type LeaderboardRowProps = {
  rank: number
  wpm: number
  accuracy: number
  date?: string
  delta?: number
  isBest?: boolean
}

export function LeaderboardRow({
  rank,
  wpm,
  accuracy,
  date,
  delta,
  isBest,
}: LeaderboardRowProps) {
  return (
    <div className={`lb-row ${isBest ? 'lb-row-best' : ''}`}>
      <span className={`lb-rank ${rank <= 3 ? `lb-rank-${rank}` : ''}`}>
        {rank === 1 ? '\u{1F451}' : rank}
      </span>
      <span className="lb-wpm">{wpm}</span>
      <span className="lb-acc">{accuracy}%</span>
      {date && <span className="lb-date">{date}</span>}
      {delta != null && delta !== 0 && (
        <span
          className={`lb-delta ${delta > 0 ? 'lb-delta-up' : 'lb-delta-down'}`}
        >
          {delta > 0 ? '\u25B2' : '\u25BC'} {Math.abs(delta)}
        </span>
      )}
    </div>
  )
}
