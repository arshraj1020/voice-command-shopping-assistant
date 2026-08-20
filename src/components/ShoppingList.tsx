import { useMemo } from 'react'
import { CATEGORY_ORDER } from '../data/categories'
import { useShopping } from '../state/ShoppingContext'
import CategoryGroup from './CategoryGroup'
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

export default function ShoppingList() {
  const { items } = useShopping()
  const groups = useMemo(() => groupByCategory(items), [items])

  if (items.length === 0) {
    return (
      <p className="empty" role="status">
        Your shopping list is empty. Add an item to get started.
      </p>
    )
  }

  return (
    <div className="list">
      {groups.map(([category, group]) => (
        <CategoryGroup key={category} category={category} items={group} />
      ))}
    </div>
  )
}
