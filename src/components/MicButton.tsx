import { MicIcon, MicOffIcon, SpinnerIcon, StopIcon } from './Icon'
import type { MicStatus } from '../types'

interface MicButtonProps {
  status: MicStatus
  onStart: () => void
  onStop: () => void
}

/** Accessible name per state — describes the action, not the state. */
const ACTIONS: Record<MicStatus, string> = {
  idle: 'Start voice input',
  listening: 'Stop listening',
  processing: 'Processing your command',
  unsupported: 'Voice input is not supported in this browser',
  denied: 'Retry voice input after allowing microphone access',
  error: 'Retry voice input',
}

function Glyph({ status }: { status: MicStatus }) {
  if (status === 'listening') return <StopIcon size={22} />
  if (status === 'processing') return <SpinnerIcon size={22} />
  if (status === 'denied') return <MicOffIcon size={22} />
  return <MicIcon size={22} />
}

/**
 * The primary action of the whole application.
 *
 * Renders nothing when speech recognition is unavailable: a permanently dead
 * primary button is worse than no button, and the dock shows an explicit
 * text-fallback message in its place.
 */
export default function MicButton({ status, onStart, onStop }: MicButtonProps) {
  if (status === 'unsupported') return null

  const listening = status === 'listening'

  return (
    <button
      type="button"
      className={`mic mic--${status}`}
      onClick={listening ? onStop : onStart}
      disabled={status === 'processing'}
      aria-label={ACTIONS[status]}
      aria-pressed={listening}
    >
      <Glyph status={status} />
    </button>
  )
}
