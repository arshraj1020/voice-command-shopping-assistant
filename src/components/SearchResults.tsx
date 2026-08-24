import { useEffect, useRef } from 'react'
import { effectivePrice } from '../data/catalog'
import { formatCurrency } from '../lib/currency'
import { toDisplayName } from '../lib/normalize'
import { describeFilters, formatSize } from '../lib/search'
import { useShopping } from '../state/ShoppingContext'
import { CloseIcon, PlusIcon, SearchIcon } from './Icon'
import type { Product } from '../types'

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useShopping()
  const price = effectivePrice(product)
  const discounted = product.onSale && product.salePrice !== null

  return (
    <li className={`product${product.inStock ? '' : ' product--out'}`}>
      <div className="product__main">
        <span className="product__brand">{product.brand}</span>
        <p className="product__name">{toDisplayName(product.name)}</p>

        <p className="product__meta">
          <span className="product__price">{formatCurrency(price)}</span>
          {discounted && (
            <span className="product__was">{formatCurrency(product.price)}</span>
          )}
          {product.size && <span>{formatSize(product.size)}</span>}
        </p>

        {/* Only badges that carry information — "in stock" is on everything. */}
        {(discounted || !product.inStock || product.tags.length > 0) && (
          <p className="product__badges">
            {discounted && <span className="badge badge--sale">Sale</span>}
            {!product.inStock && <span className="badge badge--out">Out of stock</span>}
            {product.tags.map((tag) => (
              <span key={tag} className="badge">
                {toDisplayName(tag.replace('-', ' '))}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Adding goes through the existing shopping-list action. */}
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => addItem(product.name)}
        aria-label={`Add ${toDisplayName(product.name)} by ${product.brand} to your list`}
      >
        <PlusIcon size={16} />
        Add
      </button>
    </li>
  )
}

/**
 * Results of a voice or typed product search.
 *
 * The filter chips are the point: they make the parsing visible, so it is
 * obvious which constraints were actually heard — and each one can be dropped
 * to widen the search.
 */
export default function SearchResults() {
  const { search, clearSearch, removeSearchFilter } = useShopping()
  const panelRef = useRef<HTMLDivElement>(null)

  // Bring results into view on open — a search that scrolls off-screen looks
  // like a search that did nothing.
  useEffect(() => {
    if (search) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [search])

  // Escape closes the panel.
  useEffect(() => {
    if (!search) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') clearSearch()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [search, clearSearch])

  if (!search) return null

  const chips = describeFilters(search.filters)
  const priceFiltered =
    search.filters.minPrice !== null || search.filters.maxPrice !== null

  return (
    <section className="section" aria-label="Search results">
      <div className="search" ref={panelRef}>
        <div className="section__head">
          <h2 className="section__title">Results</h2>
          <span className="section__count">
            {search.results.length}
            <span className="sr-only"> products</span>
          </span>
          <span className="section__spacer" />
          {/*
            Price filters are matched against a demo catalog priced in rupees.
            Saying so here stops a "$5" search that returns nothing from looking
            like a broken search rather than a currency mismatch.
          */}
          <span className="search__currency">Prices in ₹ · demo catalog</span>
          <button
            type="button"
            className="btn btn--icon"
            onClick={clearSearch}
            aria-label="Close search results"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {chips.length > 0 && (
          <ul className="search__filters" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.id}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => removeSearchFilter(chip.field, chip.tag)}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                  <CloseIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {search.results.length === 0 ? (
          <div className="empty" role="status">
            <SearchIcon size={28} className="empty__icon" />
            <p className="empty__title">No products match</p>
            <p className="empty__text">
              Try removing a filter above, or widening the price range.
            </p>
            {priceFiltered && (
              <p className="empty__text">
                This demo catalog is priced in Indian Rupees, so a price given
                in another currency is read as its rupee value — try{' '}
                <b>under ₹500</b>.
              </p>
            )}
          </div>
        ) : (
          <ul className="search__results">
            {search.results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
