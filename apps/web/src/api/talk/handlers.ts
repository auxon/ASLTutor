import {
  FREE_TALK_PHRASES_PER_DAY,
  LOCAL_USER_ID,
  TalkApiError,
  type CatalogSign,
  type CreatePinInput,
  type CreateSessionInput,
  type CreateUtteranceInput,
  type PatchMeInput,
  type PatchPinInput,
  type PhrasePin,
  type PinFolder,
  type TalkProfile,
  type TalkUtterance,
  type UsageCounter,
  type UsageSnapshot,
  type UtteranceResponse,
} from './types';
import { formatGlossToEnglish, mapTextToSigns, pinLabel } from './mapper';
import { DEFAULT_TALK_PIN_DEFS } from './defaults';
import type { TalkStore } from './store';

const PIN_FOLDERS: PinFolder[] = ['general', 'doctor', 'school', 'work'];

export interface TalkApiDeps {
  store: TalkStore;
  catalog: CatalogSign[];
  userId?: string;
  now?: () => Date;
  id?: () => string;
}

export interface TalkApi {
  getMe(): Promise<TalkProfile>;
  patchMe(input: PatchMeInput): Promise<TalkProfile>;
  getUsage(): Promise<UsageSnapshot>;
  listPins(): Promise<PhrasePin[]>;
  createPin(input: CreatePinInput): Promise<PhrasePin>;
  patchPin(id: string, input: PatchPinInput): Promise<PhrasePin>;
  deletePin(id: string): Promise<void>;
  reorderPins(ids: string[]): Promise<PhrasePin[]>;
  createSession(input?: CreateSessionInput): Promise<import('./types').TalkSession>;
  getSession(id: string): Promise<import('./types').TalkSession>;
  endSession(id: string): Promise<import('./types').TalkSession>;
  listUtterances(sessionId: string): Promise<TalkUtterance[]>;
  createUtterance(
    sessionId: string,
    input: CreateUtteranceInput,
    idempotencyKey?: string,
  ): Promise<UtteranceResponse>;
  listSigns(query?: string): Promise<CatalogSign[]>;
  getSign(id: string): Promise<CatalogSign>;
}

function iso(date: Date): string {
  return date.toISOString();
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultProfile(userId: string): TalkProfile {
  return {
    id: userId,
    plan: 'free',
    role_default: 'i_sign',
    trial_ends_at: null,
  };
}

function emptyUsage(userId: string, day: string): UsageCounter {
  return {
    user_id: userId,
    day,
    talk_phrases_used: 0,
    talk_seconds_used: 0,
    practice_checks_used: 0,
  };
}

function effectivePlan(profile: TalkProfile, now: Date): TalkProfile['plan'] {
  if (profile.plan === 'trial' && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at).getTime() < now.getTime()) return 'free';
  }
  return profile.plan;
}

function usageSnapshot(profile: TalkProfile, usage: UsageCounter, now: Date): UsageSnapshot {
  const plan = effectivePlan(profile, now);
  const unlimited = plan === 'pro' || plan === 'trial';
  const limit = unlimited ? null : FREE_TALK_PHRASES_PER_DAY;
  return {
    talk_phrases_used: usage.talk_phrases_used,
    talk_seconds_used: usage.talk_seconds_used,
    practice_checks_used: usage.practice_checks_used,
    talk_phrases_limit: limit,
    capped: !unlimited && usage.talk_phrases_used >= FREE_TALK_PHRASES_PER_DAY,
    day: usage.day,
  };
}

export function createTalkApi(deps: TalkApiDeps): TalkApi {
  const userId = deps.userId ?? LOCAL_USER_ID;
  const now = () => deps.now?.() ?? new Date();
  const nextId = () => deps.id?.() ?? crypto.randomUUID();
  const { store, catalog } = deps;
  let seedInFlight: Promise<PhrasePin[]> | null = null;

  async function requireProfile(): Promise<TalkProfile> {
    const existing = await store.getProfile(userId);
    if (existing) {
      const plan = effectivePlan(existing, now());
      if (plan !== existing.plan) {
        const downgraded = { ...existing, plan, trial_ends_at: existing.trial_ends_at };
        await store.putProfile(downgraded);
        return downgraded;
      }
      return existing;
    }
    const profile = defaultProfile(userId);
    await store.putProfile(profile);
    return profile;
  }

  async function requireUsage(): Promise<{ profile: TalkProfile; usage: UsageCounter }> {
    const profile = await requireProfile();
    const day = dayKey(now());
    const usage = (await store.getUsage(userId, day)) ?? emptyUsage(userId, day);
    if (!(await store.getUsage(userId, day))) {
      await store.putUsage(usage);
    }
    return { profile, usage };
  }

  async function seedDefaultPins(): Promise<PhrasePin[]> {
    if (seedInFlight) {
      await seedInFlight;
      return store.listPins(userId);
    }
    seedInFlight = (async () => {
      const profile = await requireProfile();
      const existing = await store.listPins(userId);
      if (profile.pins_seeded) return collapseDuplicateDefaults(store, existing);

      // Mark seeded first so a concurrent listPins cannot insert a second set.
      await store.putProfile({ ...profile, pins_seeded: true });

      const defaults = DEFAULT_TALK_PIN_DEFS;

      const timestamp = iso(now());
      for (const [index, item] of defaults.entries()) {
        if (!catalog.some((sign) => sign.id === item.signId)) continue;
        const pin: PhrasePin = {
          id: nextId(),
          user_id: userId,
          sign_id: item.signId,
          custom_text: item.label,
          folder: 'general',
          sort_order: index,
          created_at: timestamp,
          updated_at: timestamp,
        };
        await store.putPin(pin);
      }
      return store.listPins(userId);
    })();
    try {
      return await seedInFlight;
    } finally {
      seedInFlight = null;
    }
  }

  function findSign(id: string): CatalogSign | undefined {
    return catalog.find((sign) => sign.id === id);
  }

  return {
    async getMe() {
      return requireProfile();
    },

    async patchMe(input) {
      const profile = await requireProfile();
      const next: TalkProfile = { ...profile };
      if (input.role_default) next.role_default = input.role_default;
      if (input.plan) {
        next.plan = input.plan;
        if (input.plan === 'trial') {
          const ends = new Date(now());
          ends.setDate(ends.getDate() + 7);
          next.trial_ends_at = ends.toISOString();
        }
        if (input.plan === 'free') next.trial_ends_at = null;
      }
      await store.putProfile(next);
      return next;
    },

    async getUsage() {
      const { profile, usage } = await requireUsage();
      return usageSnapshot(profile, usage, now());
    },

    async listPins() {
      await requireProfile();
      return seedDefaultPins();
    },

    async createPin(input) {
      await requireProfile();
      const custom = input.custom_text?.trim();
      let signId = input.sign_id;
      if (signId && !findSign(signId)) {
        throw new TalkApiError(404, {
          error: { code: 'SIGN_NOT_FOUND', message: `Unknown sign ${signId}` },
        });
      }
      if (!signId && !custom) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_PIN', message: 'Provide sign_id or custom_text' },
        });
      }
      if (!signId && custom) {
        const mapped = mapTextToSigns(custom, catalog);
        if (mapped.signIds.length === 1) signId = mapped.signIds[0];
      }
      const folder = input.folder && PIN_FOLDERS.includes(input.folder) ? input.folder : 'general';
      const existing = await store.listPins(userId);
      const timestamp = iso(now());
      const pin: PhrasePin = {
        id: nextId(),
        user_id: userId,
        sign_id: signId,
        custom_text: custom,
        folder,
        sort_order: existing.length,
        created_at: timestamp,
        updated_at: timestamp,
      };
      await store.putPin(pin);
      return pin;
    },

    async patchPin(id, input) {
      const pin = await store.getPin(id);
      if (!pin || pin.user_id !== userId) {
        throw new TalkApiError(404, { error: { code: 'PIN_NOT_FOUND', message: 'Pin not found' } });
      }
      const next: PhrasePin = { ...pin, updated_at: iso(now()) };
      if (input.folder) {
        if (!PIN_FOLDERS.includes(input.folder)) {
          throw new TalkApiError(400, { error: { code: 'INVALID_FOLDER', message: 'Invalid folder' } });
        }
        next.folder = input.folder;
      }
      if (input.sort_order !== undefined) next.sort_order = input.sort_order;
      if (input.custom_text !== undefined) {
        next.custom_text = input.custom_text === null ? undefined : input.custom_text.trim();
      }
      if (input.sign_id !== undefined) {
        if (input.sign_id === null) {
          next.sign_id = undefined;
        } else {
          if (!findSign(input.sign_id)) {
            throw new TalkApiError(404, {
              error: { code: 'SIGN_NOT_FOUND', message: `Unknown sign ${input.sign_id}` },
            });
          }
          next.sign_id = input.sign_id;
        }
      }
      if (!next.sign_id && !next.custom_text) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_PIN', message: 'Pin must keep sign_id or custom_text' },
        });
      }
      await store.putPin(next);
      return next;
    },

    async deletePin(id) {
      const pin = await store.getPin(id);
      if (!pin || pin.user_id !== userId) {
        throw new TalkApiError(404, { error: { code: 'PIN_NOT_FOUND', message: 'Pin not found' } });
      }
      await store.deletePin(id);
    },

    async reorderPins(ids) {
      const existing = await store.listPins(userId);
      const byId = new Map(existing.map((pin) => [pin.id, pin]));
      if (ids.length !== existing.length || ids.some((id) => !byId.has(id))) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_REORDER', message: 'Reorder list must include every pin id exactly once' },
        });
      }
      const timestamp = iso(now());
      const next: PhrasePin[] = [];
      for (const [index, id] of ids.entries()) {
        const pin = { ...byId.get(id)!, sort_order: index, updated_at: timestamp };
        await store.putPin(pin);
        next.push(pin);
      }
      return next;
    },

    async createSession(input = {}) {
      await requireProfile();
      const timestamp = iso(now());
      const session = {
        id: nextId(),
        host_user_id: userId,
        mode: input.mode ?? 'same_phone',
        host_role: input.host_role ?? 'i_sign',
        status: 'live' as const,
        created_at: timestamp,
      };
      await store.putSession(session);
      return session;
    },

    async getSession(id) {
      const session = await store.getSession(id);
      if (!session || session.host_user_id !== userId) {
        throw new TalkApiError(404, {
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        });
      }
      return session;
    },

    async endSession(id) {
      const session = await this.getSession(id);
      if (session.status === 'ended') return session;
      const ended = { ...session, status: 'ended' as const, ended_at: iso(now()) };
      await store.putSession(ended);
      return ended;
    },

    async listUtterances(sessionId) {
      await this.getSession(sessionId);
      return store.listUtterances(sessionId);
    },

    async createUtterance(sessionId, input, idempotencyKey) {
      if (!idempotencyKey?.trim()) {
        throw new TalkApiError(400, {
          error: { code: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key header is required' },
        });
      }

      const session = await this.getSession(sessionId);
      if (session.status === 'ended') {
        throw new TalkApiError(409, {
          error: { code: 'SESSION_ENDED', message: 'This Talk session has ended' },
        });
      }

      const existing = await store.getUtteranceByIdempotency(sessionId, idempotencyKey);
      if (existing) {
        const { profile, usage } = await requireUsage();
        const snap = usageSnapshot(profile, usage, now());
        return {
          utterance: existing,
          usage: {
            talk_phrases_used: snap.talk_phrases_used,
            talk_seconds_used: snap.talk_seconds_used,
            capped: snap.capped,
          },
        };
      }

      const { profile, usage } = await requireUsage();
      const snap = usageSnapshot(profile, usage, now());
      if (snap.capped) {
        throw new TalkApiError(403, {
          error: {
            code: 'FREE_CAP',
            message:
              "You've used today's free Talk phrases. Start a 7-day trial or upgrade to Pro for unlimited Talk.",
            trial_available: profile.plan === 'free' || effectivePlan(profile, now()) === 'free',
          },
        });
      }

      const resolved = resolveUtterance(input, catalog, await store.listPins(userId));
      const duration = Math.max(0, Math.round(input.client_duration_ms ?? 0));
      const utterance: TalkUtterance = {
        id: nextId(),
        session_id: sessionId,
        direction: input.direction,
        raw_input: input.raw_input,
        output_text: resolved.outputText,
        output_sign_ids: resolved.signIds,
        confidence: resolved.confidence,
        duration_ms: duration,
        created_at: iso(now()),
        idempotency_key: idempotencyKey,
      };

      await store.putUtterance(utterance);

      const nextUsage: UsageCounter = {
        ...usage,
        talk_phrases_used: usage.talk_phrases_used + 1,
        talk_seconds_used: usage.talk_seconds_used + Math.round(duration / 1000),
      };
      await store.putUsage(nextUsage);

      const after = usageSnapshot(profile, nextUsage, now());
      return {
        utterance,
        usage: {
          talk_phrases_used: after.talk_phrases_used,
          talk_seconds_used: after.talk_seconds_used,
          capped: after.capped,
        },
      };
    },

    async listSigns(query) {
      const q = query?.trim().toLowerCase();
      if (!q) return catalog;
      return catalog.filter(
        (sign) =>
          sign.gloss.toLowerCase().includes(q) ||
          sign.label_en.toLowerCase().includes(q) ||
          sign.english.some((alias) => alias.toLowerCase().includes(q)) ||
          sign.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    },

    async getSign(id) {
      const sign = findSign(id);
      if (!sign) {
        throw new TalkApiError(404, { error: { code: 'SIGN_NOT_FOUND', message: 'Sign not found' } });
      }
      return sign;
    },
  };
}

async function collapseDuplicateDefaults(store: TalkStore, pins: PhrasePin[]): Promise<PhrasePin[]> {
  const defaultLabels = new Set(['Thank you', 'Bathroom', 'Help']);
  const seen = new Set<string>();
  const kept: PhrasePin[] = [];
  for (const pin of pins) {
    const key = `${pin.custom_text ?? ''}|${pin.sign_id ?? ''}|${pin.folder}`;
    if (defaultLabels.has(pin.custom_text ?? '') && seen.has(key)) {
      await store.deletePin(pin.id);
      continue;
    }
    if (defaultLabels.has(pin.custom_text ?? '')) seen.add(key);
    kept.push(pin);
  }
  return kept;
}

function resolveUtterance(
  input: CreateUtteranceInput,
  catalog: CatalogSign[],
  pins: PhrasePin[],
): { outputText: string; signIds: string[]; confidence?: number } {
  switch (input.direction) {
    case 'pin': {
      const pinId = input.raw_input.pin_id;
      if (!pinId) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_INPUT', message: 'pin direction requires raw_input.pin_id' },
        });
      }
      const pin = pins.find((item) => item.id === pinId);
      if (!pin) {
        throw new TalkApiError(404, { error: { code: 'PIN_NOT_FOUND', message: 'Pin not found' } });
      }
      const label = pinLabel(pin, catalog);
      if (pin.sign_id && catalog.some((sign) => sign.id === pin.sign_id)) {
        return { outputText: label, signIds: [pin.sign_id], confidence: 1 };
      }
      const mapped = mapTextToSigns(pin.custom_text ?? label, catalog);
      return { outputText: label, signIds: mapped.signIds, confidence: mapped.signIds.length ? 0.8 : 0.2 };
    }
    case 'text_to_sign': {
      const text = input.raw_input.text?.trim();
      if (!text) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_INPUT', message: 'text_to_sign requires raw_input.text' },
        });
      }
      const mapped = mapTextToSigns(text, catalog);
      return { outputText: mapped.outputText, signIds: mapped.signIds, confidence: mapped.signIds.length ? 0.75 : 0.2 };
    }
    case 'speech_to_sign': {
      const text = (input.raw_input.transcript ?? input.raw_input.text)?.trim();
      if (!text) {
        throw new TalkApiError(400, {
          error: { code: 'INVALID_INPUT', message: 'speech_to_sign requires raw_input.transcript' },
        });
      }
      const mapped = mapTextToSigns(text, catalog);
      return { outputText: mapped.outputText, signIds: mapped.signIds, confidence: mapped.signIds.length ? 0.7 : 0.2 };
    }
    case 'sign_to_text': {
      const gloss = input.raw_input.gloss;
      if (!gloss || gloss.length === 0) {
        throw new TalkApiError(400, {
          error: {
            code: 'INVALID_INPUT',
            message: 'sign_to_text requires raw_input.gloss (camera recognition is not in slice 1)',
          },
        });
      }
      const formatted = formatGlossToEnglish(gloss, catalog);
      return {
        outputText: formatted.outputText,
        signIds: formatted.signIds,
        confidence: 0.45,
      };
    }
    default:
      throw new TalkApiError(400, {
        error: { code: 'INVALID_DIRECTION', message: `Unsupported direction ${String(input.direction)}` },
      });
  }
}
