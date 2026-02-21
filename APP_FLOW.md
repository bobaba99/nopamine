# Application Flow

## 1. Overview

### Free tier (web app)

Visitors are silently signed in anonymously on first visit (no account creation required). Registered users complete the onboarding quiz to profile spending tendencies. All users (anonymous and registered) receive up to **3 AI verdicts per day**; hitting the cap shows the PaywallModal with a premium waitlist CTA. Educational resources are available to all users. The free tier builds habit and trust — no analytics, no behavioral tracking, just the core decision tool.

### Premium tier

Unlocks **unlimited verdicts** with full rationale referencing the user's profile and values, plus:

- **Chrome Extension** — session awareness on e-commerce sites, checkout interstitial friction, and opt-in website blocking (shipped incrementally in Phase 2).
- **Web App analytics** — spending pattern reports, alternative recommendations, ongoing email syncing with post-purchase satisfaction tracking, and a conversational agent for querying purchase history (Phase 3).

Users can import email receipts (Gmail, Outlook) and swipe on past purchases for regret/satisfaction to build aggregated spending patterns that improve verdict accuracy. If the verdict is not 'hold', the item is automatically queued for future regret/satisfaction feedback.

### Shared features

Educational content and verdict sharing (image export to iMessage, Messenger, WhatsApp, Instagram, etc.) are available to all users.

---

## 2. Entry Points
<!-- How do users arrive at the application? (URL, deep link, redirect, etc.) -->

Through URL from Google search or social media handles.

---

## 3. Authentication Flow

### 3.0 Guest / Anonymous Flow

On first visit, the app silently calls `signInAnonymously()` (Supabase anon auth). No action required from the visitor. The anonymous session persists in localStorage so returning guests retain their verdict history. Guests receive the full verdict experience (up to 3/day cap) with no profile onboarding.

```
[Landing Page] → [Auto anonymous sign-in] → [Dashboard] → [Verdict (up to 3/day)]
```

When an anonymous user hits the daily cap, `PaywallModal` appears with a premium waitlist CTA and an option to create a free account. Registering via the auth form calls `updateUser({ email, password })`, which **preserves the anonymous `user_id`** — all existing verdict history is retained.

```
[PaywallModal] → [Sign up / Convert] → [Dashboard] (same user_id, history intact)
```

### 3.1 New User Registration
<!-- Step-by-step flow -->

The user can register using their email or phone number. Next they will enter their password, the strength will be indicated by a progress bar below the password input text box.
After registration, the user will check their email or text messages for verification codes to activate their account. Once activated, the user can login and initiate their profile onboarding and email syncing.

```
[Landing Page] → [Register / Sign-up] → [Text message/Email Verification] → [Dashboard] → [Profile Onboarding] → [Email Syncing] → [Tour of the app] → [Start the first verdict]
```


### 3.2 Returning User Login
<!-- Step-by-step flow -->

If the user hasn't completed the profile onboarding, they will be prompted to do so. If the user has completed the profile onboarding, they will be prompted to sync their email. If the user has completed the email syncing, they will be prompted to take a tour of the app. If the user has taken the tour of the app, they will be prompted to start the first verdict.

```
[Landing Page] → [Login] → [Dashboard] → [Profile Onboarding] → [Email Syncing] → [Tour of the app] → [Start the first verdict]
```

If the user has completed the profile onboarding and email syncing, they will be directed to the dashboard.

```
[Landing Page] → [Login] → [Dashboard]
```


### 3.3 Password Recovery
<!-- Step-by-step flow -->

The user can recover their password by entering their email or phone number. They will receive a password reset email with a link to reset their password.

```
[Landing Page] → [Forgot Password] → [Email Verification] → [Reset Password]
```

---

## 4. Core User Flows

### 4.1 Flow: Verdict Generation

The user enters the details of their purchase at hand. The app generates the verdict for them. During purchase details entry, the user will see example prompts of what to enter in the justification field for the purchase. The app will also remind the user to use speech-to-text for faster entry.

The details include the product name, price, category, vendor, justification, and a toggle to indicate if the purchase is important or not (i.e., major purchase like a laptop, a new phone, etc.). The app will use an emoji to present the item's product category as an extra UI element to help the user understand the category of the purchase.

**Free tier:** 3 verdicts per day (enforced server-side via `checkDailyVerdictLimit` middleware; returns HTTP 429 with `error: 'daily_limit_reached'`). Anonymous and registered free users share the same cap. **Premium tier:** unlimited verdicts with full rationale referencing user profile and values.

```
[Dashboard] → [Purchase Details Entry] → [Verdict Generation] → [Verdict Result]
```

#### 4.1.1 Edge Cases

- The justification field now shows rotating probing questions and static `10-30 words` guidance while empty.
- If the user writes a very short or long justification, the UI shows inline word-count guidance instead of blocking the flow with a modal dialog.

### 4.2 Flow: Regenerate Verdict

The user can regenerate the verdict for the purchase. The app will regenerate the verdict for the purchase. The user can also regenerate the verdict for the purchase from the profile page.

```
[Dashboard/Profile] → [Regenerate Verdict] → [Verdict Result]
```

#### 4.2.1 Edge Cases

### 4.3 Flow: Swiping for Regret/Satisfaction

The user can swipe for regret or satisfaction on the purchase. The app will update the purchase stats. Seeding purchases will be available for swiping immediately after importing from the email API. New verdicts will be available for swiping after 3 days, then 3 weeks, and finally 3 months. The stats will be aggregated for product category, vendor, and price range, and displayed in a chart in the dashboard. It will be stored in Supabase as a table called `purchase_stats` with the following columns: `id`, `user_id`, `vendor_id`, `dimension_type` (enum: category | price_range | vendor | vendor_quality | vendor_reliability | vendor_price_tier ), `total_purchases`, `total_swipes`, `regret_count`, `satisfied_count`, `regret_rate`, `last_updated`. The dashbaord only displays the most impactful stats and the profile displays all the stats with filter enabled for each dimension type.

The swipe page shows a schedule overview (filterable by timing: all, immediate, 3 days, 3 weeks, 3 months) above the main swipe queue. Schedule overview cards are swipeable on mobile (left=regret, right=satisfied, down=not sure) with optimistic dismissal animations. The main swipe queue is unaffected by timing filters.

```
[Dashboard] → [Swipe for Regret/Satisfaction] → [Purchase Stats Update]
```

### 4.4 Flow: Import receipts from Gmail

User clicks "Import Gmail"
  → OAuth flow (Google consent)
  → Store encrypted tokens in email_connections
  → Fetch emails in batches (initial 50, refill 25, max 500 scanned) via gmail.users.messages.list
  → Multi-stage filter pipeline (see 4.4.2)
  → Get message content (gmail.users.messages.get) for candidates
  → Clean HTML/strip noise
  → GPT-5-nano extracts via Responses API (client.responses.parse()): {title, price, vendor, category, purchase_date, order_id}
  → Email content truncated to 3,000 chars (1,400 on retry)
  → Fingerprint-based deduplication (title+price+date±1day) and order ID dedup
  → Create purchases via purchaseService (source='email:gmail')
  → Update last_sync timestamp

#### 4.4.1 Edge Cases

- The user doesn't swipe on past purchases. The app will remind the user to swipe on their past purchases to build their regret patterns for better verdict accuracy.
- Token expiry: If the Gmail OAuth token expires, the user is prompted to reconnect Gmail.
- No receipts found: If no receipt emails match the search patterns, display a helpful message.
- Duplicate imports: Order ID deduplication prevents the same receipt from being imported twice.

#### 4.4.2 Multi-Stage Receipt Filtering

Before sending emails to GPT, a 3-stage filter rejects non-receipts: (1) negative patterns (shipping, refunds, promos), (2) no price patterns detected, (3) low keyword confidence (<0.5). Only emails with price signals and receipt keywords (order confirmation, invoice, receipt) pass to GPT. See `apps/web/src/api/email/receiptParser.ts` for implementation.

### 4.4b Flow: Import receipts from Outlook

User clicks "Import Outlook"
  → OAuth PKCE flow (Microsoft consent, S256 code challenge, scopes: Mail.Read offline_access)
  → Store encrypted tokens + refresh_token + token_expires_at in email_connections
  → Fetch emails in batches via Microsoft Graph API (graph.microsoft.com/v1.0/me/messages) with KQL $search queries
  → Pagination via @odata.nextLink
  → Same multi-stage filter pipeline as Gmail (see 4.4.2)
  → GPT-5-nano extracts via Responses API: {title, price, vendor, category, purchase_date, order_id}
  → Fingerprint-based deduplication and order ID dedup
  → Create purchases via purchaseService (source='email:outlook')
  → Update last_sync timestamp

**Key differences from Gmail:**
- Uses PKCE with S256 code challenge (stores code_verifier in sessionStorage)
- Token refresh via `refreshOutlookToken()` for token rotation
- Token expiry check with 5-minute buffer (`isTokenExpired`)

### 4.5 Flow: User preferences

#### 4.5.1 Theme

Profile → Edit preferences → Theme (light or dark)

#### 4.5.2 Currency

Profile → Edit preferences → Currency

#### 4.5.3 Verdict tone

This is your key differentiator over Cleo (non-judgmental). Let users choose between something like "Direct" (straight verdict) vs. "Encouraging" (softer framing, more context).

#### 4.5.4 Account management essentials

Account management essentials — Email change, password change, delete account (GDPR requirement you already noted), and data export. These aren't exciting but they're non-negotiable for a product that stores personal profile data. Confidence: 9/10. Source: expert consensus (GDPR Art. 17, 20).

#### 4.5.5 Hold duration and email reminder

Users can set a default hold duration and enable/disable hold reminder emails in Profile preferences. When a verdict or user decision enters `hold`, the app stores an expiry in `hold_timers`. Reminder emails are sent by the backend scheduler endpoint `POST /api/hold-reminders/run`, which checks due timers and delivers branded Resend emails to users whose hold window has ended.


### 4.6 Flow: Resource articles

#### 4.6.1 Admin

Editing and publishing to `Resources` page.

#### 4.6.2 Resources page

Publishing articles here for free resources and SEO optimization.

### 4.7 Flow: Alternative accepting and swiping

If the users like the alternative solution offered during the verdict, they can mark the alternative solution being used and it will pop up to the swipe queue later for regret/satisfaction evaluation. This will also be integrated with LLM verdict service.

- Branch A: valid purchase but optimizable
  - Suggests a budget alternative, rental or financing option
  - Selecting this alternative will queue it as `alternative_type = 'budget'` for swiping
- Branch B: emotionally driven purchase
  - Identifies emotional pattern behind the justification (stress relief, status seeking, boredom, retail therapy, etc.) and suggests non-purchase advices that address the same emotional needs
  - Also reframes the money in comparative terms (i.e., if you invest with an ROI of 5%, in a year it would be XXX amount)
  - Selecting this alternative will queue it as `alternative_type = 'emotional'` and future verdicts will retrieve this memory for successful or failed attempts so that it feels personalized and different each time

#### 4.7.1 Schema

Alternatives are stored in a dedicated `verdict_alternatives` table (one per verdict). Key columns:

| Column | Type | Purpose |
|--------|------|---------|
| `verdict_id` | uuid FK | Links back to the original verdict |
| `alternative_type` | `'budget'` or `'emotional'` | Branch A vs Branch B |
| `suggestion_text` | text | The alternative solution text from LLM |
| `emotional_pattern` | text | Branch B only: stress_relief, status_seeking, boredom, retail_therapy, etc. |
| `reframe_text` | text | Branch B only: money reframing comparison |
| `accepted_at` | timestamp | Null until user accepts; set by `accept_alternative` RPC |

Swipe integration uses the existing `swipe_schedules` and `swipes` tables with a new nullable `alternative_id` FK column (XOR constraint with `purchase_id` — exactly one target per row). This gives alternatives the same day3/week3/month3 swipe cadence as purchases.

#### 4.7.2 Service logic

- `accept_alternative` RPC (Supabase function):
  1. Validates verdict ownership
  2. Inserts into `verdict_alternatives` with `accepted_at = now()`
  3. Schedules 3 swipes: day3, week3, month3 from `accepted_at` (same cadence as `add_purchase` for `user_decision = 'bought'`)
  4. On conflict (re-accept same verdict): updates `accepted_at`, refreshes incomplete swipe schedules

#### 4.7.3 Swipe queue integration

The swipe queue query joins `verdict_alternatives` alongside `purchases`:
- `LEFT JOIN purchases ON swipe_schedules.purchase_id = purchases.id`
- `LEFT JOIN verdict_alternatives ON swipe_schedules.alternative_id = verdict_alternatives.id`
- UI renders alternative cards distinctly (shows suggestion text + original verdict context instead of purchase title/price)

#### 4.7.4 LLM memory integration

`verdictContext.ts` queries past accepted emotional alternatives for personalization:
```
SELECT suggestion_text, emotional_pattern, s.outcome
FROM verdict_alternatives va
LEFT JOIN swipes s ON s.alternative_id = va.id
WHERE va.user_id = ? AND va.alternative_type = 'emotional' AND va.accepted_at IS NOT NULL
ORDER BY va.created_at DESC LIMIT 5
```
This enables prompts like: "Last time you were stress-shopping, you tried [X] instead and felt [outcome]."

#### 4.7.5 UI changes

- **VerdictDetailModal**: Add "Use this alternative" button below the existing alternative solution card. On click, calls `accept_alternative` RPC.
- **Swipe queue**: Alternative cards show the suggestion text, the original item that was skipped, and the alternative type badge (budget/emotional). Swipe interaction is identical (satisfied/regret/not_sure).

### 4.7 Flow: Verdict sharing

#### 4.7.1 Share modal

User clicks "Share" on a verdict card (Dashboard, Profile, or VerdictDetailModal) → opens `VerdictShareModal`:

1. Modal creates (or reuses) a `shared_verdicts` row via `shareService.createSharedVerdict()` → generates 10-char share token
2. Generates share image HTML (`verdictImageGenerator.buildShareImageHtml`) with product name, outcome badge, score pill, rationale, and `gettruepick.com` watermark
3. User selects from 5 background themes: midnight (stars), aurora (wisps), sunset (particles), nebula (clouds), sunrise (light streaks)
4. Live preview renders in modal; image is captured to PNG via `html2canvas` on demand
5. Platform action buttons:
   - **iMessage** — `sms:&body=...` URI scheme
   - **Messenger** — Facebook dialog share URL
   - **Instagram** — downloads image + toast "Image saved — open Instagram to share"
   - **TikTok** — downloads image + toast "Image saved — open TikTok to share"
   - **WhatsApp** — `wa.me/?text=...` deep link
   - **X/Twitter** — tweet intent URL
   - **Save Image** — downloads PNG directly
   - **Copy Link** — copies share URL to clipboard
   - **Share** (mobile only) — native Web Share API

#### 4.7.2 Public shared verdict page

Route: `/shared/:token` (no auth required, public `AppShell` route)

1. Fetches `shared_verdicts` by token via `shareService.getSharedVerdict()`
2. Increments `view_count` via `increment_share_view_count` RPC (security definer)
3. Displays summary only: outcome badge, product title, price, vendor, 1-line rationale
4. CTA: "Want clarity on your next purchase?" → "Get your own verdict" button → `/auth`
5. Invalid/expired token → "This verdict link is invalid or has expired" + "Get started" CTA

---

## 5. Navigation Structure

Desktop: persistent topbar with nav links. Mobile (≤768px): hamburger menu overlay with auto-hiding header on scroll-down.

```
├── Home / Dashboard
│   ├── Verdict Generation
│   ├── Verdict History (up to 3 most recent verdicts)
│   ├── Share verdict (opens VerdictShareModal with image preview + platform buttons)
├── Home / Swipe Queue
│   ├── Schedule Overview (filterable, swipeable cards)
│   ├── Swiping for Regret/Satisfaction
├── Home / Resources
│   ├── Educational Content
├── Home / Profile
│   ├── Profile Summary
│   ├── Full Purchase History
│   ├── Full Verdict History (with share button per verdict)
│   ├── Onboarding Quiz
│   ├── Email Syncing
│   ├── Tour of the app
│   ├── Preferences (language, theme, currency, etc.)
│   └── Logout
├── /shared/:token (public, no auth required)
│   ├── Shared verdict summary (outcome, title, price, vendor, rationale)
│   └── "Get your own verdict" CTA → /auth
├── Home / About
│   ├── About the app
│   ├── Privacy Policy
│   ├── Terms of Service
│   ├── Contact Us
│   ├── FAQ
│   └── Logout
```

---

## 6. State Transitions
<!-- Document key state machines: e.g., order states, user account states -->

| Current State | Event | Next State | Implemented |
|--------------|-------|------------|-------------|
| Unauthenticated | First page visit | Anonymous User (auto `signInAnonymously`) | ✅ done |
| Unauthenticated | Sign up / sign in with email + password | Free User | ✅ done |
| Unauthenticated | Try to access protected route (`/`, `/swipe`, `/profile`) | Unauthenticated (redirect to `/auth`) | ✅ done |
| Anonymous User | Submit verdict (up to 3/day) | Anonymous User | ✅ done |
| Anonymous User | Hit daily verdict cap | Anonymous User + PaywallModal shown | ✅ done |
| Anonymous User | Convert via PaywallModal sign-up form | Free User (same `user_id`, history preserved) | ✅ done |
| Free User | Complete or edit onboarding/profile answers | Free User | ✅ done |
| Free User | Submit purchase decision form (up to 3/day) | Free User | ✅ done |
| Free User | Hit daily verdict cap | Free User + PaywallModal shown | ✅ done |
| Free User | Join premium waitlist via PaywallModal | Free User (waitlist row created) | ✅ done |
| Free User | Mark verdict decision (`bought` / `hold` / `skip`) | Free User | ✅ done |
| Free User | Add / edit / delete purchases | Free User | ✅ done |
| Free User | Swipe for regret/satisfaction (including undo) | Free User | ✅ done |
| Free User | View purchase stats | Free User | ✅ done |
| Free User | View verdict history | Free User | ✅ done |
| Free User | Import purchases from email | Free User | ✅ done |
| Free User | Accept alternative solution from verdict | Free User | ❌ not yet |
| Free User | Swipe on accepted alternative (day3/week3/month3) | Free User | ❌ not yet |
| Free User | Upgrade to premium | Premium User | ❌ not yet |
| Premium User | Unlimited verdicts with full rationale | Premium User | ❌ not yet |
| Premium User | Access spending reports and analytics | Premium User | ❌ not yet |
| Any authenticated | Logout | Unauthenticated | ✅ done |

---

## 7. API Interaction Points

API calls are mapped in `BACKEND_GUIDELINES.md` Section 2.3. Key patterns:

- **Auth:** Supabase Auth (`signInWithPassword`, `signUp`, `signOut`)
- **CRUD:** `supabase.from('<table>')` for reads/writes
- **Protected writes:** `supabase.rpc('add_purchase')`, `supabase.rpc('add_user_value')`
- **LLM:** All LLM calls go through the authenticated API proxy (`POST /api/verdict`). The proxy applies `checkDailyVerdictLimit` middleware (returns 429 `daily_limit_reached` when cap hit) and `rateLimitLLM` before forwarding to OpenAI. Frontend never calls OpenAI directly.
- **Daily limit:** `checkDailyVerdictLimit` middleware queries `verdicts` table; 429 body carries `{ error, verdicts_remaining, verdicts_used_today, daily_limit }`. Success response carries `verdicts_remaining` for client-side counter.
- **Waitlist:** `POST /api/waitlist` — no auth required; accepts `{ email, verdicts_at_signup }`, writes to `waitlist` table.
- **Hold reminder scheduler:** `POST /api/hold-reminders/run` — protected by `Authorization: Bearer <HOLD_REMINDER_CRON_SECRET>`; finds due `hold_timers`, sends Resend reminder emails, and marks them notified.
- **Email import:** Gmail REST API / Microsoft Graph API + GPT-5-nano receipt parsing

**Not yet implemented:** educational content API, premium tier billing/upgrade flow, Chrome Extension APIs, spending analytics endpoints, Stripe webhook for `paywall_conversion_completed`, alternative solution acceptance (`rpc accept_alternative`), alternative swipe queue.

**Recently implemented:** Daily verdict cap enforcement + PaywallModal + anonymous auth (`signInAnonymously`, `updateUser` conversion); Tier 1 PostHog telemetry (6 events); share verdict (`shared_verdicts` table, `VerdictShareModal`, `/shared/:token` public page); `waitlist` table + `/api/waitlist` endpoint.

---

## 8. Error Handling & Edge Cases

Error messages use inline `.status` banners (`error` / `success` / `info`). Rules:

- Keep messages under ~120 characters
- State the problem first, then the next step
- Never expose internal schema/table names to end users
- Preserve user input and scroll position on recoverable errors
- Show confirm step before irreversible actions (delete purchase/verdict)

**Still needed:** offline detection, session expiry handling, explicit fallback verdict message.
