import { RESOLUTION_LABELS } from '../../lib/h3-constants'
import { AvatarDisplay } from '../avatar/avatar-display'

type HexPopupProps = {
  playerName: string
  wpm: number
  accuracy: number
  message: string
  isPlayer: boolean
  resolution: number
  avatarDataUri: string | null
  onClose: () => void
}

export function HexPopup({
  playerName,
  wpm,
  accuracy,
  message,
  isPlayer,
  resolution,
  avatarDataUri,
  onClose,
}: HexPopupProps) {
  return (
    <div className="map-popup-overlay" onClick={onClose}>
      <div
        className="card map-popup stagger-enter stagger-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="map-popup-close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          &times;
        </button>

        {isPlayer && avatarDataUri && (
          <div className="map-popup-avatar">
            <AvatarDisplay src={avatarDataUri} name={playerName} size={48} />
          </div>
        )}

        <div className="map-popup-header">
          <span className="chip chip-speed">
            {RESOLUTION_LABELS[resolution] ?? `Res ${resolution}`}
          </span>
          {isPlayer && <span className="chip chip-go">You</span>}
        </div>

        <div className="map-popup-name">{playerName || 'Anonymous'}</div>

        <div className="map-popup-stats">
          <span className="map-popup-stat">
            <strong>{wpm}</strong> WPM
          </span>
          <span className="map-popup-divider">&middot;</span>
          <span className="map-popup-stat">
            <strong>{accuracy}%</strong> ACC
          </span>
        </div>

        {message && (
          <div className="map-popup-message">&ldquo;{message}&rdquo;</div>
        )}
      </div>
    </div>
  )
}
