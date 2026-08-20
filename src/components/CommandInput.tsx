import { useState, type FormEvent } from 'react'
import { useShopping } from '../state/ShoppingContext'
import CommandFeedback from './CommandFeedback'
import type { CommandResult } from '../types'

/**
 * Typed command entry.
 *
 * Voice input will feed the same `runCommand` path in a later phase, so this
 * input stays as the fallback for browsers without speech recognition.
 */
export default function CommandInput() {
  const { runCommand } = useShopping()
  const [text, setText] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const input = text.trim()
    if (!input) return

    const outcome = runCommand(input)
    setResult(outcome)

    // Keep the text on failure so the user can correct it.
    if (outcome.status !== 'error') setText('')
  }

  return (
    <div className="command">
      <form className="command__form" onSubmit={handleSubmit}>
        <input
          className="command__input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a command, e.g. add 2 bottles of water"
          aria-label="Shopping command"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" disabled={!text.trim()}>
          Run
        </button>
      </form>

      <CommandFeedback result={result} />
    </div>
  )
}
