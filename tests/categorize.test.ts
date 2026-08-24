import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categorizeItem, isKnownItemName } from '../src/lib/categorize'

/** Automatic categorisation of item names. */

test('files staple groceries into the right aisle', () => {
  const expected: Record<string, string> = {
    milk: 'dairy',
    apple: 'produce',
    rice: 'pantry',
    water: 'beverages',
    bread: 'bakery',
    chicken: 'meat',
    chips: 'snacks',
    toothpaste: 'personal-care',
  }

  for (const [name, category] of Object.entries(expected)) {
    assert.equal(categorizeItem(name), category, name)
  }
})

test('plant milks belong to dairy, not snacks', () => {
  for (const name of [
    'almond milk',
    'soy milk',
    'coconut milk',
    'oat milk',
    'cashew milk',
  ]) {
    assert.equal(categorizeItem(name), 'dairy', name)
  }
})

test('the longest keyword still wins elsewhere', () => {
  // Regression guard: adding the plant milks must not disturb these.
  assert.equal(categorizeItem('almonds'), 'snacks')
  assert.equal(categorizeItem('cashews'), 'snacks')
  assert.equal(categorizeItem('ice cream'), 'frozen')
  assert.equal(categorizeItem('dish soap'), 'household')
  assert.equal(categorizeItem('soap'), 'personal-care')
})

test('plurals and casing resolve to the same category', () => {
  assert.equal(categorizeItem('Apples'), 'produce')
  assert.equal(categorizeItem('TOMATOES'), 'produce')
  assert.equal(categorizeItem('paper towels'), 'household')
})

test('an unrecognised item falls back to other', () => {
  assert.equal(categorizeItem('laptop'), 'other')
  assert.equal(categorizeItem('asdkjhasd'), 'other')
  assert.equal(categorizeItem(''), 'other')
})

test('isKnownItemName matches whole names, never fragments of a sentence', () => {
  assert.equal(isKnownItemName('milk'), true)
  assert.equal(isKnownItemName('apples'), true)
  assert.equal(isKnownItemName('almond milk'), true)

  // The gate that keeps questions out of the shopping list.
  assert.equal(isKnownItemName('what about milk'), false)
  assert.equal(isKnownItemName('do you have milk'), false)
  assert.equal(isKnownItemName('asdkjhasd'), false)
  assert.equal(isKnownItemName(''), false)
})
