import { KEYWORD_ENTRIES } from '../data/categories'
import type { Category } from '../types'

/**
 * Canonical form of an item name: lowercase, punctuation removed,
 * whitespace collapsed. Used both for categorisation and for matching
 * items already on the list.
 */
export function normalizeItemName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Title-cased name for display. */
export function toDisplayName(raw: string): string {
  return normalizeItemName(raw)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Naive English singulariser. Good enough for grocery nouns. */
function singularize(word: string): string {
  if (word.length <= 3 || word.endsWith('ss')) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('es') && /(ch|sh|x|z|s)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

/** True when `keyword` appears in `name` as a whole word or phrase. */
function containsPhrase(name: string, keyword: string): boolean {
  const index = name.indexOf(keyword)
  if (index === -1) return false

  const before = index === 0 ? ' ' : name[index - 1]
  const afterIndex = index + keyword.length
  const after = afterIndex >= name.length ? ' ' : name[afterIndex]

  return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)
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
 *   4. singular whole-word match on individual words
 */
export function categorizeItem(itemName: string): Category {
  const name = normalizeItemName(itemName)
  if (!name) return 'other'

  const singularName = singularize(name)

  for (const [keyword, category] of KEYWORD_ENTRIES) {
    if (keyword === name || keyword === singularName) return category
  }

  for (const [keyword, category] of KEYWORD_ENTRIES) {
    if (containsPhrase(name, keyword)) return category
  }

  const words = name.split(' ').map(singularize)
  for (const [keyword, category] of KEYWORD_ENTRIES) {
    if (words.includes(keyword)) return category
  }

  return 'other'
}
