import { CATEGORY_LABELS } from '../data/categories'
import ListItem from './ListItem'
import type { Category, ListItem as ListItemModel } from '../types'

interface CategoryGroupProps {
  category: Category
  items: ListItemModel[]
}

export default function CategoryGroup({ category, items }: CategoryGroupProps) {
  return (
    <section className="group">
      {/* Sticks below the app bar while its own items scroll past. */}
      <h3 className="group__title">
        {CATEGORY_LABELS[category]}
        <span className="section__count">
          {items.length}
          <span className="sr-only"> items</span>
        </span>
      </h3>

      <ul className="group__items">
        {items.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}
