import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  startTransition,
  useState,
} from 'react'
import type { TypingCanvasHandle } from '../components/game/typing-canvas'
import { getTierName } from '../components/game/combo-tiers'
import type { TypingPromptHandle } from '../components/game/typing-prompt'

const SESSION_LENGTH_MS = 60_000

export type Phase = 'idle' | 'running' | 'finished'

export type SessionResult = {
  accuracy: number
  correctCharacters: number
  totalCharacters: number
  wpm: number
  maxCombo: number
}

function countCorrectCharacters(prompt: string, attempt: string) {
  let correct = 0

  for (let index = 0; index < attempt.length; index += 1) {
    if (attempt[index] === prompt[index]) {
      correct += 1
    }
  }

  return correct
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useTypingSession(
  prompt: string,
  onComplete: (result: SessionResult) => void,
) {
  const [attempt, setAttempt] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [timeLeft, setTimeLeft] = useState(SESSION_LENGTH_MS)
  const [combo, setCombo] = useState(0)
  const [result, setResult] = useState<SessionResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const promptViewRef = useRef<TypingPromptHandle>(null)
  const startedAtRef = useRef<number | null>(null)
  const attemptRef = useRef('')
  const renderedAttemptRef = useRef('')
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const canvasRef = useRef<TypingCanvasHandle>(null)
  const comboTargetRef = useRef<HTMLDivElement>(null)
  const comboIntakeRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<Phase>('idle')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const deferredAttempt = useDeferredValue(attempt)
  const correctCharacters = useMemo(
    () => countCorrectCharacters(prompt, deferredAttempt),
    [prompt, deferredAttempt],
  )

  const accuracy =
    deferredAttempt.length === 0
      ? 100
      : Math.round((correctCharacters / deferredAttempt.length) * 100)
  const elapsedMilliseconds =
    phase === 'idle' ? 0 : SESSION_LENGTH_MS - timeLeft
  const liveWpm =
    elapsedMilliseconds <= 0
      ? 0
      : Math.round(correctCharacters / 5 / (elapsedMilliseconds / 60_000))

  const progress = Math.min(1, deferredAttempt.length / prompt.length)
  const tierName = getTierName(combo)

  useEffect(() => {
    if (phase === 'idle') {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [phase])

  const syncPromptView = useCallback(() => {
    const nextAttempt = attemptRef.current
    const previousAttempt = renderedAttemptRef.current
    const launchSnapshots = promptViewRef.current?.syncAttempt(nextAttempt) ?? []

    const isForwardAppend =
      nextAttempt.length > previousAttempt.length &&
      nextAttempt.startsWith(previousAttempt)

    if (isForwardAppend && phaseRef.current === 'running') {
      const canvas = canvasRef.current
      const targetRect =
        comboIntakeRef.current?.getBoundingClientRect() ??
        comboTargetRef.current?.getBoundingClientRect()

      if (canvas && targetRect) {
        const launchSnapshotByIndex = new Map(
          launchSnapshots.map((snapshot) => [snapshot.index, snapshot.rect]),
        )

        for (
          let index = previousAttempt.length;
          index < nextAttempt.length;
          index += 1
        ) {
          const typed = nextAttempt[index]
          const expected = prompt[index]
          const correct = typed === expected

          if (correct) {
            comboRef.current += 1
            maxComboRef.current = Math.max(
              maxComboRef.current,
              comboRef.current,
            )
          } else {
            comboRef.current = 0
          }

          const charRect = launchSnapshotByIndex.get(index)

          if (!charRect) {
            continue
          }

          if (correct) {
            canvas.spawnCorrect(
              expected,
              charRect,
              comboRef.current,
              targetRect,
            )
          } else {
            canvas.spawnError(typed ?? '', charRect, comboRef.current)
          }
        }

        startTransition(() => {
          setCombo(comboRef.current)
        })
      }
    }

    renderedAttemptRef.current = nextAttempt
  }, [prompt])

  useEffect(() => {
    if (phase !== 'running') {
      return
    }

    const tick = () => {
      const startedAt = startedAtRef.current

      if (!startedAt) {
        return
      }

      const elapsed = Date.now() - startedAt
      const remaining = SESSION_LENGTH_MS - elapsed

      if (remaining <= 0) {
        finishSession()
        return
      }

      setTimeLeft(remaining)
    }

    tick()

    const interval = window.setInterval(tick, 100)

    return () => window.clearInterval(interval)
  }, [phase])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    attemptRef.current = attempt
  }, [attempt])

  useEffect(() => {
    startedAtRef.current = null
    phaseRef.current = 'idle'
    attemptRef.current = ''
    renderedAttemptRef.current = ''
    comboRef.current = 0
    maxComboRef.current = 0
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }
    setCombo(0)
    setAttempt('')
    setPhase('idle')
    setTimeLeft(SESSION_LENGTH_MS)
    setResult(null)
    requestAnimationFrame(() => {
      promptViewRef.current?.syncAttempt('')
    })
  }, [prompt])

  const finishSession = useEffectEvent(() => {
    const snapshot = textareaRef.current?.value ?? attemptRef.current
    const correct = countCorrectCharacters(prompt, snapshot)
    const elapsedMinutes = SESSION_LENGTH_MS / 60_000

    // Trigger settle transition — collect all visible char positions
    if (canvasRef.current && promptViewRef.current) {
      const goColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-go')
        .trim()
      const missColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-miss')
        .trim()

      canvasRef.current.settle(
        promptViewRef.current.collectVisibleTypedCharacters(
          snapshot,
          goColor,
          missColor,
        ),
      )
    }

    const result: SessionResult = {
      accuracy:
        snapshot.length === 0
          ? 100
          : Math.round((correct / snapshot.length) * 100),
      correctCharacters: correct,
      totalCharacters: snapshot.length,
      wpm: Math.round(correct / 5 / elapsedMinutes),
      maxCombo: maxComboRef.current,
    }

    phaseRef.current = 'finished'
    attemptRef.current = snapshot
    setAttempt(snapshot)
    setTimeLeft(0)
    setPhase('finished')
    setResult(result)
    onCompleteRef.current(result)
  })

  function resetSession() {
    startedAtRef.current = null
    phaseRef.current = 'idle'
    attemptRef.current = ''
    renderedAttemptRef.current = ''
    comboRef.current = 0
    maxComboRef.current = 0
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }
    promptViewRef.current?.syncAttempt('')
    setAttempt('')
    setCombo(0)
    setPhase('idle')
    setTimeLeft(SESSION_LENGTH_MS)
    setResult(null)
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (phaseRef.current === 'finished') {
      return
    }

    const nextAttempt = event.target.value
      .replace(/\n/g, ' ')
      .slice(0, prompt.length)

    if (nextAttempt !== event.target.value) {
      event.target.value = nextAttempt
    }

    if (phaseRef.current === 'idle' && nextAttempt.length > 0) {
      startedAtRef.current = Date.now()
      phaseRef.current = 'running'
      setPhase('running')
    }

    attemptRef.current = nextAttempt
    syncPromptView()
    startTransition(() => {
      setAttempt(nextAttempt)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault()
  }

  return {
    // State
    phase,
    attempt,
    timeLeft,
    combo,
    accuracy,
    liveWpm,
    progress,
    tierName,
    prompt,
    result,

    // Refs (for JSX)
    textareaRef,
    promptViewRef,
    canvasRef,
    comboTargetRef,
    comboIntakeRef,

    // Handlers
    handleChange,
    handleKeyDown,
    handlePaste,
    resetSession,

    // Helpers
    formatTimer,
  }
}
