import { useConvexAuth } from 'convex/react'
import { authClient } from '../lib/auth-client'

/**
 * Returns the current auth status.
 * isAnonymous = true means the user hasn't created a real account yet.
 */
export function useAuthStatus() {
  const { isAuthenticated: hasConvexAuth, isLoading: isConvexLoading } =
    useConvexAuth()
  const { data: session, isPending: isSessionPending } = authClient.useSession()

  // Better Auth's session hook can lag behind logout for a render or two.
  // Once Convex auth is gone, the rest of the app should treat the user as
  // signed out immediately instead of rendering claimed-user UI with no data.
  const hasNoLiveSession = !isConvexLoading && !hasConvexAuth
  const isAnonymous = hasNoLiveSession || session?.user?.isAnonymous === true
  const isAuthenticated = hasConvexAuth && !!session?.session
  const isClaimed = isAuthenticated && !isAnonymous
  const isPending = isConvexLoading || isSessionPending
  const user = hasNoLiveSession ? null : (session?.user ?? null)

  return {
    isAnonymous,
    isAuthenticated,
    isClaimed,
    isPending,
    user,
  }
}
