import { getLexicon } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'
import { CheckIcon } from './Icon'
import type { CommandResult, ParsedCommand } from '../types'

/**
 * The parser's reading of the command, as compact chips.
 *
 * Kept on every outcome, not just failures: it is the clearest evidence that
 * the natural-language layer actually understood what was said.
 */
function Understood({ command }: { command: ParsedCommand }) {
  if (command.intent === 'unknown') return null

  return (
    <p className="fb__understood">
      <span className="fb__intent">{command.intent.toUpperCase()}</span>
      {command.item && <span className="fb__chip">{command.item}</span>}
      {command.quantity !== null && (
        <span className="fb__chip">Qty {command.quantity}</span>
      )}
      {command.unit && <span className="fb__chip">{command.unit}</span>}
      {command.confidence === 'low' && <span className="fb__chip">low confidence</span>}
    </p>
  )
}

/**
 * What happened to the last command.
 *
 * A success is a single transient line — it auto-dismisses, because
 * "Added milk" stops being useful within seconds. A failure expands to show
 * the raw transcript and tappable example commands, because that is the
 * moment the user needs the most help.
 */
export default function CommandFeedback({ result }: { result: CommandResult | null }) {
  const { runCommand } = useShopping()
  if (!result) return null

  const { command, status, message } = result
  const failed = status === 'error'

  return (
    <div className={`fb fb--${status}`} role="status" aria-live="polite">
      {failed && <p className="fb__heard">Heard: &ldquo;{command.raw}&rdquo;</p>}

      <p className="fb__line">
        {status === 'success' && <CheckIcon size={16} />}
        <span className="fb__message">{message}</span>
      </p>

      <Understood command={command} />

      {/* Tapping an example runs it — the fastest way out of a dead end. */}
      {failed && (
        <ul className="fb__examples">
          {getLexicon(command.language).examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                className="ex"
                onClick={() => runCommand(example)}
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
