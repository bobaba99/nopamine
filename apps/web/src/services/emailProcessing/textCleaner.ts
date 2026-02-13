/**
 * Text Cleaner
 * Cleans email text for receipt parsing by removing noise
 */

/**
 * Clean up email text for receipt parsing
 * Removes common email noise while preserving receipt-relevant content
 */
export function cleanEmailTextForReceipt(text: string): string {
  return (
    text
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      // Remove URLs (but keep the link text context)
      .replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, ' ')
      // Remove tracking pixels / images references
      .replace(/\[image:[^\]]+\]/gi, '')
      .replace(/\[cid:[^\]]+\]/gi, '')
      // Remove common email footer patterns
      .replace(/unsubscribe|manage\s+preferences|view\s+in\s+browser/gi, '')
      .replace(
        /this\s+email\s+was\s+sent\s+(to|from)[\s\S]{0,200}$/i,
        ''
      )
      .replace(/if\s+you\s+(did\s+not|didn't)[\s\S]{0,150}$/i, '')
      // Remove repeated separators
      .replace(/[-=_]{10,}/g, '\n')
      .replace(/\*{5,}/g, '\n')
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
