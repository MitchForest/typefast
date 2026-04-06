import type { SessionResult } from './types'

export type XPBreakdown = {
  baseXP: number
  speedXP: number
  accuracyXP: number
  comboXP: number
  totalXP: number
}

/**
 * Calculate XP earned from a typing session.
 * Designed to give ~50-120 XP per average session.
 */
export function calculateXP(result: SessionResult): XPBreakdown {
  const baseXP = 10
  const speedXP = Math.floor(result.correctCharacters / 5)
  const accuracyXP =
    result.accuracy >= 97
      ? 50
      : result.accuracy >= 95
        ? 25
        : result.accuracy >= 90
          ? 10
          : 0
  const comboXP = Math.floor(result.maxCombo * 0.5)

  return {
    baseXP,
    speedXP,
    accuracyXP,
    comboXP,
    totalXP: baseXP + speedXP + accuracyXP + comboXP,
  }
}

/**
 * XP needed to reach a level. Level 1 = 100, Level 5 = 2500, Level 10 = 10000.
 */
export function xpForLevel(level: number): number {
  return level * level * 100
}

/**
 * Derive current level and progress from total XP.
 */
export function levelFromXP(totalXP: number): {
  level: number
  currentXP: number
  nextLevelXP: number
} {
  let level = 1
  while (xpForLevel(level + 1) <= totalXP) {
    level++
  }
  const currentLevelXP = xpForLevel(level)
  const nextLevelXP = xpForLevel(level + 1)
  return {
    level,
    currentXP: totalXP - currentLevelXP,
    nextLevelXP: nextLevelXP - currentLevelXP,
  }
}
