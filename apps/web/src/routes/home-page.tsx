import { useCallback, useState } from 'react'
import { TypingSession } from '../components/game/typing-session'
import { getCurrentMonth, getMonthlyPrompt } from '../data/prompts'

export default function HomePage() {
  const [prompt, setPrompt] = useState(() =>
    getMonthlyPrompt(getCurrentMonth()),
  )

  const handleComplete = useCallback(() => {
    // Recording + XP is handled inside TypingSession
  }, [])

  const handleReset = useCallback(() => {
    setPrompt(getMonthlyPrompt(getCurrentMonth()))
  }, [])

  return (
    <TypingSession
      prompt={prompt}
      competitive
      onComplete={handleComplete}
      onReset={handleReset}
    />
  )
}
