type ShareCardData = {
  wpm: number
  accuracy: number
  maxCombo: number
  globalRank?: number
  globalTotal?: number
  month: string
  hexesClaimed?: number
}

const WIDTH = 1200
const HEIGHT = 630

export function renderShareCard(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
): void {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Background gradient (warm off-white to subtle gold)
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, '#f7f5f0')
  bg.addColorStop(1, '#f0eddf')
  ctx.fillStyle = bg
  ctx.beginPath()
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 0)
  ctx.fill()

  // Subtle accent circles
  ctx.fillStyle = 'rgba(88, 204, 2, 0.06)'
  ctx.beginPath()
  ctx.arc(WIDTH - 150, 100, 200, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(28, 176, 246, 0.05)'
  ctx.beginPath()
  ctx.arc(150, HEIGHT - 100, 180, 0, Math.PI * 2)
  ctx.fill()

  // Card inner (white rounded rect)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(90, 81, 58, 0.08)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 8
  ctx.beginPath()
  roundRect(ctx, 60, 40, WIDTH - 120, HEIGHT - 80, 28)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Border
  ctx.strokeStyle = '#e5e0d8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  roundRect(ctx, 60, 40, WIDTH - 120, HEIGHT - 80, 28)
  ctx.stroke()

  // TypeFast wordmark (top-left)
  ctx.font = '900 22px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#3c3c3c'
  ctx.textAlign = 'left'
  ctx.fillText('Type', 108, 96)
  const typeWidth = ctx.measureText('Type').width
  ctx.fillStyle = '#58cc02'
  ctx.fillText('Fast', 108 + typeWidth, 96)

  // Month (top-right)
  ctx.font = '800 16px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#afafaf'
  ctx.textAlign = 'right'
  ctx.fillText(data.month, WIDTH - 108, 96)

  // Giant WPM
  ctx.font = '900 140px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#3c3c3c'
  ctx.textAlign = 'center'
  ctx.fillText(String(data.wpm), WIDTH / 2, 310)

  // WPM label
  ctx.font = '900 24px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#afafaf'
  ctx.letterSpacing = '0.08em'
  ctx.fillText('WPM', WIDTH / 2, 348)
  ctx.letterSpacing = '0em'

  // Stats row
  const statsY = 420
  const statsGap = 200
  const statsStartX = WIDTH / 2 - statsGap

  // Accuracy
  ctx.font = '900 28px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#3c3c3c'
  ctx.textAlign = 'center'
  ctx.fillText(`${data.accuracy}%`, statsStartX, statsY)
  ctx.font = '800 13px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#afafaf'
  ctx.fillText('ACCURACY', statsStartX, statsY + 24)

  // Combo
  ctx.font = '900 28px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#3c3c3c'
  ctx.fillText(`x${data.maxCombo}`, WIDTH / 2, statsY)
  ctx.font = '800 13px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#afafaf'
  ctx.fillText('COMBO', WIDTH / 2, statsY + 24)

  // Rank or hexes
  const rightStatX = statsStartX + statsGap * 2
  if (data.globalRank != null) {
    ctx.font = '900 28px Nunito, system-ui, sans-serif'
    ctx.fillStyle = '#3c3c3c'
    ctx.fillText(`#${data.globalRank}`, rightStatX, statsY)
    ctx.font = '800 13px Nunito, system-ui, sans-serif'
    ctx.fillStyle = '#afafaf'
    const totalLabel =
      data.globalTotal != null
        ? `OF ${data.globalTotal.toLocaleString()}`
        : 'GLOBALLY'
    ctx.fillText(totalLabel, rightStatX, statsY + 24)
  } else if (data.hexesClaimed != null && data.hexesClaimed > 0) {
    ctx.font = '900 28px Nunito, system-ui, sans-serif'
    ctx.fillStyle = '#3c3c3c'
    ctx.fillText(String(data.hexesClaimed), rightStatX, statsY)
    ctx.font = '800 13px Nunito, system-ui, sans-serif'
    ctx.fillStyle = '#afafaf'
    ctx.fillText('HEXES', rightStatX, statsY + 24)
  }

  // Bottom CTA
  ctx.font = '800 16px Nunito, system-ui, sans-serif'
  ctx.fillStyle = '#afafaf'
  ctx.textAlign = 'center'
  ctx.fillText('typefast.app', WIDTH / 2, HEIGHT - 68)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export type { ShareCardData }
