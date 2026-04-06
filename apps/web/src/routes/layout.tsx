import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import { LayoutContext } from '../hooks/use-layout'
import { useAutoAnonymous } from '../hooks/use-auto-anonymous'
import { useEnsurePlayer } from '../hooks/use-ensure-player'
import { useAuthStatus } from '../hooks/use-auth-status'
import { AvatarDisplay } from '../components/avatar/avatar-display'
import { detectCountry } from '../lib/country'

export default function Layout() {
  const { isAuthenticated } = useAutoAnonymous()
  const { isAnonymous, isClaimed } = useAuthStatus()
  const player = useEnsurePlayer()
  const updatePlayer = useMutation(api.players.updatePlayer)
  const unreadCount = useQuery(
    api.trashTalk.getUnreadCount,
    isClaimed ? {} : 'skip',
  )
  const [chrome, setChrome] = useState(true)

  // Auto-detect country on first load
  useEffect(() => {
    if (!isAuthenticated || !player || player.country) return
    detectCountry().then((country) => {
      if (country) updatePlayer({ country })
    })
  }, [isAuthenticated, player, updatePlayer])

  const setChromeCb = useCallback((visible: boolean) => {
    setChrome(visible)
  }, [])

  return (
    <LayoutContext value={{ chrome, setChrome: setChromeCb }}>
      <div className={`layout ${!chrome ? 'layout--immersive' : ''}`}>
        <header className="layout-header">
          <div className="layout-header-left">
            <NavLink to="/" className="layout-brand">
              <span className="layout-brand-type">Type</span>
              <span className="layout-brand-fast">Fast</span>
            </NavLink>

            <nav className="layout-nav-links" aria-label="main navigation">
              <NavLink to="/" end className="layout-nav-link">
                Type
              </NavLink>
              <NavLink to="/map" className="layout-nav-link">
                Map
              </NavLink>
              <NavLink to="/leaderboard" className="layout-nav-link">
                Board
              </NavLink>
              <NavLink to="/inbox" className="layout-nav-link layout-nav-link-talk">
                Talk
                {!!unreadCount && unreadCount > 0 && (
                  <span className="layout-nav-badge">{unreadCount}</span>
                )}
              </NavLink>
            </nav>
          </div>

          <div className="layout-header-right">
            <NavLink
              to="/profile"
              className="layout-avatar-link"
              aria-label="Profile"
            >
              <AvatarDisplay
                src={isAnonymous ? null : (player?.avatarDataUri ?? null)}
                name={isAnonymous ? '' : (player?.name ?? '')}
                size={32}
              />
            </NavLink>
          </div>
        </header>

        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </LayoutContext>
  )
}
