/**
 * Curated product alternatives.
 *
 * A small hand-written map rather than anything inferred: the assignment asks
 * for substitutes when a product is unavailable or when the user might prefer
 * another option, and a short curated list is both predictable and honest.
 *
 * Every substitute name is chosen so the existing categoriser files it
 * correctly — "oat milk" lands in Dairy, "popcorn" in Snacks.
 */

export interface Substitute {
  /** Canonical name of the alternative. */
  name: string
  /** Shown on the suggestion card. */
  reason: string
}

export const SUBSTITUTES: Readonly<Record<string, readonly Substitute[]>> = {
  milk: [
    { name: 'almond milk', reason: 'Dairy-free alternative' },
    { name: 'oat milk', reason: 'Dairy-free alternative' },
    { name: 'soy milk', reason: 'Dairy-free alternative' },
  ],
  butter: [
    { name: 'vegan butter', reason: 'Dairy-free alternative' },
    { name: 'ghee', reason: 'Traditional alternative' },
  ],
  bread: [{ name: 'whole grain bread', reason: 'Higher-fibre option' }],
  coke: [{ name: 'diet coke', reason: 'Sugar-free option' }],
  sugar: [{ name: 'honey', reason: 'Natural sweetener' }],
  chips: [{ name: 'popcorn', reason: 'Lighter snack' }],
  yogurt: [{ name: 'curd', reason: 'Similar dairy option' }],
  soap: [{ name: 'body wash', reason: 'Alternative format' }],
  rice: [{ name: 'pasta', reason: 'Alternative staple' }],
  cereal: [{ name: 'oats', reason: 'Whole-grain option' }],
  'orange juice': [{ name: 'fresh orange', reason: 'Less sugar than juice' }],
  'dish soap': [{ name: 'dishwasher tablets', reason: 'Alternative format' }],
}

/** Alternatives for a canonical item name, or an empty list. */
export function substitutesFor(name: string): readonly Substitute[] {
  return SUBSTITUTES[name] ?? []
}
