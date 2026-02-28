import type { VerdictOutcome, ShareBackground } from '../constants/verdictTypes'
import html2canvas from 'html2canvas'

type ShareImageData = {
  product: string
  outcome: VerdictOutcome
  rationale: string | null
  background: ShareBackground
}

const OUTCOME_LABELS: Record<VerdictOutcome, string> = { buy: 'Buy', skip: 'Skip', hold: 'Hold' }
const OUTCOME_ICONS: Record<VerdictOutcome, string> = { buy: '\u2713', skip: '\u2717', hold: '\u23F8' }

const buildStars = (): string => {
  const parts: string[] = ['<div class="bg-layer-midnight">']
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * 100
    const y = Math.random() * 100
    const d = (Math.random() * 2).toFixed(1)
    const s = 1 + Math.random() * 3
    parts.push(
      `<div class="star" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:-${d}s"></div>`,
    )
  }
  parts.push('</div>')
  return parts.join('')
}

const buildSparkles = (): string => {
  const parts: string[] = []
  for (let i = 0; i < 14; i++) {
    const x = 5 + Math.random() * 90
    const y = 5 + Math.random() * 90
    const d = (Math.random() * 3).toFixed(1)
    const s = 2 + Math.random() * 4
    parts.push(
      `<div class="sparkle" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:-${d}s"></div>`,
    )
  }
  return parts.join('')
}

const buildConfetti = (outcome: VerdictOutcome): string => {
  if (outcome !== 'buy') return ''
  const colors = [
    'rgba(93,228,168,0.6)',
    'rgba(167,139,250,0.5)',
    'rgba(96,165,250,0.5)',
    'rgba(244,114,182,0.4)',
    'rgba(245,197,99,0.5)',
  ]
  const parts: string[] = []
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * 100
    const d = (Math.random() * 4).toFixed(1)
    const dur = (3 + Math.random() * 2).toFixed(1)
    const c = colors[Math.floor(Math.random() * colors.length)]
    const w = 4 + Math.random() * 5
    const h = 6 + Math.random() * 8
    parts.push(
      `<div class="confetti" style="left:${x}%;top:-5%;width:${w}px;height:${h}px;background:${c};animation-delay:-${d}s;animation-duration:${dur}s"></div>`,
    )
  }
  return parts.join('')
}

const buildSunsetParticles = (): string => {
  const colors = [
    'rgba(244,114,182,0.4)',
    'rgba(245,197,99,0.35)',
    'rgba(220,69,69,0.3)',
    'rgba(167,139,250,0.3)',
  ]
  const parts: string[] = ['<div class="bg-layer-dusk">']
  for (let i = 0; i < 18; i++) {
    const x = 10 + Math.random() * 80
    const y = 30 + Math.random() * 60
    const d = (Math.random() * 5).toFixed(1)
    const s = 3 + Math.random() * 5
    const c = colors[Math.floor(Math.random() * colors.length)]
    parts.push(
      `<div class="particle" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;background:${c};animation-delay:-${d}s"></div>`,
    )
  }
  parts.push('</div>')
  return parts.join('')
}

const AURORA_HTML = `<div class="bg-layer-aurora">
  <div class="wisp wisp-1"></div><div class="wisp wisp-2"></div>
  <div class="wisp wisp-3"></div><div class="wisp wisp-4"></div>
</div>`

const NEBULA_HTML = `<div class="bg-layer-nebula">
  <div class="nebula-cloud neb-1"></div>
  <div class="nebula-cloud neb-2"></div>
  <div class="nebula-cloud neb-3"></div>
  <div class="nebula-cloud neb-4"></div>
  <div class="nebula-cloud neb-5"></div>
</div>`

const SUNRISE_HTML = `<div class="bg-layer-sunrise">
  <div class="sun-wash wash-1"></div>
  <div class="sun-wash wash-2"></div>
  <div class="sun-wash wash-3"></div>
  <div class="light-streak streak-1"></div>
  <div class="light-streak streak-2"></div>
  <div class="light-streak streak-3"></div>
</div>`

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const buildShareImageHtml = (data: ShareImageData): string => {
  const { product, outcome, rationale, background } = data

  return `
    <div class="share-image" data-bg="${background}" data-outcome="${outcome}" id="shareImageInner">
      ${buildStars()}
      ${AURORA_HTML}
      ${buildSunsetParticles()}
      ${NEBULA_HTML}
      ${SUNRISE_HTML}
      <div class="sparkles">${buildSparkles()}</div>
      <div class="confetti-container">${buildConfetti(outcome)}</div>
      <div class="grain"></div>
      <div class="si-header">
        <span class="si-wordmark">TruePick</span>
      </div>
      <div class="si-center">
        <div class="si-product">${escapeHtml(product)}</div>
        <div class="si-outcome-badge" data-outcome="${outcome}">
          <span class="badge-icon">${OUTCOME_ICONS[outcome]}</span>
          ${OUTCOME_LABELS[outcome]}
        </div>
        ${rationale ? `<div class="si-rationale">${escapeHtml(rationale)}</div>` : ''}
      </div>
      <div class="si-footer">
        <span class="si-link-icon">\u{1F517}</span>
        <span class="si-url">gettruepick.com</span>
      </div>
    </div>`
}

export const renderShareImageToBlob = async (
  container: HTMLElement,
  targetWidth: number,
): Promise<Blob> => {
  const displayWidth = container.offsetWidth
  const scale = targetWidth / displayWidth

  const canvas = await html2canvas(container, {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    width: displayWidth,
    height: container.offsetHeight,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/png',
      1.0,
    )
  })
}
