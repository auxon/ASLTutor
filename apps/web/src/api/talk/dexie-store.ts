import type { SignFlowDatabase } from '@/engine/mastery';
import type {
  PhrasePin,
  TalkProfile,
  TalkSession,
  TalkUtterance,
  UsageCounter,
} from './types';
import type { TalkStore } from './store';

export function createDexieTalkStore(db: SignFlowDatabase): TalkStore {
  return {
    async getProfile(userId) {
      return db.talkProfile.get(userId);
    },
    async putProfile(profile: TalkProfile) {
      await db.talkProfile.put(profile);
    },
    async listPins(userId) {
      const rows = await db.phrasePins.where('user_id').equals(userId).toArray();
      return rows.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    },
    async getPin(id) {
      return db.phrasePins.get(id);
    },
    async putPin(pin: PhrasePin) {
      await db.phrasePins.put(pin);
    },
    async deletePin(id) {
      await db.phrasePins.delete(id);
    },
    async getSession(id) {
      return db.talkSessions.get(id);
    },
    async putSession(session: TalkSession) {
      await db.talkSessions.put(session);
    },
    async listUtterances(sessionId) {
      const rows = await db.talkUtterances.where('session_id').equals(sessionId).toArray();
      return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async getUtteranceByIdempotency(sessionId, key) {
      const rows = await db.talkUtterances.where('session_id').equals(sessionId).toArray();
      return rows.find((row) => row.idempotency_key === key);
    },
    async putUtterance(utterance: TalkUtterance) {
      await db.talkUtterances.put(utterance);
    },
    async getUsage(userId, day) {
      return db.usageCounters.get([userId, day]);
    },
    async putUsage(usage: UsageCounter) {
      await db.usageCounters.put(usage);
    },
  };
}
