import { useCallback, useEffect, useRef, useState } from 'react'
import type { MicStatus } from '../types'

/**
 * Thin wrapper around the browser's native Web Speech API.
 *
 * Owns only the microphone lifecycle — it knows nothing about shopping.
 * The transcript is handed to `onResult`, which feeds the same
 * `runCommand()` path the text input uses.
 *
 * Push-to-talk, not always-listening: mobile browsers terminate recognition
 * on every pause, so a continuous session is unreliable in exactly the place
 * this app is meant to be used.
 */

/* ------------------------------------------------------------------ */
/* Minimal typings                                                     */
/* ------------------------------------------------------------------ */

/*
 * Declared locally rather than augmenting the global scope: `SpeechRecognition`
 * is not in every TypeScript DOM lib, `webkitSpeechRecognition` is in none of
 * them, and a local interface cannot collide with whichever lib is in use.
 */

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultLike {
  readonly length: number
  readonly isFinal: boolean
  readonly [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string
  readonly message?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

function isSupported(): boolean {
  return getRecognitionConstructor() !== null
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const UNSUPPORTED_MESSAGE =
  'Voice input is not supported in this browser. Use the text command box instead.'

const PERMISSION_MESSAGE =
  'Microphone permission was denied. Allow microphone access in your browser settings, or use the text command box.'

const GENERIC_MESSAGE =
  'Something went wrong with voice input. Try again, or use the text command box.'

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'no-speech': 'No speech detected. Try again.',
  'audio-capture': 'No microphone was found. Check your device audio settings.',
  network:
    'The speech service could not be reached. Check your connection, or use the text command box.',
  'not-allowed': PERMISSION_MESSAGE,
  'service-not-allowed': PERMISSION_MESSAGE,
}

/** How long `processing` stays visible, so the transition is perceivable. */
const PROCESSING_HOLD_MS = 400

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

interface UseSpeechRecognitionOptions {
  /** BCP-47 tag, e.g. "en-US" or "hi-IN". Applied to the next session. */
  lang: string
  /** Called once per completed utterance, with the final transcript. */
  onResult: (transcript: string) => void
}

interface UseSpeechRecognitionResult {
  supported: boolean
  status: MicStatus
  /** Live text while the user is still speaking. */
  interimTranscript: string
  errorMessage: string | null
  start: () => void
  stop: () => void
}

export function useSpeechRecognition({
  lang,
  onResult,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [supported] = useState(isSupported)
  const [status, setStatus] = useState<MicStatus>(() =>
    isSupported() ? 'idle' : 'unsupported',
  )
  const [interimTranscript, setInterimTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    isSupported() ? null : UNSUPPORTED_MESSAGE,
  )

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const finalReceivedRef = useRef(false)
  const statusRef = useRef<MicStatus>(status)
  const onResultRef = useRef(onResult)
  const langRef = useRef(lang)

  // Kept in refs so the recognition handlers never read a stale value.
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const applyStatus = useCallback((next: MicStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor()

    if (!Recognition) {
      setErrorMessage(UNSUPPORTED_MESSAGE)
      applyStatus('unsupported')
      return
    }

    if (statusRef.current === 'listening' || statusRef.current === 'processing') {
      return
    }

    clearHold()
    setErrorMessage(null)
    setInterimTranscript('')
    finalReceivedRef.current = false

    const recognition = new Recognition()
    recognition.lang = langRef.current
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const alternative = result[0]
        const transcript = alternative ? alternative.transcript : ''

        if (result.isFinal) final += transcript
        else interim += transcript
      }

      if (interim) setInterimTranscript(interim)

      const transcript = final.trim()
      if (!transcript) return

      finalReceivedRef.current = true
      setInterimTranscript(transcript)
      applyStatus('processing')
      onResultRef.current(transcript)
    }

    recognition.onerror = (event) => {
      // Aborting is what `stop()` does; it is not a failure.
      if (event.error === 'aborted') return

      setErrorMessage(ERROR_MESSAGES[event.error] ?? GENERIC_MESSAGE)
      applyStatus(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'denied'
          : 'error',
      )
    }

    recognition.onend = () => {
      recognitionRef.current = null

      // Leave a reported failure on screen rather than silently resetting.
      if (statusRef.current === 'denied' || statusRef.current === 'error') return

      if (finalReceivedRef.current) {
        holdTimerRef.current = window.setTimeout(() => {
          holdTimerRef.current = null
          applyStatus('idle')
        }, PROCESSING_HOLD_MS)
        return
      }

      applyStatus('idle')
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      applyStatus('listening')
    } catch {
      // start() throws if a session is somehow already running.
      recognitionRef.current = null
      setErrorMessage(GENERIC_MESSAGE)
      applyStatus('error')
    }
  }, [applyStatus, clearHold])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current

    if (!recognition) {
      if (statusRef.current === 'listening') applyStatus('idle')
      return
    }

    try {
      recognition.stop()
    } catch {
      // Already stopped — onend will settle the status.
    }
  }, [applyStatus])

  useEffect(
    () => () => {
      clearHold()

      const recognition = recognitionRef.current
      if (!recognition) return

      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null

      try {
        recognition.abort()
      } catch {
        // Nothing useful to do while unmounting.
      }

      recognitionRef.current = null
    },
    [clearHold],
  )

  return { supported, status, interimTranscript, errorMessage, start, stop }
}
