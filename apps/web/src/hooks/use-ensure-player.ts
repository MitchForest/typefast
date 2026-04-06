import { useEffect, useRef } from 'react'
import { useConvexAuth } from 'convex/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@typefast/backend/api'
import { useAuthStatus } from './use-auth-status'

/**
 * Ensures a player document exists for the authenticated user.
 * Creates one automatically after anonymous sign-in if missing.
 */
export function useEnsurePlayer() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { isPending, user } = useAuthStatus()
  const authReady = !isLoading && !isPending && isAuthenticated && !!user?.id
  const player = useQuery(api.players.getPlayer, authReady ? {} : 'skip')
  const ensurePlayer = useMutation(api.players.ensurePlayer)
  const ensuredUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authReady || !user?.id) return

    if (player !== null && player !== undefined) {
      ensuredUserIdRef.current = user.id
      return
    }

    if (player === undefined) return
    if (ensuredUserIdRef.current === user.id) return

    ensuredUserIdRef.current = user.id

    void ensurePlayer().catch((error) => {
      ensuredUserIdRef.current = null
      console.error('Failed to ensure player', error)
    })
  }, [authReady, ensurePlayer, player, user?.id])

  return player
}
