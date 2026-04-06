import { AvatarDisplay } from '../avatar/avatar-display'

type Neighbor = {
  rank: number
  playerName: string
  wpm: number
  accuracy: number
  avatarDataUri: string | null
  isMe: boolean
}

type RankData = {
  globalRank: number
  globalTotal: number
  percentile: number
  nationalRank?: number
  nationalTotal?: number
  country?: string
  neighbors: Neighbor[]
}

type PlacementCardProps = {
  rank: RankData
}

export function PlacementCard({ rank }: PlacementCardProps) {
  const percentileLabel =
    rank.percentile >= 99
      ? 'Top 1%'
      : rank.percentile >= 90
        ? `Top ${100 - rank.percentile}%`
        : `Top ${100 - rank.percentile}%`

  return (
    <div className="placement-card stagger-enter stagger-4">
      <div className="placement-header">
        <div className="placement-rank-group">
          <span className="placement-rank">#{rank.globalRank}</span>
          <span className="placement-total">
            of {rank.globalTotal.toLocaleString()}
          </span>
        </div>
        <span className="placement-percentile chip chip-speed">
          {percentileLabel}
        </span>
      </div>

      {rank.nationalRank != null && rank.country && (
        <div className="placement-national">
          #{rank.nationalRank} in {rank.country}
          {rank.nationalTotal != null && (
            <span className="placement-national-total">
              {' '}
              of {rank.nationalTotal}
            </span>
          )}
        </div>
      )}

      {/* Mini leaderboard excerpt */}
      <div className="placement-neighbors">
        {rank.neighbors.map((n) => (
          <div
            key={n.rank}
            className={`placement-neighbor ${n.isMe ? 'placement-neighbor-me' : ''}`}
          >
            <span className="placement-neighbor-rank">#{n.rank}</span>
            <AvatarDisplay src={n.avatarDataUri} name={n.playerName} size={22} />
            <span className="placement-neighbor-name">{n.playerName}</span>
            <span className="placement-neighbor-wpm">{n.wpm}</span>
            <span className="placement-neighbor-unit">WPM</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { RankData }
