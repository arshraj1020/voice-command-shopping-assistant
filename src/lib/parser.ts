import { getLexicon, type LanguageRules } from '../data/lexicon'
import { isKnownItemName } from './categorize'
import {
  applyNumberWords,
  canonicalizeItemName,
  containsNonLatinLetters,
  normalizeText,
} from './normalize'
import {
  compileQuantityPatterns,
  extractQuantity,
  extractTargetQuantity,
  type QuantityPatterns,
} from './quantity'
import { extractSearchFilters, hasAnyFilter } from './search'
import type {
  CommandSource,
  Confidence,
  Intent,
  LangCode,
  ParsedCommand,
} from '../types'

/**
 * Rule-based command parser.
 *
 * normalize -> detect intent -> extract entities -> ParsedCommand.
 *
 * Pure: no React, no DOM, no network, no side effects. One shared pipeline
 * serves every language; the vocabulary comes from `data/lexicon.ts`.
 *
 * Intents are tested most-specific-first — help, clear, update, substitute,
 * remove, search, add — so that "remove everything" clears the list rather
 * than hunting for an item called "everything", "find an alternative to milk"
 * asks for a substitute rather than searching the catalog, and Hindi
 * "दूध नहीं चाहिए" removes rather than adds.
 *
 * A final fallback accepts an utterance with no command verb at all
 * ("two apples") when what is left resolves to a product the categoriser
 * recognises exactly.
 */

/** Beyond this, the "item" is almost certainly a misparse, not a product. */
const MAX_ITEM_WORDS = 4

/** Quantity patterns are compiled once per language, not once per command. */
const quantityCache = new Map<LangCode, QuantityPatterns>()

function quantityPatternsFor(rules: LanguageRules): QuantityPatterns {
  const cached = quantityCache.get(rules.code)
  if (cached) return cached

  const compiled = compileQuantityPatterns(rules)
  quantityCache.set(rules.code, compiled)
  return compiled
}

/**
 * Decide how much to trust an extracted item name.
 *
 * The parser prefers a false negative over a destructive false positive, so
 * anything that does not look like a single product is downgraded to `low`
 * and the execution layer refuses to touch the list.
 *
 *   - too many words     -> the sentence was not really a command
 *   - a leftover digit   -> a second quantity we did not account for
 *   - a conjunction      -> a multi-item command, not supported yet
 *   - unresolved script  -> see below
 */
function assessConfidence(
  item: string,
  rules: LanguageRules,
  source: CommandSource,
): Confidence {
  const words = item.split(' ')
  if (words.length > MAX_ITEM_WORDS) return 'low'
  if (/\d/.test(item)) return 'low'
  if (words.some((word) => rules.conjunctions.includes(word))) return 'low'

  /*
   * A *spoken* name that is still in a non-Latin script resolved to nothing
   * in the alias table, so it cannot be categorised or matched — and from a
   * transcript it is most likely a misrecognised word rather than a product.
   * Typed text is exempt: there the script is a deliberate choice, which is
   * also what lets the user confirm a staged transcript by sending it.
   */
  if (source === 'voice' && containsNonLatinLetters(item)) return 'low'

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

function matchFirst(
  patterns: readonly RegExp[],
  text: string,
): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match
  }
  return null
}

/** How many stacked politeness words to peel off: "ok so please add milk". */
const MAX_LEAD_NOISE_PASSES = 3

/**
 * Remove politeness and hesitation words from the front of an utterance.
 *
 * Every intent pattern is anchored to the start of the string, so a single
 * unexpected word in front of the verb would otherwise make the whole command
 * unreadable — and "um", "okay", "so" and "please" are exactly what speech
 * transcripts open with.
 *
 * Never empties the string: "please" on its own stays "please", and falls
 * through to `unknown` as it should.
 */
export function stripLeadNoise(text: string, rules: LanguageRules): string {
  const ordered = [...rules.leadNoise].sort((a, b) => b.length - a.length)
  let result = text

  for (let pass = 0; pass < MAX_LEAD_NOISE_PASSES; pass += 1) {
    const match = ordered.find(
      (noise) => result === noise || result.startsWith(`${noise} `),
    )
    if (!match) break

    const remainder = result.slice(match.length).trim()
    if (!remainder) break

    result = remainder
  }

  return result
}

/** Strip filler phrases and leading/trailing filler words. */
export function stripFillers(text: string, rules: LanguageRules): string {
  let result = ` ${text} `

  for (const phrase of [...rules.fillerPhrases].sort((a, b) => b.length - a.length)) {
    result = result.split(` ${phrase} `).join(' ')
  }

  const words = result.split(/\s+/).filter(Boolean)
  const isFiller = (word: string) => rules.fillerWords.includes(word)

  while (words.length > 0 && isFiller(words[0])) words.shift()
  while (words.length > 0 && isFiller(words[words.length - 1])) words.pop()

  return words.join(' ')
}

/**
 * Map a spoken product name onto its canonical English name, so that the
 * shopping list, categories, and history stay in one namespace whatever
 * language the command was given in.
 */
function resolveAliases(text: string, rules: LanguageRules): string {
  if (!text) return text

  const wholePhrase = rules.productAliases[text]
  if (wholePhrase) return wholePhrase

  return text
    .split(' ')
    .map((word) => rules.productAliases[word] ?? word)
    .join(' ')
}

/** Fillers removed, aliases resolved, then canonicalised for list matching. */
function finalizeItem(text: string, rules: LanguageRules): string {
  return canonicalizeItemName(resolveAliases(stripFillers(text, rules), rules))
}

/**
 * Build an add/remove command from the payload following the intent marker.
 * Returns `unknown` when no usable item survives extraction.
 */
function buildItemCommand(
  intent: Extract<Intent, 'add' | 'remove'>,
  payload: string,
  raw: string,
  rules: LanguageRules,
  source: CommandSource,
): ParsedCommand {
  const numeric = applyNumberWords(payload, rules.numberWords)
  const { quantity, unit, rest } = extractQuantity(numeric, quantityPatternsFor(rules))
  const item = finalizeItem(rest, rules)

  if (!item || rules.pronouns.includes(item)) return unknownCommand(raw, rules.code)

  return {
    intent,
    item,
    quantity,
    unit,
    filters: null,
    language: rules.code,
    raw,
    confidence: assessConfidence(item, rules, source),
  }
}

/**
 * Parse a typed or spoken command into a `ParsedCommand`.
 *
 * The same function serves the text input and the speech transcript, so both
 * paths behave identically once the words have been captured.
 */
export function parseCommand(
  raw: string,
  language: LangCode = 'en',
  source: CommandSource = 'text',
): ParsedCommand {
  const rules = getLexicon(language)
  const text = stripLeadNoise(normalizeText(raw), rules)
  if (!text) return unknownCommand(raw, rules.code)

  const base = { filters: null, language: rules.code, raw } as const
  const empty = { item: null, quantity: null, unit: null } as const

  if (matchFirst(rules.patterns.help, text)) {
    return { ...base, ...empty, intent: 'help', confidence: 'high' }
  }

  if (matchFirst(rules.patterns.clear, text)) {
    return { ...base, ...empty, intent: 'clear', confidence: 'high' }
  }

  const update = matchFirst(rules.patterns.update, text)
  if (update) {
    const payload = applyNumberWords(update[1] ?? '', rules.numberWords)
    const { quantity, rest } = extractTargetQuantity(payload)
    const item = finalizeItem(rest, rules)

    /*
     * An update needs a target quantity. Without one this was not an update,
     * so fall through rather than giving up — several markers are shared
     * between intents ("करो" ends both "सर्च करो" and "डिलीट करो"), and the
     * later rules resolve them correctly.
     */
    if (quantity !== null && item && !rules.pronouns.includes(item)) {
      return {
        ...base,
        intent: 'update',
        item,
        quantity,
        unit: null,
        confidence: assessConfidence(item, rules, source),
      }
    }
  }

  /*
   * Tested before search and add: "find an alternative to milk" and "get me a
   * substitute for milk" open with a search verb and an add verb respectively.
   * Falls through when no item survives, so a bare "alternative" is not a
   * command.
   */
  const substitute = matchFirst(rules.patterns.substitute, text)
  if (substitute) {
    const item = finalizeItem(substitute[1] ?? '', rules)

    if (item && !rules.pronouns.includes(item)) {
      return {
        ...base,
        intent: 'substitute',
        item,
        quantity: null,
        unit: null,
        confidence: assessConfidence(item, rules, source),
      }
    }
  }

  const remove = matchFirst(rules.patterns.remove, text)
  if (remove) return buildItemCommand('remove', remove[1] ?? '', raw, rules, source)

  const search = matchFirst(rules.patterns.search, text)
  if (search) {
    const filters = extractSearchFilters(search[1] ?? '', rules)

    // "find" on its own asks for nothing at all.
    if (!hasAnyFilter(filters)) return unknownCommand(raw, rules.code)

    return {
      ...base,
      intent: 'search',
      item: filters.query,
      quantity: null,
      unit: null,
      filters,
      confidence: 'high',
    }
  }

  const add = matchFirst(rules.patterns.add, text)
  if (add) return buildItemCommand('add', add[1] ?? '', raw, rules, source)

  /*
   * No command verb at all — "two apples", "2 kg rice", "a dozen eggs".
   * People phrase list items this way, and speech recognition drops leading
   * verbs often enough that refusing outright is the worse failure.
   *
   * The gate is deliberately narrow. What is left must resolve to a name the
   * categoriser recognises *exactly*; merely containing a keyword is not
   * enough, so "what about milk" and "do you have milk" stay `unknown` while
   * "milk" does not. Nonsense ("asdkjhasd") and questions ("what is the
   * weather") resolve to nothing and are refused.
   */
  const bare = buildItemCommand('add', text, raw, rules, source)
  if (
    bare.intent === 'add' &&
    bare.confidence === 'high' &&
    bare.item &&
    isKnownItemName(bare.item)
  ) {
    return bare
  }

  return unknownCommand(raw, rules.code)
}
