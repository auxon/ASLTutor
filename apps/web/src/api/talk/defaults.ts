import type { PhrasePin } from './types';
import { LOCAL_USER_ID } from './types';
import { newTalkId } from './ids';

export const DEFAULT_TALK_PIN_DEFS = [
  { label: 'Thank you', signId: 'sign-thank-you' },
  { label: 'Bathroom', signId: 'sign-bathroom' },
  { label: 'Help', signId: 'sign-help' },
] as const;

/** Offline / storage-failure pins so Talk always has something to tap. */
export function fallbackTalkPins(now = new Date().toISOString()): PhrasePin[] {
  return DEFAULT_TALK_PIN_DEFS.map((item, index) => ({
    id: `fallback-${item.signId}`,
    user_id: LOCAL_USER_ID,
    sign_id: item.signId,
    custom_text: item.label,
    folder: 'general' as const,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));
}

export function fallbackTalkSessionId(): string {
  return `fallback-session-${newTalkId()}`;
}
