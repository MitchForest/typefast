import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '@typefast/backend/api'
import '../styles/profile.css'
import { getCurrentMonth } from '../data/prompts'
import { levelFromXP } from '../data/xp'
import { RESOLUTION_LABELS } from '../lib/h3-constants'
import { AvatarDisplay } from '../components/avatar/avatar-display'
import { AuthGate } from '../components/auth/auth-gate'
import { randomizeAvatarOptions } from '../lib/avatar'
import { authClient } from '../lib/auth-client'
import { useAuthStatus } from '../hooks/use-auth-status'
import { useGeolocation } from '../hooks/use-geolocation'
import { reverseGeocode } from '../lib/reverse-geocode'
import type { AgeBracket, AvatarOptions } from '../data/types'

const AvatarMaker = lazy(() =>
  import('../components/avatar/avatar-maker').then((module) => ({
    default: module.AvatarMaker,
  })),
)

function daysRemaining(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.getDate() - now.getDate()
}

function monthLabel(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
  const { isAnonymous } = useAuthStatus()

  // Signed-out view: single CTA
  if (isAnonymous) {
    return (
      <div className="profile-page">
        <div className="profile-signed-out stagger-enter stagger-1">
          <h2 className="profile-signed-out-title">Your profile</h2>
          <p className="profile-signed-out-copy">
            Sign in to track your stats, claim territory, and climb the
            leaderboard.
          </p>
          <AuthGate hook="Sign in to get started" detail="" inline />
        </div>
      </div>
    )
  }

  return <SignedInProfile />
}

function SignedInProfile() {
  const navigate = useNavigate()
  const player = useQuery(api.players.getPlayer)
  const stats = useQuery(api.sessions.getStats)
  const claims = useQuery(api.claims.getPlayerClaims, {
    month: getCurrentMonth(),
  })
  const updatePlayerMut = useMutation(api.players.updatePlayer)

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions | null>(null)
  const [avatarDataUri, setAvatarDataUri] = useState<string | null>(null)
  const [showAvatarMaker, setShowAvatarMaker] = useState(false)
  const [ageBracket, setAgeBracket] = useState<AgeBracket>(null)
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const geo = useGeolocation()
  const initializedRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const msgRef = useRef<HTMLInputElement>(null)

  // Sync local state from server once loaded
  useEffect(() => {
    if (!player || initializedRef.current) return
    initializedRef.current = true
    setName(player.name)
    setMessage(player.message)
    setAvatarDataUri(player.avatarDataUri ?? null)
    setAvatarOptions(
      player.avatarOptions ? JSON.parse(player.avatarOptions) : null,
    )
    setAgeBracket((player.ageBracket as AgeBracket) ?? null)
    setNotificationsOn(player.emailNotifications !== false)
  }, [player])

  const AGE_BRACKETS: { value: NonNullable<AgeBracket>; label: string }[] = [
    { value: 'under-11', label: 'Under 11' },
    { value: '11-13', label: '11-13' },
    { value: '14-18', label: '14-18' },
    { value: '18+', label: '18+' },
  ]

  function handleBracket(value: NonNullable<AgeBracket>) {
    const next = ageBracket === value ? null : value
    setAgeBracket(next)
    updatePlayerMut({ ageBracket: next })
  }

  async function handleSetLocation() {
    setLocationLoading(true)
    try {
      // Request fresh position
      geo.resetLocation()

      const pos = await new Promise<{ lat: number; lng: number } | null>(
        (resolve) => {
          if (!navigator.geolocation) {
            resolve(null)
            return
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000 },
          )
        },
      )

      if (!pos) {
        setLocationLoading(false)
        return
      }

      const label = await reverseGeocode(pos.lat, pos.lng)
      updatePlayerMut({
        location: pos,
        locationLabel: label ?? undefined,
      })
    } finally {
      setLocationLoading(false)
    }
  }

  useEffect(() => {
    if (avatarDataUri || !avatarOptions) return

    // Generate initial avatar if missing
    const opts = avatarOptions ?? randomizeAvatarOptions()
    let cancelled = false

    async function ensureAvatarData() {
      const { generateAvatarDataUri } = await import('../lib/avatar-render')
      const dataUri = generateAvatarDataUri(opts)
      if (cancelled) return
      setAvatarDataUri(dataUri)
      setAvatarOptions(opts)
      updatePlayerMut({
        avatarOptions: JSON.stringify(opts),
        avatarDataUri: dataUri,
      })
    }

    void ensureAvatarData()
    return () => {
      cancelled = true
    }
  }, [avatarDataUri, avatarOptions, updatePlayerMut])

  const handleAvatarChange = useCallback(
    (opts: AvatarOptions, dataUri: string) => {
      setAvatarOptions(opts)
      setAvatarDataUri(dataUri)
      updatePlayerMut({
        avatarOptions: JSON.stringify(opts),
        avatarDataUri: dataUri,
      })
    },
    [updatePlayerMut],
  )

  // Loading state
  if (!player || !stats) {
    return (
      <div className="profile-page">
        <div
          className="card profile-identity stagger-enter stagger-1"
          style={{ minHeight: 120 }}
        />
      </div>
    )
  }

  const { level, currentXP, nextLevelXP } = levelFromXP(stats.totalXP)
  const xpProgress = nextLevelXP > 0 ? (currentXP / nextLevelXP) * 100 : 100

  // Group claims by resolution
  const claimList = claims ?? []
  const claimsByRes: Record<number, number> = {}
  for (const c of claimList) {
    claimsByRes[c.resolution] = (claimsByRes[c.resolution] ?? 0) + 1
  }
  const totalHexes = claimList.length

  function saveName() {
    updatePlayerMut({ name: name.trim() })
  }

  function saveMessage() {
    const trimmed = message.trim().slice(0, 60)
    setMessage(trimmed)
    updatePlayerMut({ message: trimmed })
  }

  return (
    <div className="profile-page">
      {/* Identity Card */}
      <div className="card profile-identity stagger-enter stagger-1">
        <button
          className="profile-avatar-btn"
          onClick={() => setShowAvatarMaker((v) => !v)}
          type="button"
          aria-label="Edit avatar"
        >
          <AvatarDisplay src={avatarDataUri} name={name} size={56} />
          <span className="profile-avatar-edit">Edit</span>
        </button>
        <div className="profile-fields">
          <div className="profile-field">
            <label className="profile-field-label">Name</label>
            <input
              ref={nameRef}
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder="Anonymous"
              maxLength={24}
            />
          </div>
          <div className="profile-field">
            <label className="profile-field-label">Message on hex</label>
            <input
              ref={msgRef}
              className="profile-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={saveMessage}
              placeholder="Come take it."
              maxLength={60}
            />
          </div>
          <div className="profile-field">
            <label className="profile-field-label">Age bracket</label>
            <div className="profile-bracket-row">
              {AGE_BRACKETS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  className={`chip profile-bracket-chip ${ageBracket === b.value ? 'chip-go' : ''}`}
                  onClick={() => handleBracket(b.value)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {!ageBracket && (
              <span className="profile-bracket-hint">
                Used for bracket leaderboards
              </span>
            )}
          </div>
          <div className="profile-field">
            <label className="profile-field-label">Location</label>
            {player.locationLabel ? (
              <div className="profile-location-row">
                <span className="profile-location-value">
                  {player.locationLabel}
                </span>
                <button
                  type="button"
                  className="profile-location-reset"
                  onClick={handleSetLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Updating...' : 'Reset'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="chip profile-bracket-chip"
                onClick={handleSetLocation}
                disabled={locationLoading}
              >
                {locationLoading ? 'Detecting...' : 'Set my location'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Maker */}
      {showAvatarMaker && (
        <div className="card stagger-enter stagger-1">
          <Suspense
            fallback={
              <div className="claim-status">Loading avatar editor...</div>
            }
          >
            <AvatarMaker
              options={avatarOptions ?? randomizeAvatarOptions()}
              onChange={handleAvatarChange}
            />
          </Suspense>
        </div>
      )}

      {/* Level & XP */}
      <div className="card profile-level-card stagger-enter stagger-2">
        <div className="profile-level-header">
          <span className="profile-level-badge">Lvl {level}</span>
          <span className="profile-level-xp">
            {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill progress-xp"
            style={{ width: `${Math.min(100, xpProgress)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-stats stagger-enter stagger-3">
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x26A1;</div>
          <div className="profile-stat-value">
            {stats.totalXP.toLocaleString()}
          </div>
          <div className="profile-stat-label">Total XP</div>
        </div>
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x1F525;</div>
          <div className="profile-stat-value">{stats.currentStreak}</div>
          <div className="profile-stat-label">Day Streak</div>
        </div>
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x26A1;</div>
          <div className="profile-stat-value">{stats.bestWpm}</div>
          <div className="profile-stat-label">Best WPM</div>
        </div>
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x1F3AF;</div>
          <div className="profile-stat-value">{stats.bestAccuracy}%</div>
          <div className="profile-stat-label">Best ACC</div>
        </div>
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x1F4CA;</div>
          <div className="profile-stat-value">{stats.totalSessions}</div>
          <div className="profile-stat-label">Sessions</div>
        </div>
        <div className="card profile-stat-card">
          <div className="profile-stat-icon">&#x1F30D;</div>
          <div className="profile-stat-value">{totalHexes}</div>
          <div className="profile-stat-label">Hexes</div>
        </div>
      </div>

      {/* Territory */}
      {totalHexes > 0 && (
        <div className="card profile-territory stagger-enter stagger-4">
          <h3 className="profile-section-title">Your Territory</h3>
          <div className="profile-territory-list">
            {Object.entries(claimsByRes)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([res, count]) => (
                <div key={res} className="profile-territory-row">
                  <span className="chip chip-go">
                    {RESOLUTION_LABELS[Number(res)] ?? `Res ${res}`}
                  </span>
                  <span className="profile-territory-count">
                    {count} hex{count !== 1 ? 'es' : ''}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="card profile-notifications stagger-enter stagger-5">
        <div className="profile-notification-row">
          <div className="profile-notification-info">
            <span className="profile-field-label">
              Email me when I'm dethroned
            </span>
            <span className="profile-notification-hint">
              Login codes are always sent
            </span>
          </div>
          <button
            type="button"
            className={`profile-toggle ${notificationsOn ? 'profile-toggle-on' : ''}`}
            onClick={() => {
              const next = !notificationsOn
              setNotificationsOn(next)
              updatePlayerMut({ emailNotifications: next })
            }}
            aria-pressed={notificationsOn}
          >
            <span className="profile-toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Monthly Info */}
      <div className="profile-monthly stagger-enter stagger-6">
        <span className="chip chip-fire">{monthLabel()}</span>
        <span className="profile-monthly-countdown">
          Resets in {daysRemaining()} days
        </span>
      </div>

      {/* Sign Out */}
      <button
        type="button"
        className="profile-signout stagger-enter stagger-7"
        onClick={async () => {
          await authClient.signOut()
          navigate('/')
        }}
      >
        Sign out
      </button>
    </div>
  )
}
