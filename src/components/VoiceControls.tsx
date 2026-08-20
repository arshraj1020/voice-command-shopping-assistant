import { useCallback, useState } from 'react'
import { getLexicon } from '../data/lexicon'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { cleanTranscript } from '../lib/normalize'
import { parseCommand } from '../lib/parser'
import { useShopping } from '../state/ShoppingContext'
import type { CommandSource } from '../types'
import CommandFeedback from './CommandFeedback'
import CommandInput from './CommandInput'
import MicButton from './MicButton'
import TranscriptBar from './TranscriptBar'

/**
 * The command dock: everything the user speaks or types into, pinned to the
 * bottom of the screen.
 *
 * It owns three things beyond the microphone itself:
 *
 *   - **the draft**, so a transcript can be staged in the text input and
 *     edited rather than executed blind;
 *   - **alternative selection**, using the parser to re-rank the speech
 *     engine's hypotheses;
 *   - **the execution policy** — what runs immediately, what asks first, and
 *     what waits for the user.
 *
 * All mutation still happens through `runCommand`; nothing here touches the
 * shopping list directly.
 */
export default function VoiceControls() {
  const { language, runCommand, lastResult, items } = useShopping()
  const rules = getLexicon(language)

  const [draft, setDraft] = useState('')
  const [focusToken, setFocusToken] = useState(0)
  /** The pending destructive command, held until the user confirms. */
  const [pendingClear, setPendingClear] = useState<string | null>(null)

  const stageForEditing = useCallback((text: string) => {
    setDraft(text)
    setFocusToken((token) => token + 1)
  }, [])

  /**
   * The single entry point for both typed and spoken commands.
   *
   * `clear` is the only irreversible command, so it is the only one that asks
   * first. Everything else executes, and anything the parser could not read
   * confidently stays in the box for the user to fix — `runCommand` already
   * refuses to mutate the list on a low-confidence or unknown command, so the
   * list is safe either way.
   */
  const submitCommand = useCallback(
    (text: string, source: CommandSource) => {
      const input = text.trim()
      if (!input) return

      // Any new command supersedes a confirmation still waiting on screen.
      setPendingClear(null)

      const parsed = parseCommand(input, language, source)

      if (parsed.intent === 'clear' && parsed.confidence === 'high') {
        setPendingClear(input)
        setDraft(input)
        return
      }

      const result = runCommand(input, source)

      if (result.status === 'error') stageForEditing(input)
      else setDraft('')
    },
    [language, runCommand, stageForEditing],
  )

  /**
   * One spoken utterance, as ranked candidates.
   *
   * Each candidate is repaired first (trailing fillers, repeated seams), then
   * the parser picks: the first candidate it reads confidently wins. This uses
   * the parser we already have as a re-ranker for the speech model — the top
   * acoustic hypothesis is not always the most sensible command.
   */
  const handleResult = useCallback(
    (candidates: string[]) => {
      const cleaned = candidates.map(cleanTranscript).filter(Boolean)
      if (cleaned.length === 0) return

      const confident = cleaned.find((candidate) => {
        const parsed = parseCommand(candidate, language, 'voice')
        return parsed.intent !== 'unknown' && parsed.confidence === 'high'
      })

      submitCommand(confident ?? cleaned[0], 'voice')
    },
    [language, submitCommand],
  )

  const { status, interimTranscript, errorMessage, start, stop } =
    useSpeechRecognition({ lang: rules.recognitionLang, onResult: handleResult })

  const confirmClear = useCallback(() => {
    if (pendingClear) runCommand(pendingClear)
    setPendingClear(null)
    setDraft('')
  }, [pendingClear, runCommand])

  const cancelClear = useCallback(() => {
    setPendingClear(null)
    setDraft('')
  }, [])

  return (
    <div className="dock">
      <div className="dock__inner">
        {/* Destructive commands never run on a transcript alone. */}
        {pendingClear ? (
          <div className="confirm" role="alertdialog" aria-label="Confirm clearing the list">
            <p className="confirm__text">
              Clear all {items.length} {items.length === 1 ? 'item' : 'items'}?
            </p>
            <div className="confirm__actions">
              <button type="button" className="btn btn--sm" onClick={cancelClear}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--sm btn--destructive"
                onClick={confirmClear}
              >
                Clear list
              </button>
            </div>
          </div>
        ) : (
          <CommandFeedback result={lastResult} />
        )}

        <TranscriptBar
          status={status}
          interimTranscript={interimTranscript}
          errorMessage={errorMessage}
        />

        <div className="dock__row">
          <CommandInput
            value={draft}
            onChange={setDraft}
            onSubmit={(value) => submitCommand(value, 'text')}
            focusToken={focusToken}
          />
          <MicButton status={status} onStart={start} onStop={stop} />
        </div>
      </div>
    </div>
  )
}
