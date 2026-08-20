import { alternation } from '../lib/normalize'
import type { LangCode, Unit } from '../types'

/**
 * Language vocabulary for the command parser.
 *
 * The parser logic in `lib/parser.ts` is shared by every language. Only the
 * words live here: intent markers, number words, units, fillers, and the
 * product aliases that map a spoken name onto the canonical English name used
 * by the shopping list.
 */

export interface LanguageRules {
  code: LangCode
  /** Shown in the language selector, in the language itself. */
  label: string
  /** Shown in English UI chrome ("Language: Hindi"). */
  englishLabel: string
  /** BCP-47 tag handed to the Web Speech API. */
  recognitionLang: string
  /**
   * Intent patterns. Group 1, when present, is the payload: everything left
   * once the intent marker has been removed.
   */
  patterns: {
    help: readonly RegExp[]
    clear: readonly RegExp[]
    update: readonly RegExp[]
    remove: readonly RegExp[]
    search: readonly RegExp[]
    add: readonly RegExp[]
  }
  numberWords: Readonly<Record<string, number>>
  unitAliases: Readonly<Record<string, Unit>>
  /** Words that stand in for "one" before a unit, as in "a dozen eggs". */
  articles: readonly string[]
  /** Words joining a unit to its item, as in "2 bottles **of** water". */
  connectors: readonly string[]
  fillerPhrases: readonly string[]
  fillerWords: readonly string[]
  pronouns: readonly string[]
  conjunctions: readonly string[]
  /** Spoken product name -> canonical English name. */
  productAliases: Readonly<Record<string, string>>
  /** Shown to the user when a command is not understood. */
  examples: readonly string[]
  placeholder: string
  helpMessage: string
}

/* ------------------------------------------------------------------ */
/* Pattern builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * `\b` only understands ASCII word characters, so it cannot terminate a
 * Devanagari marker. These boundaries work for every script.
 */
const NOT_WORD_AHEAD = '(?![\\p{L}\\p{M}\\p{N}])'

/** "<marker> <payload>" — verb-first languages such as English. */
function prefixRule(markers: readonly string[]): RegExp {
  return new RegExp(`^(?:${alternation(markers)})${NOT_WORD_AHEAD}(.*)$`, 'u')
}

/** "<payload> <marker>" — verb-final languages such as Hindi. */
function suffixRule(markers: readonly string[]): RegExp {
  return new RegExp(`^(.*?)(?:\\s|^)(?:${alternation(markers)})$`, 'u')
}

/** Whole-utterance match with no payload. */
function exactRule(phrases: readonly string[]): RegExp {
  return new RegExp(`^(?:${alternation(phrases)})$`, 'u')
}

/** Every "<a> <b>" pairing — used to enumerate clear-list phrasings. */
function pairs(first: readonly string[], second: readonly string[]): string[] {
  const result: string[] = []
  for (const a of first) {
    for (const b of second) result.push(`${a} ${b}`)
  }
  return result
}

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                   */
/* ------------------------------------------------------------------ */

const ENGLISH_NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
}

/**
 * Units are written in Latin script even by Hindi speakers ("2 kg", "500 ml"),
 * so every language inherits these.
 */
const ENGLISH_UNIT_ALIASES: Readonly<Record<string, Unit>> = {
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

/* ------------------------------------------------------------------ */
/* English                                                             */
/* ------------------------------------------------------------------ */

const ENGLISH: LanguageRules = {
  code: 'en',
  label: 'English',
  englishLabel: 'English',
  recognitionLang: 'en-US',

  patterns: {
    help: [
      /^help$/,
      /^help me$/,
      /^commands$/,
      /^(?:show|list)(?: me)? (?:the )?commands$/,
      /^what can (?:i|you) (?:say|do)$/,
      /^what commands (?:are there|can i use)$/,
      /^how (?:do|does) (?:this|it) work$/,
    ],
    // Anchored end-to-end so "remove all the milk" is not read as "clear".
    clear: [
      /^(?:clear|empty|reset|wipe|delete|remove)\s+(?:my\s+|the\s+)?(?:whole\s+)?(?:shopping\s+)?list$/,
      /^(?:clear|empty|reset|wipe)\s+everything$/,
      /^(?:remove|delete)\s+everything$/,
      /^(?:remove|delete|clear)\s+all(?:\s+items)?$/,
      /^start\s+(?:a\s+)?new\s+list$/,
    ],
    update: [prefixRule(['change', 'update', 'set', 'make'])],
    remove: [
      /^take\b(.*?)\boff (?:my |the )?(?:shopping )?list$/,
      /^take\b(.*?)\boff$/,
      /^(?:remove|delete|drop)\b(.*?)\bfrom (?:my |the )?(?:shopping )?list$/,
      /^cross off\b(.*)$/,
      /^i do not (?:need|want)\b(.*)$/,
      /^(?:remove|delete|drop)\b(.*)$/,
    ],
    search: [/^(?:search for|look for|show me|find|search)\b(.*)$/],
    add: [
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
    ],
  },

  numberWords: ENGLISH_NUMBER_WORDS,
  unitAliases: ENGLISH_UNIT_ALIASES,
  articles: ['a', 'an'],
  connectors: ['of'],

  fillerPhrases: [
    'to my shopping list', 'from my shopping list', 'on my shopping list',
    'to the shopping list', 'off my shopping list', 'my shopping list',
    'to my list', 'from my list', 'on my list', 'off my list', 'in my list',
    'to the list', 'from the list', 'on the list', 'off the list',
    'shopping list', 'my list', 'the list', 'for me', 'as well', 'please',
  ],
  fillerWords: [
    'a', 'an', 'the', 'some', 'any', 'of', 'me', 'my', 'to', 'for', 'and',
    'more', 'extra', 'all', 'up', 'list', 'also', 'please', 'quantity',
  ],
  pronouns: ['it', 'that', 'this', 'them', 'those', 'these', 'one'],
  conjunctions: ['and'],
  productAliases: {},

  examples: [
    'add milk',
    'add 2 bottles of water',
    'remove milk',
    'change apples to 5',
  ],
  placeholder: 'Type a command, e.g. add 2 bottles of water',
  helpMessage: [
    'Try commands like:',
    '"add milk" · "I need apples" · "I want to buy bananas"',
    '"add 2 bottles of water" · "add a dozen eggs"',
    '"remove milk" · "take eggs off my list"',
    '"change apples to 5" · "clear my list"',
  ].join('\n'),
}

/* ------------------------------------------------------------------ */
/* Hindi                                                               */
/* ------------------------------------------------------------------ */

/**
 * Hindi puts the verb last, so intent markers are suffixes rather than
 * prefixes. The parser handles both shapes identically — only the pattern
 * builder differs.
 */
const HINDI_ADD_MARKERS = [
  'जोड़ो', 'जोड़ दो', 'जोड़ें', 'जोड़िए', 'जोड़ना', 'जोड़',
  'डालो', 'डाल दो', 'डालिए',
  'चाहिए', 'चाहिये', 'चाहिएं',
  'लाओ', 'ले लो', 'ले आओ', 'खरीदो', 'खरीद लो',
  'ऐड करो', 'ऐड कर दो',
]

// "नहीं चाहिए" must live here, and remove is matched before add, so that
// "दूध नहीं चाहिए" removes rather than adds.
const HINDI_REMOVE_MARKERS = [
  'हटाओ', 'हटा दो', 'हटाइए', 'हटाना',
  'निकालो', 'निकाल दो', 'निकालिए',
  'मिटाओ', 'मिटा दो',
  'डिलीट करो', 'रिमूव करो',
  'नहीं चाहिए', 'नहीं चाहिये',
]

const HINDI_UPDATE_MARKERS = [
  'कर दो', 'कर दीजिए', 'कर देना', 'कर दें', 'करो',
  'बना दो', 'बदल दो', 'बदलो',
]

const HINDI_SEARCH_MARKERS = ['खोजो', 'ढूंढो', 'ढूँढो', 'खोजें', 'सर्च करो']

const HINDI_LIST_NOUNS = [
  'सूची', 'मेरी सूची', 'पूरी सूची', 'सूची को',
  'लिस्ट', 'मेरी लिस्ट', 'पूरी लिस्ट', 'लिस्ट को',
  'सब कुछ', 'सब', 'सारा',
]

const HINDI_CLEAR_VERBS = [
  'साफ करो', 'साफ कर दो', 'खाली करो', 'खाली कर दो',
  'हटा दो', 'मिटा दो', 'डिलीट करो', 'क्लियर करो',
]

const HINDI: LanguageRules = {
  code: 'hi',
  label: 'हिन्दी',
  englishLabel: 'Hindi',
  recognitionLang: 'hi-IN',

  patterns: {
    help: [exactRule(['मदद', 'सहायता', 'हेल्प', 'कमांड', 'मदद करो', 'कमांड दिखाओ'])],
    // Both word orders are generated; only the natural ones ever occur.
    clear: [
      exactRule([
        ...pairs(HINDI_LIST_NOUNS, HINDI_CLEAR_VERBS),
        ...pairs(HINDI_CLEAR_VERBS, HINDI_LIST_NOUNS),
      ]),
    ],
    update: [suffixRule(HINDI_UPDATE_MARKERS)],
    remove: [suffixRule(HINDI_REMOVE_MARKERS)],
    search: [suffixRule(HINDI_SEARCH_MARKERS)],
    add: [suffixRule(HINDI_ADD_MARKERS)],
  },

  numberWords: {
    ...ENGLISH_NUMBER_WORDS,
    एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छै: 6,
    सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13,
    चौदह: 14, पंद्रह: 15, सोलह: 16, बीस: 20,
  },

  unitAliases: {
    ...ENGLISH_UNIT_ALIASES,
    लीटर: 'l', मिलीलीटर: 'ml', किलो: 'kg', किलोग्राम: 'kg', ग्राम: 'g',
    बोतल: 'bottle', बोतलें: 'bottle', पैकेट: 'pack', पैक: 'pack',
    डिब्बा: 'box', डिब्बे: 'box', डब्बा: 'box', दर्जन: 'dozen',
    कैन: 'can', टुकड़ा: 'piece', टुकड़े: 'piece',
  },

  // "एक" is already a number word, so "एक दर्जन" arrives as "1 दर्जन".
  articles: [],
  connectors: ['का', 'की', 'के'],

  fillerPhrases: [
    'मेरी सूची में', 'मेरी लिस्ट में', 'सूची में', 'लिस्ट में',
    'मेरी सूची से', 'मेरी लिस्ट से', 'सूची से', 'लिस्ट से',
    'कृपया', 'ज़रा', 'जरा',
  ],
  fillerWords: [
    'मुझे', 'मेरी', 'मेरा', 'मेरे', 'को', 'का', 'की', 'के', 'से', 'में',
    'पर', 'कुछ', 'और', 'लिए', 'कृपया', 'जी', 'अब', 'भी', 'है', 'हैं', 'तो',
  ],
  pronouns: ['यह', 'वह', 'इसे', 'उसे', 'इसको', 'उसको', 'ये', 'वो'],
  conjunctions: ['और'],

  productAliases: {
    दूध: 'milk', दही: 'yogurt', पनीर: 'paneer', मक्खन: 'butter', घी: 'ghee',
    चीज़: 'cheese', अंडा: 'egg', अंडे: 'egg',
    सेब: 'apple', केला: 'banana', केले: 'banana', आम: 'mango',
    संतरा: 'orange', अंगूर: 'grapes', नींबू: 'lemon',
    आलू: 'potato', प्याज: 'onion', टमाटर: 'tomato', गाजर: 'carrot',
    लहसुन: 'garlic', अदरक: 'ginger', मटर: 'peas', गोभी: 'cauliflower',
    पानी: 'water', चाय: 'tea', कॉफी: 'coffee', जूस: 'juice',
    ब्रेड: 'bread', रोटी: 'bread', आटा: 'flour', चावल: 'rice',
    दाल: 'lentils', चीनी: 'sugar', नमक: 'salt', तेल: 'oil',
    मसाला: 'spices', मसाले: 'spices',
    चिकन: 'chicken', मछली: 'fish', मटन: 'mutton',
    बिस्कुट: 'biscuit', चॉकलेट: 'chocolate', चिप्स: 'chips',
    साबुन: 'soap', शैम्पू: 'shampoo', टूथपेस्ट: 'toothpaste',
  },

  examples: [
    'दूध जोड़ो',
    'दो बोतल पानी जोड़ो',
    'दूध हटाओ',
    'सेब को 5 कर दो',
  ],
  placeholder: 'कमांड लिखें, जैसे दो बोतल पानी जोड़ो',
  helpMessage: [
    'ऐसे कमांड आज़माएँ:',
    '"दूध जोड़ो" · "सेब चाहिए" · "मुझे केला चाहिए"',
    '"दो बोतल पानी जोड़ो" · "एक किलो चावल जोड़ो"',
    '"दूध हटाओ" · "सेब निकालो"',
    '"सेब को 5 कर दो" · "मेरी सूची साफ करो"',
  ].join('\n'),
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const LEXICONS: Readonly<Record<LangCode, LanguageRules>> = {
  en: ENGLISH,
  hi: HINDI,
}

/** Every supported language, in selector order. */
export const LANGUAGES: readonly LanguageRules[] = [ENGLISH, HINDI]

export function isLangCode(value: unknown): value is LangCode {
  return value === 'en' || value === 'hi'
}

export function getLexicon(language: LangCode): LanguageRules {
  return LEXICONS[language] ?? ENGLISH
}
