import { Router } from 'express'
import type express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'
import type { HoldReminderTimerRow, HoldReminderVerdictRow } from '../types'
import { buildHoldReminderEmailHtml } from '../emails/holdReminderEmail'

export const createHoldReminderRoutes = (
  supabase: () => SupabaseClient,
  resend: Resend | null,
  requireCronSecret: express.RequestHandler,
) => {
  const router = Router()

  router.post('/run', requireCronSecret, async (_req, res) => {
    if (!resend) {
      res.status(500).json({ error: 'Resend API key not configured on server.' })
      return
    }

    const nowIso = new Date().toISOString()
    const { data: timers, error: timersError } = await supabase()
      .from('hold_timers')
      .select('id, user_id, verdict_id, expires_at')
      .eq('notified', false)
      .lte('expires_at', nowIso)
      .order('expires_at', { ascending: true })
      .limit(100)

    if (timersError) {
      res.status(500).json({ error: timersError.message })
      return
    }

    const dueTimers = (timers ?? []) as HoldReminderTimerRow[]
    if (dueTimers.length === 0) {
      res.json({ success: true, processed: 0, sent: 0, skipped: 0, failed: 0 })
      return
    }

    const userIds = [...new Set(dueTimers.map((timer) => timer.user_id))]
    const verdictIds = [...new Set(dueTimers.map((timer) => timer.verdict_id))]

    const [{ data: users, error: usersError }, { data: verdicts, error: verdictsError }] = await Promise.all([
      supabase()
        .from('users')
        .select('id, email')
        .in('id', userIds),
      supabase()
        .from('verdicts')
        .select('id, candidate_title, candidate_price, candidate_vendor')
        .in('id', verdictIds),
    ])

    if (usersError) {
      res.status(500).json({ error: usersError.message })
      return
    }
    if (verdictsError) {
      res.status(500).json({ error: verdictsError.message })
      return
    }

    const usersById = new Map(
      (users ?? []).map((user) => [String(user.id), { email: String(user.email ?? '') }]),
    )
    const verdictsById = new Map(
      ((verdicts ?? []) as HoldReminderVerdictRow[]).map((verdict) => [verdict.id, verdict]),
    )

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const timer of dueTimers) {
      const user = usersById.get(timer.user_id)
      const verdict = verdictsById.get(timer.verdict_id)

      if (!user?.email || !verdict?.candidate_title) {
        skipped += 1
        continue
      }

      try {
        await resend.emails.send({
          from: 'TruePick <noreply@resila.ai>',
          to: user.email,
          subject: `Your TruePick hold ended: ${verdict.candidate_title}`,
          html: buildHoldReminderEmailHtml({
            title: verdict.candidate_title,
            brand: verdict.candidate_vendor,
            price: verdict.candidate_price,
            expiresAt: timer.expires_at,
          }),
        })

        const { error: updateError } = await supabase()
          .from('hold_timers')
          .update({ notified: true })
          .eq('id', timer.id)
          .eq('notified', false)

        if (updateError) {
          failed += 1
          console.error('[HoldReminder] Failed to mark timer notified:', updateError.message, { timerId: timer.id })
          continue
        }

        sent += 1
      } catch (error) {
        failed += 1
        console.error('[HoldReminder] Failed to send reminder:', error, { timerId: timer.id })
      }
    }

    res.json({
      success: true,
      processed: dueTimers.length,
      sent,
      skipped,
      failed,
    })
  })

  return router
}
