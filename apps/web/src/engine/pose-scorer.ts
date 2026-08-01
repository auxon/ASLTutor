import type { FlatHandPose } from './hand-poses';
import { JOINT_NAMES, FINGERSPELLING_POSES } from './hand-poses';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface PoseScore {
  overall: number;
  handshape: number;
  orientation: number;
  location: number;
  feedback: string[];
}

/** Convert flat hand pose to approximate MediaPipe-style 21 landmarks */
export function poseToLandmarks(pose: FlatHandPose, mirrored = false): Landmark3D[] {
  const sign = mirrored ? -1 : 1;
  const landmarks: Landmark3D[] = [];

  const wrist = { x: 0, y: 0, z: 0 };
  landmarks.push(wrist);

  const fingerBases = [
    { mcp: 'indexMcp', pip: 'indexPip', dip: 'indexDip', spread: 'indexMcpSpread', x: 0.03 },
    { mcp: 'middleMcp', pip: 'middlePip', dip: 'middleDip', spread: 'middleMcpSpread', x: 0.01 },
    { mcp: 'ringMcp', pip: 'ringPip', dip: 'ringDip', spread: 'ringMcpSpread', x: -0.01 },
    { mcp: 'pinkyMcp', pip: 'pinkyPip', dip: 'pinkyDip', spread: 'pinkyMcpSpread', x: -0.03 },
  ];

  // Thumb chain
  const thumbLen = 0.04;
  landmarks.push({ x: sign * thumbLen * 0.3, y: 0.01, z: 0.01 });
  landmarks.push({ x: sign * thumbLen * 0.6, y: 0.02 - (pose.thumbMcp ?? 0) * 0.02, z: 0.02 });
  landmarks.push({ x: sign * thumbLen * 0.9, y: 0.03 - (pose.thumbIp ?? 0) * 0.03, z: 0.03 });
  landmarks.push({
    x: sign * thumbLen,
    y: 0.04 - (pose.thumbIp ?? 0) * 0.04,
    z: 0.04 - (pose.thumbCmc ?? 0) * 0.02,
  });

  for (const finger of fingerBases) {
    const spread = (pose[finger.spread] ?? 0) * 0.02;
    const mcpFlex = (pose[finger.mcp] ?? 0) * 0.06;
    const pipFlex = (pose[finger.pip] ?? 0) * 0.05;
    const dipFlex = (pose[finger.dip] ?? 0) * 0.04;
    const baseX = sign * (finger.x + spread);

    landmarks.push({ x: baseX, y: 0.06, z: -mcpFlex * 0.5 });
    landmarks.push({ x: baseX, y: 0.1, z: -mcpFlex - pipFlex * 0.3 });
    landmarks.push({ x: baseX, y: 0.13, z: -mcpFlex - pipFlex - dipFlex * 0.2 });
    landmarks.push({ x: baseX, y: 0.15, z: -mcpFlex - pipFlex - dipFlex });
  }

  while (landmarks.length < 21) {
    landmarks.push({ x: 0, y: 0, z: 0 });
  }

  return landmarks.slice(0, 21);
}

function normalizeLandmarks(landmarks: Landmark3D[]): Landmark3D[] {
  if (landmarks.length < 21) return landmarks;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const scale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, middleMcp.z - wrist.z) || 1;

  return landmarks.map((lm) => ({
    x: (lm.x - wrist.x) / scale,
    y: (lm.y - wrist.y) / scale,
    z: (lm.z - wrist.z) / scale,
  }));
}

function landmarkDistance(a: Landmark3D, b: Landmark3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scorePose(
  userLandmarks: Landmark3D[],
  targetPose: FlatHandPose,
  mirrored = false,
): PoseScore {
  const feedback: string[] = [];
  const targetLandmarks = normalizeLandmarks(poseToLandmarks(targetPose, mirrored));
  const userNormalized = normalizeLandmarks(userLandmarks);

  if (userNormalized.length < 21 || targetLandmarks.length < 21) {
    return {
      overall: 0,
      handshape: 0,
      orientation: 0,
      location: 0,
      feedback: ['Hold your hand clearly in view of the camera'],
    };
  }

  const fingertipIndices = [4, 8, 12, 16, 20];
  const mcpIndices = [2, 5, 9, 13, 17];

  let handshapeDist = 0;
  for (const idx of fingertipIndices) {
    handshapeDist += landmarkDistance(userNormalized[idx], targetLandmarks[idx]);
  }
  handshapeDist /= fingertipIndices.length;
  const handshape = Math.max(0, Math.min(1, 1 - handshapeDist / 0.35));

  let orientationDist = 0;
  for (const idx of mcpIndices) {
    orientationDist += landmarkDistance(userNormalized[idx], targetLandmarks[idx]);
  }
  orientationDist /= mcpIndices.length;
  const orientation = Math.max(0, Math.min(1, 1 - orientationDist / 0.4));

  const wristDist = landmarkDistance(userNormalized[0], targetLandmarks[0]);
  const location = Math.max(0, Math.min(1, 1 - wristDist / 0.5));

  const overall = handshape * 0.5 + orientation * 0.3 + location * 0.2;

  if (handshape < 0.6) {
    const worstFinger = findWorstFinger(userNormalized, targetLandmarks, fingertipIndices);
    feedback.push(`Adjust your ${worstFinger} finger position to match the target handshape`);
  }
  if (orientation < 0.6) {
    feedback.push('Rotate your wrist so your palm faces the correct direction');
  }
  if (location < 0.5) {
    feedback.push('Move your hand to the center of the camera frame');
  }
  if (overall >= 0.75) {
    feedback.push('Great job! Your handshape looks close to the target.');
  } else if (overall >= 0.5) {
    feedback.push('Getting closer — compare with the 3D reference and try again.');
  } else {
    feedback.push('Watch the 3D demo slowly, then try matching one parameter at a time.');
  }

  return { overall, handshape, orientation, location, feedback };
}

function findWorstFinger(
  user: Landmark3D[],
  target: Landmark3D[],
  indices: number[],
): string {
  const names = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  let worstIdx = 0;
  let worstDist = 0;
  indices.forEach((idx, i) => {
    const d = landmarkDistance(user[idx], target[idx]);
    if (d > worstDist) {
      worstDist = d;
      worstIdx = i;
    }
  });
  return names[worstIdx];
}

export function getTargetPoseForHandshape(handshape: string): FlatHandPose {
  return FINGERSPELLING_POSES[handshape] ?? FINGERSPELLING_POSES.NEUTRAL;
}

export function smoothLandmarks(
  current: Landmark3D[],
  previous: Landmark3D[] | null,
  alpha = 0.3,
): Landmark3D[] {
  if (!previous || previous.length !== current.length) return current;
  return current.map((lm, i) => ({
    x: alpha * lm.x + (1 - alpha) * previous[i].x,
    y: alpha * lm.y + (1 - alpha) * previous[i].y,
    z: alpha * lm.z + (1 - alpha) * previous[i].z,
  }));
}

export function extractPrimaryHandLandmarks(
  allLandmarks: Landmark3D[][],
): Landmark3D[] | null {
  if (allLandmarks.length === 0) return null;
  return allLandmarks.reduce((best, current) =>
    current.length > (best?.length ?? 0) ? current : best,
  );
}

export function poseFlatToJointVector(pose: FlatHandPose): number[] {
  return JOINT_NAMES.map((key) => pose[key] ?? 0);
}

export function compareJointVectors(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    dist += Math.abs(a[i] - b[i]);
  }
  return Math.max(0, Math.min(1, 1 - dist / (a.length * 0.8)));
}
