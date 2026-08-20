import { getLexicon } from '../data/lexicon'
import type { CommandResult } from '../types'

/**
 * Shows what was heard and what the parser understood.
 *
 * The same panel serves typed commands and speech transcripts, so the user
 * can always see how their words were interpreted.
 */
export default function CommandFeedback({ result }: { result: CommandResult | null }) {
  if (!result) return null

  const { command, status, message } = result
  const understood = command.intent !== 'unknown'
  const examples = getLexicon(command.language).examples

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
          {examples.map((example) => (
            <li key={example}>“{example}”</li>
          ))}
        </ul>
      )}
    </section>
  )
}
