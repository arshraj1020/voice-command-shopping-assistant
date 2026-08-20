import { LANGUAGES } from '../data/lexicon'
import { useShopping } from '../state/ShoppingContext'

/**
 * Picks the command language. The choice drives both the speech-recognition
 * locale and which vocabulary the parser uses, and it takes effect on the
 * next recognition session.
 */
export default function LanguageSelector() {
  const { language, setLanguage } = useShopping()

  return (
    <div className="lang" role="group" aria-label="Command language">
      {LANGUAGES.map((rules) => (
        <button
          key={rules.code}
          type="button"
          className={`lang__option${language === rules.code ? ' lang__option--active' : ''}`}
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
