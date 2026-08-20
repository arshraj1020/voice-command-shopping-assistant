import { useState, type FormEvent } from 'react'
import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'

/**
 * Typed command entry.
 *
 * A permanent fallback, not a stopgap: it runs the identical `runCommand`
 * path as speech, so every feature stays reachable when a microphone is
 * unavailable, blocked, or simply inconvenient.
 */
export default function CommandInput() {
  const { runCommand, language } = useShopping()
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const input = text.trim()
    if (!input) return

    const outcome = runCommand(input)

    // Keep the text on failure so the user can correct it.
    if (outcome.status !== 'error') setText('')
  }

  return (
    <form className="command" onSubmit={handleSubmit}>
      <input
        className="command__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={getLexicon(language).placeholder}
        aria-label="Shopping command"
        autoComplete="off"
        enterKeyHint="send"
      />
      <button type="submit" disabled={!text.trim()}>
        Run
      </button>
    </form>
  )
}
