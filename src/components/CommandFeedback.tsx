import type { CommandResult } from '../types'

const EXAMPLES = [
  'add milk',
  'add 2 bottles of water',
  'remove milk',
  'change apples to 5',
]

/**
 * Shows what the parser heard and what it understood.
 *
 * The same panel will display speech transcripts once voice input is added,
 * so the user can always see how a command was interpreted.
 */
export default function CommandFeedback({ result }: { result: CommandResult | null }) {
  if (!result) return null

  const { command, status, message } = result
  const understood = command.intent !== 'unknown'

  return (
    <section className={`feedback feedback--${status}`} role="status" aria-live="polite">
      <p className="feedback__heard">
        <span className="feedback__label">Heard</span>
        <span className="feedback__raw">“{command.raw}”</span>
      </p>

      {understood && (
        <p className="feedback__understood">
          <span className="feedback__label">Understood</span>
          <span className="feedback__intent">{command.intent.toUpperCase()}</span>
          {command.item && <span className="feedback__chip">Item: {command.item}</span>}
          {command.quantity !== null && (
            <span className="feedback__chip">Quantity: {command.quantity}</span>
          )}
          {command.unit && <span className="feedback__chip">Unit: {command.unit}</span>}
          {command.confidence === 'low' && (
            <span className="feedback__chip">Confidence: low</span>
          )}
        </p>
      )}

      <p className="feedback__message">{message}</p>

      {status === 'error' && (
        <ul className="feedback__examples">
          {EXAMPLES.map((example) => (
            <li key={example}>“{example}”</li>
          ))}
        </ul>
      )}
    </section>
  )
}
