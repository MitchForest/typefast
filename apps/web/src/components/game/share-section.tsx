import { useState, useCallback } from 'react'
import type { ShareCardData } from '../../lib/share-card-renderer'

type ShareSectionProps = {
  data: ShareCardData
}

export function ShareSection({ data }: ShareSectionProps) {
  const [copied, setCopied] = useState(false)

  const shareText = buildShareText(data)

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    await copyToClipboard(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareText])

  return (
    <button
      className="btn-3d btn-speed btn-lg results-share-btn"
      type="button"
      onClick={handleShare}
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

function buildShareText(data: ShareCardData): string {
  const parts = [`I typed ${data.wpm} WPM on TypeFast!`]
  if (data.globalRank != null) {
    parts.push(`#${data.globalRank} globally.`)
  }
  if (data.hexesClaimed != null && data.hexesClaimed > 0) {
    parts.push(
      `Claimed ${data.hexesClaimed} hex${data.hexesClaimed !== 1 ? 'es' : ''}.`,
    )
  }
  parts.push('typefast.app')
  return parts.join(' ')
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}
