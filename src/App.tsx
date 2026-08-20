import { useState, type FormEvent } from 'react'
import ShoppingList from './components/ShoppingList'
import { ShoppingProvider, useShopping } from './state/ShoppingContext'
import type { Unit } from './types'

const UNIT_OPTIONS: readonly Unit[] = [
  'piece', 'bottle', 'can', 'pack', 'box', 'dozen', 'g', 'kg', 'ml', 'l',
]

/**
 * Temporary manual controls for testing the list without voice input.
 * Replaced by the voice interface in a later phase.
 */
function AddItemControls() {
  const { addItem } = useShopping()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return

    addItem(name, Number(quantity) || 1, (unit as Unit) || null)
    setName('')
    setQuantity('1')
    setUnit('')
  }

  return (
    <form className="add" onSubmit={handleSubmit}>
      <input
        className="add__name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Item name"
        aria-label="Item name"
      />
      <input
        className="add__quantity"
        type="number"
        min="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        aria-label="Quantity"
      />
      <select
        className="add__unit"
        value={unit}
        onChange={(event) => setUnit(event.target.value)}
        aria-label="Unit"
      >
        <option value="">no unit</option>
        {UNIT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="submit">Add</button>
    </form>
  )
}

function Toolbar() {
  const { items, clearList } = useShopping()

  return (
    <div className="toolbar">
      <span className="toolbar__count">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </span>
      <button type="button" onClick={clearList} disabled={items.length === 0}>
        Clear list
      </button>
    </div>
  )
}

export default function App() {
  return (
    <ShoppingProvider>
      <main className="app">
        <header className="app__header">
          <h1 className="app__title">Voice Command Shopping Assistant</h1>
          <p className="app__subtitle">Phase 1 — shopping list foundation</p>
        </header>

        <AddItemControls />
        <Toolbar />
        <ShoppingList />
      </main>
    </ShoppingProvider>
  )
}
