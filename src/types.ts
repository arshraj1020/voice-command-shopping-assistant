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

/**
 * One product the user has added before.
 *
 * `count` is the number of times the item was added, not the quantity — it is
 * a measure of how routinely the product is bought.
 */
export interface HistoryEntry {
  name: string
  category: Category
  count: number
  /** Epoch milliseconds. */
  lastAddedAt: number
}

/** Purchase history, keyed by canonical item name. */
export type History = Record<string, HistoryEntry>

/** Complete shopping-list state owned by the reducer. */
export interface ShoppingState {
  items: ListItem[]
  history: History
}

/* ------------------------------------------------------------------ */
/* Product catalog                                                     */
/* ------------------------------------------------------------------ */

/** Packaged size of a product, e.g. 500 ml or 1 kg. */
export interface ProductSize {
  value: number
  unit: Unit
}

/** Searchable product attributes. */
export type ProductTag =
  | 'organic'
  | 'sugar-free'
  | 'whole-grain'
  | 'low-fat'
  | 'gluten-free'

/**
 * A catalog entry.
 *
 * `name` follows the same canonical convention as `ListItem.name` — lowercase
 * and singular — so a product added from search merges with the list exactly
 * as a spoken "add" would.
 */
export interface Product {
  id: string
  name: string
  brand: string
  category: Category
  /** Regular shelf price. */
  price: number
  /** Discounted price when `onSale`, otherwise `null`. */
  salePrice: number | null
  onSale: boolean
  size: ProductSize | null
  tags: ProductTag[]
  inStock: boolean
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

/** Command language. Vocabulary for each code lives in `data/lexicon.ts`. */
export type LangCode = 'en' | 'hi'

/** How sure the parser is. Low-confidence commands are never executed. */
export type Confidence = 'high' | 'low'

/**
 * Where a command came from.
 *
 * Provenance changes how much the parser trusts an item name: a speech
 * transcript is a guess, while typed text — including a transcript the user
 * has read and deliberately sent — is an explicit instruction.
 */
export type CommandSource = 'voice' | 'text'

/** Filters carried by a search command. */
export interface SearchFilters {
  /** Free-text product terms left after every other filter is consumed. */
  query: string | null
  brand: string | null
  minPrice: number | null
  maxPrice: number | null
  size: ProductSize | null
  attributes: ProductTag[]
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

/** Which filter a chip represents, so the UI can remove exactly one. */
export type FilterField =
  | 'query'
  | 'brand'
  | 'minPrice'
  | 'maxPrice'
  | 'size'
  | 'attribute'

/** One removable filter chip. */
export interface FilterChip {
  id: string
  label: string
  field: FilterField
  /** Set only when `field` is `'attribute'`. */
  tag?: ProductTag
}

/** The active search, held outside the shopping list — search never edits it. */
export interface SearchState {
  filters: SearchFilters
  results: Product[]
}

/* ------------------------------------------------------------------ */
/* Smart suggestions                                                   */
/* ------------------------------------------------------------------ */

/** Why a product is being suggested. Each source stays distinct in the UI. */
export type SuggestionType = 'substitute' | 'history' | 'sale' | 'seasonal'

/** One recommendation shown to the user. */
export interface Suggestion {
  id: string
  type: SuggestionType
  /** Canonical name handed to `addItem()`. */
  name: string
  /** Title shown on the card — may include a brand. */
  displayName: string
  /** Shown verbatim under the title; a suggestion without a reason looks arbitrary. */
  reason: string
  /** Catalog product this came from, when there is one. */
  productId?: string
  /** Set on substitutes: the list item this would replace. */
  replacesItemId?: string
  /** True when the original product is out of stock, so the card is prominent. */
  urgent?: boolean
}

/* ------------------------------------------------------------------ */
/* Voice input                                                         */
/* ------------------------------------------------------------------ */

/**
 * Microphone lifecycle.
 *
 * `unsupported` and `denied` are terminal until the user changes something
 * outside the app; every other state resolves back to `idle`.
 */
export type MicStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'unsupported'
  | 'denied'
  | 'error'
