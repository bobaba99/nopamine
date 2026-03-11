import type express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostHog } from 'posthog-node'
import type { AuthenticatedRequest } from '../types'

export const DAILY_VERDICT_LIMIT_FREE = 3

export const createCheckDailyVerdictLimit = (
  supabase: () => SupabaseClient,
  posthog: PostHog,
) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): Promise<void> => {
    const user = (req as AuthenticatedRequest).authUser
    const sb = supabase()

    // Regenerating an existing verdict doesn't consume a new daily slot.
    // Verify the ID belongs to this user before trusting it.
    const existingVerdictId = (req.body as Record<string, unknown>).existingVerdictId
    if (typeof existingVerdictId === 'string' && existingVerdictId.length > 0) {
      const { count } = await sb
        .from('verdicts')
        .select('id', { count: 'exact', head: true })
        .eq('id', existingVerdictId)
        .eq('user_id', user.id)
      if ((count ?? 0) > 0) {
        next()
        return
      }
    }

    const { data: userRow } = await sb
      .from('users')
      .select('tier')
      .eq('id', user.id)
      .single()

    // Anonymous users (no row in users table) default to free
    const tier = userRow?.tier ?? 'free'
    if (tier === 'premium') {
      next()
      return
    }

    // Count today's verdicts (UTC day boundary)
    const todayUtc = new Date()
    todayUtc.setUTCHours(0, 0, 0, 0)
    const { count } = await sb
      .from('verdicts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayUtc.toISOString())
      .is('deleted_at', null)

    const usedToday = count ?? 0
    if (usedToday >= DAILY_VERDICT_LIMIT_FREE) {
      posthog.capture({
        distinctId: user.id,
        event: 'paywall_hit',
        properties: {
          verdicts_used_today: usedToday,
          time_of_day: new Date().getUTCHours(),
          day_of_week: new Date().getUTCDay(),
        },
      })
      res.status(429).json({
        error: 'daily_limit_reached',
        verdicts_remaining: 0,
        verdicts_used_today: usedToday,
        daily_limit: DAILY_VERDICT_LIMIT_FREE,
      })
      return
    }

    res.locals.verdictsUsedToday = usedToday
    next()
  }
}
