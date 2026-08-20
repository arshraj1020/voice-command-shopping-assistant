import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { CATALOG } from '../data/catalog'
import { createDemoHistory } from '../data/demoHistory'
import { getLexicon } from '../data/lexicon'
import { createId } from '../lib/id'
import { parseCommand } from '../lib/parser'
import { hasAnyFilter, searchProducts } from '../lib/search'
import {
  loadHistory,
  loadItems,
  loadLanguage,
  saveHistory,
  saveItems,
  saveLanguage,
} from '../lib/storage'
import { findItemByName, shoppingReducer } from './shoppingReducer'
import type {
  CommandResult,
  FilterField,
  History,
  LangCode,
  ListItem,
  ParsedCommand,
  ProductTag,
  SearchFilters,
  SearchState,
  ShoppingState,
  Suggestion,
  Unit,
} from '../types'

/** Units that are counted and therefore pluralise: "2 bottles of water". */
const COUNTABLE_UNITS: readonly Unit[] = ['bottle', 'can', 'pack', 'box', 'piece']

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
  /** The most recent command outcome, shared by the voice and text paths. */
  lastResult: CommandResult | null
  language: LangCode
  setLanguage: (language: LangCode) => void
  /** The active product search. Never touches the shopping list. */
  search: SearchState | null
  clearSearch: () => void
  removeSearchFilter: (field: FilterField, tag?: ProductTag) => void
  /** What the user buys routinely. Feeds the suggestion engine. */
  history: History
  /** Clear the seeded demo history (and anything learned since). */
  resetHistory: () => void
  /** Apply a suggestion: add it, or swap it in for the item it replaces. */
  acceptSuggestion: (suggestion: Suggestion) => void
}

const ShoppingContext = createContext<ShoppingContextValue | null>(null)

/**
 * Lazy initialiser — storage is read once, on mount.
 *
 * A `null` history means nothing has ever been stored, so the demo history is
 * seeded. An explicitly emptied history parses to `{}` and is left alone.
 */
function init(): ShoppingState {
  return {
    items: loadItems(),
    history: loadHistory() ?? createDemoHistory(Date.now()),
  }
}

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shoppingReducer, undefined, init)
  const [language, setLanguageState] = useState<LangCode>(loadLanguage)
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)
  const [search, setSearch] = useState<SearchState | null>(null)

  useEffect(() => {
    saveItems(state.items)
  }, [state.items])

  useEffect(() => {
    saveHistory(state.history)
  }, [state.history])

  useEffect(() => {
    saveLanguage(language)
  }, [language])

  const setLanguage = useCallback((next: LangCode) => {
    setLanguageState(next)
    // The previous result was interpreted with the old vocabulary.
    setLastResult(null)
  }, [])

  const clearSearch = useCallback(() => setSearch(null), [])

  /** Drop one filter and re-run the search against what remains. */
  const removeSearchFilter = useCallback(
    (field: FilterField, tag?: ProductTag) => {
      setSearch((current) => {
        if (!current) return current

        const filters: SearchFilters = { ...current.filters }

        switch (field) {
          case 'query':
            filters.query = null
            break
          case 'brand':
            filters.brand = null
            break
          case 'minPrice':
            filters.minPrice = null
            break
          case 'maxPrice':
            filters.maxPrice = null
            break
          case 'size':
            filters.size = null
            break
          case 'attribute':
            filters.attributes = filters.attributes.filter((item) => item !== tag)
            break
        }

        return { filters, results: searchProducts(CATALOG, filters) }
      })
    },
    [],
  )

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
     * the reducer, whether the command was typed or spoken.
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
          return {
            command,
            status: 'info',
            message: getLexicon(command.language).helpMessage,
          }

        case 'search': {
          const filters = command.filters
          if (!filters || !hasAnyFilter(filters)) {
            return {
              command,
              status: 'error',
              message: 'Tell me what to search for, such as “find toothpaste under ₹500”.',
            }
          }

          // Searching never modifies the shopping list.
          const results = searchProducts(CATALOG, filters)
          setSearch({ filters, results })

          return {
            command,
            status: results.length > 0 ? 'success' : 'info',
            message:
              results.length > 0
                ? `Found ${results.length} ${results.length === 1 ? 'product' : 'products'}.`
                : 'No products found. Try relaxing the price or brand filter.',
          }
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
      runCommand: (input) => {
        const result = execute(parseCommand(input, language))
        setLastResult(result)
        return result
      },
      lastResult,
      language,
      setLanguage,
      search,
      clearSearch,
      removeSearchFilter,
      history: state.history,
      resetHistory: () => dispatch({ type: 'RESET_HISTORY' }),
      /*
       * Substitutes carry the item they replace, so accepting one swaps it in
       * and keeps the quantity and unit. Everything else is a plain add.
       * Both paths reuse the existing actions — no list logic lives here.
       */
      acceptSuggestion: (suggestion) => {
        const replaced = suggestion.replacesItemId
          ? state.items.find((item) => item.id === suggestion.replacesItemId)
          : undefined

        if (replaced) {
          removeItem(replaced.id)
          addItem(suggestion.name, replaced.quantity, replaced.unit)
          return
        }

        addItem(suggestion.name)
      },
    }
  }, [
    state.items,
    state.history,
    language,
    lastResult,
    search,
    setLanguage,
    clearSearch,
    removeSearchFilter,
  ])

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping(): ShoppingContextValue {
  const context = useContext(ShoppingContext)
  if (!context) {
    throw new Error('useShopping must be used inside a ShoppingProvider')
  }
  return context
}
