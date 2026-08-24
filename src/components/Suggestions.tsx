import { useMemo, useState } from 'react'
import { CATALOG } from '../data/catalog'
import { toDisplayName } from '../lib/normalize'
import { generateSuggestions } from '../lib/suggestions'
import { useShopping } from '../state/ShoppingContext'
import { CloseIcon, SwapIcon } from './Icon'
import type { Suggestion, SuggestionType } from '../types'

/** Short label so the source of each recommendation is unmistakable. */
const TYPE_LABELS: Record<SuggestionType, string> = {
  substitute: 'Alternative',
  history: 'You usually buy',
  sale: 'On sale',
  seasonal: 'In season',
}

/**
 * Sale reasons carry both prices; splitting them lets the discounted price
 * sit at full weight with the original struck through beside it.
 */
function SaleReason({ reason }: { reason: string }) {
  const match = /—\s*(\S+)\s*\(was\s*(\S+)\)/.exec(reason)
  if (!match) return <p className="sug__reason">{reason}</p>

  return (
    <p className="sug__reason">
      <span className="sug__price">{match[1]}</span>
      <span className="sug__was">{match[2]}</span>
    </p>
  )
}

function Card({ suggestion }: { suggestion: Suggestion }) {
  const { acceptSuggestion } = useShopping()
  const replaces = Boolean(suggestion.replacesItemId)

  return (
    <li className={`sug__card sug__card--${suggestion.type}`}>
      <span className="sug__type">{TYPE_LABELS[suggestion.type]}</span>
      <p className="sug__name">{suggestion.displayName}</p>

      {suggestion.type === 'sale' ? (
        <SaleReason reason={suggestion.reason} />
      ) : (
        <p className="sug__reason">{suggestion.reason}</p>
      )}

      {/* Both actions run through the existing shopping-list actions. */}
      <button
        type="button"
        className="btn btn--primary btn--sm sug__action"
        onClick={() => acceptSuggestion(suggestion)}
        aria-label={
          replaces
            ? `Replace with ${suggestion.displayName}`
            : `Add ${suggestion.displayName} to your list`
        }
      >
        {replaces ? <SwapIcon size={16} /> : null}
        {replaces ? 'Replace' : 'Add'}
      </button>
    </li>
  )
}

/**
 * An out-of-stock replacement is the only genuinely urgent suggestion, so it
 * breaks out of the strip and takes the full width above it.
 */
function UrgentCard({ suggestion }: { suggestion: Suggestion }) {
  const { acceptSuggestion } = useShopping()

  return (
    <div className="sug__urgent">
      <div className="sug__urgent-body">
        <span className="sug__type">Unavailable</span>
        <p className="sug__name">{suggestion.displayName}</p>
        <p className="sug__reason">{suggestion.reason}</p>
      </div>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => acceptSuggestion(suggestion)}
        aria-label={`Replace with ${suggestion.displayName}`}
      >
        <SwapIcon size={16} />
        Replace
      </button>
    </div>
  )
}

export default function Suggestions() {
  const { items, history, resetHistory, substituteFor, clearSubstitute } =
    useShopping()

  // Read the clock once, so the suggestion list stays stable while mounted.
  const [month] = useState(() => new Date().getMonth())

  const suggestions = useMemo(
    () =>
      generateSuggestions({
        items,
        history,
        catalog: CATALOG,
        month,
        requestedFor: substituteFor,
      }),
    [items, history, month, substituteFor],
  )

  const urgent = suggestions.filter((suggestion) => suggestion.urgent)
  const rest = suggestions.filter((suggestion) => !suggestion.urgent)
  const hasHistory = Object.keys(history).length > 0

  return (
    <section className="section" aria-label="Suggestions">
      <div className="section__head">
        <h2 className="section__title">Suggested for you</h2>
        <span className="section__spacer" />
        {hasHistory && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={resetHistory}
            title="Clears the seeded demo history and anything learned since"
          >
            Reset history
          </button>
        )}
      </div>

      {/* Answer to a spoken "alternative to milk" — dismissible, never sticky. */}
      {substituteFor && (
        <p className="sug__requested" role="status">
          <span>Alternatives to {toDisplayName(substituteFor)}</span>
          <button
            type="button"
            className="btn btn--icon"
            onClick={clearSubstitute}
            aria-label="Stop showing alternatives"
          >
            <CloseIcon size={16} />
          </button>
        </p>
      )}

      {urgent.map((suggestion) => (
        <UrgentCard key={suggestion.id} suggestion={suggestion} />
      ))}

      {suggestions.length === 0 ? (
        <p className="sug__empty" role="status">
          No suggestions yet. Add a few items and we&rsquo;ll learn your shopping
          pattern.
        </p>
      ) : (
        rest.length > 0 && (
          <ul className="sug__strip" aria-label="Suggested items">
            {rest.map((suggestion) => (
              <Card key={suggestion.id} suggestion={suggestion} />
            ))}
          </ul>
        )
      )}
    </section>
  )
}
