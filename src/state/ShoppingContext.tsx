import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { createId } from '../lib/id'
import { parseCommand } from '../lib/parser'
import { loadItems, saveItems } from '../lib/storage'
import { findItemByName, shoppingReducer } from './shoppingReducer'
import type {
  CommandResult,
  ListItem,
  ParsedCommand,
  ShoppingState,
  Unit,
} from '../types'

/** Units that are counted and therefore pluralise: "2 bottles of water". */
const COUNTABLE_UNITS: readonly Unit[] = ['bottle', 'can', 'pack', 'box', 'piece']

const HELP_MESSAGE = [
  'Try commands like:',
  '"add milk" · "I need apples" · "I want to buy bananas"',
  '"add 2 bottles of water" · "add a dozen eggs"',
  '"remove milk" · "take eggs off my list"',
  '"change apples to 5" · "clear my list"',
].join('\n')

/** Human-readable description of an item and its quantity. Pure. */
function describe(item: string, quantity: number | null, unit: Unit | null): string {
  const amount = quantity ?? 1

  if (!unit) return amount > 1 ? `${item} ×${amount}` : item
  if (unit === 'dozen') return `${amount} dozen ${item}`
  if (COUNTABLE_UNITS.includes(unit)) {
    return `${amount} ${unit}${amount > 1 ? 's' : ''} of ${item}`
  }
  return `${amount} ${unit} ${item}`
}

interface ShoppingContextValue {
  items: ListItem[]
  addItem: (name: string, quantity?: number, unit?: Unit | null) => void
  removeItem: (id: string) => void
  removeItemByName: (name: string) => boolean
  updateQuantity: (id: string, quantity: number) => void
  toggleChecked: (id: string) => void
  clearList: () => void
  /** Parse a typed or spoken command and apply it to the list. */
  runCommand: (input: string) => CommandResult
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

  const value = useMemo<ShoppingContextValue>(() => {
    const addItem = (name: string, quantity?: number, unit?: Unit | null) =>
      dispatch({
        type: 'ADD_ITEM',
        payload: { name, quantity, unit, id: createId(), addedAt: Date.now() },
      })

    const removeItem = (id: string) =>
      dispatch({ type: 'REMOVE_ITEM', payload: { id } })

    const updateQuantity = (id: string, quantity: number) =>
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })

    const clearList = () => dispatch({ type: 'CLEAR_LIST' })

    /**
     * Execute a parsed command using the existing shopping-list actions.
     * No add/remove/update logic is duplicated here — it all runs through
     * the reducer built in the previous phase.
     */
    const execute = (command: ParsedCommand): CommandResult => {
      // An unrecognised or uncertain command must never change the list.
      if (command.intent === 'unknown') {
        return { command, status: 'error', message: "I couldn't understand that." }
      }

      if (command.confidence === 'low') {
        return {
          command,
          status: 'error',
          message: command.item
            ? `I'm not sure what you meant by “${command.item}”. Try one item at a time.`
            : "I couldn't understand that.",
        }
      }

      switch (command.intent) {
        case 'add': {
          if (!command.item) {
            return { command, status: 'error', message: "I couldn't understand that." }
          }
          addItem(command.item, command.quantity ?? 1, command.unit)
          return {
            command,
            status: 'success',
            message: `Added ${describe(command.item, command.quantity, command.unit)}`,
          }
        }

        case 'remove': {
          if (!command.item) {
            return { command, status: 'error', message: "I couldn't understand that." }
          }
          const match = findItemByName(state.items, command.item)
          if (!match) {
            return {
              command,
              status: 'info',
              message: `${command.item} is not on your list.`,
            }
          }
          removeItem(match.id)
          return { command, status: 'success', message: `Removed ${command.item}` }
        }

        case 'update': {
          if (!command.item || command.quantity === null) {
            return { command, status: 'error', message: "I couldn't understand that." }
          }
          const match = findItemByName(state.items, command.item)
          if (!match) {
            return {
              command,
              status: 'info',
              message: `${command.item} is not on your list.`,
            }
          }
          updateQuantity(match.id, command.quantity)
          return {
            command,
            status: 'success',
            message:
              command.quantity <= 0
                ? `Removed ${command.item}`
                : `Updated ${command.item} to ${command.quantity}`,
          }
        }

        case 'clear': {
          if (state.items.length === 0) {
            return { command, status: 'info', message: 'Your list is already empty.' }
          }
          const removed = state.items.length
          clearList()
          return {
            command,
            status: 'success',
            message: `Cleared ${removed} ${removed === 1 ? 'item' : 'items'} from your list.`,
          }
        }

        case 'help':
          return { command, status: 'info', message: HELP_MESSAGE }

        case 'search':
          return {
            command,
            status: 'info',
            message: 'Product search is not available yet — it arrives in a later phase.',
          }

        default:
          return { command, status: 'error', message: "I couldn't understand that." }
      }
    }

    return {
      items: state.items,
      addItem,
      removeItem,
      removeItemByName: (name) => {
        const match = findItemByName(state.items, name)
        if (!match) return false
        removeItem(match.id)
        return true
      },
      updateQuantity,
      toggleChecked: (id) => dispatch({ type: 'TOGGLE_CHECKED', payload: { id } }),
      clearList,
      runCommand: (input) => execute(parseCommand(input)),
    }
  }, [state.items])

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping(): ShoppingContextValue {
  const context = useContext(ShoppingContext)
  if (!context) {
    throw new Error('useShopping must be used inside a ShoppingProvider')
  }
  return context
}
