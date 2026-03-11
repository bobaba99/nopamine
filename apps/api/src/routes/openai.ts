import { Router } from 'express'
import type express from 'express'
import OpenAI from 'openai'
import type { PostHog } from 'posthog-node'
import type { AuthenticatedRequest } from '../types'

const RECEIPT_EXTRACTION_PROMPT = `You are a receipt parser that extracts purchase information from email content.

Extract the following fields for EACH item purchased:
- title: The item/product name (be specific but concise)
- price: The item price as a number (no currency symbols). Must be the actual price paid, not 0.
- vendor: The store/merchant name
- category: One of: electronics, fashion, home goods, health & wellness, travel, entertainment, subscriptions, food & beverage, services, education, other
- purchase_date: The date of purchase in YYYY-MM-DD format
- order_id: The order/confirmation number if present, otherwise null

Rules:
- If multiple items are purchased, return EACH item as a separate object in a JSON array
- For subscriptions, include the period in the title (e.g., "Netflix 1 Month")
- SKIP any item where the price cannot be determined - do not include items with price 0 or unknown price
- If date cannot be determined, use the email date
- Return valid JSON only, no markdown

Email sender: {sender}
Email subject: {subject}
Email date: {email_date}

Email content:
{content}

If this is NOT a purchase receipt (e.g., promotional email, newsletter, shipping update without purchase details), respond with exactly: {"not_a_receipt": true}

For a SINGLE item, respond with:
{"items": [{"title": "...", "price": 12.99, "vendor": "...", "category": "...", "purchase_date": "YYYY-MM-DD", "order_id": "..." or null}]}

For MULTIPLE items, respond with:
{"items": [{"title": "Item 1", "price": 12.99, "vendor": "...", "category": "...", "purchase_date": "YYYY-MM-DD", "order_id": "..."}, {"title": "Item 2", "price": 8.50, "vendor": "...", "category": "...", "purchase_date": "YYYY-MM-DD", "order_id": "..."}]}`

export const createOpenAIRoutes = (
  openaiApiKey: string,
  posthog: PostHog,
  requireAuth: express.RequestHandler,
  rateLimitLLM: express.RequestHandler,
) => {
  const router = Router()
  const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null

  router.post('/embeddings/search', requireAuth, rateLimitLLM, async (req, res) => {
    if (!openaiApiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured on server.' })
      return
    }

    const { inputs } = req.body as { inputs: string[] }
    const userId = (req as AuthenticatedRequest).authUser.id

    if (!Array.isArray(inputs) || inputs.length === 0) {
      res.status(400).json({ error: 'inputs must be a non-empty array of strings.' })
      return
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: inputs,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        res.status(response.status).json({
          error: `OpenAI embeddings error: ${response.status}`,
          details: errorBody,
        })
        return
      }

      const data = await response.json()
      posthog.capture({
        distinctId: userId,
        event: 'embeddings_searched',
        properties: { input_count: inputs.length },
      })
      res.json(data)
    } catch (error) {
      posthog.captureException(error, userId, { endpoint: '/api/embeddings/search' })
      res.status(500).json({
        error: 'Failed to call OpenAI embeddings API.',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  router.post('/email/parse-receipt', requireAuth, rateLimitLLM, async (req, res) => {
    if (!openaiClient) {
      res.status(500).json({ error: 'OpenAI API key not configured on server.' })
      return
    }

    const { emailText, sender, subject, emailDate, contentLimit, maxOutputTokens } = req.body as {
      emailText: string
      sender: string
      subject: string
      emailDate: string
      contentLimit?: number
      maxOutputTokens?: number
    }
    const userId = (req as AuthenticatedRequest).authUser.id

    if (!emailText || !sender || !subject || !emailDate) {
      res.status(400).json({
        error: 'emailText, sender, subject, and emailDate are required.',
      })
      return
    }

    try {
      const limit = contentLimit ?? 3000
      const truncatedContent =
        emailText.length > limit ? emailText.slice(0, limit) + '...' : emailText

      const prompt = RECEIPT_EXTRACTION_PROMPT.replace('{sender}', sender)
        .replace('{subject}', subject)
        .replace('{email_date}', emailDate)
        .replace('{content}', truncatedContent)

      const response = await openaiClient.responses.parse({
        model: 'gpt-5-nano',
        text: { format: { type: 'json_object' } },
        input: [{ role: 'user', content: prompt }],
        max_output_tokens: maxOutputTokens ?? 1500,
      })

      if (response.error) {
        posthog.capture({
          distinctId: userId,
          event: 'receipt_parse_failed',
          properties: { reason: 'openai_parse_error', details: response.error.message },
        })
        res.status(500).json({
          error: 'OpenAI parsing failed.',
          details: response.error.message,
        })
        return
      }

      if (response.incomplete_details?.reason) {
        posthog.capture({
          distinctId: userId,
          event: 'receipt_parse_failed',
          properties: { reason: 'incomplete_response', details: response.incomplete_details.reason },
        })
        res.status(422).json({
          error: 'OpenAI response incomplete.',
          details: response.incomplete_details.reason,
        })
        return
      }

      const content = response.output_text?.trim() ?? ''
      posthog.capture({
        distinctId: userId,
        event: 'receipt_parsed',
        properties: { email_date: emailDate, content_truncated: emailText.length > limit },
      })
      res.json({ content })
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        posthog.capture({
          distinctId: userId,
          event: 'receipt_parse_failed',
          properties: { reason: 'openai_api_error', status_code: error.status },
        })
        res.status(error.status ?? 500).json({
          error: 'OpenAI API error.',
          details: error.message,
        })
        return
      }
      posthog.captureException(error, userId, { endpoint: '/api/email/parse-receipt' })
      posthog.capture({
        distinctId: userId,
        event: 'receipt_parse_failed',
        properties: { reason: 'unknown_error' },
      })
      res.status(500).json({
        error: 'Failed to parse receipt.',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  return router
}
