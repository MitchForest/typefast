import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import {
  type SessionResult,
  useTypingSession,
} from '../../hooks/use-typing-session'
import { useLayout } from '../../hooks/use-layout'
import { useAuthStatus } from '../../hooks/use-auth-status'
import { TypingCanvas } from './typing-canvas'
import { TypingPrompt } from './typing-prompt'
import { PostGameFlow } from './post-game-flow'
import type { RecordResult } from './score-reveal'

export type { SessionResult }

type TypingSessionProps = {
  prompt: string
  competitive?: boolean
  onComplete: (result: SessionResult) => void
  onReset?: () => void
}

export function TypingSession({
  prompt,
  competitive = true,
  onComplete,
  onReset,
}: TypingSessionProps) {
  const session = useTypingSession(prompt, onComplete)
  const layout = useLayout()
  const { isAnonymous, isPending } = useAuthStatus()
  const recordSessionMut = useMutation(api.sessions.recordSession)
  const rank = useQuery(
    api.leaderboard.getMyRank,
    !isPending && !isAnonymous ? {} : 'skip',
  )
  const [record, setRecord] = useState<RecordResult | null>(null)
  const publishStartedRef = useRef(false)
  const [publishing, setPublishing] = useState(false)

  // Hide chrome during active typing, show on idle/finished
  useEffect(() => {
    if (session.phase === 'running') {
      layout.setChrome(false)
    } else {
      layout.setChrome(true)
    }
    return () => layout.setChrome(true)
  }, [session.phase])

  // Record session and trigger celebrations when finished
  useEffect(() => {
    if (
      !session.result ||
      isPending ||
      isAnonymous ||
      publishStartedRef.current
    ) {
      return
    }

    publishStartedRef.current = true
    setPublishing(true)

    recordSessionMut({
      wpm: session.result.wpm,
      accuracy: session.result.accuracy,
      maxCombo: session.result.maxCombo,
      correctCharacters: session.result.correctCharacters,
      totalCharacters: session.result.totalCharacters,
    })
      .then((rec) => {
        setRecord(rec)

        if (
          rec.personalBest ||
          rec.newLevel ||
          session.result!.accuracy === 100
        ) {
          setTimeout(() => {
            session.canvasRef.current?.burst()
          }, 300)
        }
      })
      .catch((error) => {
        publishStartedRef.current = false
        console.error('Failed to post score', error)
      })
      .finally(() => {
        setPublishing(false)
      })
  }, [
    isAnonymous,
    isPending,
    recordSessionMut,
    session.canvasRef,
    session.result,
  ])

  function handleRestart() {
    publishStartedRef.current = false
    setPublishing(false)
    setRecord(null)
    session.resetSession()
    onReset?.()
  }

  return (
    <div className={`app-shell ${session.phase}`}>
      <TypingCanvas
        ref={session.canvasRef}
        comboIntakeRef={session.comboIntakeRef}
      />

      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <section className="frame">
        <section className="status-bar" aria-label="session status">
          <div className="status-chip status-chip-fire">
            <span className="chip-label">WPM</span>
            <strong>{session.liveWpm}</strong>
          </div>

          <div className="status-chip status-chip-speed">
            <strong>{session.formatTimer(session.timeLeft)}</strong>
          </div>

          <div className="status-chip status-chip-go">
            <strong>{session.accuracy}%</strong>
            <span className="chip-label">ACC</span>
          </div>

          {!session.result && (
            <button
              className="restart-btn"
              onClick={handleRestart}
              type="button"
              aria-label="Restart"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M13.65 2.35A7.96 7.96 0 0 0 8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </section>

        <section className="arena">
          {session.result ? (
            <PostGameFlow
              result={session.result}
              record={record}
              rank={record ? rank : null}
              onRestart={handleRestart}
              competitive={competitive}
              published={!!record && !publishing}
            />
          ) : (
            <div
              className={`track ${session.phase === 'running' ? 'track-active' : ''}`}
              onClick={() => session.textareaRef.current?.focus()}
            >
              <div className="track-viewport">
                <TypingPrompt prompt={prompt} ref={session.promptViewRef} />
              </div>

              <div className="meter" aria-hidden="true">
                <span
                  className="meter-fill"
                  style={{
                    transform: `scaleX(${session.progress || 0.005})`,
                  }}
                />
              </div>

              <textarea
                ref={session.textareaRef}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="input-capture"
                onChange={session.handleChange}
                onKeyDown={session.handleKeyDown}
                onPaste={session.handlePaste}
                spellCheck={false}
              />
            </div>
          )}
        </section>

        {/* Combo counter — always rendered as the particle target */}
        <div
          ref={session.comboTargetRef}
          className={`combo-target ${session.combo > 0 ? 'combo-target-active' : ''} ${session.combo >= 16 ? 'combo-target-blazing' : ''} ${session.combo >= 31 ? 'combo-target-fire' : ''} ${session.combo >= 50 ? 'combo-target-transcendent' : ''}`}
          aria-live="polite"
          aria-label={session.combo > 0 ? `Combo: ${session.combo}` : undefined}
        >
          <span
            ref={session.comboIntakeRef}
            className="combo-intake"
            aria-hidden="true"
          >
            <span className="combo-intake-core" />
          </span>

          {session.combo > 0 && (
            <span className="combo-readout">
              <span className="combo-value">x{session.combo}</span>
              {session.tierName && (
                <span className="combo-tier">{session.tierName}</span>
              )}
            </span>
          )}
        </div>

        <footer className="footer-hint">
          {session.phase === 'idle' && (
            <span>Start typing to begin. Timer starts on first key.</span>
          )}
          {session.phase === 'running' && (
            <span>{Math.round(session.progress * 100)}% through prompt</span>
          )}
        </footer>
      </section>
    </div>
  )
}
