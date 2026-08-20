import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { createId } from '../lib/id'
import { loadItems, saveItems } from '../lib/storage'
import { findItemByName, shoppingReducer } from './shoppingReducer'
import type { ListItem, ShoppingState, Unit } from '../types'

interface ShoppingContextValue {
  items: ListItem[]
  addItem: (name: string, quantity?: number, unit?: Unit | null) => void
  removeItem: (id: string) => void
  removeItemByName: (name: string) => boolean
  updateQuantity: (id: string, quantity: number) => void
  toggleChecked: (id: string) => void
  clearList: () => void
}

const ShoppingContext = createContext<ShoppingContextValue | null>(null)

/** Lazy initialiser — the saved list is read once, on mount. */
function init(): ShoppingState {
  return { items: loadItems() }
}

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shoppingReducer, undefined, init)

  useEffect(() => {
    saveItems(state.items)
  }, [state.items])

  const value = useMemo<ShoppingContextValue>(
    () => ({
      items: state.items,
      addItem: (name, quantity, unit) =>
        dispatch({
          type: 'ADD_ITEM',
          payload: { name, quantity, unit, id: createId(), addedAt: Date.now() },
        }),
      removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', payload: { id } }),
      removeItemByName: (name) => {
        const match = findItemByName(state.items, name)
        if (!match) return false
        dispatch({ type: 'REMOVE_ITEM', payload: { id: match.id } })
        return true
      },
      updateQuantity: (id, quantity) =>
        dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } }),
      toggleChecked: (id) => dispatch({ type: 'TOGGLE_CHECKED', payload: { id } }),
      clearList: () => dispatch({ type: 'CLEAR_LIST' }),
    }),
    [state.items],
  )

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping(): ShoppingContextValue {
  const context = useContext(ShoppingContext)
  if (!context) {
    throw new Error('useShopping must be used inside a ShoppingProvider')
  }
  return context
}
