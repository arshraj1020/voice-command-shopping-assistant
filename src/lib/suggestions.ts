import { effectivePrice } from '../data/catalog'
import { produceInSeason } from '../data/seasonal'
import { substitutesFor } from '../data/substitutes'
import { formatCurrency } from './currency'
import { toDisplayName } from './normalize'
import type { History, ListItem, Product, Suggestion } from '../types'

/**
 * Smart suggestions.
 *
 * Four independent generators — substitutes, history, sale, seasonal — merged,
 * deduplicated, and capped. Pure throughout: no React, no side effects, no
 * clock reads (the month is supplied by the caller), so the same inputs always
 * produce the same list.
 *
 * A spoken "alternative to milk" is served by the same substitute generator,
 * via `requestedFor` — there is one substitute implementation, not two.
 */

/** Never show more than this many cards at once. */
const MAX_SUGGESTIONS = 6

const MAX_SUBSTITUTES = 2
/** Alternatives shown when the user explicitly asked for them. */
const MAX_REQUESTED = 3
const MAX_HISTORY = 3
const MAX_SALE = 2
const MAX_SEASONAL = 2

/** Items suggested at least this often count as a routine purchase. */
const HISTORY_MIN_COUNT = 2

export interface SuggestionInput {
  items: readonly ListItem[]
  history: History
  catalog: readonly Product[]
  /** Month index, 0–11. Passed in so the engine stays deterministic. */
  month: number
  /**
   * Canonical name the user explicitly asked for alternatives to, via a
   * `substitute` command. Its alternatives outrank every other source, and —
   * unlike the automatic generator — the item need not be on the list.
   */
  requestedFor?: string | null
}

/* ------------------------------------------------------------------ */
/* Substitutes                                                         */
/* ------------------------------------------------------------------ */

/**
 * A product counts as unavailable only when *every* catalog entry for that
 * name is out of stock — if one brand still has it, there is nothing urgent
 * to tell the user.
 */
function unavailableProduct(
  name: string,
  catalog: readonly Product[],
): Product | null {
  const matches = catalog.filter((product) => product.name === name)
  if (matches.length === 0) return null
  if (matches.some((product) => product.inStock)) return null
  return matches[0]
}

/**
 * Alternatives for items already on the list.
 *
 * Out-of-stock items produce a prominent replacement; everything else
 * produces a softer "you might prefer" alternative. Both are offered as a
 * replacement action, so quantity and unit can be carried across.
 */
function substituteSuggestions(
  items: readonly ListItem[],
  catalog: readonly Product[],
  onList: ReadonlySet<string>,
): Suggestion[] {
  const urgent: Suggestion[] = []
  const preference: Suggestion[] = []

  for (const item of items) {
    const alternatives = substitutesFor(item.name)
    if (alternatives.length === 0) continue

    // Skip if the user already has one of the alternatives.
    const alternative = alternatives.find((option) => !onList.has(option.name))
    if (!alternative) continue

    const unavailable = unavailableProduct(item.name, catalog)

    const suggestion: Suggestion = {
      id: `substitute:${item.id}:${alternative.name}`,
      type: 'substitute',
      name: alternative.name,
      displayName: toDisplayName(alternative.name),
      reason: unavailable
        ? `${unavailable.brand} ${item.displayName} is out of stock — ${alternative.reason.toLowerCase()}`
        : `Instead of ${item.displayName.toLowerCase()} — ${alternative.reason.toLowerCase()}`,
      replacesItemId: item.id,
      urgent: unavailable !== null,
    }

    if (unavailable) urgent.push(suggestion)
    else preference.push(suggestion)
  }

  // Out-of-stock replacements always outrank preference alternatives.
  return [...urgent, ...preference].slice(0, MAX_SUBSTITUTES)
}

/**
 * Alternatives the user asked for out loud ("alternative to milk").
 *
 * Reuses the same substitute table and the same card shape as the automatic
 * generator. When the item happens to be on the list, `replacesItemId` is set
 * so the card offers **Replace** and carries the quantity across; otherwise it
 * is a plain **Add**.
 */
function requestedSubstituteSuggestions(
  requestedFor: string | null | undefined,
  items: readonly ListItem[],
  catalog: readonly Product[],
  onList: ReadonlySet<string>,
): Suggestion[] {
  if (!requestedFor) return []

  const alternatives = substitutesFor(requestedFor)
  if (alternatives.length === 0) return []

  const listed = items.find((item) => item.name === requestedFor)
  const displayName = listed ? listed.displayName : toDisplayName(requestedFor)
  const unavailable = unavailableProduct(requestedFor, catalog)

  return alternatives
    .filter((alternative) => !onList.has(alternative.name))
    .slice(0, MAX_REQUESTED)
    .map((alternative) => ({
      id: `requested:${requestedFor}:${alternative.name}`,
      type: 'substitute' as const,
      name: alternative.name,
      displayName: toDisplayName(alternative.name),
      reason: unavailable
        ? `${displayName} is out of stock — ${alternative.reason.toLowerCase()}`
        : `Instead of ${displayName.toLowerCase()} — ${alternative.reason.toLowerCase()}`,
      replacesItemId: listed?.id,
    }))
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

/**
 * Items bought routinely that are not on the list right now.
 *
 * Ranked by how often they are bought, then by how recently — no model, just
 * a deterministic sort.
 */
function historySuggestions(
  history: History,
  onList: ReadonlySet<string>,
): Suggestion[] {
  return Object.values(history)
    .filter((entry) => entry.count >= HISTORY_MIN_COUNT && !onList.has(entry.name))
    .sort((a, b) => b.count - a.count || b.lastAddedAt - a.lastAddedAt)
    .slice(0, MAX_HISTORY)
    .map((entry) => ({
      id: `history:${entry.name}`,
      type: 'history' as const,
      name: entry.name,
      displayName: toDisplayName(entry.name),
      reason: entry.count >= 3 ? 'You buy this often' : 'You usually buy this',
    }))
}

/* ------------------------------------------------------------------ */
/* Sale                                                                */
/* ------------------------------------------------------------------ */

/** Discounted catalog products, deepest discount first. */
function saleSuggestions(
  catalog: readonly Product[],
  onList: ReadonlySet<string>,
): Suggestion[] {
  return catalog
    .filter(
      (product) =>
        product.onSale &&
        product.salePrice !== null &&
        product.inStock &&
        !onList.has(product.name),
    )
    .sort((a, b) => {
      const discountA = 1 - effectivePrice(a) / a.price
      const discountB = 1 - effectivePrice(b) / b.price
      return discountB - discountA || a.name.localeCompare(b.name)
    })
    .slice(0, MAX_SALE)
    .map((product) => ({
      id: `sale:${product.id}`,
      type: 'sale' as const,
      name: product.name,
      displayName: `${product.brand} ${toDisplayName(product.name)}`,
      reason: `On sale — ${formatCurrency(effectivePrice(product))} (was ${formatCurrency(product.price)})`,
      productId: product.id,
    }))
}

/* ------------------------------------------------------------------ */
/* Seasonal                                                            */
/* ------------------------------------------------------------------ */

/** Produce in season this month that is not already on the list. */
function seasonalSuggestions(
  month: number,
  onList: ReadonlySet<string>,
): Suggestion[] {
  return produceInSeason(month)
    .filter((name) => !onList.has(name))
    .slice(0, MAX_SEASONAL)
    .map((name) => ({
      id: `seasonal:${name}`,
      type: 'seasonal' as const,
      name,
      displayName: toDisplayName(name),
      reason: 'In season now',
    }))
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the suggestion list.
 *
 * Sources are concatenated in priority order — requested substitute, automatic
 * substitute, history, sale, seasonal — then deduplicated by canonical name so
 * a product that qualifies under several sources appears once, under its most
 * useful reason.
 */
export function generateSuggestions({
  items,
  history,
  catalog,
  month,
  requestedFor,
}: SuggestionInput): Suggestion[] {
  const onList = new Set(items.map((item) => item.name))

  const candidates = [
    ...requestedSubstituteSuggestions(requestedFor, items, catalog, onList),
    ...substituteSuggestions(items, catalog, onList),
    ...historySuggestions(history, onList),
    ...saleSuggestions(catalog, onList),
    ...seasonalSuggestions(month, onList),
  ]

  const seen = new Set<string>()
  const suggestions: Suggestion[] = []

  for (const suggestion of candidates) {
    if (seen.has(suggestion.name)) continue
    seen.add(suggestion.name)
    suggestions.push(suggestion)
    if (suggestions.length === MAX_SUGGESTIONS) break
  }

  return suggestions
}
