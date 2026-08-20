import { LANGUAGES } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'

/**
 * Command language, as a segmented control.
 *
 * The choice drives both the speech-recognition locale and the parser's
 * vocabulary, and takes effect on the next recognition session.
 */
export default function LanguageSelector() {
  const { language, setLanguage } = useShopping()

  return (
    <div className="lang" role="group" aria-label="Command language">
      {LANGUAGES.map((rules) => (
        <button
          key={rules.code}
          type="button"
          className={`lang__option hit-44${
            language === rules.code ? ' lang__option--active' : ''
          }`}
          onClick={() => setLanguage(rules.code)}
          aria-pressed={language === rules.code}
          lang={rules.code}
        >
          {rules.label}
        </button>
      ))}
    </div>
  )
}
