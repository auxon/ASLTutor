import { dictionary } from '@/data/content';
import type { CatalogSign } from './types';

const FREE_CATEGORIES = new Set(['fingerspelling', 'greetings', 'questions', 'daily']);

export function catalogFromDictionary(): CatalogSign[] {
  return dictionary.signs.map((sign) => ({
    id: sign.id,
    gloss: sign.gloss,
    label_en: sign.english[0] ?? sign.gloss,
    english: sign.english,
    tags: [sign.category, ...sign.english],
    avatar_clip: sign.clipUrl,
    is_free_tier: FREE_CATEGORIES.has(sign.category) || sign.difficulty <= 2,
  }));
}

export const dictionaryCatalog: CatalogSign[] = catalogFromDictionary();
