import { useShopping } from '../state/ShoppingContext'
import type { ListItem as ListItemModel } from '../types'

function formatQuantity(item: ListItemModel): string {
  return item.unit ? `${item.quantity} ${item.unit}` : `×${item.quantity}`
}

export default function ListItem({ item }: { item: ListItemModel }) {
  const { updateQuantity, toggleChecked, removeItem } = useShopping()

  return (
    <li className={`item${item.checked ? ' item--checked' : ''}`}>
      <input
        type="checkbox"
        className="item__check"
        checked={item.checked}
        onChange={() => toggleChecked(item.id)}
        aria-label={`Mark ${item.displayName} as done`}
      />

      <span className="item__name">{item.displayName}</span>

      <span className="item__quantity">{formatQuantity(item)}</span>

      <div className="item__controls">
        <button
          type="button"
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          aria-label={`Decrease quantity of ${item.displayName}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          aria-label={`Increase quantity of ${item.displayName}`}
        >
          +
        </button>
        <button
          type="button"
          className="item__remove"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.displayName}`}
        >
          ✕
        </button>
      </div>
    </li>
  )
}
