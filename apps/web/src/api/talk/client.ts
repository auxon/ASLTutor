import { db } from '@/engine/mastery';
import { dictionaryCatalog } from './catalog';
import { createTalkApi, type TalkApi } from './handlers';
import { createDexieTalkStore } from './dexie-store';

let singleton: TalkApi | null = null;

/** Browser Talk API (IndexedDB). Matches the /v1 contract in docs/openapi-talk-v1.yaml. */
export function getTalkApi(): TalkApi {
  if (!singleton) {
    singleton = createTalkApi({
      store: createDexieTalkStore(db),
      catalog: dictionaryCatalog,
    });
  }
  return singleton;
}

export function resetTalkApiForTests(): void {
  singleton = null;
}
