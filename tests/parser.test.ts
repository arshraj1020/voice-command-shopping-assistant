import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCommand } from '../src/lib/parser'
import type { LangCode } from '../src/types'

/**
 * Command parsing.
 *
 * The parser is a pure function, so these need no DOM, no React and no mocks.
 * Voice and text share the same entry point, so covering it covers both.
 */

function parse(input: string, language: LangCode = 'en') {
  return parseCommand(input, language, 'text')
}

test('adds an item from the plainest command', () => {
  const command = parse('add milk')
  assert.equal(command.intent, 'add')
  assert.equal(command.item, 'milk')
  assert.equal(command.confidence, 'high')
})

test('understands varied phrasings of the same add intent', () => {
  const phrasings: Record<string, string> = {
    'add milk': 'milk',
    'I need apples': 'apple',
    'I want to buy bananas': 'banana',
    'add bananas to my list': 'banana',
    'put rice on my list': 'rice',
    'get me eggs': 'egg',
    'i am out of coffee': 'coffee',
    'pick up toothpaste': 'toothpaste',
  }

  for (const [input, item] of Object.entries(phrasings)) {
    const command = parse(input)
    assert.equal(command.intent, 'add', input)
    assert.equal(command.item, item, input)
  }
})

test('tolerates politeness and hesitation before the verb', () => {
  const inputs = [
    'please add milk',
    'can you add milk',
    'could you add milk',
    'would you add milk',
    'ok add milk',
    'okay add milk',
    'hey add milk',
    'um add milk',
    'uh add milk',
    'so add milk',
    'now add milk',
    'ok so please add milk',
  ]

  for (const input of inputs) {
    const command = parse(input)
    assert.equal(command.intent, 'add', input)
    assert.equal(command.item, 'milk', input)
    assert.equal(command.confidence, 'high', input)
  }
})

test('strips lead noise from a remove command too', () => {
  const command = parse('please remove milk')
  assert.equal(command.intent, 'remove')
  assert.equal(command.item, 'milk')
})

test('"I would like to add milk" adds milk, not an item called "add milk"', () => {
  const command = parse('I would like to add milk')
  assert.equal(command.intent, 'add')
  assert.equal(command.item, 'milk')
})

test('accepts a quantity-only command with no verb', () => {
  const cases: [string, string, number | null, string | null][] = [
    ['two apples', 'apple', 2, null],
    ['2 kg rice', 'rice', 2, 'kg'],
    ['three bottles of milk', 'milk', 3, 'bottle'],
    ['a dozen eggs', 'egg', 1, 'dozen'],
    ['5 oranges', 'orange', 5, null],
    ['milk', 'milk', null, null],
  ]

  for (const [input, item, quantity, unit] of cases) {
    const command = parse(input)
    assert.equal(command.intent, 'add', input)
    assert.equal(command.item, item, input)
    assert.equal(command.quantity, quantity, input)
    assert.equal(command.unit, unit, input)
  }
})

test('a verbless utterance that is not a known product stays unknown', () => {
  const inputs = [
    'hello',
    'asdkjhasd',
    'what is the weather',
    'sing me a song',
    'do you have milk',
    'what about milk',
    'is there milk',
    'please',
    'add it',
    'add 5',
  ]

  for (const input of inputs) {
    assert.equal(parse(input).intent, 'unknown', input)
  }
})

test('extracts quantity and unit from an explicit add', () => {
  const water = parse('add 2 bottles of water')
  assert.deepEqual(
    [water.item, water.quantity, water.unit],
    ['water', 2, 'bottle'],
  )

  const rice = parse('add 2 kg rice')
  assert.deepEqual([rice.item, rice.quantity, rice.unit], ['rice', 2, 'kg'])

  const eggs = parse('add a dozen eggs')
  assert.deepEqual([eggs.item, eggs.quantity, eggs.unit], ['egg', 1, 'dozen'])
})

test('removes, updates and clears', () => {
  assert.equal(parse('remove milk').intent, 'remove')
  assert.equal(parse('take eggs off my list').item, 'egg')

  const update = parse('change apples to 5')
  assert.equal(update.intent, 'update')
  assert.equal(update.item, 'apple')
  assert.equal(update.quantity, 5)

  assert.equal(parse('clear my list').intent, 'clear')
  assert.equal(parse('remove everything').intent, 'clear')
})

test('recognises a request for an alternative', () => {
  const inputs = [
    'alternative to milk',
    'substitute for milk',
    'what can i use instead of milk',
    'find an alternative to milk',
    'give me an alternative to milk',
    'instead of milk',
  ]

  for (const input of inputs) {
    const command = parse(input)
    assert.equal(command.intent, 'substitute', input)
    assert.equal(command.item, 'milk', input)
  }
})

test('a substitute request is not mistaken for a search or an add', () => {
  assert.equal(parse('find an alternative to milk').intent, 'substitute')
  assert.equal(parse('get me a substitute for bread').intent, 'substitute')
  // …while an ordinary search still searches.
  assert.equal(parse('find organic apples').intent, 'search')
})

test('refuses a multi-item command rather than corrupting the list', () => {
  const command = parse('add milk and bread')
  assert.equal(command.confidence, 'low')
})

test('parses Hindi commands into the canonical English namespace', () => {
  const cases: [string, string, string | null][] = [
    ['दूध जोड़ो', 'add', 'milk'],
    ['मुझे सेब चाहिए', 'add', 'apple'],
    ['दूध हटाओ', 'remove', 'milk'],
    ['दूध नहीं चाहिए', 'remove', 'milk'],
    ['मेरी सूची साफ करो', 'clear', null],
    ['दूध का विकल्प', 'substitute', 'milk'],
    ['कृपया दूध जोड़ो', 'add', 'milk'],
  ]

  for (const [input, intent, item] of cases) {
    const command = parse(input, 'hi')
    assert.equal(command.intent, intent, input)
    assert.equal(command.item, item, input)
  }
})

test('extracts Hindi quantities and units', () => {
  const water = parse('दो बोतल पानी जोड़ो', 'hi')
  assert.deepEqual(
    [water.item, water.quantity, water.unit],
    ['water', 2, 'bottle'],
  )

  const rice = parse('एक किलो चावल जोड़ो', 'hi')
  assert.deepEqual([rice.item, rice.quantity, rice.unit], ['rice', 1, 'kg'])
})

test('an unmapped Hindi word spoken aloud is refused, not guessed', () => {
  const command = parseCommand('ब्रोकली जोड़ो', 'hi', 'voice')
  assert.equal(command.confidence, 'low')
})

test('the original input is always preserved for display', () => {
  assert.equal(parse('Please Add Milk').raw, 'Please Add Milk')
})
