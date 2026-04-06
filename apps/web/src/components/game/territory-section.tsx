import { useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@typefast/backend/api'
import { useGeolocation } from '../../hooks/use-geolocation'
import type { SessionResult, DisplacedPlayer } from '../../data/types'

export type ClaimDetail = {
  h3Index: string
  resolution: number
}

type TerritorySectionProps = {
  result: SessionResult
  onClaimed?: (claims: ClaimDetail[], displaced: DisplacedPlayer[], h3Index: string, sessionTimestamp: number) => void
  onNotClaimed?: () => void
}

/**
 * Auto-claims territory when position is available.
 * Renders nothing — pure side-effect.
 */
export function TerritorySection({
  result,
  onClaimed,
  onNotClaimed,
}: TerritorySectionProps) {
  const geo = useGeolocation()
  const submitScoreMut = useMutation(api.claims.submitScore)
  const submittedRef = useRef(false)
  const requestedRef = useRef(false)
  const resolvedRef = useRef(false)

  // Stable refs for callbacks so effects don't re-fire on parent re-render
  const onClaimedRef = useRef(onClaimed)
  const onNotClaimedRef = useRef(onNotClaimed)
  onClaimedRef.current = onClaimed
  onNotClaimedRef.current = onNotClaimed

  // Stable ref for result so the submit effect doesn't re-fire
  const resultRef = useRef(result)
  resultRef.current = result

  function resolve(outcome: 'claimed', claims: ClaimDetail[], displaced: DisplacedPlayer[], h3Index: string, sessionTimestamp: number): void
  function resolve(outcome: 'not-claimed'): void
  function resolve(outcome: string, claims?: ClaimDetail[], displaced?: DisplacedPlayer[], h3Index?: string, sessionTimestamp?: number) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    if (outcome === 'claimed' && claims) {
      onClaimedRef.current?.(claims, displaced ?? [], h3Index ?? '', sessionTimestamp ?? 0)
    } else {
      onNotClaimedRef.current?.()
    }
  }

  // If no cached position, request a fresh one
  useEffect(() => {
    if (geo.position || requestedRef.current) return
    if (geo.status === 'idle') {
      requestedRef.current = true
      geo.requestLocation()
    }
  }, [geo.position, geo.status, geo.requestLocation])

  // When position is denied or errored, give up
  useEffect(() => {
    if (geo.status === 'denied' || geo.status === 'error') {
      resolve('not-claimed')
    }
  }, [geo.status])

  // Submit claim when position is available
  useEffect(() => {
    if (submittedRef.current || !geo.position) return
    submittedRef.current = true

    const r = resultRef.current

    async function submitClaim() {
      try {
        const { positionToH3, getAncestors } = await import(
          '../../lib/h3-helpers'
        )
        const h3Index = positionToH3(geo.position!.lat, geo.position!.lng)
        const ancestors = getAncestors(h3Index)

        const sessionTimestamp = Date.now()
        const { claimed, claims, displacedPlayers } = await submitScoreMut({
          h3Index,
          wpm: r.wpm,
          accuracy: r.accuracy,
          ancestors: ancestors.map((a) => ({
            h3Index: a.h3Index,
            resolution: a.resolution,
          })),
        })

        if (claimed) {
          resolve(
            'claimed',
            claims.map((c) => ({ h3Index: c.h3Index, resolution: c.resolution })),
            displacedPlayers.map((d) => ({
              userId: d.userId,
              playerName: d.playerName,
              avatarDataUri: d.avatarDataUri ?? null,
              resolution: d.resolution,
            })),
            h3Index,
            sessionTimestamp,
          )
        } else {
          resolve('not-claimed')
        }
      } catch {
        resolve('not-claimed')
      }
    }

    void submitClaim()
  }, [geo.position, submitScoreMut])

  return null
}
