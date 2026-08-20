import type { Unit } from '../types'

/**
 * Quantity and unit extraction.
 *
 * Pure: takes the text left over after the intent phrase has been removed,
 * and returns the quantity, the unit, and the remaining text.
 */

/** Spoken and written variants mapped onto the canonical `Unit` values. */
export const UNIT_ALIASES: Readonly<Record<string, Unit>> = {
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
  bottle: 'bottle', bottles: 'bottle',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
  box: 'box', boxes: 'box',
  dozen: 'dozen', dozens: 'dozen',
  g: 'g', gram: 'g', grams: 'g', gm: 'g', gms: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l', ltr: 'l',
}

/** Longest alias first, so "ml" is never matched as "l". */
const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join('|')

/** "2 bottles of water", "500 ml milk", "1 kg rice" */
const NUMBER_WITH_UNIT = new RegExp(
  `\\b(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\b(?:\\s+of\\b)?`,
)

/** "a dozen eggs", "a pack of biscuits" */
const ARTICLE_WITH_UNIT = new RegExp(`\\ba\\s+(${UNIT_PATTERN})\\b(?:\\s+of\\b)?`)

/** "5 oranges", "3 apples" — a bare count with no unit. */
const BARE_NUMBER = /\b(\d+(?:\.\d+)?)\b/

export interface QuantityMatch {
  /** `null` when the command did not state a quantity. */
  quantity: number | null
  /** `null` for plain counts such as "5 oranges". */
  unit: Unit | null
  /** The text with the matched quantity and unit removed. */
  rest: string
}

/**
 * Extract a quantity and unit from a command fragment.
 *
 * Most specific pattern first: a number followed by a unit, then an article
 * followed by a unit, then a bare number. Each match removes only its own
 * tokens, leaving the rest of the text for item extraction.
 */
export function extractQuantity(text: string): QuantityMatch {
  const numberWithUnit = NUMBER_WITH_UNIT.exec(text)
  if (numberWithUnit) {
    return {
      quantity: Number(numberWithUnit[1]),
      unit: UNIT_ALIASES[numberWithUnit[2]],
      rest: text.replace(numberWithUnit[0], ' '),
    }
  }

  const articleWithUnit = ARTICLE_WITH_UNIT.exec(text)
  if (articleWithUnit) {
    return {
      quantity: 1,
      unit: UNIT_ALIASES[articleWithUnit[1]],
      rest: text.replace(articleWithUnit[0], ' '),
    }
  }

  const bareNumber = BARE_NUMBER.exec(text)
  if (bareNumber) {
    return {
      quantity: Number(bareNumber[1]),
      unit: null,
      rest: text.replace(bareNumber[0], ' '),
    }
  }

  return { quantity: null, unit: null, rest: text }
}
