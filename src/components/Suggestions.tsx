import { useMemo, useState } from 'react'
import { CATALOG } from '../data/catalog'
import { generateSuggestions } from '../lib/suggestions'
import { useShopping } from '../state/ShoppingContext'
import type { SuggestionType } from '../types'

/** Short label so the source of each recommendation is unmistakable. */
const TYPE_LABELS: Record<SuggestionType, string> = {
  substitute: 'Alternative',
  history: 'You buy this',
  sale: 'On sale',
  seasonal: 'In season',
}

export default function Suggestions() {
  const { items, history, acceptSuggestion, resetHistory } = useShopping()

  // Read the clock once, so the suggestion list stays stable while mounted.
  const [month] = useState(() => new Date().getMonth())

  const suggestions = useMemo(
    () => generateSuggestions({ items, history, catalog: CATALOG, month }),
    [items, history, month],
  )

  const hasHistory = Object.keys(history).length > 0

  return (
    <section className="suggestions" aria-label="Suggestions">
      <div className="suggestions__header">
        <h2 className="suggestions__title">Suggestions</h2>
        {hasHistory && (
          <button
            type="button"
            className="suggestions__reset"
            onClick={resetHistory}
            title="Clears the seeded demo history and anything learned since"
          >
            Reset history
          </button>
        )}
      </div>

      {suggestions.length === 0 ? (
        <p className="suggestions__empty" role="status">
          No suggestions yet. Add a few items and we&rsquo;ll learn your shopping
          pattern.
        </p>
      ) : (
        <ul className="suggestions__list">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className={`suggestion suggestion--${suggestion.type}${
                suggestion.urgent ? ' suggestion--urgent' : ''
              }`}
            >
              <div className="suggestion__body">
                <p className="suggestion__name">
                  {suggestion.displayName}
                  <span className="suggestion__tag">
                    {TYPE_LABELS[suggestion.type]}
                  </span>
                </p>
                <p className="suggestion__reason">{suggestion.reason}</p>
              </div>

              {/* Both actions run through the existing shopping-list actions. */}
              <button
                type="button"
                onClick={() => acceptSuggestion(suggestion)}
                aria-label={
                  suggestion.replacesItemId
                    ? `Replace with ${suggestion.displayName}`
                    : `Add ${suggestion.displayName} to your list`
                }
              >
                {suggestion.replacesItemId ? 'Replace' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
