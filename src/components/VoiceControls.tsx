import { useCallback } from 'react'
import { getLexicon } from '../data/lexicon'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useShopping } from '../state/ShoppingContext'
import MicButton from './MicButton'
import TranscriptBar from './TranscriptBar'

/**
 * Wires the microphone to the command pipeline.
 *
 * This is the only place speech state lives, so `MicButton` and
 * `TranscriptBar` stay presentational and the shopping state stays free of
 * anything microphone-related.
 */
export default function VoiceControls() {
  const { language, runCommand } = useShopping()
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
    <section className="voice" aria-label="Voice command">
      <MicButton status={status} onStart={start} onStop={stop} />
      <TranscriptBar
        status={status}
        interimTranscript={interimTranscript}
        errorMessage={errorMessage}
      />
    </section>
  )
}
