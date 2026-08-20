import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import type { MicStatus } from '../types'

interface TranscriptBarProps {
  status: MicStatus
  interimTranscript: string
  errorMessage: string | null
}

/** What the status line says in each microphone state. */
const STATUS_TEXT: Record<MicStatus, string> = {
  idle: 'Tap the mic and speak, or type a command',
  // Says out loud that hesitating is safe — the session survives pauses now.
  listening: 'Listening… pauses are fine',
  processing: 'Working on it…',
  unsupported: '',
  denied: 'Microphone blocked',
  error: 'Voice input failed',
}

/**
 * Recognition state and the live transcript.
 *
 * Sits inside the command dock, directly above the input, so the user reads
 * the app's state exactly where they are about to act.
 */
export default function TranscriptBar({
  status,
  interimTranscript,
  errorMessage,
}: TranscriptBarProps) {
  const { language } = useShopping()
  const rules = getLexicon(language)

  const unsupported = status === 'unsupported'
  const showInterim = status === 'listening' && interimTranscript.length > 0

  return (
    <>
      {showInterim && (
        <p className="interim" aria-live="polite" aria-atomic="true">
          {interimTranscript}
        </p>
      )}

      {/*
        The unsupported case gets a plain, permanent explanation instead of a
        dead microphone: everything still works by typing.
      */}
      {unsupported ? (
        <p className="banner banner--info">
          Voice input isn&rsquo;t supported in this browser. Type your commands
          below — every feature works exactly the same.
        </p>
      ) : (
        errorMessage && (
          <p className="banner banner--error" role="alert">
            {errorMessage}
          </p>
        )
      )}

      {!unsupported && (
        <p className={`status status--${status}`}>
          <span>{STATUS_TEXT[status]}</span>
          <span aria-hidden="true">·</span>
          <span>{rules.englishLabel}</span>
        </p>
      )}
    </>
  )
}
