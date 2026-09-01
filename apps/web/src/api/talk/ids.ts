/** Prefer crypto.randomUUID; fall back for older WebViews / insecure contexts. */
export function newTalkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `talk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
