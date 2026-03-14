import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './AnalyticsDemoSection.css'

const SCENE_LABELS = ['Spending Reports', 'Smart Alternatives', 'Email Sync']

/* ── Inline SVG Icons ── */

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2L2 12l10 10 10-10L12 2z" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14" />
    </svg>
  )
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/* ── App Toolbar ── */

function AppToolbar({ activeScene }: { activeScene: number }) {
  return (
    <div className="analytics-demo-toolbar">
      <span className="analytics-demo-toolbar-label">
        <DiamondIcon className="analytics-demo-toolbar-diamond" />
        TruePick Premium
      </span>
      <div className="analytics-demo-toolbar-nav">
        {SCENE_LABELS.map((_, i) => (
          <span
            key={i}
            className={`analytics-demo-toolbar-nav-dot${activeScene === i ? ' analytics-demo-toolbar-nav-dot--active' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Scene 1: Spending Report ── */

function SceneSpendingReport() {
  const bars = [
    { label: 'Wk 1', height: '60%' },
    { label: 'Wk 2', height: '82%' },
    { label: 'Wk 3', height: '48%' },
    { label: 'Wk 4', height: '72%' },
  ]

  const categories = [
    { name: 'Electronics', pct: '42%', color: '#6366f1' },
    { name: 'Clothing', pct: '28%', color: '#ec4899' },
    { name: 'Food', pct: '18%', color: '#22c55e' },
    { name: 'Other', pct: '12%', color: '#f59e0b' },
  ]

  return (
    <div className="analytics-demo-scene" data-scene="spending">
      <div className="analytics-scene-stats">
        <div className="analytics-scene-stat">
          <div className="analytics-scene-stat-value">$4,250</div>
          <div className="analytics-scene-stat-label">Total Spent</div>
        </div>
        <div className="analytics-scene-stat">
          <div className="analytics-scene-stat-value">$1,180</div>
          <div className="analytics-scene-stat-label">Saved</div>
        </div>
        <div className="analytics-scene-stat">
          <div className="analytics-scene-stat-value">23</div>
          <div className="analytics-scene-stat-label">Purchases</div>
        </div>
      </div>

      <div className="analytics-scene-chart">
        {bars.map((bar) => (
          <div key={bar.label} className="analytics-scene-bar-group">
            <div
              className="analytics-scene-bar"
              style={{ '--bar-height': bar.height } as React.CSSProperties}
            />
            <span className="analytics-scene-bar-label">{bar.label}</span>
          </div>
        ))}
      </div>

      <div className="analytics-scene-categories">
        {categories.map((cat) => (
          <div key={cat.name} className="analytics-scene-category">
            <span className="analytics-scene-category-name">{cat.name}</span>
            <div className="analytics-scene-category-track">
              <div
                className="analytics-scene-category-fill"
                style={{
                  '--cat-width': cat.pct,
                  background: cat.color,
                } as React.CSSProperties}
              />
            </div>
            <span className="analytics-scene-category-pct">{cat.pct}</span>
          </div>
        ))}
      </div>

      <div className="analytics-scene-insight">
        <LightbulbIcon className="analytics-scene-insight-icon" />
        <span className="analytics-scene-insight-text">
          You saved 22% more this month by following Hold verdicts. Impulse buys dropped from 4.2 to 2.1/week.
        </span>
      </div>
    </div>
  )
}

/* ── Scene 2: Alternative Suggestions ── */

function SceneAlternatives() {
  const alternatives = [
    { name: 'Sony WH-1000XM5', price: '$279', tag: 'Same quality, 49% less', match: '92%' },
    { name: 'AirPods Pro 2', price: '$199', tag: 'If portability matters more', match: '78%' },
    { name: 'Your Bose QC35', price: '$0', tag: 'Still excellent, already own', match: '95%' },
  ]

  return (
    <div className="analytics-demo-scene" data-scene="alternatives">
      <div className="analytics-scene-original">
        <div className="analytics-scene-original-info">
          <span className="analytics-scene-original-name">AirPods Max</span>
          <span className="analytics-scene-original-price">$549</span>
        </div>
        <span className="analytics-scene-skip-badge">Skip</span>
      </div>

      <div className="analytics-scene-alts-heading">Smarter alternatives</div>

      <div className="analytics-scene-alts">
        {alternatives.map((alt) => (
          <div key={alt.name} className="analytics-scene-alt-card">
            <div className="analytics-scene-alt-top">
              <span>
                <span className="analytics-scene-alt-name">{alt.name}</span>
                <span className="analytics-scene-alt-price"> {alt.price}</span>
              </span>
              <span className="analytics-scene-alt-tag">{alt.tag}</span>
            </div>
            <div className="analytics-scene-alt-match">
              <span className="analytics-scene-alt-match-label">Match</span>
              <div className="analytics-scene-alt-match-track">
                <div
                  className="analytics-scene-alt-match-fill"
                  style={{ '--match-width': alt.match } as React.CSSProperties}
                />
              </div>
              <span className="analytics-scene-alt-match-pct">{alt.match}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Scene 3: Email Sync ── */

function SceneEmailSync() {
  return (
    <div className="analytics-demo-scene" data-scene="emailsync">
      <div className="analytics-scene-summary-pill">
        3 new purchases synced this week
      </div>

      <div className="analytics-scene-timeline">
        <div className="analytics-scene-activity">
          <EnvelopeIcon className="analytics-scene-activity-icon" />
          <div className="analytics-scene-activity-content">
            <div className="analytics-scene-activity-title">
              Purchase detected: <strong>Nike Air Max 90 — $129.99</strong>
            </div>
            <div className="analytics-scene-activity-time">2 hours ago</div>
          </div>
        </div>

        <div className="analytics-scene-activity">
          <CheckCircleIcon className="analytics-scene-activity-icon" />
          <div className="analytics-scene-activity-content">
            <div className="analytics-scene-activity-title">
              7-day check-in: How&apos;s your <strong>Kindle Paperwhite</strong>?
            </div>
            <div className="analytics-scene-emojis">
              {['😍', '😊', '😐', '😕', '😢'].map((emoji) => (
                <span key={emoji} className="analytics-scene-emoji" aria-hidden="true">
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="analytics-scene-activity">
          <CheckCircleIcon className="analytics-scene-activity-icon" />
          <div className="analytics-scene-activity-content">
            <div className="analytics-scene-activity-title">
              30-day review: <strong>Standing Desk</strong>
            </div>
            <span className="analytics-scene-satisfied-badge">92% satisfied</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Progress Dots ── */

function ProgressDots({ activeScene }: { activeScene: number }) {
  return (
    <div className="analytics-demo-progress">
      {SCENE_LABELS.map((label, i) => (
        <div key={label} className={`analytics-demo-step${activeScene === i ? ' analytics-demo-step--active' : ''}`}>
          <span className="analytics-demo-step-dot" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Scroll-based scene switching ── */

function useScrollScenes(
  sectionRef: React.RefObject<HTMLDivElement | null>,
  setActiveScene: (scene: number) => void,
  isMobile: boolean,
) {
  useEffect(() => {
    if (isMobile || !sectionRef.current) return

    const section = sectionRef.current
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect()
        const sectionHeight = section.offsetHeight
        const scrolled = -rect.top / sectionHeight
        const progress = Math.max(0, Math.min(1, scrolled))

        if (progress < 0.28) setActiveScene(0)
        else if (progress < 0.55) setActiveScene(1)
        else setActiveScene(2)

        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionRef, setActiveScene, isMobile])
}

/* ── Mobile Stacked Animation ── */

function useMobileAnimation(
  stackedRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
) {
  useEffect(() => {
    if (!stackedRef.current || !isMobile) return

    const items = stackedRef.current.querySelectorAll<HTMLElement>('.analytics-demo-stacked-scene')
    if (!items.length) return

    const ctx = gsap.context(() => {
      items.forEach((item) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })
    }, stackedRef.current)

    return () => ctx.revert()
  }, [stackedRef, isMobile])
}

/* ── Main Component ── */

export default function AnalyticsDemoSection() {
  const [activeScene, setActiveScene] = useState(0)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false,
  )
  const sectionRef = useRef<HTMLDivElement>(null)
  const stackedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useScrollScenes(sectionRef, setActiveScene, isMobile)
  useMobileAnimation(stackedRef, isMobile)

  return (
    <div className="analytics-demo-section" ref={sectionRef}>
      <h2 className="premium-section-title">Your spending, visualized</h2>
      <p className="premium-section-subtitle">
        See how Premium turns purchase data into actionable insights.
      </p>

      {/* Desktop: CSS-driven scene switching based on scroll position */}
      {!isMobile && (
        <div className="analytics-demo-container" data-active-scene={activeScene}>
          <div className="analytics-demo-app">
            <AppToolbar activeScene={activeScene} />
            <div className="analytics-demo-viewport">
              <SceneSpendingReport />
              <SceneAlternatives />
              <SceneEmailSync />
            </div>
          </div>
          <ProgressDots activeScene={activeScene} />
        </div>
      )}

      {/* Mobile: stacked with individual fade-ins */}
      {isMobile && (
        <div className="analytics-demo-stacked" ref={stackedRef}>
          {SCENE_LABELS.map((label, i) => (
            <div key={label} className="analytics-demo-stacked-scene">
              <p className="analytics-demo-stacked-label">{label}</p>
              <div className="analytics-demo-app">
                <AppToolbar activeScene={i} />
                <div className="analytics-demo-viewport">
                  {i === 0 && <SceneSpendingReport />}
                  {i === 1 && <SceneAlternatives />}
                  {i === 2 && <SceneEmailSync />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
