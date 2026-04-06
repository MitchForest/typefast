/**
 * Combo tier system — maps combo count to visual parameters.
 * All values interpolate smoothly between tiers.
 */

export interface TierParams {
  /** Bezier arc duration in ms (lower = faster) */
  arcDuration: number
  /** Initial upward velocity before arc takes over (px/s) */
  launchForce: number
  /** Number of trail dots per character */
  trailCount: number
  /** Trail dot opacity (0-1) */
  trailAlpha: number
  /** ctx.shadowBlur radius for glow on flying chars */
  glowRadius: number
  /** Glow opacity multiplier */
  glowAlpha: number
  /** Pixels of screen shake per keystroke */
  shakeAmount: number
  /** Scale of flying characters (1 = normal) */
  charScale: number
  /** Scale multiplier for counter pulse on arrival (e.g., 1.08 = 8% grow) */
  counterPulse: number
  /** Number of shatter fragments on error */
  shatterCount: number
}

interface TierDef {
  minCombo: number
  params: TierParams
}

const TIERS: TierDef[] = [
  {
    minCombo: 0,
    params: {
      arcDuration: 0,
      launchForce: 0,
      trailCount: 0,
      trailAlpha: 0,
      glowRadius: 0,
      glowAlpha: 0,
      shakeAmount: 0,
      charScale: 0,
      counterPulse: 1.0,
      shatterCount: 0,
    },
  },
  {
    minCombo: 1,
    params: {
      arcDuration: 500,
      launchForce: 40,
      trailCount: 0,
      trailAlpha: 0,
      glowRadius: 0,
      glowAlpha: 0,
      shakeAmount: 0,
      charScale: 0.85,
      counterPulse: 1.03,
      shatterCount: 3,
    },
  },
  {
    minCombo: 6,
    params: {
      arcDuration: 380,
      launchForce: 70,
      trailCount: 3,
      trailAlpha: 0.25,
      glowRadius: 4,
      glowAlpha: 0.3,
      shakeAmount: 0,
      charScale: 0.9,
      counterPulse: 1.05,
      shatterCount: 5,
    },
  },
  {
    minCombo: 16,
    params: {
      arcDuration: 320,
      launchForce: 110,
      trailCount: 5,
      trailAlpha: 0.34,
      glowRadius: 8,
      glowAlpha: 0.45,
      shakeAmount: 0,
      charScale: 0.95,
      counterPulse: 1.09,
      shatterCount: 6,
    },
  },
  {
    minCombo: 31,
    params: {
      arcDuration: 240,
      launchForce: 150,
      trailCount: 7,
      trailAlpha: 0.42,
      glowRadius: 12,
      glowAlpha: 0.58,
      shakeAmount: 0,
      charScale: 1.0,
      counterPulse: 1.12,
      shatterCount: 7,
    },
  },
  {
    minCombo: 50,
    params: {
      arcDuration: 190,
      launchForce: 190,
      trailCount: 9,
      trailAlpha: 0.5,
      glowRadius: 16,
      glowAlpha: 0.68,
      shakeAmount: 0,
      charScale: 1.05,
      counterPulse: 1.16,
      shatterCount: 8,
    },
  },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpParams(a: TierParams, b: TierParams, t: number): TierParams {
  return {
    arcDuration: lerp(a.arcDuration, b.arcDuration, t),
    launchForce: lerp(a.launchForce, b.launchForce, t),
    trailCount: Math.round(lerp(a.trailCount, b.trailCount, t)),
    trailAlpha: lerp(a.trailAlpha, b.trailAlpha, t),
    glowRadius: lerp(a.glowRadius, b.glowRadius, t),
    glowAlpha: lerp(a.glowAlpha, b.glowAlpha, t),
    shakeAmount: lerp(a.shakeAmount, b.shakeAmount, t),
    charScale: lerp(a.charScale, b.charScale, t),
    counterPulse: lerp(a.counterPulse, b.counterPulse, t),
    shatterCount: Math.round(lerp(a.shatterCount, b.shatterCount, t)),
  }
}

/** Get interpolated tier params for a given combo count. */
export function getTierParams(combo: number): TierParams {
  // Find the two tiers we're between
  let lower = TIERS[0]
  let upper = TIERS[0]

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (combo >= TIERS[i].minCombo) {
      lower = TIERS[i]
      upper = TIERS[Math.min(i + 1, TIERS.length - 1)]
      break
    }
  }

  if (lower === upper) return { ...lower.params }

  // Interpolate between tiers
  const range = upper.minCombo - lower.minCombo
  const t = Math.min(1, (combo - lower.minCombo) / range)

  return lerpParams(lower.params, upper.params, t)
}

/** Get the tier name for display. */
export function getTierName(combo: number): string {
  if (combo >= 50) return 'TRANSCENDENT'
  if (combo >= 31) return 'ON FIRE'
  if (combo >= 16) return 'BLAZING'
  if (combo >= 6) return 'ROLLING'
  if (combo >= 1) return ''
  return ''
}
