import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { PostHog } from 'posthog-node'
import { Resend } from 'resend'
import { getSupabaseServerKey, getSupabaseServerUrl } from './config/supabaseEnv'
import { createRequireAuth, createRequireAdmin, createRequireCronSecret } from './middleware/auth'
import { createRateLimitLLM, startRateLimitCleanup } from './middleware/rateLimit'
import { createCheckDailyVerdictLimit } from './middleware/dailyLimit'
import { createAdminRoutes } from './routes/admin'
import { createVerdictRoutes } from './routes/verdict'
import { createWaitlistRoutes } from './routes/waitlist'
import { createHoldReminderRoutes } from './routes/holdReminders'
import { createOpenAIRoutes } from './routes/openai'
import type { AuthenticatedRequest } from './types'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// ---------------------------------------------------------------------------
// External service clients
// ---------------------------------------------------------------------------

const supabaseUrl = getSupabaseServerUrl(process.env)
const supabaseServiceKey = getSupabaseServerKey(process.env)
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const openaiApiKey = process.env.OPENAI_API_KEY ?? ''
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const holdReminderCronSecret = process.env.HOLD_REMINDER_CRON_SECRET ?? ''

const posthog = new PostHog(process.env.POSTHOG_API_KEY ?? '', {
  host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  enableExceptionAutocapture: true,
})

process.on('SIGINT', async () => {
  await posthog.shutdown()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await posthog.shutdown()
  process.exit(0)
})

const supabase = () => createClient(supabaseUrl, supabaseServiceKey)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const requireAuth = createRequireAuth(supabaseUrl, supabaseServiceKey, posthog)
const requireAdmin = createRequireAdmin(supabaseUrl, supabaseServiceKey, adminEmails)
const requireCronSecret = createRequireCronSecret(holdReminderCronSecret)
const rateLimitLLM = createRateLimitLLM(posthog)
const checkDailyVerdictLimit = createCheckDailyVerdictLimit(supabase, posthog)

startRateLimitCleanup()

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/admin', createAdminRoutes(supabase, posthog, requireAdmin, upload))
app.use('/api/verdict', createVerdictRoutes(openaiApiKey, posthog, requireAuth, checkDailyVerdictLimit, rateLimitLLM))
app.use('/api/waitlist', createWaitlistRoutes(supabase, resend))
app.use('/api/hold-reminders', createHoldReminderRoutes(supabase, resend, requireCronSecret))
app.use('/api', createOpenAIRoutes(openaiApiKey, posthog, requireAuth, rateLimitLLM))

// FUTURE: POST /api/webhooks/stripe
// On event 'checkout.session.completed':
//   posthog.capture({
//     distinctId: event.data.object.metadata.user_id,
//     event: 'paywall_conversion_completed',
//     properties: {
//       trigger_context: event.data.object.metadata.trigger_context ?? 'unknown',
//       verdicts_at_conversion: Number(event.data.object.metadata.verdicts_at_conversion) || null,
//     },
//   })
// Requires: trigger_context + verdicts_at_conversion in Stripe checkout metadata.

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const userId = (req as AuthenticatedRequest).authUser?.id ?? 'anonymous'
  posthog.captureException(err, userId, { endpoint: req.path, method: req.method })
  res.status(500).json({ error: 'Internal server error.' })
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})
