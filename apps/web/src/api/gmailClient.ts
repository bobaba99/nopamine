/**
 * Gmail API Client
 * Wrapper for Gmail REST API to fetch and parse email messages
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1'

export type GmailMessageHeader = {
  id: string
  threadId: string
}

export type GmailMessagePart = {
  mimeType: string
  body: {
    data?: string
    size: number
  }
  parts?: GmailMessagePart[]
}

export type GmailMessage = {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    mimeType: string
    body: {
      data?: string
      size: number
    }
    parts?: GmailMessagePart[]
  }
  internalDate: string
}

export type ParsedEmail = {
  id: string
  from: string
  subject: string
  date: string
  textContent: string
}

/**
 * List messages matching a search query
 */
export async function listMessages(
  accessToken: string,
  query: string,
  maxResults: number = 100
): Promise<GmailMessageHeader[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: maxResults.toString(),
  })

  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message ?? 'Failed to list Gmail messages')
  }

  const data = await response.json()
  return data.messages ?? []
}

/**
 * Get full message content by ID
 */
export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message ?? 'Failed to get Gmail message')
  }

  return response.json()
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return atob(base64)
  }
}

/**
 * Strip HTML tags and clean up text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract text content from message parts recursively
 */
function extractTextFromParts(parts: GmailMessagePart[]): string {
  let textContent = ''
  let htmlContent = ''

  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      textContent += decodeBase64Url(part.body.data) + '\n'
    } else if (part.mimeType === 'text/html' && part.body.data) {
      htmlContent += decodeBase64Url(part.body.data) + '\n'
    } else if (part.parts) {
      const nested = extractTextFromParts(part.parts)
      if (nested) {
        textContent += nested
      }
    }
  }

  // Prefer plain text, fall back to stripped HTML
  return textContent || stripHtml(htmlContent)
}

/**
 * Extract text content from a Gmail message
 */
export function extractMessageText(message: GmailMessage): string {
  const { payload } = message

  // Simple message with body data
  if (payload.body.data) {
    const decoded = decodeBase64Url(payload.body.data)
    return payload.mimeType === 'text/html' ? stripHtml(decoded) : decoded
  }

  // Multipart message
  if (payload.parts) {
    return extractTextFromParts(payload.parts)
  }

  // Fallback to snippet
  return message.snippet
}

/**
 * Extract header value by name
 */
function getHeader(message: GmailMessage, name: string): string {
  const header = message.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )
  return header?.value ?? ''
}

/**
 * Parse a Gmail message into a structured format
 */
export function parseMessage(message: GmailMessage): ParsedEmail {
  const from = getHeader(message, 'From')
  const subject = getHeader(message, 'Subject')
  const dateHeader = getHeader(message, 'Date')

  // Parse date to ISO format
  let date: string
  try {
    date = new Date(dateHeader).toISOString().split('T')[0]
  } catch {
    date = new Date(parseInt(message.internalDate)).toISOString().split('T')[0]
  }

  const textContent = extractMessageText(message)

  return {
    id: message.id,
    from,
    subject,
    date,
    textContent,
  }
}

/**
 * Build Gmail search query for receipt-like emails
 */
export function buildReceiptQuery(sinceDays: number = 90): string {
  const filters = [
    // Sender patterns
    'from:(noreply OR no-reply OR receipt OR order OR confirmation OR shipping OR auto-confirm)',
    // Subject patterns
    'subject:(receipt OR order OR confirmation OR "thank you for your" OR shipping OR invoice OR "your purchase")',
    // Time filter
    `newer_than:${sinceDays}d`,
  ]
  return filters.join(' ')
}

/**
 * Check if an email looks like a purchase receipt based on content
 * @deprecated Use filterEmailForReceipt() for multi-stage filtering
 */
export function looksLikeReceipt(email: ParsedEmail): boolean {
  const lowerContent = (email.subject + ' ' + email.textContent).toLowerCase()

  const receiptKeywords = [
    'order confirmation',
    'order #',
    'order number',
    'receipt',
    'invoice',
    'thank you for your purchase',
    'thank you for your order',
    'your order has been',
    'payment received',
    'transaction',
    'subtotal',
    'total:',
    'amount paid',
    'billing',
  ]

  const matchCount = receiptKeywords.filter((keyword) =>
    lowerContent.includes(keyword)
  ).length

  return matchCount >= 2
}

// =============================================================================
// Multi-Stage Receipt Filtering Pipeline
// =============================================================================

export type FilterResult = {
  shouldProcess: boolean
  confidence: number
  rejectionReason?: string
}

/**
 * Stage 1: Reject emails matching non-receipt patterns
 * Returns true if email should be REJECTED
 */
export function matchesNegativePatterns(email: ParsedEmail): boolean {
  const content = (email.subject + ' ' + email.textContent).toLowerCase()

  const negativePatterns = [
    // Returns/Refunds
    /refund\s+(initiated|processed|complete|issued)/,
    /return\s+(label|authorized|received|request)/,
    /\breturn\b.*\brequest\b/,
    /cancell?(ed|ation)/,

    // Shipping-only (no purchase)
    /your\s+(package|order)\s+(has\s+)?(shipped|is\s+on\s+the\s+way)/,
    /tracking\s+(number|info|update)/,
    /out\s+for\s+delivery/,
    /delivered\s+to/,
    /shipment\s+(update|notification)/,

    // Promotional
    /\bsale\b.*\boff\b/,
    /limited\s+time\s+offer/,
    /shop\s+now/,
    /don't\s+miss/,
    /exclusive\s+deal/,
    /\bsave\s+\d+%/,

    // Account management
    /password\s+(reset|changed|updated)/,
    /account\s+(updated|settings|verification)/,
    /subscription\s+(cancelled|ended|expired)/,
    /payment\s+method\s+(updated|failed|expired)/,
    /verify\s+your\s+(email|account)/,
  ]

  return negativePatterns.some((pattern) => pattern.test(content))
}

/**
 * Stage 2: Check for price patterns in email
 * Returns confidence score 0-1 based on price presence
 */
export function detectPricePatterns(email: ParsedEmail): number {
  const content = email.subject + ' ' + email.textContent

  const pricePatterns = [
    /\$\d+\.?\d*/, // $12.99 or $12
    /USD\s*\d+\.?\d*/i, // USD 12.99
    /total[:\s]+\$?\d+\.?\d*/i, // Total: $12.99
    /amount[:\s]+\$?\d+\.?\d*/i, // Amount: $12.99
    /subtotal[:\s]+\$?\d+\.?\d*/i, // Subtotal: $12.99
    /\d+\.?\d*\s*€/, // 12.99 €
    /€\s*\d+\.?\d*/, // € 12.99
    /£\d+\.?\d*/, // £12.99
    /¥\d+/, // ¥1299
  ]

  const matchCount = pricePatterns.filter((p) => p.test(content)).length

  if (matchCount === 0) return 0
  if (matchCount >= 2) return 1
  return 0.5
}

/**
 * Stage 3: Enhanced receipt confidence scoring
 * Returns score 0-1 based on weighted keywords
 */
export function calculateReceiptConfidence(email: ParsedEmail): number {
  const content = (email.subject + ' ' + email.textContent).toLowerCase()

  // High-confidence keywords (strong receipt indicators)
  const highWeight = [
    'order confirmation',
    'payment received',
    'receipt for your',
    'invoice #',
    'order #',
    'transaction id',
    'thank you for your purchase',
    'thank you for your order',
    'order number',
    'confirmation number',
  ]

  // Medium-confidence keywords
  const mediumWeight = [
    'receipt',
    'invoice',
    'subtotal',
    'total:',
    'amount paid',
    'billing',
    'payment',
    'charged',
    'purchased',
  ]

  // Low-confidence keywords (common in non-receipts too)
  const lowWeight = ['order', 'confirmation', 'thank you']

  let score = 0
  highWeight.forEach((kw) => {
    if (content.includes(kw)) score += 0.4
  })
  mediumWeight.forEach((kw) => {
    if (content.includes(kw)) score += 0.2
  })
  lowWeight.forEach((kw) => {
    if (content.includes(kw)) score += 0.1
  })

  return Math.min(score, 1)
}

/**
 * Multi-stage filter pipeline
 * Returns whether email should be sent to LLM for parsing
 */
export function filterEmailForReceipt(email: ParsedEmail): FilterResult {
  // Stage 1: Check negative patterns (hard reject)
  if (matchesNegativePatterns(email)) {
    return {
      shouldProcess: false,
      confidence: 0,
      rejectionReason: 'matches_negative_pattern',
    }
  }

  // Stage 2: Check for price patterns
  const priceConfidence = detectPricePatterns(email)
  if (priceConfidence === 0) {
    return {
      shouldProcess: false,
      confidence: 0,
      rejectionReason: 'no_price_patterns',
    }
  }

  // Stage 3: Calculate keyword confidence
  const keywordConfidence = calculateReceiptConfidence(email)

  // Combined confidence (weighted average)
  const overallConfidence = priceConfidence * 0.4 + keywordConfidence * 0.6

  // Threshold: require >= 0.5 confidence to process
  return {
    shouldProcess: overallConfidence >= 0.5,
    confidence: overallConfidence,
    rejectionReason: overallConfidence < 0.5 ? 'low_confidence' : undefined,
  }
}
