import { useEffect, useMemo, useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { useAuthStatus } from '../../hooks/use-auth-status'
import { OtpInput } from './otp-input'

type AuthGateContext = 'rank' | 'territory' | 'progress' | 'leaderboard'

type AuthGateProps = {
  /** What to tell the user about why they should sign up */
  hook: string
  /** Extra detail below the hook */
  detail?: string
  /** Contextual styling hint */
  context?: AuthGateContext
  /** Called after successful signup */
  onSuccess?: () => void
  /**
   * When true, the form is shown inline as the primary action (no expand button).
   * When false (default), renders as a collapsible button.
   */
  inline?: boolean
  /** Called when the user dismisses the gate without signing in */
  onDismiss?: () => void
}

/**
 * Passwordless upgrade prompt shown to anonymous users.
 */
export function AuthGate({
  hook,
  detail,
  onSuccess,
  onDismiss,
  inline = false,
}: AuthGateProps) {
  const { isAnonymous } = useAuthStatus()
  const [expanded, setExpanded] = useState(inline)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loadingAction, setLoadingAction] = useState<
    'sending' | 'verifying' | 'resending' | null
  >(null)
  const [done, setDone] = useState(false)
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const OTP_LENGTH = 6
  const OTP_EXPIRY_MS = 5 * 60 * 1000
  const RESEND_DELAY_MS = 30 * 1000
  const isHidden = !isAnonymous || done
  const copy =
    detail === undefined
      ? 'Secure your progress with a six-digit email code.'
      : detail

  useEffect(() => {
    if (isHidden || step !== 'verify') return

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isHidden, step])

  const resendRemainingMs = useMemo(() => {
    if (!otpSentAt) return 0
    return Math.max(0, otpSentAt + RESEND_DELAY_MS - now)
  }, [now, otpSentAt])

  const expiryRemainingMs = useMemo(() => {
    if (!otpSentAt) return OTP_EXPIRY_MS
    return Math.max(0, otpSentAt + OTP_EXPIRY_MS - now)
  }, [now, otpSentAt])

  if (isHidden) return null

  function formatCountdown(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  function getErrorMessage(result: {
    error?: { code?: string; message?: string }
  }) {
    const code = result.error?.code

    if (code === 'INVALID_OTP') return 'That code does not match. Try again.'
    if (code === 'OTP_EXPIRED') return 'That code expired. Send a fresh one.'
    if (code === 'TOO_MANY_ATTEMPTS') {
      return 'Too many tries. Send yourself a fresh code.'
    }

    return result.error?.message ?? 'Something went wrong. Try again.'
  }

  async function sendCode(mode: 'sending' | 'resending') {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Enter an email address first.')
      return
    }

    setError('')
    setLoadingAction(mode)

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: 'sign-in',
      })

      if (result.error) {
        setError(getErrorMessage(result))
      } else {
        setEmail(normalizedEmail)
        setOtp('')
        setOtpSentAt(Date.now())
        setStep('verify')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoadingAction('verifying')

    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      })

      if (result.error) {
        setError(getErrorMessage(result))
      } else {
        setDone(true)
        onSuccess?.()
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  // Collapsed mode — just a button
  if (!expanded) {
    return (
      <div className="auth-gate">
        <button
          className={inline ? 'btn-3d btn-go btn-lg' : 'btn-3d btn-mastery btn-sm'}
          onClick={() => setExpanded(true)}
          type="button"
        >
          {hook}
        </button>
        {detail && <span className="auth-gate-detail">{detail}</span>}
      </div>
    )
  }

  // Expanded form
  return (
    <div className="auth-gate">
      <div className="auth-gate-shell">
        <div className="auth-gate-header">
          <span className="auth-gate-title">{hook}</span>
          {copy ? <p className="auth-gate-copy">{copy}</p> : null}
        </div>

        {step === 'details' ? (
          <form
            className="auth-gate-form"
            onSubmit={(e) => {
              e.preventDefault()
              void sendCode('sending')
            }}
          >
            <label className="auth-gate-field">
              <span className="auth-gate-field-label">Email address</span>
              <input
                className="auth-gate-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </label>

            {error && <span className="auth-gate-error">{error}</span>}

            <div className="auth-gate-actions">
              <button
                className="btn-3d btn-go btn-sm"
                type="submit"
                disabled={loadingAction !== null}
              >
                {loadingAction === 'sending'
                  ? 'Sending...'
                  : 'Email me a code'}
              </button>
              {!inline && (
                <button
                  className="btn-3d btn-ghost btn-sm"
                  type="button"
                  onClick={() => { setExpanded(false); onDismiss?.() }}
                >
                  Not now
                </button>
              )}
            </div>
          </form>
        ) : (
          <form className="auth-gate-form" onSubmit={handleVerify}>
            <div className="auth-gate-code-panel">
              <span className="auth-gate-code-label">Code sent to</span>
              <div className="auth-gate-email-pill">{email}</div>
              <div className="auth-gate-code-meta">
                <span>Expires in {formatCountdown(expiryRemainingMs)}</span>
                <button
                  className="auth-gate-inline-link"
                  type="button"
                  onClick={() => {
                    setStep('details')
                    setOtp('')
                    setError('')
                  }}
                >
                  Change email
                </button>
              </div>
            </div>

            <div className="auth-gate-field">
              <span className="auth-gate-field-label">One-time code</span>
              <OtpInput
                value={otp}
                onChange={setOtp}
                length={OTP_LENGTH}
                autoFocus
              />
            </div>

            <div className="auth-gate-resend-row">
              <span className="auth-gate-resend-copy">
                Didn&apos;t get it?
              </span>
              <button
                className="auth-gate-inline-link"
                type="button"
                onClick={() => void sendCode('resending')}
                disabled={loadingAction !== null || resendRemainingMs > 0}
              >
                {loadingAction === 'resending'
                  ? 'Sending...'
                  : resendRemainingMs > 0
                    ? `Resend in ${Math.ceil(resendRemainingMs / 1000)}s`
                    : 'Resend code'}
              </button>
            </div>

            {error && <span className="auth-gate-error">{error}</span>}

            <div className="auth-gate-actions">
              <button
                className="btn-3d btn-go btn-sm"
                type="submit"
                disabled={
                  loadingAction !== null || otp.trim().length !== OTP_LENGTH
                }
              >
                {loadingAction === 'verifying'
                  ? 'Verifying...'
                  : 'Verify email'}
              </button>
              <button
                className="btn-3d btn-ghost btn-sm"
                type="button"
                onClick={() => { setExpanded(false); onDismiss?.() }}
              >
                Close
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
