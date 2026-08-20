import { useEffect, useRef, type FormEvent } from 'react'
import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import { SendIcon } from './Icon'

interface CommandInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  /** Incremented by the dock to pull focus here after staging a transcript. */
  focusToken: number
}

/**
 * The command box.
 *
 * Two jobs, not one: it is the permanent fallback for browsers or situations
 * without a microphone, *and* the staging surface where a spoken transcript
 * lands so it can be read and corrected before it runs.
 */
export default function CommandInput({
  value,
  onChange,
  onSubmit,
  focusToken,
}: CommandInputProps) {
  const { language } = useShopping()
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

  // A staged transcript arrives focused with the caret at the end, so the
  // most likely next action — fixing the last word — needs no extra tap.
  useEffect(() => {
    if (focusToken === 0) return

    const input = inputRef.current
    if (!input) return

    input.focus()
    const end = input.value.length
    input.setSelectionRange(end, end)
  }, [focusToken])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <form className="dock__form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="dock__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={getLexicon(language).placeholder}
        aria-label="Shopping command"
        autoComplete="off"
        enterKeyHint="send"
      />
      {/* The submit button only appears once there is something to send. */}
      {value.trim().length > 0 && (
        <button type="submit" className="btn btn--icon" aria-label="Run command">
          <SendIcon />
        </button>
      )}
    </form>
  )
}
