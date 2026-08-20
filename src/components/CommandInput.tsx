import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import { SendIcon } from './Icon'

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
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" focuses the command box, as long as the user is not already typing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return

      const active = document.activeElement
      const typing =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      if (typing) return

      event.preventDefault()
      inputRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const input = text.trim()
    if (!input) return

    const outcome = runCommand(input)

    // Keep the text on failure so the user can correct it.
    if (outcome.status !== 'error') setText('')
  }

  const hasText = text.trim().length > 0

  return (
    <form className="dock__form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="dock__field"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={getLexicon(language).placeholder}
        aria-label="Shopping command"
        autoComplete="off"
        enterKeyHint="send"
      />
      {/* The submit button only appears once there is something to send. */}
      {hasText && (
        <button type="submit" className="btn btn--icon" aria-label="Run command">
          <SendIcon />
        </button>
      )}
    </form>
  )
}
