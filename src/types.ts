/**
 * Shared application types.
 *
 * Extended in later phases with the product catalog and suggestion models.
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

/* ------------------------------------------------------------------ */
/* Command parsing                                                     */
/* ------------------------------------------------------------------ */

/** What the user asked the app to do. */
export type Intent =
  | 'add'
  | 'remove'
  | 'update'
  | 'clear'
  | 'search'
  | 'help'
  | 'unknown'

/**
 * Command language. Only English is parsed today; the multilingual phase
 * adds further codes and the matching keyword tables.
 */
export type LangCode = 'en'

/** How sure the parser is. Low-confidence commands are never executed. */
export type Confidence = 'high' | 'low'

/**
 * Filters carried by a search command.
 * Populated by the voice-search phase — always `null` today.
 */
export interface SearchFilters {
  query: string | null
  brand: string | null
  maxPrice: number | null
  size: { value: number; unit: Unit } | null
}

/** The result of parsing one typed or spoken command. */
export interface ParsedCommand {
  intent: Intent
  /** Canonical item name, or the raw query for a search. `null` if none. */
  item: string | null
  /** `null` when the command did not state a quantity. */
  quantity: number | null
  unit: Unit | null
  filters: SearchFilters | null
  language: LangCode
  /** The original input, always preserved so the UI can show what was heard. */
  raw: string
  confidence: Confidence
}

/** Outcome of executing a parsed command against the shopping list. */
export interface CommandResult {
  command: ParsedCommand
  status: 'success' | 'info' | 'error'
  message: string
}
