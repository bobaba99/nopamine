import type express from 'express'

export type AuthenticatedRequest = express.Request & {
  authUser: { id: string; email: string }
}

export type AdminRequest = express.Request & {
  adminUser: { id: string; email: string }
}

export type HoldReminderTimerRow = {
  id: string
  user_id: string
  verdict_id: string
  expires_at: string
}

export type HoldReminderVerdictRow = {
  id: string
  candidate_title: string
  candidate_price: number | null
  candidate_vendor: string | null
}

export type ResourceUpsertBody = {
  slug: string
  title: string
  summary: string
  bodyMarkdown: string
  tags: string[]
  readingTimeMinutes: number | null
  canonicalUrl: string | null
  coverImageUrl: string | null
  ctaUrl: string | null
  isPublished: boolean
  publishedAt: string | null
}
