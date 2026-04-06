import { useRef, useCallback, useEffect } from 'react'

type OtpInputProps = {
  length?: number
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus = false,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const focusIndex = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, length - 1))
      refs.current[clamped]?.focus()
    },
    [length],
  )

  function handleInput(i: number, digit: string) {
    const next = value.split('')
    next[i] = digit
    // Fill any gaps with empty strings
    for (let j = 0; j < length; j++) {
      if (!next[j]) next[j] = ''
    }
    const joined = next.join('').slice(0, length)
    onChange(joined)
    if (digit && i < length - 1) focusIndex(i + 1)
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) {
        handleInput(i, '')
      } else if (i > 0) {
        handleInput(i - 1, '')
        focusIndex(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusIndex(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focusIndex(i + 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)
    onChange(pasted)
    focusIndex(Math.min(pasted.length, length - 1))
  }

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="otp-box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            if (d) handleInput(i, d)
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
