import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import CommandFeedback from './CommandFeedback'
import type { MicStatus } from '../types'

interface TranscriptBarProps {
  status: MicStatus
  interimTranscript: string
  errorMessage: string | null
}

const STATUS_TEXT: Record<MicStatus, string> = {
  idle: 'Tap Speak, or type a command below.',
  listening: 'Listening…',
  processing: 'Processing…',
  unsupported: 'Voice input unavailable — the text box below works exactly the same.',
  denied: 'Microphone blocked.',
  error: 'Voice input failed.',
}

/**
 * Shows the recognition state, what the browser heard, and what the parser
 * made of it. Serves both input paths: a typed command produces the same
 * `CommandResult`, so the panel is the single place the user looks.
 */
export default function TranscriptBar({
  status,
  interimTranscript,
  errorMessage,
}: TranscriptBarProps) {
  const { lastResult, language } = useShopping()
  const rules = getLexicon(language)
  const showInterim = status === 'listening' && interimTranscript.length > 0

  return (
    <div className="transcript">
      <p className="transcript__status">
        <span className="transcript__language">Language: {rules.englishLabel}</span>
        <span className={`transcript__state transcript__state--${status}`}>
          {STATUS_TEXT[status]}
        </span>
      </p>

      {showInterim && (
        <p className="transcript__interim" aria-live="polite">
          “{interimTranscript}”
        </p>
      )}

      {errorMessage && (
        <p className="transcript__error" role="alert">
          {errorMessage}
        </p>
      )}

      <CommandFeedback result={lastResult} />
    </div>
  )
}
