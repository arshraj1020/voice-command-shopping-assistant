import { useMemo } from 'react'
import { CATEGORY_ORDER } from '../data/categories'
import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import CategoryGroup from './CategoryGroup'
import { MicIcon } from './Icon'
import type { Category, ListItem } from '../types'

/** Group items by category, preserving the canonical aisle order. */
function groupByCategory(items: ListItem[]): [Category, ListItem[]][] {
  return CATEGORY_ORDER.map(
    (category) =>
      [category, items.filter((item) => item.category === category)] as [
        Category,
        ListItem[],
      ],
  ).filter(([, group]) => group.length > 0)
}

/**
 * First-run screen.
 *
 * The examples are live: tapping one runs it through the same parser a spoken
 * command uses. That turns a dead end into a guided demo, and answers the
 * question every new user has — "what am I allowed to say?"
 */
function EmptyList() {
  const { runCommand, language } = useShopping()

  return (
    <div className="empty">
      <MicIcon size={32} className="empty__icon" />
      <p className="empty__title">Your list is empty</p>
      <p className="empty__text">Tap the mic and say something like:</p>

      <ul className="empty__examples">
        {getLexicon(language).examples.map((example) => (
          <li key={example}>
            <button type="button" className="ex" onClick={() => runCommand(example)}>
              {example}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ShoppingList() {
  const { items, clearList } = useShopping()
  const groups = useMemo(() => groupByCategory(items), [items])

  return (
    <section className="section" aria-label="Shopping list">
      <div className="section__head">
        <h2 className="section__title">Shopping list</h2>
        <span className="section__count">
          {items.length}
          <span className="sr-only"> items</span>
        </span>
        <span className="section__spacer" />
        {items.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearList}>
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyList />
      ) : (
        groups.map(([category, group]) => (
          <CategoryGroup key={category} category={category} items={group} />
        ))
      )}
    </section>
  )
}
