import { describe, expect, it } from 'vitest';
import { createTalkApi } from './handlers';
import { mapTextToSigns, formatGlossToEnglish } from './mapper';
import { createMemoryTalkStore, createResilientTalkStore, type TalkStore } from './store';
import { TalkApiError, type CatalogSign } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const catalog: CatalogSign[] = [
  {
    id: 'sign-thank-you',
    gloss: 'THANK-YOU',
    label_en: 'Thank you',
    english: ['Thank you', 'Thanks'],
    tags: ['greetings'],
    avatar_clip: '/clips/thank-you.json',
    is_free_tier: true,
  },
  {
    id: 'sign-bathroom',
    gloss: 'BATHROOM',
    label_en: 'Bathroom',
    english: ['Bathroom', 'Restroom'],
    tags: ['daily'],
    avatar_clip: '/clips/bathroom.json',
    is_free_tier: true,
  },
  {
    id: 'sign-help',
    gloss: 'HELP',
    label_en: 'Help',
    english: ['Help'],
    tags: ['greetings'],
    avatar_clip: '/clips/help.json',
    is_free_tier: true,
  },
  {
    id: 'sign-hello',
    gloss: 'HELLO',
    label_en: 'Hello',
    english: ['Hello', 'Hi'],
    tags: ['greetings'],
    avatar_clip: '/clips/hello.json',
    is_free_tier: true,
  },
  {
    id: 'sign-where',
    gloss: 'WHERE',
    label_en: 'Where?',
    english: ['Where?'],
    tags: ['questions'],
    avatar_clip: '/clips/where.json',
    is_free_tier: true,
  },
  ...LETTERS.map((letter) => ({
    id: `sign-${letter.toLowerCase()}`,
    gloss: letter,
    label_en: `Letter ${letter}`,
    english: [`Letter ${letter}`],
    tags: ['fingerspelling'],
    avatar_clip: `/clips/${letter.toLowerCase()}.json`,
    is_free_tier: true,
  })),
];

function setup(plan: 'free' | 'trial' | 'pro' = 'free') {
  let n = 0;
  const api = createTalkApi({
    store: createMemoryTalkStore(),
    catalog,
    now: () => new Date('2026-09-01T15:00:00.000Z'),
    id: () => `id-${++n}`,
  });
  return { api, setPlan: () => api.patchMe({ plan }) };
}

describe('mapTextToSigns', () => {
  it('maps thank you and restroom phrases to dictionary signs', () => {
    const thank = mapTextToSigns('Thank you', catalog);
    expect(thank.signIds).toEqual(['sign-thank-you']);

    const restroom = mapTextToSigns('Where is the nearest restroom?', catalog);
    expect(restroom.signIds).toEqual(['sign-where', 'sign-bathroom']);
  });

  it('fingerspells unknown words', () => {
    const mapped = mapTextToSigns('Hi Bob', catalog);
    expect(mapped.signIds[0]).toBe('sign-hello');
    expect(mapped.signIds.slice(1)).toEqual(['sign-b', 'sign-o', 'sign-b']);
  });
});

describe('formatGlossToEnglish', () => {
  it('joins known gloss labels', () => {
    const result = formatGlossToEnglish(['HELLO', 'HELP'], catalog);
    expect(result.outputText).toBe('Hello. Help');
    expect(result.signIds).toEqual(['sign-hello', 'sign-help']);
  });
});

describe('Talk pin CRUD', () => {
  it('seeds default pins and supports create/patch/delete/reorder', async () => {
    const { api } = setup();
    const seeded = await api.listPins();
    expect(seeded.map((pin) => pin.custom_text)).toEqual(['Thank you', 'Bathroom', 'Help']);

    const created = await api.createPin({ custom_text: 'Hello', folder: 'school' });
    expect(created.sign_id).toBe('sign-hello');
    expect(created.folder).toBe('school');

    const patched = await api.patchPin(created.id, { custom_text: 'Hi there', folder: 'work' });
    expect(patched.custom_text).toBe('Hi there');
    expect(patched.folder).toBe('work');

    const listed = await api.listPins();
    const ids = listed.map((pin) => pin.id);
    const reversed = [...ids].reverse();
    const reordered = await api.reorderPins(reversed);
    expect(reordered.map((pin) => pin.id)).toEqual(reversed);

    await api.deletePin(created.id);
    const afterDelete = await api.listPins();
    expect(afterDelete.some((pin) => pin.id === created.id)).toBe(false);
    expect(afterDelete).toHaveLength(3);
  });

  it('does not duplicate default pins when listPins races', async () => {
    const { api } = setup();
    const [first, second] = await Promise.all([api.listPins(), api.listPins()]);
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    expect(await api.listPins()).toHaveLength(3);
  });
});

describe('Talk utterances', () => {
  it('plays a pin and maps typed text to signs', async () => {
    const { api } = setup();
    const pins = await api.listPins();
    const session = await api.createSession({ mode: 'same_phone', host_role: 'i_sign' });

    const pinResult = await api.createUtterance(
      session.id,
      { direction: 'pin', raw_input: { pin_id: pins[0].id }, client_duration_ms: 2000 },
      'idem-pin-1',
    );
    expect(pinResult.utterance.output_text).toBe('Thank you');
    expect(pinResult.utterance.output_sign_ids).toEqual(['sign-thank-you']);
    expect(pinResult.usage.talk_phrases_used).toBe(1);

    const textResult = await api.createUtterance(
      session.id,
      {
        direction: 'text_to_sign',
        raw_input: { text: 'Hello, how can I help you today?' },
      },
      'idem-text-1',
    );
    expect(textResult.utterance.output_sign_ids).toEqual(['sign-hello', 'sign-help']);

    const replay = await api.createUtterance(
      session.id,
      {
        direction: 'text_to_sign',
        raw_input: { text: 'Hello, how can I help you today?' },
      },
      'idem-text-1',
    );
    expect(replay.utterance.id).toBe(textResult.utterance.id);
    expect(replay.usage.talk_phrases_used).toBe(2);
  });

  it('returns FREE_CAP after 10 free phrases and leaves Pro uncapped', async () => {
    const { api } = setup('free');
    const pins = await api.listPins();
    const session = await api.createSession();

    for (let i = 0; i < 10; i++) {
      const result = await api.createUtterance(
        session.id,
        { direction: 'pin', raw_input: { pin_id: pins[0].id } },
        `free-${i}`,
      );
      expect(result.usage.talk_phrases_used).toBe(i + 1);
    }

    try {
      await api.createUtterance(
        session.id,
        { direction: 'pin', raw_input: { pin_id: pins[0].id } },
        'free-11',
      );
      throw new Error('expected FREE_CAP');
    } catch (error) {
      expect(error).toBeInstanceOf(TalkApiError);
      const apiError = error as TalkApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.body.error.code).toBe('FREE_CAP');
      expect(apiError.body.error.trial_available).toBe(true);
    }

    const usage = await api.getUsage();
    expect(usage.talk_phrases_used).toBe(10);
    expect(usage.capped).toBe(true);

    const pro = setup('pro');
    await pro.setPlan();
    const proPins = await pro.api.listPins();
    const proSession = await pro.api.createSession();
    for (let i = 0; i < 12; i++) {
      const result = await pro.api.createUtterance(
        proSession.id,
        { direction: 'pin', raw_input: { pin_id: proPins[0].id } },
        `pro-${i}`,
      );
      expect(result.usage.capped).toBe(false);
      expect(result.usage.talk_phrases_used).toBe(i + 1);
    }
  });

  it('requires an idempotency key', async () => {
    const { api } = setup();
    const session = await api.createSession();
    await expect(
      api.createUtterance(session.id, { direction: 'text_to_sign', raw_input: { text: 'Help' } }),
    ).rejects.toMatchObject({ status: 400, body: { error: { code: 'IDEMPOTENCY_REQUIRED' } } });
  });
});

describe('createResilientTalkStore', () => {
  it('falls back to memory after IndexedDB-style failures and still seeds pins', async () => {
    const fallback = createMemoryTalkStore();
    const broken: TalkStore = {
      getProfile: async () => {
        throw new Error('IndexedDB unavailable');
      },
      putProfile: async () => {
        throw new Error('IndexedDB unavailable');
      },
      listPins: async () => {
        throw new Error('IndexedDB unavailable');
      },
      getPin: async () => {
        throw new Error('IndexedDB unavailable');
      },
      putPin: async () => {
        throw new Error('IndexedDB unavailable');
      },
      deletePin: async () => {
        throw new Error('IndexedDB unavailable');
      },
      getSession: async () => {
        throw new Error('IndexedDB unavailable');
      },
      putSession: async () => {
        throw new Error('IndexedDB unavailable');
      },
      listUtterances: async () => {
        throw new Error('IndexedDB unavailable');
      },
      getUtteranceByIdempotency: async () => {
        throw new Error('IndexedDB unavailable');
      },
      putUtterance: async () => {
        throw new Error('IndexedDB unavailable');
      },
      getUsage: async () => {
        throw new Error('IndexedDB unavailable');
      },
      putUsage: async () => {
        throw new Error('IndexedDB unavailable');
      },
    };

    const api = createTalkApi({
      store: createResilientTalkStore(broken, fallback),
      catalog,
      now: () => new Date('2026-09-01T15:00:00.000Z'),
      id: (() => {
        let n = 0;
        return () => `resilient-${++n}`;
      })(),
    });

    const pins = await api.listPins();
    expect(pins.map((pin) => pin.custom_text)).toEqual(['Thank you', 'Bathroom', 'Help']);
    const session = await api.createSession();
    const result = await api.createUtterance(
      session.id,
      { direction: 'pin', raw_input: { pin_id: pins[0].id } },
      'resilient-utterance',
    );
    expect(result.utterance.output_text).toBe('Thank you');
  });
});
