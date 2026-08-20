import { effectivePrice } from '../data/catalog'
import { formatCurrency } from '../lib/currency'
import { toDisplayName } from '../lib/normalize'
import { describeFilters, formatSize } from '../lib/search'
import { useShopping } from '../state/ShoppingContext'
import type { Product } from '../types'

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useShopping()
  const price = effectivePrice(product)

  return (
    <li className="product">
      <div className="product__main">
        <p className="product__name">
          <span className="product__brand">{product.brand}</span>
          {toDisplayName(product.name)}
        </p>

        <p className="product__meta">
          {product.size && <span>{formatSize(product.size)}</span>}
          <span className="product__price">{formatCurrency(price)}</span>
          {product.onSale && product.salePrice !== null && (
            <span className="product__was">{formatCurrency(product.price)}</span>
          )}
        </p>

        <p className="product__badges">
          {product.onSale && <span className="badge badge--sale">Sale</span>}
          {product.tags.map((tag) => (
            <span key={tag} className="badge">
              {toDisplayName(tag.replace('-', ' '))}
            </span>
          ))}
          <span
            className={`badge ${product.inStock ? 'badge--stock' : 'badge--out'}`}
          >
            {product.inStock ? 'In stock' : 'Out of stock'}
          </span>
        </p>
      </div>

      {/* Adding goes through the existing shopping-list action. */}
      <button
        type="button"
        onClick={() => addItem(product.name)}
        aria-label={`Add ${toDisplayName(product.name)} by ${product.brand} to your list`}
      >
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
  if (!search) return null

  const chips = describeFilters(search.filters)

  return (
    <section className="search" aria-label="Search results">
      <div className="search__header">
        <h2 className="search__title">
          Search results
          <span className="search__count">{search.results.length}</span>
        </h2>
        <button type="button" onClick={clearSearch}>
          Close
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
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {search.results.length === 0 ? (
        <p className="empty" role="status">
          No products found. Try relaxing the price or brand filter.
        </p>
      ) : (
        <ul className="search__results">
          {search.results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}
    </section>
  )
}
