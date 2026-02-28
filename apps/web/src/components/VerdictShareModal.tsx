import { useCallback, useEffect, useRef, useState } from 'react'
import type { VerdictRow, ShareBackground, LLMEvaluationReasoning } from '../constants/verdictTypes'
import { createSharedVerdict, buildShareUrl } from '../api/verdict/shareService'
import { buildShareImageHtml, renderShareImageToBlob } from '../utils/verdictImageGenerator'
import {
  copyToClipboard,
  downloadBlob,
  shareViaWebShare,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  buildMessengerShareUrl,
  buildIMessageUrl,
} from '../utils/shareHelpers'

type VerdictShareModalProps = {
  verdict: VerdictRow
  userId: string
  isOpen: boolean
  onClose: () => void
}

const BACKGROUNDS: { key: ShareBackground; label: string }[] = [
  { key: 'midnight', label: 'Night' },
  { key: 'aurora', label: 'Aurora' },
  { key: 'sunset', label: 'Sunset' },
  { key: 'nebula', label: 'Nebula' },
  { key: 'sunrise', label: 'Sunrise' },
]

const extractRationalePlain = (reasoning: Record<string, unknown> | null | undefined): string | null => {
  if (!reasoning) return null
  const typed = reasoning as LLMEvaluationReasoning
  if (typed.rationaleOneLiner) return typed.rationaleOneLiner
  const raw = typed.rationale
  if (!raw) return null
  const plain = raw.replace(/<[^>]*>/g, '').trim()
  return plain.length > 120 ? `${plain.slice(0, 117)}...` : plain
}

export default function VerdictShareModal({
  verdict,
  userId,
  isOpen,
  onClose,
}: VerdictShareModalProps) {
  const [background, setBackground] = useState<ShareBackground>('midnight')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const outcome = verdict.predicted_outcome ?? 'hold'
  const rationale = extractRationalePlain(verdict.reasoning)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const prepare = async () => {
      setPreparing(true)
      const result = await createSharedVerdict(verdict, userId)
      if (cancelled) return
      if (result.token) {
        setShareUrl(buildShareUrl(result.token))
      } else {
        showToast(result.error ?? 'Could not create share link')
      }
      setPreparing(false)
    }
    void prepare()
    return () => { cancelled = true }
  }, [isOpen, verdict, userId, showToast])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  if (!isOpen) return null

  const imageHtml = buildShareImageHtml({
    product: verdict.candidate_title,
    outcome,
    rationale,
    background,
  })

  const getImageElement = (): HTMLElement | null =>
    previewRef.current?.querySelector('#shareImageInner') ?? null

  const renderAndDownload = async (filename: string): Promise<Blob | null> => {
    const el = getImageElement()
    if (!el) {
      showToast('Preview not ready')
      return null
    }
    try {
      return await renderShareImageToBlob(el, 1080)
    } catch {
      showToast('Image render failed')
      return null
    }
  }

  const handleDownload = async () => {
    setActionLoading('download')
    const blob = await renderAndDownload(`truepick-${outcome}.png`)
    if (blob) {
      downloadBlob(blob, `truepick-${outcome}.png`)
      showToast('Image saved')
    }
    setActionLoading(null)
  }

  const handleNativeShare = async () => {
    setActionLoading('share')
    const blob = await renderAndDownload(`truepick-${outcome}.png`)
    if (!blob) { setActionLoading(null); return }

    const file = new File([blob], `truepick-${outcome}.png`, { type: 'image/png' })
    const shareText = `I asked TruePick about "${verdict.candidate_title}" — verdict: ${outcome.toUpperCase()}`
    const ok = await shareViaWebShare({
      title: 'TruePick Verdict',
      text: shareText,
      url: shareUrl ?? 'https://gettruepick.com',
      files: [file],
    })

    if (!ok) {
      downloadBlob(blob, `truepick-${outcome}.png`)
      showToast('Downloaded — share manually')
    }
    setActionLoading(null)
  }

  const handleCopyLink = async () => {
    if (!shareUrl) { showToast('Link not ready'); return }
    setActionLoading('copy')
    const ok = await copyToClipboard(shareUrl)
    showToast(ok ? 'Link copied' : 'Copy failed')
    setActionLoading(null)
  }

  const handleTwitter = () => {
    if (!shareUrl) return
    const text = `I asked @TruePick about "${verdict.candidate_title}" — verdict: ${outcome.toUpperCase()}`
    window.open(buildTwitterShareUrl(text, shareUrl), '_blank', 'noopener')
  }

  const handleWhatsApp = () => {
    if (!shareUrl) return
    const text = `Check out my TruePick verdict for "${verdict.candidate_title}": ${shareUrl}`
    window.open(buildWhatsAppShareUrl(text), '_blank', 'noopener')
  }

  const handleMessenger = () => {
    if (!shareUrl) return
    window.open(buildMessengerShareUrl(shareUrl), '_blank', 'noopener')
  }

  const handleIMessage = () => {
    if (!shareUrl) return
    const text = `Check out my TruePick verdict for "${verdict.candidate_title}": ${shareUrl}`
    window.location.href = buildIMessageUrl(text)
  }

  const handleInstagram = async () => {
    setActionLoading('instagram')
    const blob = await renderAndDownload(`truepick-${outcome}.png`)
    if (blob) {
      downloadBlob(blob, `truepick-${outcome}.png`)
      showToast('Image saved — open Instagram to share')
    }
    setActionLoading(null)
  }

  const handleTikTok = async () => {
    setActionLoading('tiktok')
    const blob = await renderAndDownload(`truepick-${outcome}.png`)
    if (blob) {
      downloadBlob(blob, `truepick-${outcome}.png`)
      showToast('Image saved — open TikTok to share')
    }
    setActionLoading(null)
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <div
        className="share-modal-overlay open"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Share verdict"
        tabIndex={-1}
      >
        <div className="share-modal">
          <div className="share-modal-header">
            <span className="share-modal-title">Share Verdict</span>
            <button
              type="button"
              className="share-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div
            className="share-modal-preview"
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: imageHtml }}
          />

          <div className="share-bg-selector">
            <div className="share-bg-label">Background</div>
            <div className="share-bg-options">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.key}
                  type="button"
                  className={`share-bg-opt${background === bg.key ? ' active' : ''}`}
                  onClick={() => setBackground(bg.key)}
                >
                  <div className="share-bg-swatch" data-bg={bg.key} />
                  <span className="share-bg-opt-label">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="share-modal-actions">
            {/* Native share (mobile only) */}
            <button
              type="button"
              className="share-modal-btn share-modal-btn--primary share-modal-btn--native"
              onClick={handleNativeShare}
              disabled={preparing || actionLoading !== null}
            >
              {actionLoading === 'share' ? 'Sharing...' : '\u2197 Share'}
            </button>

            {/* Platform grid */}
            <div className="share-platform-grid">
              <PlatformButton label="iMessage" onClick={handleIMessage} disabled={!shareUrl || preparing} />
              <PlatformButton label="Messenger" onClick={handleMessenger} disabled={!shareUrl || preparing} />
              <PlatformButton
                label="Instagram"
                onClick={handleInstagram}
                disabled={preparing || actionLoading !== null}
              />
              <PlatformButton
                label="TikTok"
                onClick={handleTikTok}
                disabled={preparing || actionLoading !== null}
              />
              <PlatformButton label="WhatsApp" onClick={handleWhatsApp} disabled={!shareUrl || preparing} />
              <PlatformButton label="X / Twitter" onClick={handleTwitter} disabled={!shareUrl || preparing} />
            </div>

            {/* Utility actions */}
            <button
              type="button"
              className="share-modal-btn share-modal-btn--glass"
              onClick={handleDownload}
              disabled={preparing || actionLoading !== null}
            >
              {actionLoading === 'download' ? 'Saving...' : '\u2193 Save Image'}
            </button>

            <button
              type="button"
              className={`share-modal-btn share-modal-btn--glass${actionLoading === 'copy' ? '' : ''}`}
              onClick={handleCopyLink}
              disabled={!shareUrl || preparing}
            >
              {preparing ? 'Creating link...' : '\u2291 Copy Link'}
            </button>
          </div>
        </div>
      </div>

      <div className={`share-toast${toast ? ' show' : ''}`}>
        {toast}
      </div>
    </>
  )
}

function PlatformButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      className="share-platform-btn"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
