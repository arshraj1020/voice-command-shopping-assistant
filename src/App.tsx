import CommandInput from './components/CommandInput'
import ShoppingList from './components/ShoppingList'
import { ShoppingProvider, useShopping } from './state/ShoppingContext'

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
          <p className="app__subtitle">
            Type a command in plain English. Voice input arrives in a later phase.
          </p>
        </header>

        <CommandInput />
        <Toolbar />
        <ShoppingList />
      </main>
    </ShoppingProvider>
  )
}
