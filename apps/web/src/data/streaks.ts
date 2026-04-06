/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
export function todayUTC(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

/**
 * Update streak based on last session date.
 * Returns the new streak count and date.
 */
export function updateStreak(
  lastDate: string | null,
  currentStreak: number,
  today: string,
): { streak: number; lastDate: string } {
  if (!lastDate) {
    return { streak: 1, lastDate: today }
  }

  if (lastDate === today) {
    // Already practiced today, no change
    return { streak: currentStreak, lastDate: today }
  }

  // Check if last session was yesterday
  const last = new Date(lastDate + 'T00:00:00Z')
  const now = new Date(today + 'T00:00:00Z')
  const diffDays = Math.round(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 1) {
    return { streak: currentStreak + 1, lastDate: today }
  }

  // Streak broken
  return { streak: 1, lastDate: today }
}
