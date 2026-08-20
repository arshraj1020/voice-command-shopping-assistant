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
      <h2 className="group__title">
        {CATEGORY_LABELS[category]}
        <span className="group__count">{items.length}</span>
      </h2>
      <ul className="group__items">
        {items.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}
