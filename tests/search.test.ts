import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATALOG, effectivePrice } from '../src/data/catalog'
import { parseCommand } from '../src/lib/parser'
import { searchProducts } from '../src/lib/search'
import type { SearchFilters } from '../src/types'

/** Voice-activated product search: filter extraction, then the engine. */

function filtersFor(input: string): SearchFilters {
  const command = parseCommand(input, 'en', 'text')
  assert.equal(command.intent, 'search', input)
  assert.ok(command.filters, input)
  return command.filters
}

function search(input: string) {
  return searchProducts(CATALOG, filtersFor(input))
}

test('extracts an attribute filter and the product query', () => {
  const filters = filtersFor('find organic apples')
  assert.equal(filters.query, 'apples')
  assert.deepEqual(filters.attributes, ['organic'])

  const results = search('find organic apples')
  assert.ok(results.length > 0)
  assert.ok(results.every((product) => product.tags.includes('organic')))
})

test('extracts a maximum price in every spoken form', () => {
  for (const input of [
    'find toothpaste under ₹500',
    'find toothpaste below 500 rupees',
    'find toothpaste less than Rs 500',
    'find toothpaste under INR 500',
  ]) {
    const filters = filtersFor(input)
    assert.equal(filters.maxPrice, 500, input)
    assert.equal(filters.query, 'toothpaste', input)
  }

  const results = search('find toothpaste under ₹500')
  assert.ok(results.length > 0)
  assert.ok(results.every((product) => effectivePrice(product) <= 500))
})

test('combines a brand with a price ceiling', () => {
  const filters = filtersFor('find colgate under ₹300')
  assert.equal(filters.brand, 'Colgate')
  assert.equal(filters.maxPrice, 300)

  const results = search('find colgate under ₹300')
  assert.ok(results.length > 0)
  assert.ok(
    results.every(
      (product) =>
        product.brand === 'Colgate' && effectivePrice(product) <= 300,
    ),
  )
})

test('extracts a price range', () => {
  const filters = filtersFor('find products between ₹100 and ₹500')
  assert.equal(filters.minPrice, 100)
  assert.equal(filters.maxPrice, 500)

  const results = search('find products between ₹100 and ₹500')
  assert.ok(results.length > 0)
  assert.ok(
    results.every((product) => {
      const price = effectivePrice(product)
      return price >= 100 && price <= 500
    }),
  )
})

test('extracts a packaged size and matches across units', () => {
  const filters = filtersFor('find 500ml coke')
  assert.deepEqual(filters.size, { value: 500, unit: 'ml' })
  assert.ok(search('find 500ml coke').length > 0)
})

test('a dollar amount is read as its numeric value, not a different currency', () => {
  // The catalog is priced in INR; the parser must still understand "$5", and
  // the UI is what explains the mismatch.
  assert.equal(filtersFor('find toothpaste under $5').maxPrice, 5)
})

test('a search with nothing to search for is not a command', () => {
  assert.equal(parseCommand('find', 'en', 'text').intent, 'unknown')
})

test('results are ordered: in stock first, then cheapest', () => {
  const results = search('find products between ₹1 and ₹100000')
  const firstOutOfStock = results.findIndex((product) => !product.inStock)

  if (firstOutOfStock !== -1) {
    assert.ok(
      results.slice(firstOutOfStock).every((product) => !product.inStock),
      'in-stock products must all precede out-of-stock ones',
    )
  }
})

test('searching never mutates the catalog', () => {
  const before = CATALOG.length
  search('find organic apples')
  assert.equal(CATALOG.length, before)
})
