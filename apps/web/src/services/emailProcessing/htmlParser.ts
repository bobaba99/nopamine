/**
 * HTML Parser
 * Strips HTML tags and decodes HTML entities for email processing
 */

/**
 * Strip HTML tags and decode HTML entities
 */
export function stripHtmlAdvanced(html: string): string {
  return (
    html
      // Remove style and script blocks completely
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove head section
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      // Convert block elements to newlines
      .replace(/<\/?(div|p|br|hr|tr|table|h[1-6])[^>]*>/gi, '\n')
      // Convert list items to bullets
      .replace(/<li[^>]*>/gi, '\n• ')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
