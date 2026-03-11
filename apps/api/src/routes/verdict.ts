import { Router } from 'express'
import type express from 'express'
import type { PostHog } from 'posthog-node'
import type { AuthenticatedRequest } from '../types'
import { DAILY_VERDICT_LIMIT_FREE } from '../middleware/dailyLimit'

const LLM_TIMEOUT_MS = 60_000

export const createVerdictRoutes = (
  openaiApiKey: string,
  posthog: PostHog,
  requireAuth: express.RequestHandler,
  checkDailyVerdictLimit: express.RequestHandler,
  rateLimitLLM: express.RequestHandler,
) => {
  const router = Router()

  router.post('/evaluate', requireAuth, checkDailyVerdictLimit, rateLimitLLM, async (req, res) => {
    if (!openaiApiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured on server.' })
      return
    }

    const { systemPrompt, userPrompt, model, maxTokens } = req.body as {
      systemPrompt: string
      userPrompt: string
      model?: string
      maxTokens?: number
    }
    const userId = (req as AuthenticatedRequest).authUser.id

    if (!systemPrompt || !userPrompt) {
      res.status(400).json({ error: 'systemPrompt and userPrompt are required.' })
      return
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: model ?? 'gpt-5-nano',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_completion_tokens: maxTokens ?? 4000,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        posthog.capture({
          distinctId: userId,
          event: 'verdict_eval_failed',
          properties: { model: model ?? 'gpt-5-nano', status_code: response.status, reason: 'openai_error' },
        })
        res.status(response.status).json({
          error: `OpenAI API error: ${response.status}`,
          details: errorBody,
        })
        return
      }

      const data = await response.json()
      posthog.capture({
        distinctId: userId,
        event: 'verdict_evaluated',
        properties: { model: model ?? 'gpt-5-nano', max_tokens: maxTokens ?? 4000 },
      })
      const usedToday = (res.locals.verdictsUsedToday as number | undefined) ?? 0
      const verdicts_remaining = Math.max(0, DAILY_VERDICT_LIMIT_FREE - (usedToday + 1))
      res.json({ ...data, verdicts_remaining })
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        posthog.capture({
          distinctId: userId,
          event: 'verdict_eval_failed',
          properties: { model: model ?? 'gpt-5-nano', reason: 'timeout' },
        })
        res.status(504).json({ error: 'OpenAI request timed out.' })
        return
      }
      posthog.captureException(error, userId, { endpoint: '/api/verdict/evaluate' })
      posthog.capture({
        distinctId: userId,
        event: 'verdict_eval_failed',
        properties: { model: model ?? 'gpt-5-nano', reason: 'unknown_error' },
      })
      res.status(500).json({
        error: 'Failed to call OpenAI API.',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  return router
}
