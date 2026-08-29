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

const FINGERS: Array<{
  name: string;
  idxs: [number, number, number, number];
  poseKeys: [string, string, string];
  poseMax: number;
}> = [
  { name: 'thumb', idxs: [1, 2, 3, 4], poseKeys: ['thumbCmc', 'thumbMcp', 'thumbIp'], poseMax: 2.0 },
  { name: 'index', idxs: [5, 6, 7, 8], poseKeys: ['indexMcp', 'indexPip', 'indexDip'], poseMax: 4.2 },
  { name: 'middle', idxs: [9, 10, 11, 12], poseKeys: ['middleMcp', 'middlePip', 'middleDip'], poseMax: 4.2 },
  { name: 'ring', idxs: [13, 14, 15, 16], poseKeys: ['ringMcp', 'ringPip', 'ringDip'], poseMax: 4.2 },
  { name: 'pinky', idxs: [17, 18, 19, 20], poseKeys: ['pinkyMcp', 'pinkyPip', 'pinkyDip'], poseMax: 4.2 },
];

function dist(a: Landmark3D, b: Landmark3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clamp(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

function sub(a: Landmark3D, b: Landmark3D): Landmark3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Landmark3D, b: Landmark3D): Landmark3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(v: Landmark3D): number {
  return Math.hypot(v.x, v.y, v.z) || 1;
}

/** 0 = extended, 1 = fully curled. Uses bone-chain vs tip span, so it is rotation-invariant. */
export function fingerCurl(landmarks: Landmark3D[], idxs: [number, number, number, number]): number {
  const [a, b, c, d] = idxs.map((i) => landmarks[i]);
  if (!a || !b || !c || !d) return 0;
  const chain = dist(a, b) + dist(b, c) + dist(c, d);
  if (chain < 1e-6) return 0;
  const raw = 1 - dist(a, d) / chain;
  return clamp((raw - 0.04) / 0.62);
}

function expectedCurl(pose: FlatHandPose, keys: [string, string, string], poseMax: number): number {
  const sum = keys.reduce((s, k) => s + Math.abs(pose[k] ?? 0), 0);
  return clamp(sum / poseMax);
}

function curlBand(v: number): 'open' | 'mid' | 'closed' {
  if (v < 0.28) return 'open';
  if (v > 0.55) return 'closed';
  return 'mid';
}

function curlSimilarity(user: number, expected: number): number {
  const ub = curlBand(user);
  const eb = curlBand(expected);
  const d = Math.abs(user - expected);
  if (ub === eb) return clamp(0.84 + (1 - d) * 0.16);
  if (ub === 'mid' || eb === 'mid') return clamp(1 - d / 0.5);
  return clamp(1 - d / 0.42);
}

function palmWidth(landmarks: Landmark3D[]): number {
  if (landmarks.length < 18) return 0;
  return dist(landmarks[5], landmarks[17]);
}

/** Index/middle tip separation relative to palm — distinguishes U vs V. */
function indexMiddleSpread(landmarks: Landmark3D[]): number {
  if (landmarks.length < 13) return 0;
  const width = palmWidth(landmarks) || 1;
  return dist(landmarks[8], landmarks[12]) / width;
}

function expectedSpread(pose: FlatHandPose): number {
  return clamp(Math.abs(pose.indexMcpSpread ?? 0) / 0.25);
}

function palmFacingCamera(landmarks: Landmark3D[]): number {
  if (landmarks.length < 18) return 0;
  const n = cross(sub(landmarks[5], landmarks[0]), sub(landmarks[17], landmarks[0]));
  return Math.abs(n.z) / length(n);
}

function handInFrame(image: Landmark3D[]): { location: number; tooSmall: boolean } {
  if (image.length < 21) return { location: 0, tooSmall: true };
  let sx = 0;
  let sy = 0;
  for (const p of image) {
    sx += p.x;
    sy += p.y;
  }
  const cx = sx / image.length;
  const cy = sy / image.length;
  const fromCenter = Math.hypot(cx - 0.5, cy - 0.5);
  const size = palmWidth(image);
  const tooSmall = size < 0.04;
  const location = clamp(1 - fromCenter / 0.55) * (tooSmall ? 0.4 : 1);
  return { location, tooSmall };
}

/**
 * Compare a live MediaPipe hand to a target ASL pose.
 *
 * Previous scoring compared image-space landmarks to a synthetic 3D rig with
 * the Y axis flipped, so a perfect match still scored ~0 on handshape/orientation.
 * After wrist normalization the location term was always 1, which floors overall
 * at 20% — matching the bug report.
 */
export function scorePose(
  userLandmarks: Landmark3D[],
  targetPose: FlatHandPose,
  _mirrored = false,
  imageLandmarks: Landmark3D[] = userLandmarks,
): PoseScore {
  const feedback: string[] = [];

  if (userLandmarks.length < 21) {
    return {
      overall: 0,
      handshape: 0,
      orientation: 0,
      location: 0,
      feedback: ['Hold your hand clearly in view of the camera'],
    };
  }

  const fingerScores = FINGERS.map((finger) => {
    const user = fingerCurl(userLandmarks, finger.idxs);
    const expected = expectedCurl(targetPose, finger.poseKeys, finger.poseMax);
    return { name: finger.name, user, expected, score: curlSimilarity(user, expected) };
  });

  const curlScore =
    fingerScores.reduce((s, f) => s + f.score, 0) / fingerScores.length;

  const spreadScore = clamp(
    1 - Math.abs(clamp(indexMiddleSpread(userLandmarks) / 1.8) - expectedSpread(targetPose)) / 0.75,
  );

  const handshape = clamp(curlScore * 0.85 + spreadScore * 0.15);

  const facing = palmFacingCamera(userLandmarks);
  const wantsEdgeOn = Math.abs(targetPose.wristRotX ?? 0) > 0.5 || Math.abs(targetPose.wristRotZ ?? 0) > 0.5;
  const orientation = wantsEdgeOn ? clamp(1 - facing * 0.4) : clamp((facing - 0.25) / 0.7);

  const { location, tooSmall } = handInFrame(imageLandmarks);

  const overall = clamp(handshape * 0.7 + orientation * 0.15 + location * 0.15);

  if (tooSmall) {
    feedback.push('Move your hand closer to the camera');
  }
  if (handshape < 0.6) {
    const worst = fingerScores.reduce((a, b) => (a.score < b.score ? a : b));
    feedback.push(`Adjust your ${worst.name} — ${worst.user < worst.expected ? 'curl it more' : 'straighten it more'}`);
  }
  if (orientation < 0.55 && !wantsEdgeOn) {
    feedback.push('Turn your palm to face the camera');
  }
  if (location < 0.5 && !tooSmall) {
    feedback.push('Move your hand to the center of the camera frame');
  }
  if (overall >= 0.8) {
    feedback.push('Great job! Your handshape looks close to the target.');
  } else if (overall >= 0.55) {
    feedback.push('Getting closer — compare with the 3D reference and try again.');
  } else if (feedback.length === 0) {
    feedback.push('Watch the 3D demo slowly, then try matching one parameter at a time.');
  }

  return { overall, handshape, orientation, location, feedback };
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
    palmWidth(current) > palmWidth(best) ? current : best,
  );
}

export function poseFlatToJointVector(pose: FlatHandPose): number[] {
  return JOINT_NAMES.map((key) => pose[key] ?? 0);
}

export function compareJointVectors(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d += Math.abs(a[i] - b[i]);
  }
  return Math.max(0, Math.min(1, 1 - d / (a.length * 0.8)));
}

/** MediaPipe-style 21-point hand in image space: wrist at bottom, fingers toward -Y. */
export function syntheticHand(kind: 'closed' | 'open' | 'index'): Landmark3D[] {
  const wrist = { x: 0.5, y: 0.72, z: 0 };
  const palm = 0.09;
  const mcpY = 0.55;
  const xs = [0.38, 0.44, 0.5, 0.56, 0.62];
  const lms: Landmark3D[] = [wrist];

  const thumbExtended = kind === 'open';
  lms.push({ x: 0.34, y: 0.64, z: 0 });
  lms.push({ x: 0.32, y: 0.6, z: 0 });
  if (thumbExtended) {
    lms.push({ x: 0.3, y: 0.52, z: 0 });
    lms.push({ x: 0.28, y: 0.46, z: 0 });
  } else {
    lms.push({ x: 0.36, y: 0.58, z: 0.01 });
    lms.push({ x: 0.4, y: 0.56, z: 0.01 });
  }

  for (let i = 0; i < 4; i++) {
    const mcp = { x: xs[i + 1], y: mcpY, z: 0 };
    const extended = kind === 'open' || (kind === 'index' && i === 0);
    lms.push(mcp);
    if (extended) {
      lms.push({ x: mcp.x, y: mcpY - palm * 0.55, z: 0 });
      lms.push({ x: mcp.x, y: mcpY - palm * 1.05, z: 0 });
      lms.push({ x: mcp.x, y: mcpY - palm * 1.55, z: 0 });
    } else {
      lms.push({ x: mcp.x, y: mcpY + 0.055, z: 0.01 });
      lms.push({ x: mcp.x, y: mcpY + 0.07, z: 0.02 });
      lms.push({ x: mcp.x, y: mcpY + 0.02, z: 0.01 });
    }
  }

  return lms;
}
