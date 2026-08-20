import { canonicalizeItemName, normalizeText } from './normalize'
import { extractQuantity } from './quantity'
import type { Confidence, Intent, LangCode, ParsedCommand } from '../types'

/**
 * Rule-based command parser.
 *
 * normalize -> detect intent -> extract entities -> ParsedCommand.
 *
 * Pure: no React, no DOM, no network, no side effects. Rules are ordered so
 * that the most specific phrasing wins, and anything that cannot be matched
 * confidently becomes `unknown` rather than a guess.
 */

/** Checked first: these must beat the generic "remove"/"add" rules. */
const HELP_PATTERNS: readonly RegExp[] = [
  /^help$/,
  /^help me$/,
  /^commands$/,
  /^(?:show|list)(?: me)? (?:the )?commands$/,
  /^what can (?:i|you) (?:say|do)$/,
  /^what commands (?:are there|can i use)$/,
  /^how (?:do|does) (?:this|it) work$/,
]

/** Anchored end-to-end so "remove all the milk" is not read as "clear". */
const CLEAR_PATTERNS: readonly RegExp[] = [
  /^(?:clear|empty|reset|wipe|delete|remove)\s+(?:my\s+|the\s+)?(?:whole\s+)?(?:shopping\s+)?list$/,
  /^(?:clear|empty|reset|wipe)\s+everything$/,
  /^(?:remove|delete)\s+everything$/,
  /^(?:remove|delete|clear)\s+all(?:\s+items)?$/,
  /^start\s+(?:a\s+)?new\s+list$/,
]

/** Group 1 = item, group 2 = new quantity. */
const UPDATE_PATTERNS: readonly RegExp[] = [
  /^(?:change|update|set)\b(.*?)\bquantity to (\d+(?:\.\d+)?)$/,
  /^(?:change|update|set)\b(.*?)\bto (\d+(?:\.\d+)?)$/,
  /^make\b(.*?)\b(\d+(?:\.\d+)?)$/,
]

/** Group 1 = item text. */
const REMOVE_PATTERNS: readonly RegExp[] = [
  /^take\b(.*?)\boff (?:my |the )?(?:shopping )?list$/,
  /^take\b(.*?)\boff$/,
  /^(?:remove|delete|drop)\b(.*?)\bfrom (?:my |the )?(?:shopping )?list$/,
  /^cross off\b(.*)$/,
  /^i do not (?:need|want)\b(.*)$/,
  /^(?:remove|delete|drop)\b(.*)$/,
]

/** Group 1 = search query. Intent only — execution arrives with voice search. */
const SEARCH_PATTERNS: readonly RegExp[] = [
  /^(?:search for|look for|find|search)\b(.*)$/,
]

/** Group 1 = item text. Ordered longest-phrase-first. */
const ADD_PATTERNS: readonly RegExp[] = [
  /^i want to buy\b(.*)$/,
  /^i would like to buy\b(.*)$/,
  /^i would like\b(.*)$/,
  /^i am out of\b(.*)$/,
  /^we are out of\b(.*)$/,
  /^i want\b(.*)$/,
  /^i need\b(.*)$/,
  /^we need\b(.*)$/,
  /^out of\b(.*)$/,
  /^put\b(.*?)\bon (?:my |the )?(?:shopping )?list$/,
  /^add\b(.*?)\bto (?:my |the )?(?:shopping )?list$/,
  /^(?:add|buy|get|grab|purchase|order|need|pick up)\b(.*)$/,
]

/** Removed from anywhere in the item text. Longest first. */
const FILLER_PHRASES: readonly string[] = [
  'to my shopping list', 'from my shopping list', 'on my shopping list',
  'to the shopping list', 'off my shopping list', 'my shopping list',
  'to my list', 'from my list', 'on my list', 'off my list', 'in my list',
  'to the list', 'from the list', 'on the list', 'off the list',
  'shopping list', 'my list', 'the list', 'for me', 'as well', 'please',
]

/** Trimmed from the start and end of the item text. */
const FILLER_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'some', 'any', 'of', 'me', 'my', 'to', 'for', 'and',
  'more', 'extra', 'all', 'up', 'list', 'also', 'please',
])

/** Items that resolve to a pronoun are ambiguous — never act on them. */
const PRONOUNS: ReadonlySet<string> = new Set([
  'it', 'that', 'this', 'them', 'those', 'these', 'one',
])

/** Beyond this, the "item" is almost certainly a misparse, not a product. */
const MAX_ITEM_WORDS = 4

/**
 * Decide how much to trust an extracted item name.
 *
 * The parser prefers a false negative over a destructive false positive, so
 * anything that does not look like a single product is downgraded to `low`
 * and the execution layer refuses to touch the list.
 *
 *   - too many words  -> the sentence was not really a command
 *   - a leftover digit -> a second quantity we did not account for
 *   - "and"            -> a multi-item command, not supported yet
 */
function assessConfidence(item: string): Confidence {
  const words = item.split(' ')
  if (words.length > MAX_ITEM_WORDS) return 'low'
  if (/\d/.test(item)) return 'low'
  if (words.includes('and')) return 'low'
  return 'high'
}

function unknownCommand(raw: string, language: LangCode): ParsedCommand {
  return {
    intent: 'unknown',
    item: null,
    quantity: null,
    unit: null,
    filters: null,
    language,
    raw,
    confidence: 'low',
  }
}

function matchFirst(patterns: readonly RegExp[], text: string): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match
  }
  return null
}

/** Strip filler phrases and leading/trailing filler words. */
export function stripFillers(text: string): string {
  let result = ` ${text} `

  for (const phrase of FILLER_PHRASES) {
    result = result.split(` ${phrase} `).join(' ')
  }

  const words = result.split(/\s+/).filter(Boolean)
  while (words.length > 0 && FILLER_WORDS.has(words[0])) words.shift()
  while (words.length > 0 && FILLER_WORDS.has(words[words.length - 1])) words.pop()

  return words.join(' ')
}

/**
 * Build an add/remove command from the text following the intent phrase.
 * Returns `unknown` when no usable item survives extraction.
 */
function buildItemCommand(
  intent: Extract<Intent, 'add' | 'remove'>,
  payload: string,
  raw: string,
  language: LangCode,
): ParsedCommand {
  const { quantity, unit, rest } = extractQuantity(payload)
  const item = canonicalizeItemName(stripFillers(rest))

  if (!item || PRONOUNS.has(item)) return unknownCommand(raw, language)

  return {
    intent,
    item,
    quantity,
    unit,
    filters: null,
    language,
    raw,
    confidence: assessConfidence(item),
  }
}

/**
 * Parse a typed or spoken command into a `ParsedCommand`.
 *
 * The same function serves the text input today and the speech transcript in
 * a later phase, so both paths behave identically.
 */
export function parseCommand(raw: string, language: LangCode = 'en'): ParsedCommand {
  const text = normalizeText(raw)
  if (!text) return unknownCommand(raw, language)

  const base = { filters: null, language, raw } as const

  if (matchFirst(HELP_PATTERNS, text)) {
    return { ...base, intent: 'help', item: null, quantity: null, unit: null, confidence: 'high' }
  }

  if (matchFirst(CLEAR_PATTERNS, text)) {
    return { ...base, intent: 'clear', item: null, quantity: null, unit: null, confidence: 'high' }
  }

  const update = matchFirst(UPDATE_PATTERNS, text)
  if (update) {
    const item = canonicalizeItemName(stripFillers(update[1] ?? ''))
    const quantity = Number(update[2])

    if (!item || PRONOUNS.has(item) || !Number.isFinite(quantity)) {
      return unknownCommand(raw, language)
    }

    return {
      ...base,
      intent: 'update',
      item,
      quantity,
      unit: null,
      confidence: assessConfidence(item),
    }
  }

  const remove = matchFirst(REMOVE_PATTERNS, text)
  if (remove) return buildItemCommand('remove', remove[1] ?? '', raw, language)

  const search = matchFirst(SEARCH_PATTERNS, text)
  if (search) {
    const query = stripFillers(search[1] ?? '')
    if (!query) return unknownCommand(raw, language)
    return { ...base, intent: 'search', item: query, quantity: null, unit: null, confidence: 'high' }
  }

  const add = matchFirst(ADD_PATTERNS, text)
  if (add) return buildItemCommand('add', add[1] ?? '', raw, language)

  return unknownCommand(raw, language)
}
