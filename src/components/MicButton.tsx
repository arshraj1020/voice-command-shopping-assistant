import type { MicStatus } from '../types'

interface MicButtonProps {
  status: MicStatus
  onStart: () => void
  onStop: () => void
}

/** Visible label and accessible name for each microphone state. */
const LABELS: Record<MicStatus, { text: string; action: string }> = {
  idle: { text: 'Speak', action: 'Start voice input' },
  listening: { text: 'Stop', action: 'Stop listening' },
  processing: { text: 'Working…', action: 'Processing your command' },
  unsupported: { text: 'Voice unavailable', action: 'Voice input is not supported in this browser' },
  denied: { text: 'Try again', action: 'Retry voice input after allowing microphone access' },
  error: { text: 'Try again', action: 'Retry voice input' },
}

export default function MicButton({ status, onStart, onStop }: MicButtonProps) {
  const listening = status === 'listening'
  const disabled = status === 'processing' || status === 'unsupported'
  const { text, action } = LABELS[status]

  return (
    <button
      type="button"
      className={`mic mic--${status}`}
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      aria-label={action}
      aria-pressed={listening}
    >
      <span className="mic__icon" aria-hidden="true">
        {listening ? '■' : '🎤'}
      </span>
      <span className="mic__text">{text}</span>
    </button>
  )
}
