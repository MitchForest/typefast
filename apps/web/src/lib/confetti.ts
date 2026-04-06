export type ConfettiParticle = {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  width: number
  height: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

const COLORS = [
  '#58cc02',
  '#1cb0f6',
  '#ffc800',
  '#ff9600',
  '#ce82ff',
  '#ff4b4b',
]

export function spawnConfetti(
  count: number,
  originX: number,
  originY: number,
): ConfettiParticle[] {
  const particles: ConfettiParticle[] = []

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const speed = 300 + Math.random() * 400
    const life = 1.5 + Math.random() * 1

    particles.push({
      x: originX + (Math.random() - 0.5) * 20,
      y: originY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed * (0.3 + Math.random() * 0.7),
      vy: Math.sin(angle) * speed - 200 - Math.random() * 300,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 12,
      width: 4 + Math.random() * 6,
      height: 3 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      life,
      maxLife: life,
    })
  }

  return particles
}

const GRAVITY = 600

export function updateConfetti(
  particles: ConfettiParticle[],
  dt: number,
): ConfettiParticle[] {
  const alive: ConfettiParticle[] = []

  for (const p of particles) {
    p.life -= dt
    if (p.life <= 0) continue

    p.vy += GRAVITY * dt
    p.vx *= 0.99
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rotation += p.rotationSpeed * dt

    // Fade out in last 30% of life
    const fadeRatio = p.life / p.maxLife
    p.alpha = fadeRatio < 0.3 ? fadeRatio / 0.3 : 1

    alive.push(p)
  }

  return alive
}

export function renderConfetti(
  ctx: CanvasRenderingContext2D,
  particles: ConfettiParticle[],
) {
  for (const p of particles) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height)
    ctx.restore()
  }
}
