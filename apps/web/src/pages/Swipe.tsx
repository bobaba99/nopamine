import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { SwipeOutcome, SwipeQueueItem, SwipeTiming } from '../api/types'
import { getUnratedPurchases, createSwipe, deleteSwipe } from '../api/swipeService'

type SwipeProps = {
  session: Session | null
}

type SwipeDirection = 'left' | 'right' | null

type LastSwipe = {
  scheduleId: string
  timing: SwipeTiming
  purchaseTitle: string
  outcome: SwipeOutcome
}

const UNDO_TIMEOUT_MS = 3000

const formatTimingLabel = (timing: SwipeTiming) => {
  switch (timing) {
    case 'immediate':
      return 'Immediate'
    case 'week':
      return '1 week'
    case 'month3':
      return '3 months'
    case 'month6':
      return '6 months'
    default:
      return timing
  }
}

export default function Swipe({ session }: SwipeProps) {
  const [purchases, setPurchases] = useState<SwipeQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null)
  const [status, setStatus] = useState<string>('')
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'immediate' | 'later'>('all')
  const undoTimerRef = useRef<number | null>(null)

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }, [])

  const clearLastSwipe = useCallback(() => {
    setLastSwipe(null)
    clearUndoTimer()
  }, [clearUndoTimer])

  const loadUnratedPurchases = useCallback(async () => {
    if (!session) return

    setLoading(true)
    setStatus('')
    clearLastSwipe()

    try {
      const data = await getUnratedPurchases(session.user.id)
      setPurchases(data)
      setCurrentIndex(0)
    } catch (err) {
      setStatus('Failed to load purchases.')
    } finally {
      setLoading(false)
    }
  }, [session, clearLastSwipe])

  useEffect(() => {
    void loadUnratedPurchases()
  }, [loadUnratedPurchases])

  const visiblePurchases = purchases.filter((item) => {
    if (viewMode === 'immediate') return item.timing === 'immediate'
    if (viewMode === 'later') return item.timing !== 'immediate'
    return true
  })
  const currentItem = visiblePurchases[currentIndex] ?? null
  const currentPurchase = currentItem?.purchase ?? null
  const remaining = visiblePurchases.length - currentIndex

  const handleUndo = useCallback(async () => {
    if (!session || !lastSwipe || undoing) return

    setUndoing(true)
    clearUndoTimer()

    const { error } = await deleteSwipe(session.user.id, lastSwipe.scheduleId)

    if (error) {
      setStatus('Failed to undo.')
      setUndoing(false)
      return
    }

    setCurrentIndex((prev) => Math.max(0, prev - 1))
    setLastSwipe(null)
    setUndoing(false)
  }, [session, lastSwipe, undoing, clearUndoTimer])

  const handleSwipe = useCallback(
    async (outcome: SwipeOutcome) => {
      if (!session || !currentPurchase || !currentItem || swiping || undoing) return

      // Capture purchase data before any state changes
      const swipedPurchase = {
        id: currentPurchase.id,
        title: currentPurchase.title,
        scheduleId: currentItem.schedule_id,
        timing: currentItem.timing,
      }

      // Clear any pending undo before new swipe
      clearLastSwipe()

      setSwiping(true)
      setSwipeDirection(outcome === 'satisfied' ? 'right' : 'left')
      setStatus('')

      const { error } = await createSwipe(
        session.user.id,
        swipedPurchase.id,
        outcome,
        swipedPurchase.timing,
        swipedPurchase.scheduleId,
      )

      if (error) {
        setStatus(error)
        setSwiping(false)
        setSwipeDirection(null)
        return
      }

      // Brief delay for animation, then update state
      setTimeout(() => {
        // Set undo state FIRST, before changing index
        setLastSwipe({
          scheduleId: swipedPurchase.scheduleId,
          timing: swipedPurchase.timing,
          purchaseTitle: swipedPurchase.title,
          outcome,
        })

        setCurrentIndex((prev) => prev + 1)
        setSwiping(false)
        setSwipeDirection(null)

        // Auto-clear undo after timeout
        undoTimerRef.current = window.setTimeout(() => {
          setLastSwipe(null)
        }, UNDO_TIMEOUT_MS)
      }, 300)
    },
    [session, currentPurchase, swiping, undoing, clearLastSwipe],
  )

  const handleRegret = useCallback(() => {
    void handleSwipe('regret')
  }, [handleSwipe])

  const handleSatisfied = useCallback(() => {
    void handleSwipe('satisfied')
  }, [handleSwipe])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (lastSwipe && !undoing) {
          event.preventDefault()
          void handleUndo()
        }
        return
      }

      if (!currentPurchase || swiping) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleRegret()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleSatisfied()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPurchase, swiping, handleRegret, handleSatisfied, lastSwipe, undoing, handleUndo])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <section className="route-content">
        <h1>Swipe queue</h1>
        <p>Loading your purchases...</p>
      </section>
    )
  }

  if (purchases.length === 0) {
    return (
      <section className="route-content">
        <h1>Swipe queue</h1>
        <div className="swipe-filter">
          <button
            type="button"
            className={`filter-chip ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('all')
              setCurrentIndex(0)
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-chip ${viewMode === 'immediate' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('immediate')
              setCurrentIndex(0)
            }}
          >
            Immediate
          </button>
          <button
            type="button"
            className={`filter-chip ${viewMode === 'later' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('later')
              setCurrentIndex(0)
            }}
          >
            Later
          </button>
        </div>
        <p>Rate your past purchases to build your regret patterns.</p>
        <div className="empty-card">
          <span>No purchases to rate. Add some in your Profile first.</span>
        </div>
      </section>
    )
  }

  if (!currentPurchase) {
    return (
      <section className="route-content">
        <h1>Swipe queue</h1>
        <div className="swipe-filter">
          <button
            type="button"
            className={`filter-chip ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('all')
              setCurrentIndex(0)
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-chip ${viewMode === 'immediate' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('immediate')
              setCurrentIndex(0)
            }}
          >
            Immediate
          </button>
          <button
            type="button"
            className={`filter-chip ${viewMode === 'later' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('later')
              setCurrentIndex(0)
            }}
          >
            Later
          </button>
        </div>
        <p>
          {visiblePurchases.length === 0
            ? 'No purchases match this filter.'
            : "You've rated all your purchases."}
        </p>

        {lastSwipe && (
          <div className="undo-toast">
            <span>
              Marked "{lastSwipe.purchaseTitle}" as{' '}
              <strong>{lastSwipe.outcome}</strong>
              <span className="timing-chip">{formatTimingLabel(lastSwipe.timing)}</span>
            </span>
            <button
              type="button"
              className="undo-button"
              onClick={() => void handleUndo()}
              disabled={undoing}
            >
              {undoing ? 'Undoing...' : 'Undo'}
            </button>
          </div>
        )}

        <div className="swipe-complete">
          <span className="complete-icon">✓</span>
          <p>All caught up! Add more purchases in your Profile to continue.</p>
          <button
            className="ghost"
            type="button"
            onClick={() => void loadUnratedPurchases()}
          >
            Refresh
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="route-content">
      <h1>Swipe queue</h1>
      <p>
        Rate your past purchases. Left = regret, Right = satisfied.
        <span className="keyboard-hint"> Use ← → arrow keys</span>
      </p>
      <div className="swipe-filter">
        <button
          type="button"
          className={`filter-chip ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('all')
            setCurrentIndex(0)
          }}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-chip ${viewMode === 'immediate' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('immediate')
            setCurrentIndex(0)
          }}
        >
          Immediate
        </button>
        <button
          type="button"
          className={`filter-chip ${viewMode === 'later' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('later')
            setCurrentIndex(0)
          }}
        >
          Later
        </button>
      </div>

      {status && <div className="status error">{status}</div>}

      <div className="swipe-counter">{remaining} remaining</div>

      {lastSwipe && (
        <div className="undo-toast">
          <span>
            Marked "{lastSwipe.purchaseTitle}" as{' '}
            <strong>{lastSwipe.outcome}</strong>
            <span className="timing-chip">{formatTimingLabel(lastSwipe.timing)}</span>
          </span>
          <button
            type="button"
            className="undo-button"
            onClick={() => void handleUndo()}
            disabled={undoing}
          >
            {undoing ? 'Undoing...' : 'Undo'}
          </button>
        </div>
      )}

      <div className="swipe-container">
        <button
          className="swipe-button regret"
          type="button"
          onClick={handleRegret}
          disabled={swiping}
          aria-label="Regret"
        >
          <span className="swipe-icon">←</span>
          <span className="swipe-label">Regret</span>
        </button>

        <div
          className={`swipe-card ${swipeDirection ? `swiping-${swipeDirection}` : ''}`}
        >
          <div className="swipe-card-content">
            <div className="swipe-title-row">
              <span className="swipe-title">{currentPurchase.title}</span>
              {currentItem && (
                <span className="timing-chip">
                  {formatTimingLabel(currentItem.timing)}
                </span>
              )}
            </div>
            <span className="swipe-price">
              ${Number(currentPurchase.price).toFixed(2)}
            </span>
            <div className="swipe-meta">
              {currentPurchase.vendor && (
                <span>Vendor: {currentPurchase.vendor}</span>
              )}
              {currentPurchase.category && (
                <span>Category: {currentPurchase.category}</span>
              )}
              <span>
                Purchased:{' '}
                {new Date(currentPurchase.purchase_date).toLocaleDateString()}
              </span>
              {currentItem && (
                <span>
                  Scheduled:{' '}
                  {new Date(currentItem.scheduled_for).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          className="swipe-button satisfied"
          type="button"
          onClick={handleSatisfied}
          disabled={swiping}
          aria-label="Satisfied"
        >
          <span className="swipe-icon">→</span>
          <span className="swipe-label">Satisfied</span>
        </button>
      </div>
    </section>
  )
}
