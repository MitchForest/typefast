import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import {
  TRASH_TALK_PRESETS,
  TRASH_TALK_MAX_LENGTH,
} from '@typefast/backend/gameLogic'
import { AvatarDisplay } from '../avatar/avatar-display'
import { RESOLUTION_LABELS } from '../../lib/h3-constants'
import type { DisplacedPlayer } from '../../data/types'
import '../../styles/trash-talk.css'

type TrashTalkModalProps = {
  displacedPlayer: DisplacedPlayer
  sessionTimestamp: number
  wpm: number
  h3Index: string
  onDone: () => void
}

export function TrashTalkModal({
  displacedPlayer,
  sessionTimestamp,
  wpm,
  h3Index,
  onDone,
}: TrashTalkModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const sendTrashTalk = useMutation(api.trashTalk.sendTrashTalk)
  const player = useQuery(api.players.getPlayer)
  const [mode, setMode] = useState<'presets' | 'custom'>('presets')
  const [customText, setCustomText] = useState('')
  const [sent, setSent] = useState(false)
  const [sentMessage, setSentMessage] = useState('')
  const [sending, setSending] = useState(false)

  const areaLabel =
    RESOLUTION_LABELS[displacedPlayer.resolution] ?? 'Territory'

  const isMinor =
    player?.ageBracket === 'under-11' ||
    player?.ageBracket === '11-13' ||
    player?.ageBracket === '14-18'

  // Auto-open on mount
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const handleDismiss = useCallback(() => {
    dialogRef.current?.close()
    onDone()
  }, [onDone])

  async function handleSendPreset(key: string) {
    if (sending) return
    setSending(true)
    const preset = TRASH_TALK_PRESETS.find((p) => p.key === key)
    try {
      await sendTrashTalk({
        recipientId: displacedPlayer.userId,
        message: key,
        isPreset: true,
        h3Index,
        resolution: displacedPlayer.resolution,
        areaLabel,
        wpm,
        sessionTimestamp,
      })
      setSentMessage(preset?.text ?? key)
      setSent(true)
      setTimeout(() => {
        dialogRef.current?.close()
        onDone()
      }, 1500)
    } catch {
      setSending(false)
    }
  }

  async function handleSendCustom() {
    if (sending || customText.trim().length === 0) return
    setSending(true)
    try {
      await sendTrashTalk({
        recipientId: displacedPlayer.userId,
        message: customText.trim(),
        isPreset: false,
        h3Index,
        resolution: displacedPlayer.resolution,
        areaLabel,
        wpm,
        sessionTimestamp,
      })
      setSentMessage(customText.trim())
      setSent(true)
      setTimeout(() => {
        dialogRef.current?.close()
        onDone()
      }, 1500)
    } catch {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="trash-talk-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
      onCancel={(e) => {
        e.preventDefault()
        handleDismiss()
      }}
    >
      <div className="trash-talk-modal-body">
        {sent ? (
          <div className="trash-talk-sent stagger-enter stagger-1">
            <AvatarDisplay
              src={displacedPlayer.avatarDataUri}
              name={displacedPlayer.playerName}
              size={48}
            />
            <div className="trash-talk-sent-label">SENT</div>
            <div className="trash-talk-sent-message">
              &ldquo;{sentMessage}&rdquo;
              <span className="trash-talk-sent-to">
                &rarr; {displacedPlayer.playerName || 'Anonymous'}
              </span>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="trash-talk-close"
              onClick={handleDismiss}
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="trash-talk-hero stagger-enter stagger-1">
              <AvatarDisplay
                src={displacedPlayer.avatarDataUri}
                name={displacedPlayer.playerName}
                size={56}
              />
              <div className="trash-talk-headline">DETHRONED</div>
              <div className="trash-talk-subtext">
                You knocked{' '}
                <strong>
                  {displacedPlayer.playerName || 'Anonymous'}
                </strong>{' '}
                off {areaLabel}
              </div>
              <span className="chip chip-speed trash-talk-context-chip">
                {areaLabel} &middot; {wpm} WPM
              </span>
            </div>

            {mode === 'presets' ? (
              <div className="trash-talk-options stagger-enter stagger-2">
                <div className="trash-talk-prompt">
                  Send some trash talk
                </div>
                <div className="trash-talk-grid">
                  {TRASH_TALK_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className="trash-talk-preset"
                      disabled={sending}
                      onClick={() => handleSendPreset(preset.key)}
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>
                {!isMinor && (
                  <button
                    type="button"
                    className="trash-talk-custom-toggle"
                    onClick={() => setMode('custom')}
                  >
                    Write your own
                  </button>
                )}
              </div>
            ) : (
              <div className="trash-talk-options stagger-enter stagger-1">
                <div className="trash-talk-custom-input-row">
                  <input
                    className="trash-talk-input"
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={TRASH_TALK_MAX_LENGTH}
                    placeholder="Say something..."
                    autoFocus
                  />
                  <span className="trash-talk-char-count">
                    {customText.length}/{TRASH_TALK_MAX_LENGTH}
                  </span>
                </div>
                <div className="trash-talk-custom-actions">
                  <button
                    type="button"
                    className="btn-3d btn-secondary btn-sm"
                    onClick={() => setMode('presets')}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-3d btn-fire btn-sm"
                    disabled={sending || customText.trim().length === 0}
                    onClick={handleSendCustom}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="trash-talk-dismiss"
              onClick={handleDismiss}
            >
              Nah, I&rsquo;m good
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}
