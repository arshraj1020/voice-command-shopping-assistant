/**
 * Text normalisation.
 *
 * Pure string helpers shared by the command parser and the shopping list.
 * No React, no DOM, no side effects.
 *
 * Every character class here includes `\p{M}` (combining marks) alongside
 * `\p{L}`. Devanagari vowel signs are marks, not letters, so omitting them
 * would silently destroy Hindi words.
 */

/** Contractions and common shorthand, expanded before punctuation is stripped. */
const CONTRACTIONS: Readonly<Record<string, string>> = {
  "i'm": 'i am',
  im: 'i am',
  "i've": 'i have',
  "i'd": 'i would',
  "i'll": 'i will',
  "we're": 'we are',
  "we've": 'we have',
  "you're": 'you are',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "let's": 'let us',
  "don't": 'do not',
  dont: 'do not',
  "doesn't": 'does not',
  doesnt: 'does not',
  "didn't": 'did not',
  "can't": 'cannot',
  cant: 'cannot',
  "won't": 'will not',
  wont: 'will not',
  "shouldn't": 'should not',
  "wouldn't": 'would not',
  "isn't": 'is not',
  "aren't": 'are not',
  gimme: 'give me',
  lemme: 'let me',
  wanna: 'want to',
  gonna: 'going to',
}

/**
 * Nouns that are normally written in the plural. Singularising these produces
 * awkward names ("chip", "oat"), so they are left alone.
 */
const INVARIANT_PLURALS: ReadonlySet<string> = new Set([
  'chips', 'crisps', 'oats', 'peas', 'beans', 'lentils', 'nuts', 'noodles',
  'tissues', 'greens', 'groceries', 'scissors', 'clothes', 'jeans', 'grapes',
])

/**
 * Words that carry no meaning when a transcript *ends* on them.
 *
 * Speech recognition hallucinates a continuation when audio is cut off
 * mid-utterance — "add water bottle with" is the classic shape. Trimming is
 * deliberately trailing-only, so a legitimate command that merely contains one
 * of these ("add mac and cheese", "take eggs off my list") is never damaged.
 */
const TRAILING_FILLERS: ReadonlySet<string> = new Set([
  'with', 'and', 'to', 'for', 'of', 'the', 'a', 'an', 'in', 'on', 'at',
  'from', 'by', 'or', 'but', 'so', 'that', 'is', 'it', 'my', 'me',
  'please', 'um', 'uh', 'er', 'ah', 'like',
])

/** Longest repeated tail we will collapse, in words. */
const MAX_REPEAT_WINDOW = 4

/** Escape a literal string for safe use inside a regular expression. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a regex alternation from literal strings, longest first so the most
 * specific match always wins.
 */
export function alternation(values: readonly string[]): string {
  return [...values]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
}

export function expandContractions(text: string): string {
  return text.replace(/[a-z]+(?:'[a-z]+)*/g, (word) => CONTRACTIONS[word] ?? word)
}

/**
 * Replace spelled-out numbers with digits, using the supplied vocabulary.
 *
 * Applied to the command payload *after* the intent marker has been removed.
 * Doing it earlier would corrupt markers that contain a number word — Hindi
 * "कर दो" ("make it") ends in "दो", which also means "two".
 */
export function applyNumberWords(
  text: string,
  numberWords: Readonly<Record<string, number>>,
): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (word) =>
    word in numberWords ? String(numberWords[word]) : word,
  )
}

/** Devanagari digits (०-९) mapped onto ASCII. */
function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x0966),
  )
}

/**
 * Full normalisation pipeline for a spoken or typed command.
 *
 * lowercase -> expand contractions -> strip punctuation -> normalise digits
 * -> collapse whitespace.
 *
 * Currency symbols (`\p{Sc}`, which covers ₹ and $) and decimal points are
 * preserved because product search needs them for price filters.
 */
export function normalizeText(raw: string): string {
  const lowered = raw.toLowerCase().replace(/[‘’ʼ]/g, "'")

  const stripped = expandContractions(lowered)
    .replace(/[^\p{L}\p{M}\p{N}\p{Sc}\s.'-]/gu, ' ')
    .replace(/'/g, '')
    // Keep decimal points, drop sentence punctuation.
    .replace(/\.(?!\d)/g, ' ')

  return normalizeDigits(stripped).replace(/\s+/g, ' ').trim()
}

/**
 * Canonical form of an item name: lowercase, punctuation removed,
 * whitespace collapsed. Used to match and merge items on the list.
 */
export function normalizeItemName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Title-cased name for display. */
export function toDisplayName(raw: string): string {
  return normalizeItemName(raw)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Naive English singulariser. Deliberately simple and deterministic —
 * good enough for grocery nouns, and no attempt at full grammar.
 *
 * Non-Latin scripts pass through untouched, which is what we want: Hindi
 * item names are resolved through the lexicon's alias table instead.
 */
export function singularizeWord(word: string): string {
  if (word.length <= 3 || word.endsWith('ss')) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (/(ch|sh|x|z|s)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

/** Singularise the final word of a phrase ("paper towels" -> "paper towel"). */
export function singularizePhrase(phrase: string): string {
  const words = phrase.split(' ')
  if (words.length === 0) return phrase
  const last = words[words.length - 1]
  words[words.length - 1] = INVARIANT_PLURALS.has(last) ? last : singularizeWord(last)
  return words.join(' ')
}

/**
 * Canonical item name used as the shopping-list key, so that "Apples",
 * "apple", and "APPLE" all refer to the same row.
 */
export function canonicalizeItemName(raw: string): string {
  return singularizePhrase(normalizeItemName(raw))
}

/* ------------------------------------------------------------------ */
/* Speech transcript repair                                            */
/* ------------------------------------------------------------------ */

/**
 * Drop dangling connectives from the end of a transcript.
 *
 * Only strips from the tail, and never strips the last remaining word, so a
 * command can be shortened but never emptied.
 */
export function trimTrailingFillers(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean)

  while (words.length > 1 && TRAILING_FILLERS.has(words[words.length - 1].toLowerCase())) {
    words.pop()
  }

  return words.join(' ')
}

/**
 * Collapse an immediately repeated tail.
 *
 * When a recognition session is restarted mid-utterance, the browser sometimes
 * re-emits the words either side of the seam — "add milk add milk". Repeats
 * are collapsed longest-window-first so the largest duplication wins.
 */
export function collapseRepeatedTail(text: string): string {
  let words = text.trim().split(/\s+/).filter(Boolean)

  // A few passes handle a seam that duplicated more than once.
  for (let pass = 0; pass < 3; pass += 1) {
    let collapsed = false

    for (let size = MAX_REPEAT_WINDOW; size >= 1; size -= 1) {
      if (words.length < size * 2) continue

      const tail = words.slice(-size).join(' ').toLowerCase()
      const before = words.slice(-size * 2, -size).join(' ').toLowerCase()

      if (tail === before) {
        words = words.slice(0, -size)
        collapsed = true
        break
      }
    }

    if (!collapsed) break
  }

  return words.join(' ')
}

/**
 * Repair a raw speech transcript before it reaches the parser.
 *
 * Whitespace, then repeated seams, then dangling tail words — in that order,
 * because collapsing a repeat can expose a new trailing filler.
 */
export function cleanTranscript(raw: string): string {
  return trimTrailingFillers(collapseRepeatedTail(raw.replace(/\s+/g, ' ').trim()))
}
