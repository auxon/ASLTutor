import { getAnimationBySignId, getSignById } from '@/data/content';
import { composeSignSequence } from '@/engine/sign-player';
import type { ASLSignClip } from '@asl/sign-schema';
import type { SignAnimation } from '@asl/sign-schema';

export interface TalkPlayback {
  signs: ASLSignClip[];
  parts: SignAnimation[];
  animation: SignAnimation | null;
  label: string;
}

export function playbackFromSignIds(signIds: string[], fallbackLabel: string): TalkPlayback {
  const signs = signIds
    .map((id) => getSignById(id))
    .filter((sign): sign is ASLSignClip => Boolean(sign));
  const parts = signs
    .map((sign) => getAnimationBySignId(sign.id))
    .filter((animation): animation is SignAnimation => Boolean(animation));
  const animation = composeSignSequence(`talk-${signIds.join('-')}`, parts);
  return {
    signs,
    parts,
    animation,
    label: signs.length > 0 ? signs.map((sign) => sign.gloss).join(' · ') : fallbackLabel,
  };
}

export function glossAtProgress(parts: SignAnimation[], progress: number): string {
  if (parts.length === 0) return '';
  const total = parts.reduce((sum, part) => sum + part.duration, 0) || 1;
  let remaining = progress * total;
  for (const part of parts) {
    if (remaining <= part.duration) return part.gloss;
    remaining -= part.duration;
  }
  return parts[parts.length - 1]?.gloss ?? '';
}
