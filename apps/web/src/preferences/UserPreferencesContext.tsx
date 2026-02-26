/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserPreferences } from '../constants/userTypes'
import { getUserProfile } from '../api/user/userProfileService'
import {
  buildDefaultUserPreferences,
  normalizeUserPreferences,
} from '../utils/userPreferences'
import {
  formatCurrencyAmount,
  formatDateTimeValue,
  formatDateValue,
} from '../utils/formatters'

type ResolvedTheme = 'light' | 'dark'

type UserPreferencesContextValue = {
  preferences: UserPreferences
  effectiveTheme: ResolvedTheme
  setPreferences: (next: UserPreferences) => void
  refreshPreferences: () => Promise<void>
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null)

const getSystemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const resolveTheme = (theme: UserPreferences['theme']): ResolvedTheme =>
  theme === 'system' ? getSystemTheme() : theme

export function UserPreferencesProvider({
  session,
  children,
}: {
  session: Session | null
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    buildDefaultUserPreferences(),
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveTheme: ResolvedTheme =
    preferences.theme === 'system' ? systemTheme : resolveTheme(preferences.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
    document.documentElement.style.colorScheme = effectiveTheme
  }, [effectiveTheme])

  const refreshPreferences = useCallback(async () => {
    if (!session) {
      setPreferences(buildDefaultUserPreferences())
      return
    }

    try {
      const profile = await getUserProfile(session.user.id)
      setPreferences(normalizeUserPreferences(profile?.preferences ?? null))
    } catch (error) {
      console.error('Failed to refresh user preferences', error)
      setPreferences(buildDefaultUserPreferences())
    }
  }, [session])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshPreferences()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshPreferences])

  const contextValue = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences,
      effectiveTheme,
      setPreferences,
      refreshPreferences,
    }),
    [effectiveTheme, preferences, refreshPreferences],
  )

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider')
  }
  return context
}

export const useUserFormatting = () => {
  const { preferences } = useUserPreferences()
  const locale = preferences.locale

  const formatCurrency = useCallback(
    (amount: number | null | undefined, emptyValue?: string) =>
      formatCurrencyAmount(amount, preferences, locale, emptyValue),
    [locale, preferences],
  )

  const formatDate = useCallback(
    (
      value: string | Date | null | undefined,
      options?: Intl.DateTimeFormatOptions,
      emptyValue?: string,
    ) => formatDateValue(value, locale, options, emptyValue),
    [locale],
  )

  const formatDateTime = useCallback(
    (value: string | Date | null | undefined, emptyValue?: string) =>
      formatDateTimeValue(value, locale, emptyValue),
    [locale],
  )

  return {
    formatCurrency,
    formatDate,
    formatDateTime,
  }
}
