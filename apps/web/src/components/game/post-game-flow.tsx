import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScoreReveal } from './score-reveal'
import { TrashTalkModal } from './trash-talk-composer'
import { AuthGate } from '../auth/auth-gate'
import { useAuthStatus } from '../../hooks/use-auth-status'
import {
  RESOLUTION_AREA_SQ_MI,
  RESOLUTION_LABELS,
  RESOLUTION_ZOOM,
} from '../../lib/h3-constants'
import type { SessionResult, DisplacedPlayer } from '../../data/types'
import type { RecordResult } from './score-reveal'
import type { ClaimDetail } from './territory-section'

const TerritorySection = lazy(() =>
  import('./territory-section').then((module) => ({
    default: module.TerritorySection,
  })),
)

type PostGameFlowProps = {
  result: SessionResult
  record: RecordResult | null
  rank: { globalRank: number; globalTotal: number } | null | undefined
  onRestart: () => void
  competitive: boolean
  published: boolean
}

/** How long (ms) to hold on the score celebration before showing CTAs */
const CELEBRATION_MS = 2000

export function PostGameFlow({
  result,
  record,
  rank,
  onRestart,
  competitive,
  published,
}: PostGameFlowProps) {
  const { isAnonymous, isPending } = useAuthStatus()
  const navigate = useNavigate()

  // ── Claim state ──
  const [claimResult, setClaimResult] = useState<
    | { type: 'claimed'; claims: ClaimDetail[]; displacedPlayers: DisplacedPlayer[]; h3Index: string; sessionTimestamp: number }
    | { type: 'not-claimed' }
    | null
  >(null)

  // ── Trash talk state ──
  const [trashTalkDismissed, setTrashTalkDismissed] = useState(false)

  // ── Stage timer ──
  // Stage 1 = celebration (score only), Stage 2 = outcome + CTAs
  const [stage, setStage] = useState<1 | 2>(1)

  // Wait for auth resolution so anonymous users don't get stuck in stage 1
  // while Better Auth is still hydrating.
  useEffect(() => {
    if (isPending) return
    if (!isAnonymous && !record) return
    const timer = window.setTimeout(() => setStage(2), CELEBRATION_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isAnonymous, isPending, record])

  // If stage 2 arrives before record (edge case), skip to stage 2
  const showCTA = stage === 2

  // ── Derived claim data ──
  const largestClaim =
    claimResult?.type === 'claimed'
      ? claimResult.claims.reduce((best, c) =>
          c.resolution < best.resolution ? c : best,
        )
      : null

  const largestArea = largestClaim
    ? RESOLUTION_AREA_SQ_MI[largestClaim.resolution]
    : null

  const largestLabel = largestClaim
    ? RESOLUTION_LABELS[largestClaim.resolution]
    : null

  function handleSeeTerritory() {
    if (!largestClaim) return
    navigate('/map', {
      state: {
        h3Index: largestClaim.h3Index,
        resolution: largestClaim.resolution,
        zoom: RESOLUTION_ZOOM[largestClaim.resolution],
      },
    })
  }

  // Displaced players to trash talk
  const displacedPlayers =
    claimResult?.type === 'claimed' ? claimResult.displacedPlayers : []
  const showTrashTalk =
    !trashTalkDismissed && displacedPlayers.length > 0

  // Determine what the primary CTA should be right now
  const claimed = claimResult?.type === 'claimed' && largestClaim

  // ── Auth modal for anonymous users ──
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open modal when stage 2 triggers for anonymous users
  useEffect(() => {
    if (showCTA && isAnonymous) {
      dialogRef.current?.showModal()
    }
  }, [showCTA, isAnonymous])

  const handleDismiss = useCallback(() => {
    dialogRef.current?.close()
    onRestart()
  }, [onRestart])

  // Close on backdrop click (click on <dialog> itself, not its children)
  const handleDialogClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) handleDismiss()
    },
    [handleDismiss],
  )

  return (
    <div className="results">
      {/* ── Stage 1: Score celebration (always visible) ── */}
      <ScoreReveal result={result} record={record} />

      {/* Silent territory auto-claim running in background */}
      {published && competitive && (
        <Suspense fallback={null}>
          <TerritorySection
            result={result}
            onClaimed={(claims, displaced, h3Index, sessionTimestamp) =>
              setClaimResult({ type: 'claimed', claims, displacedPlayers: displaced, h3Index, sessionTimestamp })
            }
            onNotClaimed={() => setClaimResult({ type: 'not-claimed' })}
          />
        </Suspense>
      )}

      {/* ── Auth modal for anonymous users ── */}
      {isAnonymous && (
        <dialog
          ref={dialogRef}
          className="auth-modal"
          onClick={handleDialogClick}
          onCancel={(e) => { e.preventDefault(); handleDismiss() }}
        >
          <div className="auth-modal-body">
            <AuthGate
              hook="Sign in to save your score"
              detail=""
              inline
              onDismiss={handleDismiss}
            />
            <button
              className="auth-modal-dismiss"
              onClick={handleDismiss}
              type="button"
            >
              Skip &mdash; type again
            </button>
          </div>
        </dialog>
      )}

      {/* ── Stage 2: Outcome + CTAs (after celebration timer, signed-in only) ── */}
      {showCTA && !isAnonymous && (
        <>
          {/* Signed in + claimed hex → territory celebration */}
          {claimed && (
            <>
              <div className="results-territory-celebration results-stage2-enter">
                <div className="results-territory-headline">
                  You're the fastest typist in{' '}
                  <strong>
                    {largestArea?.toLocaleString()} sq mi
                  </strong>
                </div>
                <div className="results-territory-detail">
                  {largestLabel} level
                  {claimResult.claims.length > 1 && (
                    <>
                      {' '}&middot; {claimResult.claims.length} hexes
                      claimed
                    </>
                  )}
                </div>

                <button
                  className="btn-3d btn-go btn-lg results-territory-cta"
                  type="button"
                  onClick={handleSeeTerritory}
                >
                  See your territory
                </button>
              </div>
              <div className="results-secondary results-stage2-enter results-stage2-delay">
                <button
                  className="results-text-link"
                  onClick={onRestart}
                  type="button"
                >
                  Go again
                </button>
              </div>

              {/* Trash talk modal overlays on top */}
              {showTrashTalk && (
                <TrashTalkModal
                  displacedPlayer={displacedPlayers[0]}
                  sessionTimestamp={claimResult.sessionTimestamp}
                  wpm={result.wpm}
                  h3Index={claimResult.h3Index}
                  onDone={() => setTrashTalkDismissed(true)}
                />
              )}
            </>
          )}

          {/* Signed in + not claimed (or claim still pending) → leaderboard */}
          {!claimed && (
            <>
              <div className="results-rank-card results-stage2-enter">
                {rank && (
                  <div className="results-rank-headline">
                    #{rank.globalRank} of{' '}
                    {rank.globalTotal.toLocaleString()}
                  </div>
                )}
                <button
                  className="btn-3d btn-speed btn-lg"
                  type="button"
                  onClick={() => navigate('/leaderboard')}
                >
                  See leaderboard
                </button>
              </div>
              <div className="results-secondary results-stage2-enter results-stage2-delay">
                <button
                  className="results-text-link"
                  onClick={onRestart}
                  type="button"
                >
                  Go again
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export type { RecordResult }
