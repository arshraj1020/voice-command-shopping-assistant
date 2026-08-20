import { CATEGORY_ORDER } from '../data/categories'
import { categorizeItem } from './categorize'
import { createId } from './id'
import { normalizeItemName, toDisplayName } from './normalize'
import type { Category, ListItem, Unit } from '../types'

/** Versioned so a future schema change cannot be fed stale data. */
export const STORAGE_KEY = 'vcsa.list.v1'

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
