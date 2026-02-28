import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { SharedVerdictRow } from '../constants/verdictTypes'
import { getSharedVerdict, incrementShareViewCount } from '../api/verdict/shareService'
import { GlassCard, LiquidButton } from '../components/Kinematics'

export default function SharedVerdict() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [sharedVerdict, setSharedVerdict] = useState<SharedVerdictRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      const data = await getSharedVerdict(token)
      if (cancelled) return

      if (!data) {
        setNotFound(true)
      } else {
        setSharedVerdict(data)
        void incrementShareViewCount(token)
      }
      setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="shared-verdict-page">
        <div className="shared-verdict-hero">
          <div className="eval-spinner" />
        </div>
      </div>
    )
  }

  if (notFound || !sharedVerdict) {
    return (
      <div className="shared-verdict-page">
        <div className="shared-verdict-hero">
          <div className="shared-brand">TruePick</div>
          <h1>This verdict link is invalid or has expired.</h1>
        </div>
        <div className="shared-verdict-cta">
          <h2>Try TruePick yourself</h2>
          <p>Get AI-powered buy/skip/hold verdicts for your purchases.</p>
          <LiquidButton className="primary" type="button" onClick={() => navigate('/auth')}>
            Get started
          </LiquidButton>
        </div>
      </div>
    )
  }

  const outcomeLabel =
    sharedVerdict.predicted_outcome === 'buy' ? '\u2713 Buy'
      : sharedVerdict.predicted_outcome === 'skip' ? '\u2717 Skip'
        : '\u23F8 Hold'

  const formattedPrice = sharedVerdict.candidate_price !== null
    ? `$${Number(sharedVerdict.candidate_price).toFixed(2)}`
    : null

  return (
    <div className="shared-verdict-page">
      <div className="shared-verdict-hero">
        <div className="shared-brand">TruePick</div>
        <h1>Someone shared a purchase verdict with you</h1>
      </div>

      <GlassCard className={`shared-verdict-card outcome-${sharedVerdict.predicted_outcome}`}>
        <div className="shared-outcome-badge">{outcomeLabel}</div>
        <h2>{sharedVerdict.candidate_title}</h2>
        {formattedPrice && (
          <div className="shared-verdict-price">{formattedPrice}</div>
        )}
        {sharedVerdict.candidate_vendor && (
          <div className="shared-verdict-vendor">from {sharedVerdict.candidate_vendor}</div>
        )}
        {sharedVerdict.rationale_summary && (
          <div className="shared-verdict-rationale">{sharedVerdict.rationale_summary}</div>
        )}
      </GlassCard>

      <div className="shared-verdict-cta">
        <h2>Want clarity on your next purchase?</h2>
        <p>TruePick uses AI to give you an honest verdict based on your spending patterns.</p>
        <LiquidButton className="primary" type="button" onClick={() => navigate('/auth')}>
          Get your own verdict
        </LiquidButton>
      </div>

      <div className="shared-verdict-footer">
        Powered by <strong>TruePick</strong>
      </div>
    </div>
  )
}
