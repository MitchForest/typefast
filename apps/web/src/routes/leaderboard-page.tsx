import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import '../styles/leaderboard.css'
import { LeaderboardRow } from '../components/leaderboard/leaderboard-row'
import { AvatarDisplay } from '../components/avatar/avatar-display'
import { useAuthStatus } from '../hooks/use-auth-status'

type Scope = 'global' | 'domain'

function monthLabel(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatArea(sqMi: number): string {
  if (sqMi >= 1_000_000) return `${(sqMi / 1_000_000).toFixed(1)}M sq mi`
  if (sqMi >= 1_000) return `${(sqMi / 1_000).toFixed(1)}K sq mi`
  return `${sqMi.toLocaleString()} sq mi`
}

export default function LeaderboardPage() {
  const { isAnonymous } = useAuthStatus()
  const player = useQuery(api.players.getPlayer)
  const stats = useQuery(api.sessions.getStats)
  const history = useQuery(api.sessions.getSessionHistory)
  const globalBoard = useQuery(api.leaderboard.getGlobalLeaderboard, {
    limit: 50,
  })
  const rank = useQuery(api.leaderboard.getMyRank)
  const [scope, setScope] = useState<Scope>('global')

  const domainBoard = useQuery(
    api.domainLeaderboard.getDomainLeaderboard,
    scope === 'domain' && player?.emailDomain
      ? { domain: player.emailDomain, limit: 50 }
      : 'skip',
  )

  const activeBoard =
    scope === 'domain' ? domainBoard?.entries : globalBoard

  // Highlight the current user in the leaderboard
  const myUserId = player?.userId ?? null

  // Personal session history ranked by WPM
  const sessionList = history ?? []
  const ranked = [...sessionList].sort(
    (a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy,
  )

  // Compute deltas between consecutive sessions (chronological)
  const chronological = [...sessionList].sort(
    (a, b) => a.timestamp - b.timestamp,
  )
  const deltaMap = new Map<number, number>()
  for (let i = 1; i < chronological.length; i++) {
    deltaMap.set(
      chronological[i].timestamp,
      chronological[i].wpm - chronological[i - 1].wpm,
    )
  }

  const displayStats = stats ?? {
    bestWpm: 0,
    bestAccuracy: 0,
    totalSessions: 0,
  }

  const hasDomain = !!player?.emailDomain

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="lb-header stagger-enter stagger-1">
        <h2 className="lb-title">Leaderboard</h2>
        <span className="chip chip-fire">{monthLabel()}</span>
      </div>

      {/* Your Rank — the hero moment (signed-in with sessions only) */}
      {rank && (
        <div className="lb-your-rank stagger-enter stagger-2">
          <div className="lb-your-rank-number">#{rank.globalRank}</div>
          <div className="lb-your-rank-meta">
            <span className="lb-your-rank-total">
              of {rank.globalTotal.toLocaleString()} players
            </span>
            <span className="chip chip-speed lb-your-rank-percentile">
              Top {Math.max(1, 100 - rank.percentile)}%
            </span>
          </div>
        </div>
      )}

      {/* Stats strip — only for signed-in users with sessions */}
      {!isAnonymous && displayStats.totalSessions > 0 && (
        <div className="lb-stats-strip stagger-enter stagger-3">
          <div className="lb-stat-pill">
            <span className="lb-stat-pill-value">{displayStats.bestWpm}</span>
            <span className="lb-stat-pill-label">Best WPM</span>
          </div>
          <div className="lb-stat-pill">
            <span className="lb-stat-pill-value">
              {displayStats.bestAccuracy}%
            </span>
            <span className="lb-stat-pill-label">Best ACC</span>
          </div>
          <div className="lb-stat-pill">
            <span className="lb-stat-pill-value">
              {displayStats.totalSessions}
            </span>
            <span className="lb-stat-pill-label">Sessions</span>
          </div>
        </div>
      )}

      {/* Rankings list */}
      {activeBoard && activeBoard.length > 0 && (
        <div className="lb-list stagger-enter stagger-4">
          <div className="lb-list-header">
            <span className="lb-list-title">
              {scope === 'domain' && player?.emailDomain
                ? `@${player.emailDomain}`
                : 'Rankings'}
            </span>
            <div className="lb-list-header-right">
              {scope === 'domain' && domainBoard && (
                <span className="lb-domain-meta">
                  {domainBoard.memberCount} member
                  {domainBoard.memberCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {activeBoard.map((entry, i) => {
            const isMe = entry.userId === myUserId
            return (
              <div
                key={entry.userId}
                className={`lb-global-row ${i === 0 ? 'lb-global-row-first' : ''} ${isMe ? 'lb-global-row-me' : ''}`}
              >
                <span className="lb-global-rank">
                  {i === 0 ? '\uD83D\uDC51' : `#${i + 1}`}
                </span>
                <AvatarDisplay
                  src={entry.avatarDataUri}
                  name={entry.playerName}
                  size={28}
                />
                <div className="lb-global-info">
                  <span className="lb-global-name">
                    {entry.playerName}
                    {isMe && <span className="lb-global-you">you</span>}
                  </span>
                  <span className="lb-global-sub">
                    {scope === 'global' &&
                      'locationLabel' in entry &&
                      entry.locationLabel && (
                        <span className="lb-global-location">
                          {entry.locationLabel}
                        </span>
                      )}
                    {scope === 'global' &&
                      'totalAreaSqMi' in entry &&
                      entry.totalAreaSqMi > 0 && (
                        <span className="lb-global-territory">
                          {formatArea(entry.totalAreaSqMi)}
                        </span>
                      )}
                  </span>
                </div>
                <span className="lb-global-wpm">{entry.wpm} WPM</span>
                <span className="lb-global-acc">{entry.accuracy}%</span>
              </div>
            )
          })}
        </div>
      )}

      {activeBoard && activeBoard.length === 0 && (
        <div className="lb-empty stagger-enter stagger-4">
          <p className="lb-empty-text">No entries yet.</p>
          <p className="lb-empty-hint">Be the first on the board!</p>
        </div>
      )}

      {/* Scope toggle — non-prominent, below the rankings */}
      {hasDomain && (
        <div className="lb-scope-toggle stagger-enter stagger-5">
          <button
            type="button"
            className={`lb-scope-btn ${scope === 'global' ? 'lb-scope-btn-active' : ''}`}
            onClick={() => setScope('global')}
          >
            Everyone
          </button>
          <button
            type="button"
            className={`lb-scope-btn ${scope === 'domain' ? 'lb-scope-btn-active' : ''}`}
            onClick={() => setScope('domain')}
          >
            @{player?.emailDomain}
          </button>
        </div>
      )}

      {/* Session history */}
      {ranked.length > 0 && (
        <div className="lb-list stagger-enter stagger-6">
          <div className="lb-list-header">
            <span className="lb-list-title">Your Sessions</span>
          </div>
          {ranked.slice(0, 20).map((entry, i) => (
            <LeaderboardRow
              key={entry.timestamp}
              rank={i + 1}
              wpm={entry.wpm}
              accuracy={entry.accuracy}
              date={formatDate(entry.timestamp)}
              delta={deltaMap.get(entry.timestamp)}
              isBest={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
