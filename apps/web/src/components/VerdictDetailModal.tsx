import type { VerdictRow } from '../api/core/types'
import { sanitizeVerdictRationaleHtml } from '../utils/sanitizeHtml'
import { useUserFormatting } from '../preferences/UserPreferencesContext'

type VerdictDetailModalProps = {
  verdict: VerdictRow
  isOpen: boolean
  onClose: () => void
  onRegenerate?: (verdict: VerdictRow) => void
  onShare?: (verdict: VerdictRow) => void
  isRegenerating?: boolean
}

type ReasoningData = {
  alternativeSolution?: string
  rationale?: string
  importantPurchase?: boolean
}

export default function VerdictDetailModal({
  verdict,
  isOpen,
  onClose,
  onRegenerate,
  onShare,
  isRegenerating = false,
}: VerdictDetailModalProps) {
  const { formatCurrency, formatDateTime } = useUserFormatting()
  if (!isOpen) return null

  const reasoning = verdict.reasoning as ReasoningData | null
  const isImportant = reasoning?.importantPurchase === true
  const rationale = reasoning?.rationale
    ? sanitizeVerdictRationaleHtml(reasoning.rationale)
    : null
  const alternativeSolution = reasoning?.alternativeSolution
    ? sanitizeVerdictRationaleHtml(reasoning.alternativeSolution)
    : null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title-row">
            <h2>{verdict.candidate_title}</h2>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="modal-actions">
            {onShare && (
              <button
                type="button"
                className="ghost"
                onClick={() => onShare(verdict)}
              >
                Share
              </button>
            )}
            {onRegenerate && (
              <button
                type="button"
                className="ghost"
                onClick={() => onRegenerate(verdict)}
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>

        <div className="modal-body">
          <div className="verdict-detail-grid">
            <div className="detail-item">
              <span className="detail-label">Recommendation</span>
              <span
                className={`detail-value outcome-badge outcome-${verdict.predicted_outcome}`}
              >
                {verdict.predicted_outcome === 'buy' && '✓ Buy'}
                {verdict.predicted_outcome === 'hold' && '⏸ Hold'}
                {verdict.predicted_outcome === 'skip' && '✗ Skip'}
              </span>
            </div>

            {verdict.candidate_price !== null && (
              <div className="detail-item">
                <span className="detail-label">Price</span>
                <span className="detail-value">
                  {formatCurrency(verdict.candidate_price)}
                </span>
              </div>
            )}

            {verdict.candidate_category && (
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{verdict.candidate_category}</span>
              </div>
            )}

            {verdict.candidate_vendor && (
              <div className="detail-item">
                <span className="detail-label">Vendor</span>
                <span className="detail-value">{verdict.candidate_vendor}</span>
              </div>
            )}

            {verdict.created_at && (
              <div className="detail-item">
                <span className="detail-label">Created</span>
                <span className="detail-value">
                  {formatDateTime(verdict.created_at)}
                </span>
              </div>
            )}

            {isImportant && (
              <div className="detail-item">
                <span className="detail-label">Important</span>
                <span className="detail-value important-badge">Important</span>
              </div>
            )}
          </div>

          {verdict.justification && (
            <div className="detail-section">
              <h3>Your Justification</h3>
              <p className="detail-text">{verdict.justification}</p>
            </div>
          )}

          {reasoning && (rationale || alternativeSolution) && (
            <div className="detail-section">
              <h3>AI Analysis</h3>

              {rationale && (
                <div className="analysis-item analysis-card--hover">
                  <div className="analysis-header">
                    <span className="analysis-label">Rationale</span>
                  </div>
                  <p
                    className="analysis-explanation rationale-text"
                    dangerouslySetInnerHTML={{ __html: rationale }}
                  />
                </div>
              )}

              {alternativeSolution && (
                <div className="analysis-item analysis-card--hover analysis-card--compact">
                  <div className="analysis-header">
                    <span className="analysis-label">Alternative solution</span>
                  </div>
                  <p
                    className="analysis-explanation rationale-text"
                    dangerouslySetInnerHTML={{ __html: alternativeSolution }}
                  />
                </div>
              )}
            </div>
          )}

          {verdict.hold_release_at && (
            <div className="detail-section">
              <h3>Hold Information</h3>
              <p className="detail-text">
                Hold expires: {formatDateTime(verdict.hold_release_at)}
              </p>
            </div>
          )}

          {verdict.user_decision && (
            <div className="detail-section">
              <h3>Your Decision</h3>
              <p className="detail-text">
                <strong>{verdict.user_decision}</strong>
                {verdict.user_decision === 'hold' && verdict.user_hold_until && (
                  <> (until {formatDateTime(verdict.user_hold_until)})</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
