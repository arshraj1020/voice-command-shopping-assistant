/**
 * Shared application types.
 *
 * Extended in later phases with the product catalog, parsed voice
 * commands, and suggestion models.
 */

/** Aisle-style grouping used to organise the shopping list. */
export type Category =
  | 'produce'
  | 'dairy'
  | 'bakery'
  | 'meat'
  | 'pantry'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'household'
  | 'personal-care'
  | 'other'

/** Measurement units understood by the app. `null` means a plain count. */
export type Unit =
  | 'piece'
  | 'bottle'
  | 'can'
  | 'pack'
  | 'box'
  | 'dozen'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'

/** A single row on the shopping list. */
export interface ListItem {
  /** Stable unique identifier. */
  id: string
  /** Canonical lowercase name. Used to match and merge items. */
  name: string
  /** Human-readable name shown in the UI. */
  displayName: string
  /** Always >= 1 while the item is on the list. */
  quantity: number
  /** Unit of measure, or `null` when the item is simply counted. */
  unit: Unit | null
  category: Category
  checked: boolean
  /** Epoch milliseconds. */
  addedAt: number
}

/** Complete shopping-list state owned by the reducer. */
export interface ShoppingState {
  items: ListItem[]
}
