import { db } from '@/engine/mastery';
import { dictionaryCatalog } from './catalog';
import { createTalkApi, type TalkApi } from './handlers';
import { createDexieTalkStore } from './dexie-store';
import { createMemoryTalkStore, createResilientTalkStore } from './store';
import { newTalkId } from './ids';

let singleton: TalkApi | null = null;

function buildTalkApi(useDexie: boolean): TalkApi {
  const memory = createMemoryTalkStore();
  const store = useDexie
    ? createResilientTalkStore(createDexieTalkStore(db), memory)
    : memory;
  return createTalkApi({
    store,
    catalog: dictionaryCatalog,
    id: newTalkId,
  });
}

/** Browser Talk API (IndexedDB with in-memory fallback). Matches docs/openapi-talk-v1.yaml. */
export function getTalkApi(): TalkApi {
  if (!singleton) {
    try {
      singleton = buildTalkApi(true);
    } catch {
      singleton = buildTalkApi(false);
    }
  }
  return singleton;
}

export function resetTalkApiForTests(): void {
  singleton = null;
}
