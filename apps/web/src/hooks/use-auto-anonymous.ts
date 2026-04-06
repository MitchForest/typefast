import { useEffect, useRef } from 'react'
import { useConvexAuth } from 'convex/react'
import { authClient } from '../lib/auth-client'

/**
 * Auto-signs in anonymously if no session exists.
 * Called once in Layout so every visitor gets a real user ID immediately.
 */
export function useAutoAnonymous() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (isLoading) return

    if (isAuthenticated) {
      attemptedRef.current = false
      return
    }

    if (attemptedRef.current) return

    attemptedRef.current = true

    void authClient.signIn.anonymous().catch((error) => {
      attemptedRef.current = false
      console.error('Failed to create anonymous session', error)
    })
  }, [isLoading, isAuthenticated])

  return { isLoading, isAuthenticated }
}
