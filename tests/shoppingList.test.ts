import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCommand } from '../src/lib/parser'
import { findItemByName, shoppingReducer } from '../src/state/shoppingReducer'
import { parseStoredItems } from '../src/lib/storage'
import type { ShoppingState } from '../src/types'

/**
 * Shopping-list state, and the whole command → list path.
 *
 * The reducer takes `id` and `addedAt` from the caller, so these assertions
 * need no clock or crypto stubbing.
 */

const NOW = 1_700_000_000_000
const EMPTY: ShoppingState = { items: [], history: {} }

function add(state: ShoppingState, name: string, quantity = 1, id = name) {
  return shoppingReducer(state, {
    type: 'ADD_ITEM',
    payload: { name, quantity, unit: null, id, addedAt: NOW },
  })
}

/** Run a command exactly as the app does: parse, then dispatch. */
function run(state: ShoppingState, input: string): ShoppingState {
  const command = parseCommand(input, 'en', 'voice')
  if (command.confidence === 'low') return state

  switch (command.intent) {
    case 'add': {
      if (!command.item) return state
      return shoppingReducer(state, {
        type: 'ADD_ITEM',
        payload: {
          name: command.item,
          quantity: command.quantity ?? 1,
          unit: command.unit,
          id: `id-${input}`,
          addedAt: NOW,
        },
      })
    }
    case 'remove': {
      const match = command.item && findItemByName(state.items, command.item)
      return match
        ? shoppingReducer(state, { type: 'REMOVE_ITEM', payload: { id: match.id } })
        : state
    }
    case 'update': {
      const match = command.item && findItemByName(state.items, command.item)
      return match && command.quantity !== null
        ? shoppingReducer(state, {
            type: 'UPDATE_QUANTITY',
            payload: { id: match.id, quantity: command.quantity },
          })
        : state
    }
    case 'clear':
      return shoppingReducer(state, { type: 'CLEAR_LIST' })
    default:
      return state
  }
}

test('adds, categorises and records an item', () => {
  const state = add(EMPTY, 'milk')

  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].name, 'milk')
  assert.equal(state.items[0].displayName, 'Milk')
  assert.equal(state.items[0].category, 'dairy')
  assert.equal(state.history.milk.count, 1)
})

test('adding the same item again increases its quantity', () => {
  const state = add(add(EMPTY, 'milk', 1, 'a'), 'milk', 2, 'b')

  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].quantity, 3)
  assert.equal(state.history.milk.count, 2)
})

test('names are canonicalised so plurals and casing merge', () => {
  const state = add(add(EMPTY, 'Apples', 1, 'a'), 'apple', 1, 'b')
  assert.equal(state.items.length, 1)
})

test('setting a quantity to zero removes the item', () => {
  const state = add(EMPTY, 'milk')
  const next = shoppingReducer(state, {
    type: 'UPDATE_QUANTITY',
    payload: { id: state.items[0].id, quantity: 0 },
  })

  assert.equal(next.items.length, 0)
})

test('clearing the list keeps the purchase history', () => {
  const state = shoppingReducer(add(EMPTY, 'milk'), { type: 'CLEAR_LIST' })

  assert.equal(state.items.length, 0)
  assert.equal(state.history.milk.count, 1)
})

test('removing an item that is not on the list changes nothing', () => {
  const state = add(EMPTY, 'milk')
  assert.equal(shoppingReducer(state, {
    type: 'REMOVE_ITEM',
    payload: { id: 'nope' },
  }), state)
})

test('a spoken session ends in the expected list', () => {
  let state = EMPTY
  for (const command of [
    'add milk',
    'I need two bottles of water',
    'buy 5 oranges',
    'two apples',
    'please add bread',
    'remove milk',
    'change oranges to 3',
  ]) {
    state = run(state, command)
  }

  const byName = Object.fromEntries(
    state.items.map((item) => [item.name, item]),
  )

  assert.deepEqual(Object.keys(byName).sort(), [
    'apple',
    'bread',
    'orange',
    'water',
  ])
  assert.equal(byName.water.quantity, 2)
  assert.equal(byName.water.unit, 'bottle')
  assert.equal(byName.orange.quantity, 3)
  assert.equal(byName.apple.quantity, 2)
  assert.equal(byName.bread.category, 'bakery')
})

test('an unreadable command never modifies the list', () => {
  const state = add(EMPTY, 'milk')
  for (const input of ['asdkjhasd', 'sing me a song', 'add milk and bread']) {
    assert.deepEqual(run(state, input).items, state.items, input)
  }
})

test('corrupted stored data yields an empty list rather than throwing', () => {
  assert.deepEqual(parseStoredItems('not json'), [])
  assert.deepEqual(parseStoredItems('{"not":"an array"}'), [])
  assert.deepEqual(parseStoredItems(null), [])
})

test('stored items are rebuilt with sane values', () => {
  const items = parseStoredItems(
    JSON.stringify([
      { name: 'milk', quantity: -4, unit: 'bogus', category: 'nonsense' },
      { name: '', quantity: 1 },
      { nothing: true },
    ]),
  )

  assert.equal(items.length, 1)
  assert.equal(items[0].quantity, 1)
  assert.equal(items[0].unit, null)
  assert.equal(items[0].category, 'dairy')
})
