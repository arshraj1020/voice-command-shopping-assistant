import { useCallback } from 'react'
import { getLexicon } from '../data/lexicon'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useShopping } from '../state/ShoppingContext'
import CommandFeedback from './CommandFeedback'
import CommandInput from './CommandInput'
import MicButton from './MicButton'
import TranscriptBar from './TranscriptBar'

/**
 * The command dock: everything the user speaks or types into, pinned to the
 * bottom of the screen.
 *
 * This is the only place speech state lives, so `MicButton`, `TranscriptBar`,
 * and `CommandInput` stay presentational and the shopping state stays free of
 * anything microphone-related.
 */
export default function VoiceControls() {
  const { language, runCommand, lastResult } = useShopping()
  const rules = getLexicon(language)

  // A spoken command takes exactly the path a typed one does.
  const handleResult = useCallback(
    (transcript: string) => {
      runCommand(transcript)
    },
    [runCommand],
  )

  const { status, interimTranscript, errorMessage, start, stop } =
    useSpeechRecognition({ lang: rules.recognitionLang, onResult: handleResult })

  return (
    <div className="dock">
      <div className="dock__inner">
        <CommandFeedback result={lastResult} />

        <TranscriptBar
          status={status}
          interimTranscript={interimTranscript}
          errorMessage={errorMessage}
        />

        <div className="dock__row">
          <CommandInput />
          <MicButton status={status} onStart={start} onStop={stop} />
        </div>
      </div>
    </div>
  )
}
