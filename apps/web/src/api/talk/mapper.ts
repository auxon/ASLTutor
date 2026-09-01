import type { CatalogSign } from './types';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'am',
  'was',
  'were',
  'be',
  'been',
  'to',
  'of',
  'for',
  'and',
  'or',
  'in',
  'on',
  'at',
  'it',
  'this',
  'that',
  'with',
  'from',
  'as',
  'by',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'will',
  'just',
  'how',
  'nearest',
  'today',
  'i',
  'you',
  'we',
  'me',
  'my',
  'your',
  'our',
]);

export function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface PhraseIndexEntry {
  words: string[];
  sign: CatalogSign;
}

function buildPhraseIndex(signs: CatalogSign[]): PhraseIndexEntry[] {
  const entries: PhraseIndexEntry[] = [];
  for (const sign of signs) {
    // Single-letter fingerspelling signs are only used as a fallback so "I" in
    // a sentence does not consume the letter-I handshape.
    if (/^[A-Z]$/.test(sign.gloss)) continue;
    const phrases = new Set<string>();
    phrases.add(normalizePhrase(sign.gloss));
    phrases.add(normalizePhrase(sign.label_en));
    for (const alias of sign.english) phrases.add(normalizePhrase(alias));
    for (const tag of sign.tags) {
      const normalized = normalizePhrase(tag);
      if (normalized && normalized !== sign.gloss.toLowerCase()) {
        phrases.add(normalized);
      }
    }
    for (const phrase of phrases) {
      if (!phrase) continue;
      entries.push({ words: phrase.split(' '), sign });
    }
  }
  entries.sort((a, b) => b.words.length - a.words.length || a.sign.gloss.localeCompare(b.sign.gloss));
  return entries;
}

function matchAt(
  tokens: string[],
  start: number,
  index: PhraseIndexEntry[],
): PhraseIndexEntry | undefined {
  for (const entry of index) {
    if (entry.words.length === 0 || start + entry.words.length > tokens.length) continue;
    const slice = tokens.slice(start, start + entry.words.length);
    if (slice.every((word, i) => word === entry.words[i])) {
      return entry;
    }
  }
  return undefined;
}

function fingerspellWord(word: string, signs: CatalogSign[]): CatalogSign[] {
  const byGloss = new Map(signs.map((sign) => [sign.gloss.toUpperCase(), sign]));
  const result: CatalogSign[] = [];
  for (const char of word) {
    const upper = char.toUpperCase();
    const sign = byGloss.get(upper);
    if (sign) result.push(sign);
  }
  return result;
}

export function mapTextToSigns(
  text: string,
  signs: CatalogSign[],
): { signIds: string[]; matched: CatalogSign[]; outputText: string } {
  const tokens = normalizePhrase(text).split(' ').filter(Boolean);
  const index = buildPhraseIndex(signs);
  const matched: CatalogSign[] = [];
  let i = 0;

  while (i < tokens.length) {
    const hit = matchAt(tokens, i, index);
    if (hit) {
      matched.push(hit.sign);
      i += Math.max(1, hit.words.length);
      continue;
    }

    const token = tokens[i];
    if (STOPWORDS.has(token)) {
      i += 1;
      continue;
    }

    const spelled = fingerspellWord(token, signs);
    if (spelled.length > 0) matched.push(...spelled);
    i += 1;
  }

  return {
    signIds: matched.map((sign) => sign.id),
    matched,
    outputText: text.trim(),
  };
}

export function formatGlossToEnglish(glosses: string[], signs: CatalogSign[]): {
  outputText: string;
  signIds: string[];
} {
  const byGloss = new Map(
    signs.flatMap((sign) => {
      const keys = [sign.gloss.toUpperCase(), normalizePhrase(sign.gloss).toUpperCase()];
      return keys.map((key) => [key, sign] as const);
    }),
  );

  const matched: CatalogSign[] = [];
  const labels: string[] = [];

  for (const raw of glosses) {
    const key = raw.trim().toUpperCase().replace(/[_\s]+/g, '-');
    const alt = raw.trim().toUpperCase().replace(/[-_]+/g, ' ');
    const sign = byGloss.get(key) ?? byGloss.get(alt) ?? byGloss.get(normalizePhrase(raw).toUpperCase());
    if (sign) {
      matched.push(sign);
      labels.push(sign.label_en);
    } else if (raw.trim()) {
      labels.push(raw.trim());
    }
  }

  const outputText = labels.length > 0 ? labels.join('. ').replace(/\?\./g, '?') : glosses.join(' ');
  return {
    outputText,
    signIds: matched.map((sign) => sign.id),
  };
}

export function pinLabel(pin: { custom_text?: string; sign_id?: string }, signs: CatalogSign[]): string {
  if (pin.custom_text?.trim()) return pin.custom_text.trim();
  if (pin.sign_id) {
    const sign = signs.find((item) => item.id === pin.sign_id);
    if (sign) return sign.label_en;
  }
  return 'Phrase';
}
