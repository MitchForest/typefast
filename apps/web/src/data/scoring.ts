/**
 * Compare two scores. Returns true if `a` beats `b`.
 * Primary: higher WPM wins. Tiebreaker: higher accuracy.
 */
export function scoreBeatsClaim(
  wpm: number,
  accuracy: number,
  claimWpm: number,
  claimAccuracy: number,
): boolean {
  if (wpm > claimWpm) return true
  if (wpm === claimWpm && accuracy > claimAccuracy) return true
  return false
}
