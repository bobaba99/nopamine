/**
 * Email Processing Types
 */

export type ParsedRawEmail = {
  messageId: string | null
  from: string
  to: string
  subject: string
  date: string
  contentType: string
  textPlain: string
  textHtml: string
  cleanedText: string
}

export type ReceiptFilterEmail = {
  subject: string
  textContent: string
  labelIds?: string[]
}

export type FilterResult = {
  shouldProcess: boolean
  confidence: number
  rejectionReason?: 'matches_negative_pattern' | 'no_price_patterns' | 'low_confidence'
}
