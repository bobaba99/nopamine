import { useEffect, useRef, useState } from 'react'
import { useGSAPLoader } from './Kinematics'
import './ChromeExtensionDemo.css'

const SCENE_LABELS = ['Session Awareness', 'Checkout Interstitial', 'Website Blocking']
const SCENE_URLS = ['shopnow.com/products', 'shopnow.com/checkout', 'fashion-deals.com']

/* ── Inline SVGs ── */

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

/* ── Browser Toolbar ── */

function BrowserToolbar({ activeScene }: { activeScene: number }) {
  return (
    <div className="ext-demo-toolbar">
      <div className="ext-demo-dots">
        <span className="ext-demo-dot ext-demo-dot--red" />
        <span className="ext-demo-dot ext-demo-dot--yellow" />
        <span className="ext-demo-dot ext-demo-dot--green" />
      </div>
      <div className="ext-demo-address-bar">
        {SCENE_URLS.map((url, i) => (
          <span
            key={url}
            className={`ext-demo-url${activeScene !== i ? ' ext-demo-url--hidden' : ''}`}
          >
            {url}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Scene 1: Session Awareness ── */

function SceneSessionAwareness() {
  return (
    <div className="ext-demo-scene" data-scene="session">
      <div className="ext-scene-header">
        <span className="ext-scene-site-name">ShopNow</span>
        <div className="ext-scene-nav-dots">
          <span className="ext-scene-nav-dot" />
          <span className="ext-scene-nav-dot" />
          <span className="ext-scene-nav-dot" />
        </div>
      </div>

      <div className="ext-scene-products">
        {['$149', '$89', '$65', '$219'].map((price) => (
          <div key={price} className="ext-scene-product-card">
            <div className="ext-scene-product-swatch" />
            <span className="ext-scene-product-price">{price}</span>
          </div>
        ))}
      </div>

      <div className="ext-scene-notification" data-el="notification">
        <ShieldIcon className="ext-scene-notification-icon" />
        <div className="ext-scene-notification-text">
          <span className="ext-scene-notification-title">14 products in 22 min</span>
          <span className="ext-scene-notification-sub">Impulse pattern detected</span>
        </div>
      </div>
    </div>
  )
}

/* ── Scene 2: Checkout Interstitial ── */

function SceneCheckoutInterstitial() {
  return (
    <div className="ext-demo-scene" data-scene="checkout">
      <div className="ext-scene-checkout">
        <span className="ext-scene-checkout-title">Order Summary</span>

        <div className="ext-scene-checkout-item">
          <div className="ext-scene-checkout-thumb" />
          <div className="ext-scene-checkout-details">
            <span className="ext-scene-checkout-name">Wireless Headphones</span>
            <span className="ext-scene-checkout-price">$149.00</span>
          </div>
        </div>

        <div className="ext-scene-checkout-total">
          <span className="ext-scene-checkout-total-label">Total</span>
          <span className="ext-scene-checkout-total-value">$149.00</span>
        </div>

        <div className="ext-scene-place-order">Place Order</div>
      </div>

      <div className="ext-scene-overlay" data-el="overlay">
        <span className="ext-scene-overlay-heading">Before you buy...</span>
        <span className="ext-scene-overlay-badge" data-el="badge">HOLD</span>
        <span className="ext-scene-overlay-text">This matches an impulse pattern. Sleep on it?</span>
        <div className="ext-scene-overlay-buttons">
          <span className="ext-scene-overlay-btn">Continue anyway</span>
          <span className="ext-scene-overlay-btn ext-scene-overlay-btn--primary">Take a break</span>
        </div>
      </div>
    </div>
  )
}

/* ── Scene 3: Website Blocking ── */

function SceneWebsiteBlocking() {
  return (
    <div className="ext-demo-scene" data-scene="blocking">
      <div className="ext-scene-blocked-bg" data-el="blocked-bg">
        <div className="ext-scene-blocked-lines">
          <div className="ext-scene-blocked-line" />
          <div className="ext-scene-blocked-line" />
          <div className="ext-scene-blocked-line" />
          <div className="ext-scene-blocked-line" />
        </div>
      </div>

      <div className="ext-scene-prompt" data-el="prompt">
        <ShieldIcon className="ext-scene-shield" />
        <span className="ext-scene-prompt-title">Time to reflect</span>
        <span className="ext-scene-countdown">0:30</span>
        <span className="ext-scene-prompt-sub">You set a 30-second reflection period for this site</span>
      </div>
    </div>
  )
}

/* ── Progress Indicator ── */

function ProgressDots({ activeScene }: { activeScene: number }) {
  return (
    <div className="ext-demo-progress">
      {SCENE_LABELS.map((label, i) => (
        <div key={label} className={`ext-demo-step${activeScene === i ? ' ext-demo-step--active' : ''}`}>
          <span className="ext-demo-step-dot" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Pure CSS scroll-based scene switching (no GSAP timeline/pin) ── */

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
        // How far the section has scrolled past the viewport top
        // 0 = section top at viewport top, 1 = section bottom at viewport top
        const scrolled = -rect.top / sectionHeight
        const progress = Math.max(0, Math.min(1, scrolled))

        if (progress < 0.33) setActiveScene(0)
        else if (progress < 0.67) setActiveScene(1)
        else setActiveScene(2)

        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionRef, setActiveScene, isMobile])
}

/* ── Mobile Stacked Animation ── */

function useMobileAnimation(
  gsapReady: boolean,
  stackedRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
) {
  useEffect(() => {
    if (!gsapReady || !stackedRef.current || !isMobile) return
    const gsap = window.gsap
    if (!gsap) return

    const items = stackedRef.current.querySelectorAll<HTMLElement>('.ext-demo-stacked-scene')
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
  }, [gsapReady, stackedRef, isMobile])
}

/* ── Main Component ── */

export default function ChromeExtensionDemo() {
  const gsapReady = useGSAPLoader()
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
  useMobileAnimation(gsapReady, stackedRef, isMobile)

  return (
    <div className="ext-demo-section" ref={sectionRef}>
      <h2 className="premium-section-title">See it in action</h2>
      <p className="premium-section-subtitle">
        A quick look at how TruePick Premium works in your daily browsing.
      </p>

      {/* Desktop: CSS-driven scene switching based on scroll position */}
      {!isMobile && (
        <div className="ext-demo-container" data-active-scene={activeScene}>
          <div className="ext-demo-browser">
            <BrowserToolbar activeScene={activeScene} />
            <div className="ext-demo-viewport">
              <SceneSessionAwareness />
              <SceneCheckoutInterstitial />
              <SceneWebsiteBlocking />
            </div>
          </div>
          <ProgressDots activeScene={activeScene} />
        </div>
      )}

      {/* Mobile: stacked with individual fade-ins */}
      {isMobile && (
        <div className="ext-demo-stacked" ref={stackedRef}>
          {SCENE_LABELS.map((label, i) => (
            <div key={label} className="ext-demo-stacked-scene">
              <p className="ext-demo-stacked-label">{label}</p>
              <div className="ext-demo-browser">
                <BrowserToolbar activeScene={i} />
                <div className="ext-demo-viewport">
                  {i === 0 && <SceneSessionAwareness />}
                  {i === 1 && <SceneCheckoutInterstitial />}
                  {i === 2 && <SceneWebsiteBlocking />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
