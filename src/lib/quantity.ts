import { alternation } from './normalize'
import type { Unit } from '../types'

/**
 * Quantity and unit extraction.
 *
 * Pure: takes the text left over after the intent marker has been removed,
 * and returns the quantity, the unit, and the remaining text.
 *
 * Patterns are compiled once per language rather than per command, and use
 * script-agnostic boundaries so Hindi unit words match as reliably as English
 * ones.
 */

export interface QuantityVocabulary {
  unitAliases: Readonly<Record<string, Unit>>
  articles: readonly string[]
  connectors: readonly string[]
}

export interface QuantityPatterns {
  /** "2 bottles of water", "500 ml milk", "दो लीटर दूध" */
  numberWithUnit: RegExp
  /** "a dozen eggs" — absent for languages with no article form. */
  articleWithUnit: RegExp | null
  /** "5 oranges" — a bare count with no unit. */
  bareNumber: RegExp
  aliases: Readonly<Record<string, Unit>>
}

export interface QuantityMatch {
  /** `null` when the command did not state a quantity. */
  quantity: number | null
  /** `null` for plain counts such as "5 oranges". */
  unit: Unit | null
  /** The text with the matched quantity and unit removed. */
  rest: string
}

const NOT_WORD_AHEAD = '(?![\\p{L}\\p{M}\\p{N}])'

export function compileQuantityPatterns(
  vocabulary: QuantityVocabulary,
): QuantityPatterns {
  const units = alternation(Object.keys(vocabulary.unitAliases))
  const connector = vocabulary.connectors.length
    ? `(?:\\s+(?:${alternation(vocabulary.connectors)})${NOT_WORD_AHEAD})?`
    : ''

  return {
    numberWithUnit: new RegExp(
      `(^|\\s)(\\d+(?:\\.\\d+)?)\\s*(${units})${NOT_WORD_AHEAD}${connector}`,
      'u',
    ),
    articleWithUnit: vocabulary.articles.length
      ? new RegExp(
          `(^|\\s)(?:${alternation(vocabulary.articles)})\\s+(${units})${NOT_WORD_AHEAD}${connector}`,
          'u',
        )
      : null,
    bareNumber: new RegExp(`(^|\\s)(\\d+(?:\\.\\d+)?)${NOT_WORD_AHEAD}`, 'u'),
    aliases: vocabulary.unitAliases,
  }
}

/** Remove exactly the matched span, leaving a separating space behind. */
function withoutMatch(text: string, match: RegExpExecArray): string {
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
}

/**
 * Extract a quantity and unit from a command fragment.
 *
 * Most specific pattern first: a number followed by a unit, then an article
 * followed by a unit, then a bare number. Each match removes only its own
 * tokens, leaving the rest of the text for item extraction.
 */
export function extractQuantity(
  text: string,
  patterns: QuantityPatterns,
): QuantityMatch {
  const numberWithUnit = patterns.numberWithUnit.exec(text)
  if (numberWithUnit) {
    return {
      quantity: Number(numberWithUnit[2]),
      unit: patterns.aliases[numberWithUnit[3]],
      rest: withoutMatch(text, numberWithUnit),
    }
  }

  if (patterns.articleWithUnit) {
    const articleWithUnit = patterns.articleWithUnit.exec(text)
    if (articleWithUnit) {
      return {
        quantity: 1,
        unit: patterns.aliases[articleWithUnit[2]],
        rest: withoutMatch(text, articleWithUnit),
      }
    }
  }

  const bareNumber = patterns.bareNumber.exec(text)
  if (bareNumber) {
    return {
      quantity: Number(bareNumber[2]),
      unit: null,
      rest: withoutMatch(text, bareNumber),
    }
  }

  return { quantity: null, unit: null, rest: text }
}

/**
 * Take the *last* number in a fragment — the target quantity of an update.
 *
 * "change 2 apples to 5" means five, not two, so the trailing number wins.
 */
export function extractTargetQuantity(text: string): {
  quantity: number | null
  rest: string
} {
  const pattern = /\d+(?:\.\d+)?/g
  let last: RegExpExecArray | null = null
  let current: RegExpExecArray | null = pattern.exec(text)

  while (current !== null) {
    last = current
    current = pattern.exec(text)
  }

  if (!last) return { quantity: null, rest: text }

  return {
    quantity: Number(last[0]),
    rest: `${text.slice(0, last.index)} ${text.slice(last.index + last[0].length)}`,
  }
}
