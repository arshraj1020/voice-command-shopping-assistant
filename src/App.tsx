import LanguageSelector from './components/LanguageSelector'
import SearchResults from './components/SearchResults'
import ShoppingList from './components/ShoppingList'
import Suggestions from './components/Suggestions'
import VoiceControls from './components/VoiceControls'
import { ShoppingProvider } from './state/ShoppingContext'

/**
 * App shell.
 *
 * The shopping list is the body of the page and the command dock is pinned to
 * the bottom, so the microphone stays within thumb reach and never scrolls
 * away — a voice-first product whose microphone disappears is not voice-first.
 */
export default function App() {
  return (
    <ShoppingProvider>
      <div className="app">
        <header className="topbar">
          <h1 className="topbar__title">Voice Command Shopping Assistant</h1>
          <LanguageSelector />
        </header>

        <main className="app__body">
          <Suggestions />
          <SearchResults />
          <ShoppingList />
        </main>

        <VoiceControls />
      </div>
    </ShoppingProvider>
  )
}
