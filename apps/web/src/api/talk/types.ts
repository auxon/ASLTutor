export const LOCAL_USER_ID = 'local-user';
export const FREE_TALK_PHRASES_PER_DAY = 10;

export type TalkPlan = 'free' | 'trial' | 'pro';
export type TalkRole = 'i_sign' | 'i_speak';
export type PinFolder = 'general' | 'doctor' | 'school' | 'work';
export type TalkSessionMode = 'same_phone' | 'linked' | 'solo_show';
export type TalkSessionStatus = 'live' | 'ended';
export type TalkDirection = 'pin' | 'text_to_sign' | 'speech_to_sign' | 'sign_to_text';

export interface TalkProfile {
  id: string;
  plan: TalkPlan;
  role_default: TalkRole;
  trial_ends_at: string | null;
  /** Internal: default Thank you / Bathroom / Help pins were created once. */
  pins_seeded?: boolean;
}

export interface PhrasePin {
  id: string;
  user_id: string;
  sign_id?: string;
  custom_text?: string;
  folder: PinFolder;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TalkSession {
  id: string;
  host_user_id: string;
  mode: TalkSessionMode;
  host_role: TalkRole;
  status: TalkSessionStatus;
  link_code?: string;
  created_at: string;
  ended_at?: string;
}

export interface UtteranceRawInput {
  pin_id?: string;
  text?: string;
  transcript?: string;
  gloss?: string[];
}

export interface TalkUtterance {
  id: string;
  session_id: string;
  direction: TalkDirection;
  raw_input: UtteranceRawInput;
  output_text: string;
  output_sign_ids: string[];
  confidence?: number;
  duration_ms: number;
  created_at: string;
  idempotency_key?: string;
}

export interface UsageCounter {
  user_id: string;
  day: string;
  talk_phrases_used: number;
  talk_seconds_used: number;
  practice_checks_used: number;
}

export interface UsageSnapshot {
  talk_phrases_used: number;
  talk_seconds_used: number;
  practice_checks_used: number;
  talk_phrases_limit: number | null;
  capped: boolean;
  day: string;
}

export interface CatalogSign {
  id: string;
  gloss: string;
  label_en: string;
  english: string[];
  tags: string[];
  avatar_clip: string;
  is_free_tier: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    trial_available?: boolean;
  };
}

export class TalkApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = 'TalkApiError';
    this.status = status;
    this.body = body;
  }
}

export function isTalkApiError(error: unknown): error is TalkApiError {
  return error instanceof TalkApiError;
}

export interface CreatePinInput {
  sign_id?: string;
  custom_text?: string;
  folder?: PinFolder;
}

export interface PatchPinInput {
  sign_id?: string | null;
  custom_text?: string | null;
  folder?: PinFolder;
  sort_order?: number;
}

export interface CreateSessionInput {
  mode?: TalkSessionMode;
  host_role?: TalkRole;
}

export interface CreateUtteranceInput {
  direction: TalkDirection;
  raw_input: UtteranceRawInput;
  client_duration_ms?: number;
}

export interface PatchMeInput {
  plan?: TalkPlan;
  role_default?: TalkRole;
}

export interface UtteranceResponse {
  utterance: TalkUtterance;
  usage: {
    talk_phrases_used: number;
    talk_seconds_used: number;
    capped: boolean;
  };
}
