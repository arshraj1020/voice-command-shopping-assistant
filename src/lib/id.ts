/**
 * Stable unique identifiers for list items.
 *
 * `crypto.randomUUID` is only available in secure contexts (HTTPS and
 * localhost), so a short fallback keeps the app working when the page is
 * served over plain HTTP.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
