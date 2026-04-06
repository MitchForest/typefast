import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import { TRASH_TALK_REACTIONS } from '@typefast/backend/gameLogic'
import { AvatarDisplay } from '../components/avatar/avatar-display'
import { AuthGate } from '../components/auth/auth-gate'
import { useAuthStatus } from '../hooks/use-auth-status'
import '../styles/inbox.css'

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export default function InboxPage() {
  const { isAnonymous } = useAuthStatus()

  if (isAnonymous) {
    return (
      <div className="inbox-page">
        <h1 className="inbox-title">Trash Talk</h1>
        <div className="inbox-empty stagger-enter stagger-1">
          <AuthGate
            hook="Sign in to see your messages"
            detail=""
            inline
          />
        </div>
      </div>
    )
  }

  return <SignedInInbox />
}

function SignedInInbox() {
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)

  if (selectedOpponent) {
    return (
      <ThreadDetail
        opponentId={selectedOpponent}
        onBack={() => setSelectedOpponent(null)}
      />
    )
  }

  return <ThreadList onSelect={setSelectedOpponent} />
}

function ThreadList({ onSelect }: { onSelect: (id: string) => void }) {
  const threads = useQuery(api.trashTalk.getThreads)

  return (
    <div className="inbox-page">
      <h1 className="inbox-title stagger-enter stagger-1">Trash Talk</h1>

      {threads && threads.length === 0 && (
        <div className="inbox-empty stagger-enter stagger-2">
          <div className="inbox-empty-icon">&#x1F525;</div>
          <div className="inbox-empty-text">
            No beef yet. Go type and dethrone someone!
          </div>
          <a href="/" className="btn-3d btn-go">
            Start typing
          </a>
        </div>
      )}

      {threads &&
        threads.map((thread, i) => (
          <div
            key={thread.opponentId}
            className={`card card-interactive inbox-thread stagger-enter stagger-${Math.min(i + 2, 8)}`}
            onClick={() => onSelect(thread.opponentId)}
          >
            <div className="inbox-thread-avatar">
              <AvatarDisplay
                src={thread.opponentAvatar}
                name={thread.opponentName}
                size={40}
              />
              {thread.unreadCount > 0 && (
                <div className="inbox-thread-unread-dot" />
              )}
            </div>

            <div className="inbox-thread-body">
              <div className="inbox-thread-name">{thread.opponentName}</div>
              <div className="inbox-thread-preview">
                {thread.isSender ? 'You: ' : ''}
                {thread.latestMessage}
              </div>
            </div>

            <div className="inbox-thread-meta">
              <div className="inbox-thread-time">
                {formatRelativeTime(thread.latestTimestamp)}
              </div>
              {thread.unreadCount > 0 && (
                <div className="inbox-thread-badge">
                  {thread.unreadCount}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  )
}

function ThreadDetail({
  opponentId,
  onBack,
}: {
  opponentId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const thread = useQuery(api.trashTalk.getThread, { opponentId })
  const markReadMut = useMutation(api.trashTalk.markRead)
  const reactMut = useMutation(api.trashTalk.reactToTrashTalk)
  const player = useQuery(api.players.getPlayer)

  // Mark unread messages as read when thread opens
  useEffect(() => {
    if (!thread || !player) return
    const unreadIds = thread.messages
      .filter((m) => m.recipientId === player.userId && !m.readAt)
      .map((m) => m._id)
    if (unreadIds.length > 0) {
      markReadMut({ trashTalkIds: unreadIds })
    }
  }, [thread, player, markReadMut])

  async function handleReact(messageId: string, reaction: string) {
    await reactMut({
      trashTalkId: messageId as any,
      reaction,
    })
  }

  const opponentName = thread?.opponent?.name ?? 'Anonymous'
  const opponentAvatar = thread?.opponent?.avatarDataUri ?? null

  // Show CTA only if the most recent message is from the opponent (they dethroned you last)
  const opponentHasLastWord =
    thread?.messages[0]?.senderId === opponentId

  return (
    <div className="inbox-page">
      <div className="inbox-detail-header stagger-enter stagger-1">
        <button
          type="button"
          className="inbox-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <AvatarDisplay
          src={opponentAvatar}
          name={opponentName}
          size={32}
        />
        <span className="inbox-detail-name">{opponentName}</span>
      </div>

      <div className="inbox-messages">
        {thread?.messages.map((msg, i) => {
          const isSent = msg.senderId !== opponentId
          const isReceived = !isSent

          return (
            <div
              key={msg._id}
              className={`inbox-bubble ${isSent ? 'inbox-bubble-sent' : 'inbox-bubble-received'} stagger-enter stagger-${Math.min(i + 2, 8)}`}
            >
              <div className="inbox-bubble-context">
                <span className="chip chip-speed">
                  {msg.areaLabel} &middot; {msg.wpm} WPM
                </span>
              </div>

              <div className="inbox-bubble-message">
                &ldquo;{msg.message}&rdquo;
              </div>

              <div className="inbox-bubble-time">
                {formatRelativeTime(msg.timestamp)}
              </div>

              {/* Show existing reaction */}
              {msg.reaction && (
                <div className="inbox-reaction">{msg.reaction}</div>
              )}

              {/* Show reaction picker for received messages without a reaction */}
              {isReceived && !msg.reaction && (
                <div className="inbox-reaction-picker">
                  {TRASH_TALK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="inbox-reaction-btn"
                      onClick={() => handleReact(msg._id, emoji)}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA only when opponent dethroned you last — you need to take it back */}
      {opponentHasLastWord && (
        <div className="inbox-cta stagger-enter stagger-3">
          <button
            type="button"
            className="btn-3d btn-go btn-lg"
            onClick={() => navigate('/')}
          >
            Reclaim your turf
          </button>
        </div>
      )}
    </div>
  )
}
