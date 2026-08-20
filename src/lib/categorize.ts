import { KEYWORD_ENTRIES } from '../data/categories'
import { normalizeItemName, singularizePhrase } from './normalize'
import type { Category } from '../types'

/**
 * Keyword table extended with singular forms, so that a canonicalised item
 * name ("grape", "almond", "paper towel") still matches a keyword that was
 * only written in the plural.
 *
 * Sorted longest-first so the most specific keyword wins — this is what keeps
 * "ice cream" out of Dairy and "dish soap" out of Personal Care.
 */
const MATCH_ENTRIES: readonly (readonly [string, Category])[] = (() => {
  const seen = new Set<string>()
  const entries: (readonly [string, Category])[] = []

  for (const [keyword, category] of KEYWORD_ENTRIES) {
    for (const form of [keyword, singularizePhrase(keyword)]) {
      if (seen.has(form)) continue
      seen.add(form)
      entries.push([form, category] as const)
    }
  }

  return entries.sort((a, b) => b[0].length - a[0].length)
})()

/** True when `keyword` appears in `name` as a whole word or phrase. */
function containsPhrase(name: string, keyword: string): boolean {
  const index = name.indexOf(keyword)
  if (index === -1) return false

  const before = index === 0 ? ' ' : name[index - 1]
  const afterIndex = index + keyword.length
  const after = afterIndex >= name.length ? ' ' : name[afterIndex]

  return !/[\p{L}\p{M}\p{N}]/u.test(before) && !/[\p{L}\p{M}\p{N}]/u.test(after)
}

/**
 * Resolve an item name to a category.
 *
 * Pure: no React, no DOM, no side effects. Falls back to `'other'`
 * whenever nothing matches.
 *
 * Matching order — most specific first:
 *   1. exact match on the whole normalised name
 *   2. exact match on its singular form
 *   3. whole-word/phrase match anywhere in the name (longest keyword wins)
 *   4. whole-word match on individual singularised words
 */
export function categorizeItem(itemName: string): Category {
  const name = normalizeItemName(itemName)
  if (!name) return 'other'

  const singularName = singularizePhrase(name)

  for (const [keyword, category] of MATCH_ENTRIES) {
    if (keyword === name || keyword === singularName) return category
  }

  for (const [keyword, category] of MATCH_ENTRIES) {
    if (containsPhrase(name, keyword) || containsPhrase(singularName, keyword)) {
      return category
    }
  }

  const words = name.split(' ').map((word) => singularizePhrase(word))
  for (const [keyword, category] of MATCH_ENTRIES) {
    if (words.includes(keyword)) return category
  }

  return 'other'
}
