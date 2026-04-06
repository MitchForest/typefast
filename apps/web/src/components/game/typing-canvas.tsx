/**
 * TypingCanvas — transparent Canvas overlay for Combo Stream particle effects.
 *
 * Sits on top of the entire viewport. Pointer-events: none.
 * Exposes an imperative API via ref for spawning particles.
 * Respects prefers-reduced-motion.
 */

import {
  forwardRef,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  type ParticleState,
  createParticleState,
  renderParticles,
  spawnCorrectChar,
  spawnError,
  updateParticles,
} from './particles'
import {
  type ConfettiParticle,
  renderConfetti,
  spawnConfetti,
  updateConfetti,
} from '../../lib/confetti'
import {
  type PileState,
  createPile,
  disposePile,
  renderPile,
  updatePile,
} from './settle-pile'

export interface TypingCanvasHandle {
  /** Spawn a particle for a correctly typed character. */
  spawnCorrect(
    char: string,
    charRect: DOMRect,
    combo: number,
    targetRect: DOMRect,
  ): void
  /** Spawn error shatter effect. */
  spawnError(char: string, charRect: DOMRect, combo: number): void
  /** Trigger session-end settle transition — letters pile at bottom. */
  settle(
    chars: Array<{
      char: string
      x: number
      y: number
      w: number
      h: number
      color: string
    }>,
  ): void
  /** Check if any particles are still alive. */
  hasParticles(): boolean
  /** Trigger a confetti burst at the given position. */
  burst(originX?: number, originY?: number, count?: number): void
}

type TypingCanvasProps = {
  comboIntakeRef: RefObject<HTMLElement | null>
}

// Resolve CSS custom properties to hex for Canvas usage
function resolveColor(prop: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(prop)
    .trim()
}

export const TypingCanvas = forwardRef<TypingCanvasHandle, TypingCanvasProps>(
  function TypingCanvas({ comboIntakeRef }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<ParticleState>(createParticleState())
    const confettiRef = useRef<ConfettiParticle[]>([])
    const pileRef = useRef<PileState | null>(null)
    const rafRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(0)
    const colorsRef = useRef({ go: '', miss: '' })
    const fontRef = useRef('')
    const comboPulseAnimationRef = useRef<Animation | null>(null)

    // Check reduced motion
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Resolve colors and font on mount
    useEffect(() => {
      if (reducedMotion) return
      colorsRef.current = {
        go: resolveColor('--color-go'),
        miss: resolveColor('--color-miss'),
      }
      // Match the prompt font
      const promptEl = document.querySelector('.prompt') as HTMLElement
      if (promptEl) {
        const cs = getComputedStyle(promptEl)
        fontRef.current = `700 ${cs.fontSize} ${cs.fontFamily}`
      } else {
        fontRef.current = '700 1.15rem "JetBrains Mono", monospace'
      }
    }, [reducedMotion])

    // Canvas sizing
    const resize = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }, [])

    useEffect(() => {
      if (reducedMotion) return
      resize()
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    }, [resize, reducedMotion])

    const hasActiveEffects = useCallback(() => {
      const state = stateRef.current
      return (
        state.chars.length > 0 ||
        state.fragments.length > 0 ||
        state.bursts.length > 0 ||
        confettiRef.current.length > 0 ||
        pileRef.current !== null
      )
    }, [])

    const pulseComboIntake = useCallback(
      (arrivalCount: number) => {
        const intake = comboIntakeRef.current

        if (!intake) {
          return
        }

        comboPulseAnimationRef.current?.cancel()
        comboPulseAnimationRef.current = intake.animate(
          [
            {
              transform: 'scale(1)',
              filter: 'brightness(1)',
            },
            {
              transform: `scale(${1 + Math.min(0.2, arrivalCount * 0.05)})`,
              filter: 'brightness(1.18)',
            },
            {
              transform: 'scale(1)',
              filter: 'brightness(1)',
            },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        )
      },
      [comboIntakeRef],
    )

    const startLoop = useCallback(() => {
      if (reducedMotion || rafRef.current) {
        return
      }

      const loop = (time: number) => {
        const canvas = canvasRef.current

        if (!canvas) {
          rafRef.current = 0
          return
        }

        const ctx = canvas.getContext('2d')

        if (!ctx) {
          rafRef.current = 0
          return
        }

        const dt = lastTimeRef.current
          ? Math.min(0.05, (time - lastTimeRef.current) / 1000)
          : 0.016
        lastTimeRef.current = time

        const state = stateRef.current
        const floorY = window.innerHeight - 40

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

        const { arrivals } = updateParticles(state, dt, floorY)

        if (arrivals.length > 0) {
          pulseComboIntake(arrivals.length)
        }

        if (
          state.chars.length > 0 ||
          state.fragments.length > 0 ||
          state.bursts.length > 0
        ) {
          renderParticles(ctx, state, fontRef.current)
        }

        if (confettiRef.current.length > 0) {
          confettiRef.current = updateConfetti(confettiRef.current, dt)
          renderConfetti(ctx, confettiRef.current)
        }

        // Letter pile physics
        const pile = pileRef.current
        if (pile) {
          const alive = updatePile(pile, dt)
          if (alive) {
            renderPile(ctx, pile, fontRef.current)
          } else {
            disposePile(pile)
            pileRef.current = null
          }
        }

        if (hasActiveEffects()) {
          rafRef.current = requestAnimationFrame(loop)
          return
        }

        rafRef.current = 0
        lastTimeRef.current = 0
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      }

      rafRef.current = requestAnimationFrame(loop)
    }, [hasActiveEffects, pulseComboIntake, reducedMotion])

    useEffect(() => {
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        comboPulseAnimationRef.current?.cancel()
        if (pileRef.current) {
          disposePile(pileRef.current)
          pileRef.current = null
        }
      }
    }, [])

    // Imperative API
    useImperativeHandle(
      ref,
      () => ({
        spawnCorrect(
          char: string,
          charRect: DOMRect,
          combo: number,
          targetRect: DOMRect,
        ) {
          if (reducedMotion) return
          const ox = charRect.left + charRect.width / 2
          const oy = charRect.top + charRect.height / 2
          const tx = targetRect.left + targetRect.width / 2
          const ty = targetRect.top + targetRect.height / 2
          spawnCorrectChar(
            stateRef.current,
            char,
            ox,
            oy,
            tx,
            ty,
            combo,
            colorsRef.current.go,
          )
          startLoop()
        },

        spawnError(char: string, charRect: DOMRect, combo: number) {
          if (reducedMotion) return
          const x = charRect.left + charRect.width / 2
          const y = charRect.top + charRect.height / 2
          spawnError(
            stateRef.current,
            char,
            x,
            y,
            combo,
            colorsRef.current.miss,
          )
          startLoop()
        },

        settle(
          chars: Array<{
            char: string
            x: number
            y: number
            w: number
            h: number
            color: string
          }>,
        ) {
          if (reducedMotion) return

          // Convert any in-flight arc particles to falling
          for (const p of stateRef.current.chars) {
            if (p.state === 'arc') {
              p.state = 'fall'
              p.vy = -80 - Math.random() * 60
              p.vx = (Math.random() - 0.5) * 80
            }
          }

          // Create the matter.js letter pile
          pileRef.current = createPile(
            chars,
            window.innerWidth,
            window.innerHeight,
          )

          startLoop()
        },

        hasParticles() {
          const s = stateRef.current
          return (
            s.chars.length > 0 ||
            s.fragments.length > 0 ||
            s.bursts.length > 0 ||
            confettiRef.current.length > 0
          )
        },

        burst(
          originX = window.innerWidth / 2,
          originY = window.innerHeight / 3,
          count = 40,
        ) {
          if (reducedMotion) return
          confettiRef.current = [
            ...confettiRef.current,
            ...spawnConfetti(count, originX, originY),
          ]
          startLoop()
        },
      }),
      [hasActiveEffects, reducedMotion, startLoop],
    )

    if (reducedMotion) return null

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 100,
        }}
        aria-hidden="true"
      />
    )
  },
)
