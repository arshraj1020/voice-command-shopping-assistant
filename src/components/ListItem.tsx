import { useShopping } from '../state/ShoppingContext'
import { MinusIcon, PlusIcon, TrashIcon } from './Icon'
import type { ListItem as ListItemModel } from '../types'

/** Secondary line under the name: unit, when the item has one. */
function metaLine(item: ListItemModel): string | null {
  if (!item.unit) return null
  return item.quantity === 1 ? item.unit : `${item.unit}s`
}

export default function ListItem({ item }: { item: ListItemModel }) {
  const { updateQuantity, toggleChecked, removeItem } = useShopping()
  const meta = metaLine(item)

  return (
    <li className={`item${item.checked ? ' item--checked' : ''}`}>
      {/* The label gives the 22px checkbox a full 44px touch target. */}
      <label className="item__checkwrap">
        <input
          type="checkbox"
          className="item__check"
          checked={item.checked}
          onChange={() => toggleChecked(item.id)}
          aria-label={`Mark ${item.displayName} as done`}
        />
      </label>

      <div className="item__body">
        <p className="item__name">{item.displayName}</p>
        {meta && <p className="item__meta">{meta}</p>}
      </div>

      {/* Joined stepper — the quantity lives inside the control it changes. */}
      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          aria-label={`Decrease quantity of ${item.displayName}`}
        >
          <MinusIcon size={18} />
        </button>
        <span className="stepper__value">
          <span className="sr-only">Quantity </span>
          {item.quantity}
        </span>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          aria-label={`Increase quantity of ${item.displayName}`}
        >
          <PlusIcon size={18} />
        </button>
      </div>

      <button
        type="button"
        className="btn btn--icon btn--danger"
        onClick={() => removeItem(item.id)}
        aria-label={`Remove ${item.displayName}`}
      >
        <TrashIcon size={18} />
      </button>
    </li>
  )
}
