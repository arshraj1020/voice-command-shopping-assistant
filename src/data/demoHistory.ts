import { categorizeItem } from '../lib/categorize'
import type { History } from '../types'

/**
 * Seeded demo shopping history.
 *
 * A brand-new browser has no purchase history, which would leave the
 * recommendation feature invisible on first visit. This small, obviously
 * synthetic history is written once on first run so the feature can be seen
 * immediately.
 *
 * **This is demo data, not real user history** — it is disclosed in the README
 * and the user can clear it from the Suggestions panel. Once cleared it does
 * not come back: the storage layer distinguishes "never stored" from
 * "deliberately emptied".
 */
const DEMO_ENTRIES: readonly { name: string; count: number; daysAgo: number }[] = [
  { name: 'milk', count: 4, daysAgo: 2 },
  { name: 'bread', count: 3, daysAgo: 3 },
  { name: 'egg', count: 3, daysAgo: 5 },
  { name: 'banana', count: 2, daysAgo: 6 },
  { name: 'rice', count: 2, daysAgo: 9 },
  { name: 'apple', count: 2, daysAgo: 12 },
  { name: 'toothpaste', count: 2, daysAgo: 20 },
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Build the demo history relative to a supplied timestamp.
 *
 * Pure — the caller provides "now", so the result is deterministic.
 */
export function createDemoHistory(now: number): History {
  const history: History = {}

  for (const entry of DEMO_ENTRIES) {
    history[entry.name] = {
      name: entry.name,
      // Derived rather than hardcoded, so it can never drift from the
      // categoriser the rest of the app uses.
      category: categorizeItem(entry.name),
      count: entry.count,
      lastAddedAt: now - entry.daysAgo * DAY_MS,
    }
  }

  return history
}
