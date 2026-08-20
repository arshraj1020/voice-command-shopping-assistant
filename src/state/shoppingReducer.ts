import { categorizeItem, normalizeItemName, toDisplayName } from '../lib/categorize'
import type { ListItem, ShoppingState, Unit } from '../types'

export type ShoppingAction =
  | {
      type: 'ADD_ITEM'
      payload: {
        name: string
        quantity?: number
        unit?: Unit | null
        /**
         * Supplied by the caller (see `ShoppingContext`) so the reducer stays
         * deterministic and can be tested without stubbing time or crypto.
         */
        id: string
        addedAt: number
      }
    }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'TOGGLE_CHECKED'; payload: { id: string } }
  | { type: 'CLEAR_LIST' }

export const initialShoppingState: ShoppingState = { items: [] }

/** Look up an item by its canonical name. Pure helper shared with the provider. */
export function findItemByName(
  items: readonly ListItem[],
  name: string,
): ListItem | undefined {
  const canonical = normalizeItemName(name)
  return items.find((item) => item.name === canonical)
}

/**
 * Pure reducer. Every state transition is derived only from the previous
 * state and the dispatched action.
 */
export function shoppingReducer(
  state: ShoppingState,
  action: ShoppingAction,
): ShoppingState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { name, quantity, unit, id, addedAt } = action.payload
      const canonical = normalizeItemName(name)
      if (!canonical) return state

      const amount = Math.max(1, Math.floor(quantity ?? 1))
      const existing = state.items.find((item) => item.name === canonical)

      // Adding an item already on the list increases its quantity instead of
      // creating a second row.
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  quantity: item.quantity + amount,
                  unit: unit ?? item.unit,
                }
              : item,
          ),
        }
      }

      const newItem: ListItem = {
        id,
        name: canonical,
        displayName: toDisplayName(name),
        quantity: amount,
        unit: unit ?? null,
        category: categorizeItem(canonical),
        checked: false,
        addedAt,
      }

      return { ...state, items: [...state.items, newItem] }
    }

    case 'REMOVE_ITEM': {
      const items = state.items.filter((item) => item.id !== action.payload.id)
      // Removing something that is not on the list is a no-op.
      return items.length === state.items.length ? state : { ...state, items }
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload
      if (!state.items.some((item) => item.id === id)) return state

      // Dropping to zero or below removes the item entirely.
      if (quantity <= 0) {
        return { ...state, items: state.items.filter((item) => item.id !== id) }
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity: Math.floor(quantity) } : item,
        ),
      }
    }

    case 'TOGGLE_CHECKED': {
      if (!state.items.some((item) => item.id === action.payload.id)) return state
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, checked: !item.checked } : item,
        ),
      }
    }

    case 'CLEAR_LIST':
      return state.items.length === 0 ? state : { ...state, items: [] }

    default:
      return state
  }
}
