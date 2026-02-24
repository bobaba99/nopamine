# Email Parsing Architecture

## Current architecture

```markdown
importGmailReceipts()
  → Build receipt query (sender + subject + time window)
  → List message headers
  → Fetch full message per header
  → Parse/clean email body
  → Hard receipt filter (Stage 1-3 in services/emailProcessing/receiptFilter.ts)
  → AI extraction
  → add_purchase RPC
  → updateLastSync + import log summary
```

### 1. Entry point and orchestration (`importGmail.ts` / `importOutlook.ts`)

- Gmail: `importGmailReceipts(accessToken, userId, options)`
- Outlook: `importOutlookReceipts(accessToken, userId, options)`
- Validates `accessToken` and `openaiApiKey`
- **Batch sizes:** Initial batch of 50 messages, refill batches of 25, maximum 500 emails scanned per import run
- 100ms rate limiting between Gmail API calls
- Starts import logging and clears previous fetched-message snapshots

### 2. Fetch candidate messages first (`gmailClient.ts` / `outlookClient.ts`)

**Gmail:**
1. Build query with `buildReceiptQuery(sinceDays)`:
   - Sender/vendor-like signals in `from:(noreply OR no-reply OR receipt OR order OR confirmation OR shipping OR auto-confirm)`
   - Receipt-like subject terms in `subject:(receipt OR order OR confirmation OR invoice ...)`
   - Time window via `newer_than:${sinceDays}d`
2. Fetch message headers with `listMessages(accessToken, query, maxMessages * 3)`.
3. For each header, fetch full message payload with `getMessage(accessToken, messageId)`.

**Outlook:**
1. Use KQL `$search` queries via Microsoft Graph API (`graph.microsoft.com/v1.0/me/messages`)
2. Note: `$search` cannot be combined with `$filter` in Microsoft Graph
3. Pagination via `@odata.nextLink`

### 3. Parse message into normalized email text (`gmailClient.ts` + `services/emailProcessing/*`)

- `parseMessage` extracts `from`, `subject`, `date`, `textContent`.
- `extractMessageText` decodes base64, handles multipart MIME, strips HTML, and cleans text.
- HTML/text normalization is provided by `services/emailProcessing/htmlParser.ts` and `services/emailProcessing/textCleaner.ts`.
- This creates one normalized `ParsedEmail` record per fetched Gmail message.

### 4. Formal hard-filter logic (`services/emailProcessing/receiptFilter.ts`)

`gmailClient.ts` delegates to `services/emailProcessing/receiptFilter.ts` for Stage 1-3 logic.
Filter runs before AI parsing so only likely receipts are sent to the LLM.

1. Stage 1 `matchesNegativePatterns(email)`:
   - Hard reject when content matches non-receipt regex groups:
   - refunds/returns/cancellations
   - shipping status updates (`tracking update`, `out for delivery`, `delivered to`)
   - account/security events (`password reset`, `verify your account`, payment method updates)
2. Stage 2 `detectPricePatterns(email)`:
   - Price confidence scoring from price evidence:
   - `$12.99` / comma-formatted prices
   - `USD` / `CAD` styles
   - `total`, `amount`, `subtotal`, tax lines (`tax|gst|hst|pst`)
   - score: `0` (none), `0.5` (single), `1` (2+ matches)
3. Stage 3 `calculateReceiptConfidence(email)`:
   - Weighted keyword score:
   - high-weight terms: `order confirmation`, `payment received`, `invoice #`, `order #`, `transaction id`
   - medium-weight terms: `receipt`, `invoice`, `subtotal`, `total:`, `amount paid`, `billing`, `payment`
   - low-weight terms: `order`, `confirmation`, `thank you`
   - final keyword score capped to `1.0`
4. Final decision `filterEmailForReceipt(email)`:
   - `overallConfidence = stage2PriceConfidence * 0.4 + stage3KeywordConfidence * 0.6`
   - `shouldProcess = overallConfidence >= 0.5`
   - rejection reason is one of:
   - `matches_negative_pattern`
   - `no_price_patterns`
   - `low_confidence`

### 5. AI extraction only for passed emails (`receiptParser.ts`)

1. Truncate email text to 3,000 chars (1,400 chars on retry).
2. Prompt model `gpt-5-nano` via OpenAI Responses API (`client.responses.parse()` with `dangerouslyAllowBrowser: true`) with sender, subject, date, and content.
3. Parse structured JSON output into item list.
4. Validate each item (`validateAndNormalize`):
   - required: `title`, `vendor`, `price`
   - `price` must be `> 0`
   - date/category normalized; strings length-limited

### 6. Create purchases and dedupe (`importGmail.ts`)

- For each extracted item, call Supabase RPC `add_purchase(...)`.
- Duplicate detection uses DB error signals (`23505`, conflict/duplicate/unique hints).
- Duplicate rows are skipped; valid rows are appended to import results.

### 7. Finalization and logging (`importGmail.ts`, `log/importLogger.ts`)

- Update `email_connections.last_sync` via `updateLastSync(userId)`.
- Return `{ imported, skipped, errors, log }`.
- Logs include:
  - `import`
  - `skip`
  - `error`
  - `filter_reject`

## Other ways to enhance parsing

- Filter by sender email patterns
- ~~Use Google's preassigned label: Reciepts to prefilter during retrieval (their shit is more robust than mine)~~ apparently this is set by users
- Read over the raw return after base64 decoding (debug flow implemented; can be integrated further in production service path)

### Sender email matching

```regex
From:.+\>
```

This query returns both vendor and their email

```markdown
From: "Anthropic, PBC" <invoice+statements@mail.anthropic.com>
From: Air Canada <notification@notification.aircanada.ca>
From: Airbnb <automated@airbnb.com>
From: "Expedia.com" <expedia@eg.expedia.com>
```
