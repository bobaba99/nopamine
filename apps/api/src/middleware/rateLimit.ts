import type express from 'express'
import type { PostHog } from 'posthog-node'
import type { AuthenticatedRequest } from '../types'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20

const rateLimits = new Map<string, number[]>()

export const createRateLimitLLM = (posthog: PostHog) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const userId = (req as AuthenticatedRequest).authUser?.id
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }

    const now = Date.now()
    const timestamps = (rateLimits.get(userId) ?? []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    )

    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
      posthog.capture({
        distinctId: userId,
        event: 'rate_limit_exceeded',
        properties: { endpoint: req.path, limit: RATE_LIMIT_MAX_REQUESTS, window_ms: RATE_LIMIT_WINDOW_MS },
      })
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
      })
      return
    }

    timestamps.push(now)
    rateLimits.set(userId, timestamps)
    next()
  }
}

export const startRateLimitCleanup = () => {
  setInterval(() => {
    const now = Date.now()
    for (const [userId, timestamps] of rateLimits.entries()) {
      const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      if (valid.length === 0) {
        rateLimits.delete(userId)
      } else {
        rateLimits.set(userId, valid)
      }
    }
  }, 5 * 60 * 1000)
}
