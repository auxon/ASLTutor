import type { FlatHandPose } from './hand-poses';
import { FINGERSPELLING_POSES, SIGN_POSES, JOINT_NAMES } from './hand-poses';
import { lerp } from '@/lib/utils';
import type { SignAnimation, SignKeyframe } from '@asl/sign-schema';

export function interpolateFlatPose(a: FlatHandPose, b: FlatHandPose, t: number): FlatHandPose {
  const result: FlatHandPose = {};
  for (const key of JOINT_NAMES) {
    result[key] = lerp(a[key] ?? 0, b[key] ?? 0, t);
  }
  return result;
}

export function sampleAnimation(
  animation: SignAnimation,
  normalizedTime: number,
): { left: FlatHandPose; right: FlatHandPose } {
  const keyframes = animation.keyframes;
  if (keyframes.length === 0) {
    return { left: {}, right: {} };
  }

  const t = Math.max(0, Math.min(1, normalizedTime));
  let prev: SignKeyframe = keyframes[0];
  let next: SignKeyframe = keyframes[0];

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].t <= t) prev = keyframes[i];
    if (keyframes[i].t >= t) {
      next = keyframes[i];
      break;
    }
  }

  if (prev === next || prev.t === next.t) {
    const pose = resolveKeyframePose(prev);
    return { left: pose.left, right: pose.right };
  }

  const localT = (t - prev.t) / (next.t - prev.t);
  const prevPose = resolveKeyframePose(prev);
  const nextPose = resolveKeyframePose(next);

  return {
    left: interpolateFlatPose(prevPose.left, nextPose.left, localT),
    right: interpolateFlatPose(prevPose.right, nextPose.right, localT),
  };
}

function resolveKeyframePose(keyframe: SignKeyframe): { left: FlatHandPose; right: FlatHandPose } {
  const handshape = keyframe.handshape;
  const basePose = handshape
    ? FINGERSPELLING_POSES[handshape] ?? SIGN_POSES[handshape] ?? {}
    : {};

  const right = flattenHandPose(keyframe.rightHand, basePose);
  const left = flattenHandPose(keyframe.leftHand, basePose);

  return { left, right };
}

function flattenHandPose(
  handPose: SignKeyframe['rightHand'],
  base: FlatHandPose,
): FlatHandPose {
  if (!handPose) return { ...base };

  const flat: FlatHandPose = { ...base };
  const map: Array<[keyof FlatHandPose, keyof NonNullable<typeof handPose>]> = [
    ['thumbCmc', 'thumbCmc'],
    ['thumbMcp', 'thumbMcp'],
    ['thumbIp', 'thumbIp'],
    ['indexMcp', 'indexMcp'],
    ['indexPip', 'indexPip'],
    ['indexDip', 'indexDip'],
    ['middleMcp', 'middleMcp'],
    ['middlePip', 'middlePip'],
    ['middleDip', 'middleDip'],
    ['ringMcp', 'ringMcp'],
    ['ringPip', 'ringPip'],
    ['ringDip', 'ringDip'],
    ['pinkyMcp', 'pinkyMcp'],
    ['pinkyPip', 'pinkyPip'],
    ['pinkyDip', 'pinkyDip'],
  ];

  for (const [flatKey, poseKey] of map) {
    const rot = handPose[poseKey];
    if (rot && typeof rot === 'object' && 'x' in rot) {
      flat[flatKey] = rot.x;
    }
  }

  if (handPose.rotation) {
    flat.wristRotX = handPose.rotation[0];
    flat.wristRotY = handPose.rotation[1];
    flat.wristRotZ = handPose.rotation[2];
  }

  return flat;
}

export function createStaticAnimation(id: string, gloss: string, handshape: string): SignAnimation {
  return {
    id,
    gloss,
    duration: 1.5,
    keyframes: [
      { t: 0, handshape, rightHand: {} },
      { t: 1, handshape, rightHand: {} },
    ],
  };
}

export function createMotionAnimation(
  id: string,
  gloss: string,
  handshape: string,
  movement: 'wave' | 'nod' | 'shake' | 'circle',
): SignAnimation {
  const base = handshape;
  const keyframes: SignKeyframe[] = [{ t: 0, handshape: base }];

  switch (movement) {
    case 'wave':
      keyframes.push(
        { t: 0.25, handshape: base, rightHand: { rotation: [0, 0.4, 0] } },
        { t: 0.5, handshape: base, rightHand: { rotation: [0, -0.4, 0] } },
        { t: 0.75, handshape: base, rightHand: { rotation: [0, 0.4, 0] } },
        { t: 1, handshape: base },
      );
      break;
    case 'nod':
      keyframes.push(
        { t: 0.5, handshape: base, rightHand: { rotation: [0.5, 0, 0] } },
        { t: 1, handshape: base },
      );
      break;
    case 'shake':
      keyframes.push(
        { t: 0.25, handshape: base, rightHand: { rotation: [0, 0, 0.3] } },
        { t: 0.5, handshape: base, rightHand: { rotation: [0, 0, -0.3] } },
        { t: 0.75, handshape: base, rightHand: { rotation: [0, 0, 0.3] } },
        { t: 1, handshape: base },
      );
      break;
    case 'circle':
      keyframes.push(
        { t: 0.25, handshape: base, rightHand: { rotation: [0.2, 0.3, 0] } },
        { t: 0.5, handshape: base, rightHand: { rotation: [0, 0.4, 0.2] } },
        { t: 0.75, handshape: base, rightHand: { rotation: [-0.2, 0.2, 0] } },
        { t: 1, handshape: base },
      );
      break;
  }

  return { id, gloss, duration: 2, keyframes };
}

export function createFingerspellAnimation(letter: string): SignAnimation {
  return createStaticAnimation(`anim-${letter.toLowerCase()}`, letter, letter);
}

export function createJAnimation(): SignAnimation {
  return {
    id: 'anim-j',
    gloss: 'J',
    duration: 2,
    keyframes: [
      { t: 0, handshape: 'I' },
      { t: 0.2, handshape: 'I' },
      { t: 0.8, handshape: 'I', rightHand: { rotation: [0, 1.2, 0] } },
      { t: 1, handshape: 'I', rightHand: { rotation: [0, 1.2, 0] } },
    ],
  };
}

export function createZAnimation(): SignAnimation {
  return {
    id: 'anim-z',
    gloss: 'Z',
    duration: 2,
    keyframes: [
      { t: 0, handshape: '1' },
      { t: 0.25, handshape: '1', rightHand: { rotation: [0, 0, -0.5] } },
      { t: 0.5, handshape: '1', rightHand: { rotation: [0, 0, 0] } },
      { t: 0.75, handshape: '1', rightHand: { rotation: [0, 0, 0.5] } },
      { t: 1, handshape: '1' },
    ],
  };
}

export const FINGERSPELL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const FINGERSPELL_NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function buildFingerspellingAnimations(): SignAnimation[] {
  const animations: SignAnimation[] = [];

  for (const letter of FINGERSPELL_LETTERS) {
    if (letter === 'J') {
      animations.push(createJAnimation());
    } else if (letter === 'Z') {
      animations.push(createZAnimation());
    } else {
      animations.push(createFingerspellAnimation(letter));
    }
  }

  for (const num of FINGERSPELL_NUMBERS) {
    animations.push(createFingerspellAnimation(num));
  }

  return animations;
}

export function composeSignSequence(id: string, parts: SignAnimation[]): SignAnimation | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return { ...parts[0], id };

  const pause = 0.12;
  const totalDuration =
    parts.reduce((sum, part) => sum + part.duration, 0) + pause * (parts.length - 1);
  const keyframes: SignKeyframe[] = [];
  let elapsed = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    for (const keyframe of part.keyframes) {
      const t = totalDuration === 0 ? 0 : (elapsed + keyframe.t * part.duration) / totalDuration;
      keyframes.push({ ...keyframe, t: Math.min(1, Math.max(0, t)) });
    }
    elapsed += part.duration + pause;
  }

  if (keyframes.length > 0 && keyframes[keyframes.length - 1].t < 1) {
    keyframes.push({ ...keyframes[keyframes.length - 1], t: 1 });
  }

  return {
    id,
    gloss: parts.map((part) => part.gloss).join(' '),
    duration: totalDuration,
    keyframes,
  };
}

export function buildSignAnimations(): SignAnimation[] {
  const motionMap: Record<string, 'wave' | 'nod' | 'shake' | 'circle'> = {
    HELLO: 'wave',
    'THANK-YOU': 'nod',
    PLEASE: 'circle',
    YES: 'nod',
    NO: 'shake',
    HELP: 'nod',
    NAME: 'circle',
    WHAT: 'shake',
    WHO: 'shake',
    WHERE: 'shake',
    RED: 'shake',
    BLUE: 'shake',
    GREEN: 'shake',
    MOTHER: 'nod',
    FATHER: 'nod',
    BATHROOM: 'shake',
  };

  const handshapeMap: Record<string, string> = {
    HELLO: '5',
    'THANK-YOU': '5',
    PLEASE: '5',
    YES: 'S',
    NO: '1',
    HELP: 'A',
    NAME: 'H',
    WHAT: '1',
    WHO: '1',
    WHERE: '1',
    RED: '1',
    BLUE: 'B',
    GREEN: 'G',
    MOTHER: '5',
    FATHER: '5',
    BATHROOM: 'T',
  };

  return Object.keys(motionMap).map((gloss) => {
    const movement = motionMap[gloss] ?? 'nod';
    const handshape = handshapeMap[gloss] ?? '5';
    return createMotionAnimation(`anim-${gloss.toLowerCase()}`, gloss, handshape, movement);
  });
}
