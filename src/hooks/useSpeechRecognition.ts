import { useCallback, useEffect, useRef, useState } from 'react'
import type { MicStatus } from '../types'

/**
 * Managed tap-to-start speech capture, built on the browser's native
 * Web Speech API.
 *
 * The browser decides when *it* thinks you stopped talking, and it is wrong
 * often enough to be a problem: a hesitation mid-command ends the session and
 * truncates the sentence. So this hook owns the session lifecycle instead.
 *
 *   - `continuous: true` keeps the recogniser open across pauses
 *   - our own silence timer decides when the user actually finished
 *   - a natural `onend` restarts transparently, invisible to the user
 *   - final results accumulate across those restarts
 *   - the command is delivered exactly once, when the session really ends
 *
 * The hook knows nothing about shopping, parsing, or language vocabulary. It
 * hands back the candidate transcripts and the caller decides what they mean.
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
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

/** Silence after which we treat the utterance as finished. */
const SILENCE_MS = 2000

/** Hard ceiling on one listening session — the mic is never open longer. */
const MAX_SESSION_MS = 15000

/** Safety net if `stop()` never produces an `onend`. */
const STOP_GRACE_MS = 1000

/** How long `processing` stays visible, so the transition is perceivable. */
const PROCESSING_HOLD_MS = 400

/** Guards against an endless restart loop if the browser keeps ending. */
const MAX_RESTARTS = 8

/** Ranked hypotheses to request; the caller re-ranks them with the parser. */
const MAX_ALTERNATIVES = 3

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const UNSUPPORTED_MESSAGE =
  'Voice input is not supported in this browser. Use the text command box instead.'

const PERMISSION_MESSAGE =
  'Microphone permission was denied. Allow microphone access in your browser settings, or use the text command box.'

const GENERIC_MESSAGE =
  'Something went wrong with voice input. Try again, or use the text command box.'

const NO_SPEECH_MESSAGE = 'No speech detected. Try again.'

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'audio-capture': 'No microphone was found. Check your device audio settings.',
  network:
    'The speech service could not be reached. Check your connection, or use the text command box.',
  'not-allowed': PERMISSION_MESSAGE,
  'service-not-allowed': PERMISSION_MESSAGE,
}

/* ------------------------------------------------------------------ */
/* Candidate assembly                                                  */
/* ------------------------------------------------------------------ */

/**
 * Build whole-utterance candidates from the per-chunk alternatives.
 *
 * Candidate *n* takes alternative *n* from every chunk (falling back to the
 * top alternative where a chunk offered fewer), so each candidate is a
 * coherent reading of the entire command rather than a mix-and-match.
 */
function buildCandidates(chunks: readonly string[][], interim: string): string[] {
  if (chunks.length === 0) {
    const trimmed = interim.trim()
    return trimmed ? [trimmed] : []
  }

  const depth = Math.min(
    MAX_ALTERNATIVES,
    Math.max(...chunks.map((alternatives) => alternatives.length)),
  )

  const candidates: string[] = []
  for (let rank = 0; rank < depth; rank += 1) {
    const text = chunks
      .map((alternatives) => alternatives[rank] ?? alternatives[0] ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) candidates.push(text)
  }

  return [...new Set(candidates)]
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

interface UseSpeechRecognitionOptions {
  /** BCP-47 tag, e.g. "en-US" or "hi-IN". Applied to the next session. */
  lang: string
  /**
   * Called **once per session**, never per interim or final result, with the
   * ranked whole-utterance candidates. Empty sessions do not call it.
   */
  onResult: (candidates: string[]) => void
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

  // Session bookkeeping. Refs, not state: the recognition handlers are
  // attached once per recogniser and must never read a stale value.
  const sessionActiveRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const deliveredRef = useRef(false)
  const restartsRef = useRef(0)
  const chunksRef = useRef<string[][]>([])
  const interimRef = useRef('')

  const silenceTimerRef = useRef<number | null>(null)
  const sessionTimerRef = useRef<number | null>(null)
  const graceTimerRef = useRef<number | null>(null)
  const holdTimerRef = useRef<number | null>(null)

  const statusRef = useRef<MicStatus>(status)
  const onResultRef = useRef(onResult)
  const langRef = useRef(lang)

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

  const clearTimer = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current)
      ref.current = null
    }
  }, [])

  const clearSessionTimers = useCallback(() => {
    clearTimer(silenceTimerRef)
    clearTimer(sessionTimerRef)
    clearTimer(graceTimerRef)
  }, [clearTimer])

  /** Detach handlers and abort, so a dead recogniser can never call back. */
  const teardownRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return

    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null

    try {
      recognition.abort()
    } catch {
      // Already finished.
    }
  }, [])

  /**
   * End the session exactly once and, if there is anything to say, hand the
   * candidates to the caller. Every exit path funnels through here, which is
   * what makes duplicate execution impossible.
   */
  const finishSession = useCallback(
    (deliver: boolean) => {
      if (deliveredRef.current) return
      deliveredRef.current = true
      sessionActiveRef.current = false

      clearSessionTimers()

      const candidates = buildCandidates(chunksRef.current, interimRef.current)
      chunksRef.current = []
      interimRef.current = ''
      setInterimTranscript('')

      if (!deliver) return

      if (candidates.length === 0) {
        setErrorMessage(NO_SPEECH_MESSAGE)
        applyStatus('error')
        return
      }

      applyStatus('processing')
      onResultRef.current(candidates)

      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null
        // A later error state must not be overwritten by the hold expiring.
        if (statusRef.current === 'processing') applyStatus('idle')
      }, PROCESSING_HOLD_MS)
    },
    [applyStatus, clearSessionTimers],
  )

  /** Ask the recogniser to wrap up, with a grace period as a safety net. */
  const requestStop = useCallback(() => {
    stopRequestedRef.current = true

    const recognition = recognitionRef.current
    if (!recognition) {
      finishSession(true)
      return
    }

    try {
      recognition.stop()
    } catch {
      finishSession(true)
      return
    }

    clearTimer(graceTimerRef)
    graceTimerRef.current = window.setTimeout(() => {
      graceTimerRef.current = null
      finishSession(true)
    }, STOP_GRACE_MS)
  }, [clearTimer, finishSession])

  /** Restarted on every result — this is our end-of-speech detector. */
  const armSilenceTimer = useCallback(() => {
    clearTimer(silenceTimerRef)
    silenceTimerRef.current = window.setTimeout(() => {
      silenceTimerRef.current = null
      requestStop()
    }, SILENCE_MS)
  }, [clearTimer, requestStop])

  /**
   * Open one underlying recogniser. Called on `start()` and again on each
   * transparent restart; the session state around it is untouched.
   */
  const openRecognition = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) {
      setErrorMessage(UNSUPPORTED_MESSAGE)
      applyStatus('unsupported')
      return
    }

    const recognition = new Recognition()
    recognition.lang = langRef.current
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = MAX_ALTERNATIVES

    recognition.onresult = (event) => {
      let interim = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]

        if (result.isFinal) {
          const alternatives: string[] = []
          for (let rank = 0; rank < result.length && rank < MAX_ALTERNATIVES; rank += 1) {
            const text = result[rank]?.transcript?.trim()
            if (text) alternatives.push(text)
          }
          // Accumulate; never execute here. The session decides when it ends.
          if (alternatives.length > 0) chunksRef.current.push(alternatives)
        } else {
          interim += result[0]?.transcript ?? ''
        }
      }

      interimRef.current = interim
      setInterimTranscript(interim.trim())

      // Any speech at all resets the clock.
      armSilenceTimer()
    }

    recognition.onerror = (event) => {
      // Aborting is what teardown does; it is not a failure.
      if (event.error === 'aborted') return

      if (event.error === 'no-speech') {
        // Not an error yet — if we already captured words, deliver them.
        stopRequestedRef.current = true
        return
      }

      const denied =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'

      setErrorMessage(ERROR_MESSAGES[event.error] ?? GENERIC_MESSAGE)
      applyStatus(denied ? 'denied' : 'error')
      stopRequestedRef.current = true
      finishSession(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null

      if (!sessionActiveRef.current) return

      if (stopRequestedRef.current || restartsRef.current >= MAX_RESTARTS) {
        finishSession(true)
        return
      }

      // The browser ended on its own mid-command. Reopen silently — the user
      // stays in "Listening…" and the accumulated transcript is preserved.
      restartsRef.current += 1
      openRecognition()
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setErrorMessage(GENERIC_MESSAGE)
      applyStatus('error')
      finishSession(false)
    }
  }, [applyStatus, armSilenceTimer, finishSession])

  const start = useCallback(() => {
    if (!isSupported()) {
      setErrorMessage(UNSUPPORTED_MESSAGE)
      applyStatus('unsupported')
      return
    }

    if (statusRef.current === 'listening' || statusRef.current === 'processing') {
      return
    }

    clearTimer(holdTimerRef)
    clearSessionTimers()
    teardownRecognition()

    sessionActiveRef.current = true
    stopRequestedRef.current = false
    deliveredRef.current = false
    restartsRef.current = 0
    chunksRef.current = []
    interimRef.current = ''

    setErrorMessage(null)
    setInterimTranscript('')
    applyStatus('listening')

    openRecognition()
    armSilenceTimer()

    // The microphone is never open longer than this, whatever happens.
    sessionTimerRef.current = window.setTimeout(() => {
      sessionTimerRef.current = null
      requestStop()
    }, MAX_SESSION_MS)
  }, [
    applyStatus,
    armSilenceTimer,
    clearSessionTimers,
    clearTimer,
    openRecognition,
    requestStop,
    teardownRecognition,
  ])

  const stop = useCallback(() => {
    if (!sessionActiveRef.current) return
    requestStop()
  }, [requestStop])

  useEffect(
    () => () => {
      clearTimer(holdTimerRef)
      clearSessionTimers()
      sessionActiveRef.current = false
      deliveredRef.current = true
      teardownRecognition()
    },
    [clearSessionTimers, clearTimer, teardownRecognition],
  )

  return { supported, status, interimTranscript, errorMessage, start, stop }
}
