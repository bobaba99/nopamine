/**
 * AnalyticsProvider
 *
 * Placed inside BrowserRouter, outside the route tree.
 * Responsibilities:
 *   1. Initialize GA4 once on mount
 *   2. Set/clear user_id when Supabase session changes
 *   3. Track page_view on every route change
 *   4. Measure session_load_duration (auth hydration latency)
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import ReactGA from 'react-ga4'
import {
  initializeGA4,
  isAnalyticsEnabled,
  setAnalyticsUserId,
  useAnalytics,
} from '../hooks/useAnalytics'

type AnalyticsProviderProps = {
  session: Session | null
  sessionLoading: boolean
  children: React.ReactNode
}

export default function AnalyticsProvider({
  session,
  sessionLoading,
  children,
}: AnalyticsProviderProps) {
  const location = useLocation()
  const { trackSessionLoadDuration } = useAnalytics()
  const initializedRef = useRef(false)
  const mountTimeRef = useRef(Date.now())
  const sessionMeasuredRef = useRef(false)

  // Initialize GA4 once
  useEffect(() => {
    if (initializedRef.current) return
    initializeGA4()
    initializedRef.current = true
  }, [])

  // Set user ID when session changes
  useEffect(() => {
    setAnalyticsUserId(session?.user?.id ?? null)
  }, [session])

  // Track page views on route change
  useEffect(() => {
    if (!isAnalyticsEnabled()) return
    ReactGA.send({ hitType: 'pageview', page: location.pathname, title: document.title })
  }, [location.pathname])

  // Measure session load duration (time until auth resolves)
  useEffect(() => {
    if (sessionMeasuredRef.current || sessionLoading) return
    sessionMeasuredRef.current = true
    trackSessionLoadDuration(Date.now() - mountTimeRef.current)
  }, [sessionLoading, trackSessionLoadDuration])

  return <>{children}</>
}
