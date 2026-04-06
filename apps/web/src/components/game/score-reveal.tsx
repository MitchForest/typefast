import type { SessionResult } from '../../data/types'

type RecordResult = {
  baseXP: number
  speedXP: number
  accuracyXP: number
  comboXP: number
  totalXP: number
  personalBest: boolean
  newLevel: boolean
  deltaFromBest: number
  deltaFromLast: number
}

type ScoreRevealProps = {
  result: SessionResult
  record: RecordResult | null
}

export function ScoreReveal({ result, record }: ScoreRevealProps) {
  const personalBest = record?.personalBest ?? false
  const deltaFromBest = record?.deltaFromBest ?? 0
  const deltaFromLast = record?.deltaFromLast ?? 0
  const hasKicker =
    personalBest || result.accuracy === 100 || record?.newLevel === true

  return (
    <>
      {/* Hero: kicker + WPM + delta */}
      <div className="results-hero stagger-enter stagger-1">
        {personalBest && (
          <div className="results-badge results-badge-best">
            NEW PERSONAL BEST
          </div>
        )}
        {result.accuracy === 100 && (
          <div className="results-badge results-badge-perfect">PERFECT</div>
        )}
        {record?.newLevel && (
          <div className="results-badge results-badge-level">LEVEL UP</div>
        )}
        {!hasKicker && <div className="results-kicker">Time.</div>}

        <div className="results-wpm">
          {result.wpm}
          <span className="results-unit">WPM</span>
        </div>

        <div className="results-delta">
          {!personalBest && deltaFromBest !== 0 && (
            <span className="results-delta-line results-delta-best">
              {Math.abs(deltaFromBest)} from your best
            </span>
          )}
          {deltaFromLast !== 0 && (
            <span
              className={`results-delta-line ${deltaFromLast > 0 ? 'results-delta-up' : 'results-delta-down'}`}
            >
              {deltaFromLast > 0 ? '\u25B2' : '\u25BC'}{' '}
              {deltaFromLast > 0 ? 'up' : 'down'} {Math.abs(deltaFromLast)} from
              last
            </span>
          )}
        </div>
      </div>

      {/* Inline stats — one compact line */}
      <div className="results-inline-stats stagger-enter stagger-2">
        <span>{result.accuracy}% acc</span>
        <span className="results-inline-sep">&middot;</span>
        <span>x{result.maxCombo} combo</span>
        {record && (
          <>
            <span className="results-inline-sep">&middot;</span>
            <span>+{record.totalXP} XP</span>
          </>
        )}
      </div>
    </>
  )
}

export type { RecordResult }
