import { CATEGORY_ORDER } from '../data/categories'
import { isLangCode } from '../data/lexicon'
import { categorizeItem } from './categorize'
import { createId } from './id'
import { normalizeItemName, toDisplayName } from './normalize'
import type { Category, History, LangCode, ListItem, Unit } from '../types'

/** Versioned so a future schema change cannot be fed stale data. */
export const STORAGE_KEY = 'vcsa.list.v1'
export const LANGUAGE_KEY = 'vcsa.language.v1'
export const HISTORY_KEY = 'vcsa.history.v1'

const VALID_UNITS = [
  'piece', 'bottle', 'can', 'pack', 'box', 'dozen', 'g', 'kg', 'ml', 'l',
] as const satisfies readonly Unit[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toUnit(value: unknown): Unit | null {
  return VALID_UNITS.includes(value as Unit) ? (value as Unit) : null
}

function toCategory(value: unknown, name: string): Category {
  return CATEGORY_ORDER.includes(value as Category)
    ? (value as Category)
    : categorizeItem(name)
}

/**
 * Rebuild a trusted `ListItem` from untrusted stored data.
 * Returns `null` when the entry is too damaged to be useful.
 */
function sanitizeItem(value: unknown): ListItem | null {
  if (!isRecord(value)) return null
  if (typeof value.name !== 'string') return null

  const name = normalizeItemName(value.name)
  if (!name) return null

  const quantity =
    typeof value.quantity === 'number' && Number.isFinite(value.quantity)
      ? Math.max(1, Math.floor(value.quantity))
      : 1

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId(),
    name,
    displayName:
      typeof value.displayName === 'string' && value.displayName
        ? value.displayName
        : toDisplayName(name),
    quantity,
    unit: toUnit(value.unit),
    category: toCategory(value.category, name),
    checked: value.checked === true,
    addedAt:
      typeof value.addedAt === 'number' && Number.isFinite(value.addedAt)
        ? value.addedAt
        : Date.now(),
  }
}

/**
 * Pure parser for stored list data. Any malformed input yields an empty
 * list rather than throwing, so corrupted storage can never crash the app.
 */
export function parseStoredItems(raw: string | null): ListItem[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map(sanitizeItem)
    .filter((item): item is ListItem => item !== null)
}

/** Read the saved list. Returns an empty list if storage is unavailable. */
export function loadItems(): ListItem[] {
  try {
    return parseStoredItems(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    // Storage can throw in private-browsing modes. Start empty and continue.
    return []
  }
}

/** Persist the list. Failures are ignored so the app keeps working in memory. */
export function saveItems(items: readonly ListItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Quota exceeded or storage disabled — nothing useful to do here.
  }
}

/* ------------------------------------------------------------------ */
/* Shopping history                                                    */
/* ------------------------------------------------------------------ */

function sanitizeHistoryEntry(value: unknown): History[string] | null {
  if (!isRecord(value)) return null
  if (typeof value.name !== 'string') return null

  const name = normalizeItemName(value.name)
  if (!name) return null

  const count =
    typeof value.count === 'number' && Number.isFinite(value.count)
      ? Math.max(1, Math.floor(value.count))
      : 1

  return {
    name,
    category: toCategory(value.category, name),
    count,
    lastAddedAt:
      typeof value.lastAddedAt === 'number' && Number.isFinite(value.lastAddedAt)
        ? value.lastAddedAt
        : Date.now(),
  }
}

/**
 * Pure parser for stored history.
 *
 * Returns `null` when there is nothing usable stored — which the provider
 * treats as "seed the demo history". An explicitly emptied history parses to
 * `{}` instead, so clearing it makes the seed stay gone.
 */
export function parseStoredHistory(raw: string | null): History | null {
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  const history: History = {}
  for (const value of Object.values(parsed)) {
    const entry = sanitizeHistoryEntry(value)
    if (entry) history[entry.name] = entry
  }

  return history
}

/** Read the saved history, or `null` when nothing has ever been stored. */
export function loadHistory(): History | null {
  try {
    return parseStoredHistory(window.localStorage.getItem(HISTORY_KEY))
  } catch {
    return null
  }
}

export function saveHistory(history: History): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable — history simply will not survive a reload.
  }
}

/** Read the saved command language, falling back to English. */
export function loadLanguage(): LangCode {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY)
    return isLangCode(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

export function saveLanguage(language: LangCode): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Storage unavailable — the choice simply will not survive a reload.
  }
}
