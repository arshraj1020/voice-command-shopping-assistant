import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATALOG } from '../src/data/catalog'
import { createDemoHistory } from '../src/data/demoHistory'
import { produceInSeason } from '../src/data/seasonal'
import { generateSuggestions } from '../src/lib/suggestions'
import { shoppingReducer } from '../src/state/shoppingReducer'
import type { History, ListItem, ShoppingState } from '../src/types'

/** Smart suggestions: history, seasonal, sale and substitutes. */

const AUGUST = 7
const NOW = 1_700_000_000_000

/** Build a list through the real reducer, so items are shaped as in the app. */
function listOf(...names: string[]): ListItem[] {
  let state: ShoppingState = { items: [], history: {} }

  for (const [index, name] of names.entries()) {
    state = shoppingReducer(state, {
      type: 'ADD_ITEM',
      payload: { name, quantity: 1, unit: null, id: `id-${index}`, addedAt: NOW },
    })
  }

  return state.items
}

function suggest(options: {
  items?: ListItem[]
  history?: History
  month?: number
  requestedFor?: string | null
}) {
  return generateSuggestions({
    items: options.items ?? [],
    history: options.history ?? {},
    catalog: CATALOG,
    month: options.month ?? AUGUST,
    requestedFor: options.requestedFor ?? null,
  })
}

test('recommends items bought routinely that are not on the list', () => {
  const suggestions = suggest({ history: createDemoHistory(NOW) })
  const history = suggestions.filter((item) => item.type === 'history')

  assert.ok(history.length > 0)
  assert.ok(history.some((item) => item.name === 'milk'))
  assert.ok(history.every((item) => item.reason.length > 0))
})

test('does not recommend something already on the list', () => {
  const suggestions = suggest({
    items: listOf('milk'),
    history: createDemoHistory(NOW),
  })

  assert.equal(
    suggestions.filter((item) => item.type === 'history' && item.name === 'milk')
      .length,
    0,
  )
})

test('a one-off purchase is not treated as a routine', () => {
  const history: History = {
    caviar: { name: 'caviar', category: 'other', count: 1, lastAddedAt: NOW },
  }

  assert.equal(
    suggest({ history }).filter((item) => item.type === 'history').length,
    0,
  )
})

test('suggests produce that is in season this month', () => {
  const seasonal = suggest({ month: AUGUST }).filter(
    (item) => item.type === 'seasonal',
  )

  assert.ok(seasonal.length > 0)
  const inSeason = produceInSeason(AUGUST)
  assert.ok(seasonal.every((item) => inSeason.includes(item.name)))
})

test('suggests discounted products that are in stock', () => {
  const sale = suggest({}).filter((item) => item.type === 'sale')

  assert.ok(sale.length > 0)
  for (const suggestion of sale) {
    const product = CATALOG.find((entry) => entry.id === suggestion.productId)
    assert.ok(product, suggestion.id)
    assert.equal(product.onSale, true)
    assert.equal(product.inStock, true)
  }
})

test('offers an alternative for an item on the list', () => {
  const substitutes = suggest({ items: listOf('milk') }).filter(
    (item) => item.type === 'substitute',
  )

  assert.ok(substitutes.length > 0)
  assert.equal(substitutes[0].name, 'almond milk')
  // Replacing carries the original across, so the card can offer "Replace".
  assert.ok(substitutes[0].replacesItemId)
})

test('marks an out-of-stock item as urgent', () => {
  // Every catalog entry for butter is out of stock.
  const urgent = suggest({ items: listOf('butter') }).filter(
    (item) => item.urgent,
  )

  assert.ok(urgent.length > 0)
  assert.match(urgent[0].reason, /out of stock/)
})

test('answers a spoken request for an alternative, list or no list', () => {
  const requested = suggest({ requestedFor: 'milk' }).filter(
    (item) => item.type === 'substitute',
  )

  assert.ok(requested.length > 0)
  assert.ok(requested.some((item) => item.name === 'almond milk'))
  // Nothing to replace — milk is not on the list — so the card is a plain add.
  assert.equal(requested[0].replacesItemId, undefined)
})

test('a requested alternative outranks every other source', () => {
  const suggestions = suggest({
    requestedFor: 'milk',
    history: createDemoHistory(NOW),
  })

  assert.equal(suggestions[0].type, 'substitute')
})

test('an item with no curated alternative produces none', () => {
  assert.equal(
    suggest({ requestedFor: 'apple' }).filter((item) => item.type === 'substitute')
      .length,
    0,
  )
})

test('each product appears at most once', () => {
  const suggestions = suggest({
    items: listOf('milk'),
    history: createDemoHistory(NOW),
    requestedFor: 'milk',
  })

  const names = suggestions.map((item) => item.name)
  assert.equal(names.length, new Set(names).size)
})

test('the same inputs always produce the same suggestions', () => {
  const options = { items: listOf('milk'), history: createDemoHistory(NOW) }
  assert.deepEqual(suggest(options), suggest(options))
})
