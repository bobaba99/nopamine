/**
 * Receipt Parser
 * Calls server-side Express proxy which uses gpt-5-nano for receipt extraction
 */

import type { PurchaseCategory } from '../core/types'
import { supabase } from '../core/supabaseClient'

export type ExtractedReceipt = {
  title: string
  price: number
  vendor: string
  category: PurchaseCategory | null
  purchase_date: string
  order_id: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const VALID_CATEGORIES: PurchaseCategory[] = [
  'electronics',
  'fashion',
  'home goods',
  'health & wellness',
  'travel',
  'entertainment',
  'subscriptions',
  'food & beverage',
  'services',
  'education',
  'other',
]

const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No active session')
  }
  return session.access_token
}

const callParseEndpoint = async (
  token: string,
  emailText: string,
  sender: string,
  subject: string,
  emailDate: string,
  contentLimit: number,
  maxOutputTokens: number
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/email/parse-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      emailText,
      sender,
      subject,
      emailDate,
      contentLimit,
      maxOutputTokens,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    const detail = (body as { details?: string }).details ?? ''
    if (response.status === 422 && detail.includes('max_output_tokens')) {
      throw new Error(`OpenAI response incomplete: max_output_tokens`)
    }
    throw new Error((body as { error?: string }).error ?? `API error: ${response.status}`)
  }

  const data = (await response.json()) as { content: string }
  return data.content ?? ''
}

const parseContent = (content: string, emailDate: string): ExtractedReceipt[] => {
  if (!content) {
    return []
  }

  const parsed = JSON.parse(content)

  if (parsed.not_a_receipt) {
    return []
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed)
      ? parsed
      : [parsed]

  const results: ExtractedReceipt[] = []
  for (const item of items) {
    const validated = validateAndNormalize(item, emailDate)
    if (validated) {
      results.push(validated)
    }
  }

  return results
}

/**
 * Parse receipt email content via server-side gpt-5-nano proxy
 * Returns an array of extracted receipts (one per item in the email)
 */
export async function parseReceiptWithAI(
  emailText: string,
  sender: string,
  subject: string,
  emailDate: string
): Promise<ExtractedReceipt[]> {
  try {
    const token = await getAuthToken()

    let content: string
    try {
      content = await callParseEndpoint(token, emailText, sender, subject, emailDate, 3000, 1500)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('OpenAI response incomplete: max_output_tokens')
      ) {
        content = await callParseEndpoint(token, emailText, sender, subject, emailDate, 1400, 700)
      } else {
        throw error
      }
    }

    return parseContent(content, emailDate)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return []
    }
    throw error
  }
}

/**
 * Validate and normalize extracted receipt data
 * Returns null if required fields are missing or price is invalid
 */
function validateAndNormalize(
  data: Record<string, unknown>,
  fallbackDate: string
): ExtractedReceipt | null {
  if (typeof data.title !== 'string' || !data.title.trim()) {
    return null
  }

  let price = 0
  if (typeof data.price === 'number') {
    price = data.price
  } else if (typeof data.price === 'string') {
    price = parseFloat(data.price.replace(/[^0-9.]/g, '')) || 0
  }

  if (price <= 0) {
    return null
  }

  if (typeof data.vendor !== 'string' || !data.vendor.trim()) {
    return null
  }

  let category: PurchaseCategory | null = null
  if (
    typeof data.category === 'string' &&
    VALID_CATEGORIES.includes(data.category as PurchaseCategory)
  ) {
    category = data.category as PurchaseCategory
  }

  let purchaseDate = fallbackDate
  if (typeof data.purchase_date === 'string') {
    const dateMatch = data.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)
    if (dateMatch) {
      purchaseDate = data.purchase_date
    }
  }

  const orderId =
    typeof data.order_id === 'string' && data.order_id.trim()
      ? data.order_id.trim()
      : null

  return {
    title: data.title.trim().slice(0, 200),
    price: Math.round(price * 100) / 100,
    vendor: data.vendor.trim().slice(0, 100),
    category,
    purchase_date: purchaseDate,
    order_id: orderId?.slice(0, 100) ?? null,
  }
}

/**
 * Batch parse multiple emails with rate limiting
 * Returns a flat array of all extracted receipts from all emails
 */
export async function parseReceiptsBatch(
  emails: Array<{
    text: string
    sender: string
    subject: string
    date: string
  }>,
  delayMs: number = 200
): Promise<ExtractedReceipt[]> {
  const results: ExtractedReceipt[] = []

  for (const email of emails) {
    try {
      const receipts = await parseReceiptWithAI(
        email.text,
        email.sender,
        email.subject,
        email.date
      )
      results.push(...receipts)
    } catch {
      // Skip emails that fail to parse
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
