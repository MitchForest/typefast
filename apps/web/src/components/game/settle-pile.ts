/**
 * Letter pile — matter.js rigid-body simulation.
 * When a typing session ends, visible characters drop and pile up at the bottom.
 */

import Matter from 'matter-js'

// ── Types ───────────────────────────────────────────────────

export interface PileChar {
  char: string
  color: string
  body: Matter.Body
}

export interface PileState {
  engine: Matter.Engine
  chars: PileChar[]
  fadeAlpha: number
  settling: boolean
  settleTimer: number
}

// ── Create ──────────────────────────────────────────────────

export function createPile(
  chars: Array<{
    char: string
    x: number
    y: number
    w: number
    h: number
    color: string
  }>,
  width: number,
  height: number,
): PileState {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.8, scale: 0.001 },
  })

  const floorY = height - 8

  // Static boundaries: ground + left/right walls
  const ground = Matter.Bodies.rectangle(
    width / 2,
    floorY + 30,
    width * 2,
    60,
    { isStatic: true, friction: 0.8 },
  )
  const wallL = Matter.Bodies.rectangle(-30, height / 2, 60, height * 2, {
    isStatic: true,
  })
  const wallR = Matter.Bodies.rectangle(
    width + 30,
    height / 2,
    60,
    height * 2,
    { isStatic: true },
  )

  Matter.Composite.add(engine.world, [ground, wallL, wallR])

  const pileChars: PileChar[] = []

  for (const c of chars) {
    const body = Matter.Bodies.rectangle(c.x, c.y, c.w * 0.85, c.h * 0.85, {
      restitution: 0.25,
      friction: 0.6,
      frictionAir: 0.008,
      density: 0.001,
      angle: (Math.random() - 0.5) * 0.2,
    })

    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: -1 - Math.random() * 2,
    })

    pileChars.push({ char: c.char, color: c.color, body })
    Matter.Composite.add(engine.world, body)
  }

  return {
    engine,
    chars: pileChars,
    fadeAlpha: 1,
    settling: false,
    settleTimer: 0,
  }
}

// ── Update ──────────────────────────────────────────────────

/** Returns false when the pile is fully faded and should be disposed. */
export function updatePile(state: PileState, dt: number): boolean {
  Matter.Engine.update(state.engine, dt * 1000)

  // Detect when most bodies are at rest
  if (!state.settling) {
    let atRest = 0
    for (const c of state.chars) {
      const v = c.body.velocity
      if (Math.abs(v.x) < 0.3 && Math.abs(v.y) < 0.3) {
        atRest++
      }
    }
    if (state.chars.length > 0 && atRest >= state.chars.length * 0.85) {
      state.settling = true
    }
  }

  // Once settled, hold briefly then fade out
  if (state.settling) {
    state.settleTimer += dt
    if (state.settleTimer > 2) {
      state.fadeAlpha -= dt * 1.2
      if (state.fadeAlpha <= 0) {
        state.fadeAlpha = 0
        return false
      }
    }
  }

  return true
}

// ── Render ──────────────────────────────────────────────────

export function renderPile(
  ctx: CanvasRenderingContext2D,
  state: PileState,
  font: string,
): void {
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const c of state.chars) {
    const pos = c.body.position
    const angle = c.body.angle

    ctx.save()
    ctx.globalAlpha = state.fadeAlpha
    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)
    ctx.fillStyle = c.color
    ctx.fillText(c.char, 0, 0)
    ctx.restore()
  }
}

// ── Dispose ─────────────────────────────────────────────────

export function disposePile(state: PileState): void {
  Matter.Composite.clear(state.engine.world, false)
  Matter.Engine.clear(state.engine)
  state.chars.length = 0
}
