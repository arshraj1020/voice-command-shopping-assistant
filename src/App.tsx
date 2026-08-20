import CommandInput from './components/CommandInput'
import LanguageSelector from './components/LanguageSelector'
import SearchResults from './components/SearchResults'
import ShoppingList from './components/ShoppingList'
import Suggestions from './components/Suggestions'
import VoiceControls from './components/VoiceControls'
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
          <LanguageSelector />
        </header>

        <VoiceControls />
        <CommandInput />
        <Suggestions />
        <SearchResults />
        <Toolbar />
        <ShoppingList />
      </main>
    </ShoppingProvider>
  )
}
