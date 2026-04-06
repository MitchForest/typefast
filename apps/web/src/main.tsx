import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from './lib/auth-client'
import Layout from './routes/layout'
import HomePage from './routes/home-page'
import './styles.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

const MapPage = React.lazy(() => import('./routes/map-page'))
const ProfilePage = React.lazy(() => import('./routes/profile-page'))
const LeaderboardPage = React.lazy(() => import('./routes/leaderboard-page'))
const InboxPage = React.lazy(() => import('./routes/inbox-page'))

function RouteSkeleton() {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-ink-muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
      }}
    >
      Loading...
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route
              path="map"
              element={
                <React.Suspense fallback={<RouteSkeleton />}>
                  <MapPage />
                </React.Suspense>
              }
            />
            <Route
              path="leaderboard"
              element={
                <React.Suspense fallback={<RouteSkeleton />}>
                  <LeaderboardPage />
                </React.Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <React.Suspense fallback={<RouteSkeleton />}>
                  <ProfilePage />
                </React.Suspense>
              }
            />
            <Route
              path="inbox"
              element={
                <React.Suspense fallback={<RouteSkeleton />}>
                  <InboxPage />
                </React.Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConvexBetterAuthProvider>
  </React.StrictMode>,
)
