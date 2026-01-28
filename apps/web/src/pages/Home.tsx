import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Stats, VerdictRow } from '../api/types'
import { PURCHASE_CATEGORIES } from '../api/types'
import { getSwipeStats } from '../api/statsService'
import { getRecentVerdict, createVerdict, evaluatePurchase } from '../api/verdictService'
import VerdictDetailModal from '../components/VerdictDetailModal'

type HomeProps = {
  session: Session | null
}

export default function Home({ session }: HomeProps) {
  const [stats, setStats] = useState<Stats>({
    swipesCompleted: 0,
    regretRate: 0,
    activeHolds: 0,
  })
  const [recentVerdict, setRecentVerdict] = useState<VerdictRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('uncategorized')
  const [vendor, setVendor] = useState('')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string>('')

  const loadStats = useCallback(async () => {
    if (!session) return
    const data = await getSwipeStats(session.user.id)
    setStats(data)
  }, [session])

  const loadRecentVerdict = useCallback(async () => {
    if (!session) return
    const data = await getRecentVerdict(session.user.id)
    setRecentVerdict(data)
  }, [session])

  useEffect(() => {
    void loadStats()
    void loadRecentVerdict()
  }, [loadStats, loadRecentVerdict])

  const resetForm = () => {
    setTitle('')
    setPrice('')
    setCategory('uncategorized')
    setVendor('')
    setJustification('')
  }

  const handleEvaluate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session) return

    const priceValue = price ? Number(price) : null
    if (!title.trim()) {
      setStatus('Item title is required.')
      return
    }

    setSubmitting(true)
    setStatus('')

    const input = {
      title: title.trim(),
      price: priceValue,
      category: category.trim() || null,
      vendor: vendor.trim() || null,
      justification: justification.trim() || null,
    }

    // Get API key from environment (in production, this should be handled server-side)
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

    const evaluation = await evaluatePurchase(session.user.id, input, openaiApiKey)
    const { error } = await createVerdict(session.user.id, input, evaluation)

    if (error) {
      setStatus(error)
      setSubmitting(false)
      return
    }

    resetForm()
    await loadStats()
    await loadRecentVerdict()
    setSubmitting(false)
  }

  return (
    <section className="route-content">
      <h1>Today's reflection</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Swipes completed</span>
          <span className="stat-value">{stats.swipesCompleted}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Regret rate</span>
          <span className="stat-value">{stats.regretRate}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">24h holds active</span>
          <span className="stat-value">{stats.activeHolds}</span>
        </div>
      </div>
      <p>
        Considering a purchase? Enter the details below and we'll evaluate it
        against your patterns.
      </p>

      {status && <div className="status error">{status}</div>}

      <div className="decision-section">
        <h2>New purchase decision</h2>
        <form className="decision-form" onSubmit={handleEvaluate}>
          <label>
            What do you want to buy?
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Noise cancelling headphones"
              required
            />
          </label>
          <div className="form-row">
            <label>
              Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299.00"
              />
            </label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {PURCHASE_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Brand / Vendor
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Amazon"
            />
          </label>
          <label>
            Why do you want this?
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="I need it for work calls..."
              rows={3}
            />
          </label>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Evaluating...' : 'Evaluate'}
          </button>
        </form>
      </div>

      {recentVerdict && (
        <div className="verdict-result">
          <h2>Latest verdict</h2>
          <div
            className={`verdict-card outcome-${recentVerdict.predicted_outcome} clickable`}
            onClick={() => setModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setModalOpen(true)}
            role="button"
            tabIndex={0}
          >
            <div className="verdict-header">
              <span className="verdict-title">{recentVerdict.candidate_title}</span>
              <span className="verdict-outcome">
                {recentVerdict.predicted_outcome === 'buy' && '✓ Buy'}
                {recentVerdict.predicted_outcome === 'hold' && '⏸ Hold for 24h'}
                {recentVerdict.predicted_outcome === 'skip' && '✗ Skip'}
              </span>
            </div>
            {recentVerdict.candidate_price && (
              <span className="verdict-price">
                ${recentVerdict.candidate_price.toFixed(2)}
              </span>
            )}
            {recentVerdict.hold_release_at && (
              <span className="verdict-hold">
                Hold expires:{' '}
                {new Date(recentVerdict.hold_release_at).toLocaleString()}
              </span>
            )}
            <span className="click-hint">Details</span>
          </div>
        </div>
      )}

      {recentVerdict && (
        <VerdictDetailModal
          verdict={recentVerdict}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  )
}
