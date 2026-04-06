const PROMPT_TARGET_LENGTH = 2200

const PASSAGES = [
  'Type with rhythm, not panic. Fast hands come from calm focus and clean repeats.',
  'Let the mistakes pass through you. Accuracy builds the line, speed follows behind it.',
  'A good sprint feels like a groove. Keep moving, keep breathing, keep the cursor honest.',
  'Watch the next word, trust your fingers, and stay loose when the pace starts climbing.',
  'The goal is not drama. The goal is one clean minute where momentum never breaks.',
  'Every strong run starts quiet. Sit still, read ahead, and let the sentence pull you forward.',
  'Typing well is small discipline repeated at speed. Precision first, then pressure, then flow.',
  'Do not chase the timer. Chase the next correct character and let the score arrive on its own.',
]

export function createPrompt() {
  let text = ''

  while (text.length < PROMPT_TARGET_LENGTH) {
    const next = PASSAGES[Math.floor(Math.random() * PASSAGES.length)]
    text += `${text ? ' ' : ''}${next}`
  }

  return text
}

/**
 * Get the monthly prompt. For now this is a random prompt using the month as seed.
 * In production, we'd curate these manually each month.
 */
export function getMonthlyPrompt(month: string): string {
  // Simple deterministic seed from month string
  let seed = 0
  for (let i = 0; i < month.length; i++) {
    seed = ((seed << 5) - seed + month.charCodeAt(i)) | 0
  }

  // Use seeded random to build prompt
  function seededRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  let text = ''
  while (text.length < PROMPT_TARGET_LENGTH) {
    const next = PASSAGES[Math.floor(seededRandom() * PASSAGES.length)]
    text += `${text ? ' ' : ''}${next}`
  }

  return text
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
