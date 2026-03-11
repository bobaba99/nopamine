import { Router } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'
import { buildWaitlistEmailHtml } from '../emails/waitlistEmail'

export const createWaitlistRoutes = (
  supabase: () => SupabaseClient,
  resend: Resend | null,
) => {
  const router = Router()

  router.post('/', async (req, res) => {
    const { email, verdicts_at_signup } = req.body as { email?: string; verdicts_at_signup?: number }

    if (!email?.trim()) {
      res.status(400).json({ error: 'email is required.' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Invalid email address.' })
      return
    }

    const { error } = await supabase()
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), verdicts_at_signup: verdicts_at_signup ?? null })

    const isDuplicate = error?.code === '23505'

    if (error && !isDuplicate) {
      res.status(500).json({ error: error.message })
      return
    }

    if (resend && !isDuplicate) {
      resend.emails.send({
        from: 'TruePick <noreply@resila.ai>',
        to: email.trim(),
        subject: "You're on the TruePick waitlist",
        html: buildWaitlistEmailHtml(),
      }).catch((err: unknown) => { console.error('[Resend] Failed to send waitlist email:', err) })
    }

    res.json({ success: true })
  })

  return router
}
