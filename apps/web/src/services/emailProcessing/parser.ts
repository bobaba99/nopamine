/**
 * Email Parser
 * Parses raw RFC 822 email content into structured components
 */

import type { ParsedRawEmail } from './types'
import { stripHtmlAdvanced } from './htmlParser'
import { cleanEmailTextForReceipt } from './textCleaner'

/**
 * Parse a single header line, handling folded headers (continuation lines)
 */
function parseHeaderLine(line: string): { name: string; value: string } | null {
  const colonIndex = line.indexOf(':')
  if (colonIndex <= 0) return null

  const name = line.slice(0, colonIndex).trim()
  const value = line.slice(colonIndex + 1).trim()
  return { name, value }
}

/**
 * Parse RFC 822 headers from raw email content
 * Returns headers as a Map and the index where body begins
 */
function parseHeaders(raw: string): {
  headers: Map<string, string>
  bodyStart: number
} {
  const headers = new Map<string, string>()
  const lines = raw.split(/\r?\n/)

  let i = 0
  let currentHeader: { name: string; value: string } | null = null

  for (; i < lines.length; i++) {
    const line = lines[i]

    // Empty line marks end of headers
    if (line === '') {
      if (currentHeader) {
        headers.set(currentHeader.name.toLowerCase(), currentHeader.value)
      }
      break
    }

    // Continuation line (starts with whitespace)
    if (/^\s/.test(line) && currentHeader) {
      currentHeader.value += ' ' + line.trim()
      continue
    }

    // New header line
    if (currentHeader) {
      headers.set(currentHeader.name.toLowerCase(), currentHeader.value)
    }
    currentHeader = parseHeaderLine(line)
  }

  // Calculate body start position
  let bodyStart = 0
  for (let j = 0; j <= i; j++) {
    bodyStart += lines[j].length + 1 // +1 for newline
  }

  return { headers, bodyStart }
}

/**
 * Extract boundary from Content-Type header
 */
function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=["']?([^"';\s]+)["']?/i)
  return match ? match[1] : null
}

/**
 * Decode quoted-printable encoded string
 */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
}

/**
 * Decode base64 encoded string
 */
function decodeBase64(text: string): string {
  try {
    // Remove line breaks and decode
    const cleaned = text.replace(/\r?\n/g, '')
    return atob(cleaned)
  } catch {
    return text
  }
}

/**
 * Decode content based on Content-Transfer-Encoding
 */
function decodeContent(content: string, encoding: string): string {
  const normalizedEncoding = encoding.toLowerCase().trim()

  if (normalizedEncoding === 'quoted-printable') {
    return decodeQuotedPrintable(content)
  }
  if (normalizedEncoding === 'base64') {
    return decodeBase64(content)
  }

  return content
}

/**
 * Parse a single MIME part
 */
function parseMimePart(
  raw: string
): { contentType: string; encoding: string; body: string } | null {
  const { headers, bodyStart } = parseHeaders(raw)
  const body = raw.slice(bodyStart).trim()

  return {
    contentType: headers.get('content-type') ?? 'text/plain',
    encoding: headers.get('content-transfer-encoding') ?? '7bit',
    body,
  }
}

/**
 * Parse multipart MIME body into parts
 */
function parseMultipartBody(
  body: string,
  boundary: string
): Array<{ contentType: string; content: string }> {
  const parts: Array<{ contentType: string; content: string }> = []
  const delimiter = '--' + boundary

  const sections = body.split(delimiter)

  for (const section of sections) {
    const trimmed = section.trim()

    // Skip empty sections and end delimiter
    if (!trimmed || trimmed.startsWith('--')) continue

    const parsed = parseMimePart(trimmed)
    if (!parsed) continue

    const decodedContent = decodeContent(parsed.body, parsed.encoding)
    parts.push({
      contentType: parsed.contentType,
      content: decodedContent,
    })
  }

  return parts
}

/**
 * Parse raw RFC 822 email content into structured format
 * This handles the output from Gmail's format=raw API (after base64 decoding)
 */
export function parseRawEmail(rawContent: string): ParsedRawEmail {
  const { headers, bodyStart } = parseHeaders(rawContent)
  const body = rawContent.slice(bodyStart)

  const contentType = headers.get('content-type') ?? 'text/plain'
  const encoding = headers.get('content-transfer-encoding') ?? '7bit'

  let textPlain = ''
  let textHtml = ''

  // Check if multipart
  if (contentType.toLowerCase().includes('multipart')) {
    const boundary = extractBoundary(contentType)
    if (boundary) {
      const parts = parseMultipartBody(body, boundary)

      for (const part of parts) {
        const partType = part.contentType.toLowerCase()

        // Handle nested multipart
        if (partType.includes('multipart')) {
          const nestedBoundary = extractBoundary(part.contentType)
          if (nestedBoundary) {
            const nestedParts = parseMultipartBody(part.content, nestedBoundary)
            for (const nested of nestedParts) {
              if (nested.contentType.includes('text/plain')) {
                textPlain += nested.content + '\n'
              } else if (nested.contentType.includes('text/html')) {
                textHtml += nested.content + '\n'
              }
            }
          }
        } else if (partType.includes('text/plain')) {
          textPlain += part.content + '\n'
        } else if (partType.includes('text/html')) {
          textHtml += part.content + '\n'
        }
      }
    }
  } else {
    // Simple single-part message
    const decodedBody = decodeContent(body, encoding)

    if (contentType.toLowerCase().includes('text/html')) {
      textHtml = decodedBody
    } else {
      textPlain = decodedBody
    }
  }

  // Clean up the text for receipt parsing
  // Prefer plain text, fall back to stripped HTML
  const rawText = textPlain || stripHtmlAdvanced(textHtml)
  const cleanedText = cleanEmailTextForReceipt(rawText)

  // Parse date to ISO format
  const dateHeader = headers.get('date') ?? ''
  let date: string
  try {
    date = new Date(dateHeader).toISOString().split('T')[0]
  } catch {
    date = new Date().toISOString().split('T')[0]
  }

  return {
    messageId: headers.get('message-id') ?? null,
    from: headers.get('from') ?? '',
    to: headers.get('to') ?? '',
    subject: headers.get('subject') ?? '',
    date,
    contentType,
    textPlain: textPlain.trim(),
    textHtml: textHtml.trim(),
    cleanedText,
  }
}

/**
 * Extract receipt-relevant text from parsed email
 * Returns cleaned text optimized for LLM parsing
 */
export function extractReceiptText(parsed: ParsedRawEmail): string {
  // Start with the subject as context
  let result = ''

  if (parsed.subject) {
    result += `Subject: ${parsed.subject}\n\n`
  }

  // Use cleaned text
  result += parsed.cleanedText

  return result
}
