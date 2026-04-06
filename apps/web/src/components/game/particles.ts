/**
 * Combo Stream particle system.
 * Pure functions — no React, no DOM. Just types, physics, and Canvas rendering.
 */

import { getTierParams } from './combo-tiers'

// ── Constants ───────────────────────────────────────────────

const GRAVITY = 1400 // px/s²
const BOUNCE = 0.25
const FRICTION = 0.65
const SETTLE_VY = 8 // below this vy, particle is "settled"
const FADE_RATE = 0.6 // alpha/s for falling particles
const ARRIVE_DECAY = 0.12 // exponential decay factor for arriving particles (per frame at 60fps)
const FRAGMENT_LIFE = 0.8 // seconds
const BURST_LIFE = 0.24 // seconds

// ── Types ───────────────────────────────────────────────────

export interface CharParticle {
  id: number
  char: string
  x: number
  y: number
  ox: number // origin x
  oy: number // origin y
  tx: number // target x
  ty: number // target y
  vx: number
  vy: number
  t: number // bezier progress 0→1
  arcDuration: number // ms
  rotation: number
  rotationSpeed: number
  alpha: number
  scale: number
  initialScale: number // stored at spawn so we compute scale from it, not compound
  color: string
  state: 'arc' | 'fall' | 'arrive' | 'dead'
  trail: Array<{ x: number; y: number }>
  trailCount: number
  /** Per-particle arc curvature variation (-1 to 1) for spread */
  curveBias: number
  trailAlpha: number
  glowRadius: number
  glowAlpha: number
  arrivalPulse: number
}

export interface ShatterFragment {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  alpha: number
  scale: number
  color: string
  char: string
  life: number
}

export interface ArrivalBurst {
  x: number
  y: number
  color: string
  life: number
  maxRadius: number
}

export interface ParticleState {
  chars: CharParticle[]
  fragments: ShatterFragment[]
  bursts: ArrivalBurst[]
  nextId: number
}

// ── Factory ─────────────────────────────────────────────────

export function createParticleState(): ParticleState {
  return { chars: [], fragments: [], bursts: [], nextId: 0 }
}

let _idCounter = 0

export function spawnCorrectChar(
  state: ParticleState,
  char: string,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  combo: number,
  color: string,
): void {
  const tier = getTierParams(combo)

  // Tier 0 (combo 0): no particles
  if (tier.arcDuration === 0) return

  const id = _idCounter++
  // Keep the destination readable so the effect still feels tied to the typed glyph.
  const spreadAmount = Math.min(18, 6 + combo * 0.18)
  const spread = (Math.random() - 0.5) * spreadAmount
  // Per-particle curve variation so adjacent chars take visually distinct paths
  const curveBias = (Math.random() - 0.5) * Math.min(0.8, 0.35 + combo * 0.01)
  // Reduce rotation at high combo to prevent messy overlapping text
  const maxRotSpeed = combo >= 16 ? 0.9 : 2.6

  state.chars.push({
    id,
    char,
    x: ox,
    y: oy,
    ox,
    oy,
    tx: tx + spread,
    ty,
    vx: 0,
    vy: -tier.launchForce,
    t: 0,
    arcDuration: tier.arcDuration,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * maxRotSpeed,
    alpha: 1,
    scale: tier.charScale,
    initialScale: tier.charScale,
    color,
    state: 'arc',
    trail: [{ x: ox, y: oy }],
    trailCount: tier.trailCount,
    curveBias,
    trailAlpha: tier.trailAlpha,
    glowRadius: tier.glowRadius,
    glowAlpha: tier.glowAlpha,
    arrivalPulse: tier.counterPulse,
  })
}

export function spawnError(
  state: ParticleState,
  char: string,
  x: number,
  y: number,
  combo: number,
  color: string,
): void {
  const tier = getTierParams(combo)

  // Shatter any in-flight arc particles
  for (let i = state.chars.length - 1; i >= 0; i--) {
    const p = state.chars[i]
    if (p.state === 'arc') {
      createFragments(state, p.char, p.x, p.y, p.color, tier.shatterCount)
      p.state = 'dead'
    }
  }

  // Shatter the error character itself
  createFragments(state, char, x, y, color, Math.max(3, tier.shatterCount))
}

function createFragments(
  state: ParticleState,
  char: string,
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
    const speed = 120 + Math.random() * 200
    state.fragments.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100, // bias upward
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 16,
      alpha: 1,
      scale: 0.4 + Math.random() * 0.4,
      color,
      char,
      life: FRAGMENT_LIFE,
    })
  }
}

// ── Settle (session end) ────────────────────────────────────

export function settleAll(
  state: ParticleState,
  chars: Array<{ char: string; x: number; y: number; color: string }>,
): void {
  // Convert all arc particles to fall
  for (const p of state.chars) {
    if (p.state === 'arc') {
      p.state = 'fall'
      // Give a slight upward kick + random horizontal spread
      p.vy = -80 - Math.random() * 60
      p.vx = (Math.random() - 0.5) * 80
    }
  }

  // Spawn particles for the detached characters
  for (const c of chars) {
    const id = _idCounter++
    state.chars.push({
      id,
      char: c.char,
      x: c.x,
      y: c.y,
      ox: c.x,
      oy: c.y,
      tx: c.x,
      ty: c.y,
      vx: (Math.random() - 0.5) * 60,
      vy: -40 - Math.random() * 40,
      t: 0,
      arcDuration: 0,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 4,
      alpha: 1,
      scale: 0.9,
      initialScale: 0.9,
      color: c.color,
      state: 'fall',
      trail: [],
      trailCount: 0,
      curveBias: 0,
      trailAlpha: 0,
      glowRadius: 0,
      glowAlpha: 0,
      arrivalPulse: 1,
    })
  }
}

// ── Bezier helper ───────────────────────────────────────────

function bezier2(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

// ── Physics update ──────────────────────────────────────────

export function updateParticles(
  state: ParticleState,
  dt: number,
  floorY: number,
): { arrivals: ArrivalBurst[] } {
  const arrivals: ArrivalBurst[] = []

  // Update character particles
  for (const p of state.chars) {
    if (p.state === 'dead') continue

    switch (p.state) {
      case 'arc': {
        p.t += (dt * 1000) / p.arcDuration
        if (p.t >= 1) {
          p.state = 'arrive'
          p.x = p.tx
          p.y = p.ty
          const burst = {
            x: p.tx,
            y: p.ty,
            color: p.color,
            life: BURST_LIFE,
            maxRadius: 12 + (p.arrivalPulse - 1) * 90,
          }
          arrivals.push(burst)
          state.bursts.push(burst)
          break
        }

        // Ease-in-out with fast initial detach:
        // First 20% of t covers rapidly (particle snaps away from text),
        // then eases toward target.
        // remap t through: eased = t < 0.2 ? t * 2.5 * 0.35 : 0.35 + (t-0.2)/0.8 * 0.65
        let eased: number
        if (p.t < 0.15) {
          // Fast snap away: first 15% of time covers 30% of arc distance
          eased = (p.t / 0.15) * 0.3
        } else {
          // Smooth glide for the remaining 85% of time
          const rem = (p.t - 0.15) / 0.85
          eased = 0.3 + rem * 0.7
        }

        // Control point: between origin and target, biased upward + curveBias for spread
        const cx = (p.ox + p.tx) / 2 + p.curveBias * 18
        const cy =
          Math.min(p.oy, p.ty) -
          44 -
          12 * (1000 / p.arcDuration) +
          p.curveBias * 10
        p.x = bezier2(p.ox, cx, p.tx, eased)
        p.y = bezier2(p.oy, cy, p.ty, eased)
        p.rotation += p.rotationSpeed * dt
        // Compute scale from initialScale — NOT compounding
        p.scale = p.initialScale * (1 - eased * 0.22)

        // Record trail positions (rendered directly from trail array)
        if (p.trailCount > 0) {
          p.trail.push({ x: p.x, y: p.y })
          if (p.trail.length > p.trailCount) {
            p.trail.shift()
          }
        }
        break
      }

      case 'fall': {
        p.vy += GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.rotationSpeed * dt

        // Floor collision
        if (p.y >= floorY) {
          p.y = floorY
          p.vy *= -BOUNCE
          p.vx *= FRICTION
          p.rotationSpeed *= 0.5
          if (Math.abs(p.vy) < SETTLE_VY) {
            p.vy = 0
            p.vx = 0
            p.rotationSpeed = 0
          }
        }

        // Fade out if off-screen or settled for too long
        if (p.y > floorY + 100) {
          p.alpha -= FADE_RATE * dt * 3
        }
        if (p.vy === 0 && p.vx === 0) {
          p.alpha -= FADE_RATE * dt * 0.3
        }

        if (p.alpha <= 0) p.state = 'dead'
        break
      }

      case 'arrive': {
        p.scale *= 1 - ARRIVE_DECAY
        p.alpha *= 1 - ARRIVE_DECAY
        if (p.alpha < 0.03) p.state = 'dead'
        break
      }
    }
  }

  // Update shatter fragments
  for (const f of state.fragments) {
    f.vy += GRAVITY * 0.8 * dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.rotation += f.rotationSpeed * dt
    f.life -= dt
    f.alpha = Math.max(0, f.life / FRAGMENT_LIFE)
    f.scale *= 0.995
  }

  for (const burst of state.bursts) {
    burst.life -= dt
  }

  // Garbage collect dead particles
  state.chars = state.chars.filter((p) => p.state !== 'dead')
  state.fragments = state.fragments.filter((f) => f.life > 0)
  state.bursts = state.bursts.filter((burst) => burst.life > 0)

  return { arrivals }
}

// ── Canvas rendering ────────────────────────────────────────

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  state: ParticleState,
  font: string,
): void {
  // 1. Trails — tapered energy streaks behind flying characters
  for (const p of state.chars) {
    if (p.trail.length < 2 || p.state === 'dead') continue

    // Draw tapered stroke: thicker at head, thinner at tail
    for (let i = 1; i < p.trail.length; i++) {
      const t = i / p.trail.length // 0 = oldest, 1 = newest
      ctx.beginPath()
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y)
      ctx.lineTo(p.trail[i].x, p.trail[i].y)
      ctx.strokeStyle = p.color
      ctx.lineWidth = t * 2.4 + 0.75
      ctx.globalAlpha = t * p.trailAlpha * p.alpha
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }

  // 2. Arrival bursts — tiny charge flashes at the combo intake.
  for (const burst of state.bursts) {
    const progress = 1 - burst.life / BURST_LIFE
    const radius = 4 + burst.maxRadius * progress

    ctx.save()
    ctx.globalAlpha = (1 - progress) * 0.24
    ctx.fillStyle = burst.color
    ctx.beginPath()
    ctx.arc(burst.x, burst.y, radius * 0.45, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = (1 - progress) * 0.8
    ctx.strokeStyle = burst.color
    ctx.lineWidth = Math.max(0.9, 2.2 * (1 - progress))
    ctx.beginPath()
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // 3. Character particles
  for (const p of state.chars) {
    if (p.alpha <= 0 || p.state === 'dead') continue
    ctx.save()
    ctx.globalAlpha = p.alpha
    if (p.glowRadius > 0 && p.state === 'arc') {
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.glowRadius * (0.65 + p.glowAlpha)
    }
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.scale(p.scale, p.scale)
    ctx.fillStyle = p.color
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.char, 0, 0)
    ctx.restore()
  }

  // 4. Shatter fragments
  for (const f of state.fragments) {
    if (f.alpha <= 0) continue
    ctx.save()
    ctx.globalAlpha = f.alpha
    ctx.translate(f.x, f.y)
    ctx.rotate(f.rotation)
    ctx.scale(f.scale, f.scale)
    ctx.fillStyle = f.color
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(f.char, 0, 0)
    ctx.restore()
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}
