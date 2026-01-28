import type { VerdictRow } from '../api/types'

type VerdictDetailModalProps = {
  verdict: VerdictRow
  isOpen: boolean
  onClose: () => void
}

type ReasoningData = {
  valueConflictScore?: {
    score: number
    explanation: string
  }
  patternRepetitionRisk?: {
    score: number
    explanation: string
  }
  rationale?: string
}

export default function VerdictDetailModal({
  verdict,
  isOpen,
  onClose,
}: VerdictDetailModalProps) {
  if (!isOpen) return null

  const reasoning = verdict.reasoning as ReasoningData | null

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
                  ${verdict.candidate_price.toFixed(2)}
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
                  {new Date(verdict.created_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {verdict.justification && (
            <div className="detail-section">
              <h3>Your Justification</h3>
              <p className="detail-text">{verdict.justification}</p>
            </div>
          )}

          {reasoning && (
            <div className="detail-section">
              <h3>AI Analysis</h3>

              {reasoning.valueConflictScore && (
                <div className="analysis-item">
                  <div className="analysis-header">
                    <span className="analysis-label">Value Conflict Score</span>
                    <span className="analysis-score">
                      {reasoning.valueConflictScore.score}/5
                    </span>
                  </div>
                  <p className="analysis-explanation">
                    {reasoning.valueConflictScore.explanation}
                  </p>
                </div>
              )}

              {reasoning.patternRepetitionRisk && (
                <div className="analysis-item">
                  <div className="analysis-header">
                    <span className="analysis-label">Pattern Repetition Risk</span>
                    <span className="analysis-score">
                      {reasoning.patternRepetitionRisk.score}/5
                    </span>
                  </div>
                  <p className="analysis-explanation">
                    {reasoning.patternRepetitionRisk.explanation}
                  </p>
                </div>
              )}

              {reasoning.rationale && (
                <div className="analysis-item">
                  <div className="analysis-header">
                    <span className="analysis-label">Rationale</span>
                  </div>
                  <p className="analysis-explanation">{reasoning.rationale}</p>
                </div>
              )}
            </div>
          )}

          {verdict.hold_release_at && (
            <div className="detail-section">
              <h3>Hold Information</h3>
              <p className="detail-text">
                Hold expires: {new Date(verdict.hold_release_at).toLocaleString()}
              </p>
            </div>
          )}

          {verdict.user_decision && (
            <div className="detail-section">
              <h3>Your Decision</h3>
              <p className="detail-text">
                <strong>{verdict.user_decision}</strong>
                {verdict.user_decision === 'hold' && verdict.user_hold_until && (
                  <> (until {new Date(verdict.user_hold_until).toLocaleString()})</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
