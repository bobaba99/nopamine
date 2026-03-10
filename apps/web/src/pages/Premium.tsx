import { useState } from 'react'
import { GlassCard, LiquidButton, VolumetricInput } from '../components/Kinematics'
import { analytics } from '../hooks/useAnalytics'
import './Premium.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export default function Premium() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), verdicts_at_signup: 0 }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Something went wrong. Please try again.')
        return
      }

      analytics.trackWaitlistSubmitted('premium_page')
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="premium-page">
      {/* ── Hero ── */}
      <div className="premium-hero">
        <span className="premium-badge">Coming soon</span>
        <h1 className="premium-headline">
          TruePick Premium
        </h1>
        <p className="premium-subheadline">
          Go beyond single verdicts. Get automated purchase protection, spending
          intelligence, and a Chrome extension that intervenes before you checkout.
        </p>
      </div>

      {/* ── Chrome Extension ── */}
      <div className="premium-section">
        <h2 className="premium-section-title">Chrome Extension</h2>
        <p className="premium-section-subtitle">
          Your purchase therapist, built into the browser.
        </p>

        <div className="premium-features">
          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">🔍</div>
            <h3>Session Awareness</h3>
            <p>
              Tracks browsing activity on e-commerce domains — time on site, pages
              viewed, visit frequency. Surfaces real-time indicators
              like &ldquo;You&apos;ve browsed 14 products in 22 minutes — this pattern
              matches impulse browsing.&rdquo;
            </p>
          </GlassCard>

          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">🛑</div>
            <h3>Checkout Interstitial</h3>
            <p>
              Detects checkout flows via URL patterns and DOM heuristics. Injects a
              dismissible decision overlay that routes you through TruePick&apos;s
              verdict engine before you complete the purchase.
            </p>
          </GlassCard>

          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">🔒</div>
            <h3>Website Blocking</h3>
            <p>
              Opt-in commitment device with customizable schedules. Soft block adds a
              30-second reflection prompt; hard block fully prevents access with a
              cooldown period you control.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* ── Unlimited Verdicts ── */}
      <div className="premium-section">
        <h2 className="premium-section-title">Unlimited &amp; Refined Verdicts</h2>
        <p className="premium-section-subtitle">
          No daily cap. Deeper reasoning that references your values and history.
        </p>

        <div className="premium-features premium-features--two">
          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">♾️</div>
            <h3>Unlimited Verdicts</h3>
            <p>
              Remove the 3/day free-tier cap. Evaluate as many purchases as you need,
              whenever you need — no waiting for tomorrow.
            </p>
          </GlassCard>

          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">🎯</div>
            <h3>Personalized Rationale</h3>
            <p>
              Every verdict references your profile, values, and spending history.
              Hold verdicts include email reminders and customizable hold durations.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* ── Analytics & Intelligence ── */}
      <div className="premium-section">
        <h2 className="premium-section-title">Analytics &amp; Intelligence</h2>
        <p className="premium-section-subtitle">
          Turn purchase data into actionable spending insights.
        </p>

        <div className="premium-features">
          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">📊</div>
            <h3>Spending Reports</h3>
            <p>
              Weekly and monthly reports with charts, trend lines, and key
              metrics like &ldquo;$280 redirected to satisfied purchases this
              month.&rdquo; Dividend-report style summaries you can actually act on.
            </p>
          </GlassCard>

          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">💡</div>
            <h3>Alternative Suggestions</h3>
            <p>
              When a verdict suggests skip, the AI surfaces alternatives — cheaper
              options, DIY approaches, or existing items you own that fulfill the
              same need.
            </p>
          </GlassCard>

          <GlassCard className="premium-feature-card">
            <div className="premium-feature-icon">📧</div>
            <h3>Ongoing Email Sync</h3>
            <p>
              Automatically log completed transactions from purchase confirmation
              emails. Merges with verdicts for post-purchase satisfaction tracking
              at 7, 14, and 30 days.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* ── Tier Comparison ── */}
      <div className="premium-section">
        <h2 className="premium-section-title">Free vs. Premium</h2>
        <p className="premium-section-subtitle">
          Everything in Free, plus the tools to make it automatic.
        </p>

        <GlassCard className="premium-comparison-card">
          <table className="premium-comparison-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Free</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Profile quiz</td>
                <td className="premium-check">✓</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>AI verdicts (3/day)</td>
                <td className="premium-check">✓</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Educational resources</td>
                <td className="premium-check">✓</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Unlimited verdicts</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Personalized rationale</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Session awareness</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Checkout interstitials</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Website blocking</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Spending reports</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Alternative suggestions</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
              <tr>
                <td>Ongoing email sync</td>
                <td className="premium-dash">—</td>
                <td className="premium-check">✓</td>
              </tr>
            </tbody>
          </table>
        </GlassCard>
      </div>

      {/* ── Waitlist CTA ── */}
      <div className="premium-section premium-waitlist-section">
        <GlassCard className="premium-waitlist-card">
          <h2 className="premium-section-title">Be the first to know</h2>
          <p className="premium-waitlist-body">
            Premium is in active development. Join the waitlist and founding
            members get <strong>3 months free</strong> when we launch.
          </p>

          {submitted ? (
            <p className="premium-waitlist-success">
              You&apos;re on the list! We&apos;ll reach out when premium launches.
            </p>
          ) : (
            <form className="premium-waitlist-form" onSubmit={(e) => void handleWaitlistSubmit(e)}>
              <div className="premium-waitlist-input-row">
                <VolumetricInput
                  as="input"
                  type="email"
                  className="premium-waitlist-input"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  aria-label="Email address for premium waitlist"
                />
                <LiquidButton type="submit" className="primary premium-waitlist-btn" disabled={submitting}>
                  {submitting ? 'Joining...' : 'Join waitlist'}
                </LiquidButton>
              </div>
              {error && <p className="premium-waitlist-error">{error}</p>}
            </form>
          )}
        </GlassCard>
      </div>
    </section>
  )
}
