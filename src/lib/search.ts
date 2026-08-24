import { CATALOG_BRANDS, effectivePrice } from '../data/catalog'
import type { LanguageRules } from '../data/lexicon'
import { formatCurrency } from './currency'
import {
  alternation,
  canonicalizeItemName,
  normalizeItemName,
  singularizeWord,
  toDisplayName,
} from './normalize'
import type {
  FilterChip,
  Product,
  ProductSize,
  ProductTag,
  SearchFilters,
} from '../types'

/**
 * Product search: filter extraction and the search engine itself.
 *
 * Pure throughout — no React, no DOM, no network. The catalog is never
 * mutated; every result is a new array.
 */

const NOT_WORD_AHEAD = '(?![\\p{L}\\p{M}\\p{N}])'

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/**
 * Spoken forms of each tag. Speech recognition returns "sugar free", the
 * catalog stores "sugar-free", and a user might type either.
 */
const TAG_ALIASES: Readonly<Record<ProductTag, readonly string[]>> = {
  organic: ['organic'],
  'sugar-free': ['sugar-free', 'sugar free', 'sugarfree', 'no sugar'],
  'whole-grain': ['whole-grain', 'whole grain', 'wholegrain', 'wholemeal'],
  'low-fat': ['low-fat', 'low fat', 'lowfat'],
  'gluten-free': ['gluten-free', 'gluten free', 'glutenfree'],
}

/** Brands are derived from the catalog, not hardcoded. */
function brandAliases(brand: string): string[] {
  const base = brand.toLowerCase().replace(/['’]/g, '')
  const spaced = base.replace(/-/g, ' ')
  return base === spaced ? [base] : [base, spaced]
}

const BRAND_LOOKUP: ReadonlyMap<string, string> = new Map(
  CATALOG_BRANDS.flatMap((brand) =>
    brandAliases(brand).map((alias) => [alias, brand] as const),
  ),
)

const TAG_LOOKUP: ReadonlyMap<string, ProductTag> = new Map(
  (Object.entries(TAG_ALIASES) as [ProductTag, readonly string[]][]).flatMap(
    ([tag, aliases]) => aliases.map((alias) => [alias, tag] as const),
  ),
)

/** Compiled once at module load rather than per search. */
const BRAND_PATTERN = new RegExp(
  `(^|\\s)(${alternation([...BRAND_LOOKUP.keys()])})${NOT_WORD_AHEAD}`,
  'u',
)

const TAG_PATTERN = new RegExp(
  `(^|\\s)(${alternation([...TAG_LOOKUP.keys()])})${NOT_WORD_AHEAD}`,
  'u',
)

/*
 * A money amount, written any of the ways a shopper might say it:
 * "₹500", "Rs 500", "Rs.500", "INR 500", "500 rupees", or a bare "500".
 * `\p{Sc}` covers every currency sign, so "$5" keeps working at no extra cost.
 */
const CURRENCY_PREFIX = '(?:\\p{Sc}|rs\\.?|inr)?\\s*'
const CURRENCY_SUFFIX =
  '(?:\\s*(?:rupees?|rupaye|rs|inr|dollars?|bucks?)(?![\\p{L}\\p{M}\\p{N}]))?'
const AMOUNT = `${CURRENCY_PREFIX}(\\d+(?:\\.\\d+)?)${CURRENCY_SUFFIX}`

const MAX_PRICE_PATTERN = new RegExp(
  `(?:under|below|less than|cheaper than|at most|up ?to|within)\\s*${AMOUNT}`,
  'u',
)
const MIN_PRICE_PATTERN = new RegExp(
  `(?:over|above|more than|at least|starting (?:at|from))\\s*${AMOUNT}`,
  'u',
)
const BETWEEN_PRICE_PATTERN = new RegExp(
  `between\\s*${AMOUNT}\\s*(?:and|to)\\s*${AMOUNT}`,
  'u',
)

/** Words that carry no meaning in a product query. */
const QUERY_NOISE: ReadonlySet<string> = new Set([
  'me', 'my', 'a', 'an', 'the', 'some', 'any', 'of', 'for', 'please',
  'product', 'products', 'item', 'items', 'something', 'anything',
  'that', 'is', 'are', 'with', 'in', 'and', 'priced', 'price', 'cost',
  'costing', 'costs', 'rupees', 'rupee', 'rs', 'inr', 'dollars', 'bucks',
])

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

/** Remove exactly the matched span, leaving a separating space behind. */
function withoutMatch(text: string, match: RegExpExecArray): string {
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
}

function extractPrice(text: string): {
  minPrice: number | null
  maxPrice: number | null
  rest: string
} {
  const between = BETWEEN_PRICE_PATTERN.exec(text)
  if (between) {
    const low = Number(between[1])
    const high = Number(between[2])
    return {
      minPrice: Math.min(low, high),
      maxPrice: Math.max(low, high),
      rest: withoutMatch(text, between),
    }
  }

  let rest = text
  let maxPrice: number | null = null
  let minPrice: number | null = null

  const max = MAX_PRICE_PATTERN.exec(rest)
  if (max) {
    maxPrice = Number(max[1])
    rest = withoutMatch(rest, max)
  }

  const min = MIN_PRICE_PATTERN.exec(rest)
  if (min) {
    minPrice = Number(min[1])
    rest = withoutMatch(rest, min)
  }

  return { minPrice, maxPrice, rest }
}

/**
 * "500ml", "1 l", "250 g" — a packaged size, not a quantity to buy.
 * Uses the active language's unit vocabulary, so Hindi units work too.
 */
function extractSize(
  text: string,
  rules: LanguageRules,
): { size: ProductSize | null; rest: string } {
  const pattern = new RegExp(
    `(^|\\s)(\\d+(?:\\.\\d+)?)\\s*(${alternation(Object.keys(rules.unitAliases))})${NOT_WORD_AHEAD}`,
    'u',
  )

  const match = pattern.exec(text)
  if (!match) return { size: null, rest: text }

  return {
    size: { value: Number(match[2]), unit: rules.unitAliases[match[3]] },
    rest: withoutMatch(text, match),
  }
}

function extractBrand(text: string): { brand: string | null; rest: string } {
  const match = BRAND_PATTERN.exec(text)
  if (!match) return { brand: null, rest: text }

  return {
    brand: BRAND_LOOKUP.get(match[2]) ?? null,
    rest: withoutMatch(text, match),
  }
}

function extractAttributes(text: string): {
  attributes: ProductTag[]
  rest: string
} {
  const attributes = new Set<ProductTag>()
  let rest = text
  let match = TAG_PATTERN.exec(rest)

  while (match) {
    const tag = TAG_LOOKUP.get(match[2])
    if (tag) attributes.add(tag)
    rest = withoutMatch(rest, match)
    match = TAG_PATTERN.exec(rest)
  }

  return { attributes: [...attributes], rest }
}

/**
 * Turn the text following a search verb into structured filters.
 *
 * Order matters and runs most-specific-first, each stage consuming its own
 * tokens: price, then size, then brand, then attributes. Whatever survives is
 * the product query.
 *
 * Price is consumed before anything else so the "500" in "under ₹500" can
 * never be mistaken for a size or a quantity.
 */
export function extractSearchFilters(
  text: string,
  rules: LanguageRules,
): SearchFilters {
  const price = extractPrice(text)
  const size = extractSize(price.rest, rules)
  const brand = extractBrand(size.rest)
  const tags = extractAttributes(brand.rest)

  const words = tags.rest
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !QUERY_NOISE.has(word))
    .filter((word) => !rules.fillerWords.includes(word))
    // Resolve spoken product names onto the catalog's English names, so a
    // Hindi search reaches the same products an English one does.
    .map((word) => rules.productAliases[word] ?? word)

  const query = words.join(' ').trim()

  return {
    query: query || null,
    brand: brand.brand,
    minPrice: price.minPrice,
    maxPrice: price.maxPrice,
    size: size.size,
    attributes: tags.attributes,
  }
}

/** True when the user actually asked for something. */
export function hasAnyFilter(filters: SearchFilters): boolean {
  return (
    filters.query !== null ||
    filters.brand !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.size !== null ||
    filters.attributes.length > 0
  )
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

/** Convert to a comparable base unit so 1 L matches 1000 ml. */
function toBaseSize(size: ProductSize): { unit: string; value: number } {
  switch (size.unit) {
    case 'l':
      return { unit: 'ml', value: size.value * 1000 }
    case 'ml':
      return { unit: 'ml', value: size.value }
    case 'kg':
      return { unit: 'g', value: size.value * 1000 }
    case 'g':
      return { unit: 'g', value: size.value }
    default:
      return { unit: size.unit, value: size.value }
  }
}

function sizesMatch(a: ProductSize, b: ProductSize): boolean {
  const left = toBaseSize(a)
  const right = toBaseSize(b)
  return left.unit === right.unit && Math.abs(left.value - right.value) < 0.001
}

/** Loose word match: exact, or a prefix in either direction for longer words. */
function wordsMatch(candidate: string, term: string): boolean {
  if (candidate === term) return true
  if (term.length >= 4 && candidate.startsWith(term)) return true
  return candidate.length >= 4 && term.startsWith(candidate)
}

function matchesQuery(product: Product, query: string | null): boolean {
  if (!query) return true

  const terms = canonicalizeItemName(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true

  const haystack = normalizeItemName(`${product.name} ${product.brand}`)
    .split(' ')
    .map(singularizeWord)

  return terms.every((term) =>
    haystack.some((candidate) => wordsMatch(candidate, term)),
  )
}

/**
 * Filter the catalog. Never mutates the input.
 *
 * Ordering is deliberately simple and deterministic: in-stock products first,
 * then cheapest first, then alphabetical. No ranking model.
 */
export function searchProducts(
  catalog: readonly Product[],
  filters: SearchFilters,
): Product[] {
  const matches = catalog.filter((product) => {
    if (!matchesQuery(product, filters.query)) return false
    if (filters.brand && product.brand !== filters.brand) return false

    const price = effectivePrice(product)
    if (filters.maxPrice !== null && price > filters.maxPrice) return false
    if (filters.minPrice !== null && price < filters.minPrice) return false

    if (filters.size) {
      if (!product.size || !sizesMatch(product.size, filters.size)) return false
    }

    return filters.attributes.every((tag) => product.tags.includes(tag))
  })

  return [...matches].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1

    const priceDelta = effectivePrice(a) - effectivePrice(b)
    if (priceDelta !== 0) return priceDelta

    return a.name.localeCompare(b.name)
  })
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

export function formatSize(size: ProductSize): string {
  return `${size.value} ${size.unit}`
}

/**
 * Describe the active filters as removable chips.
 *
 * This is what makes the voice parsing visible: the user can see exactly
 * which constraints were heard, and drop any one of them.
 */
export function describeFilters(filters: SearchFilters): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.query) {
    chips.push({ id: 'query', label: `“${filters.query}”`, field: 'query' })
  }
  if (filters.brand) {
    chips.push({ id: 'brand', label: filters.brand, field: 'brand' })
  }
  if (filters.maxPrice !== null) {
    chips.push({
      id: 'maxPrice',
      label: `Under ${formatCurrency(filters.maxPrice)}`,
      field: 'maxPrice',
    })
  }
  if (filters.minPrice !== null) {
    chips.push({
      id: 'minPrice',
      label: `Over ${formatCurrency(filters.minPrice)}`,
      field: 'minPrice',
    })
  }
  if (filters.size) {
    chips.push({ id: 'size', label: formatSize(filters.size), field: 'size' })
  }
  for (const tag of filters.attributes) {
    chips.push({
      id: `attribute:${tag}`,
      label: toDisplayName(tag.replace('-', ' ')),
      field: 'attribute',
      tag,
    })
  }

  return chips
}
