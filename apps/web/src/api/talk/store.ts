import type {
  PhrasePin,
  TalkProfile,
  TalkSession,
  TalkUtterance,
  UsageCounter,
} from './types';

export interface TalkStore {
  getProfile(userId: string): Promise<TalkProfile | undefined>;
  putProfile(profile: TalkProfile): Promise<void>;
  listPins(userId: string): Promise<PhrasePin[]>;
  getPin(id: string): Promise<PhrasePin | undefined>;
  putPin(pin: PhrasePin): Promise<void>;
  deletePin(id: string): Promise<void>;
  getSession(id: string): Promise<TalkSession | undefined>;
  putSession(session: TalkSession): Promise<void>;
  listUtterances(sessionId: string): Promise<TalkUtterance[]>;
  getUtteranceByIdempotency(sessionId: string, key: string): Promise<TalkUtterance | undefined>;
  putUtterance(utterance: TalkUtterance): Promise<void>;
  getUsage(userId: string, day: string): Promise<UsageCounter | undefined>;
  putUsage(usage: UsageCounter): Promise<void>;
}

export function createMemoryTalkStore(): TalkStore {
  const profiles = new Map<string, TalkProfile>();
  const pins = new Map<string, PhrasePin>();
  const sessions = new Map<string, TalkSession>();
  const utterances = new Map<string, TalkUtterance>();
  const usage = new Map<string, UsageCounter>();

  return {
    async getProfile(userId) {
      return profiles.get(userId);
    },
    async putProfile(profile) {
      profiles.set(profile.id, profile);
    },
    async listPins(userId) {
      return [...pins.values()]
        .filter((pin) => pin.user_id === userId)
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    },
    async getPin(id) {
      return pins.get(id);
    },
    async putPin(pin) {
      pins.set(pin.id, pin);
    },
    async deletePin(id) {
      pins.delete(id);
    },
    async getSession(id) {
      return sessions.get(id);
    },
    async putSession(session) {
      sessions.set(session.id, session);
    },
    async listUtterances(sessionId) {
      return [...utterances.values()]
        .filter((item) => item.session_id === sessionId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async getUtteranceByIdempotency(sessionId, key) {
      return [...utterances.values()].find(
        (item) => item.session_id === sessionId && item.idempotency_key === key,
      );
    },
    async putUtterance(utterance) {
      utterances.set(utterance.id, utterance);
    },
    async getUsage(userId, day) {
      return usage.get(`${userId}:${day}`);
    },
    async putUsage(counter) {
      usage.set(`${counter.user_id}:${counter.day}`, counter);
    },
  };
}
