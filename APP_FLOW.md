# Application Flow

## 1. Overview

### Free tier (web app)

User registers, completes the onboarding quiz to profile spending tendencies, and receives up to **3 AI verdicts per week** with limited rationale depth. Educational resources are available to all free users. The free tier builds habit and trust — no analytics, no behavioral tracking, just the core decision tool.

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

**Free tier:** 3 verdicts per week with a shorter rationale. **Premium tier:** unlimited verdicts with full rationale referencing user profile and values.

```
[Dashboard] → [Purchase Details Entry] → [Verdict Generation] → [Verdict Result]
```

#### 4.1.1 Edge Cases

- The user enters minimal justification for the purchase. If the length is less than 10 words, the app will show a modal dialog suggesting the user to write down more details with some probing questions to get a more accurate verdict. The dialog has a button to 'go back' and another button to 'continue' if the user wants to continue with missing details.
- The justification also cannot be too long. If the length is greater than 100 words, the app will show a modal dialog suggesting the user to shorten the justification. The dialog has a button to 'go back' and another button to 'continue' if the user wants to continue with the long justification. This way to keep the token count in check.

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


### 4.6 Flow: Resource articles

#### 4.6.1 Admin

Editing and publishing to `Resources` page.

#### 4.6.2 Resources page

Publishing articles here for free resources and SEO optimization.

### 4.6 Flow: Alternative accepting and swiping

If the users like the alternative solution offered during the verdict, they can mark the alternative solution being used and it will pop up to the swipe queue later for regret/satisfaction evaluation. This will also be integrated with LLM verdict service.

- Branch A: valid purchase but optimizable
  - Suggests a budget alternative, rental or financing option
  - Selecting this alterantive will queue it as 'alternative' for swiping
- Branch B: emotionally driven purchase
  - Identifies emotional pattern behind the justification (stress relief, status seeking, boredom, retail therapy, etc.) and suggests non-purchase advices that address the same emotional needs
  - Also reframes the money in comparative terms (i.e., if you invest with an ROI of 5%, in a year it would be XXX amount)
  - Selecting this alternative will queue this item as 'skip' and future verdict will retrieve this memory for successful or failed attempts so that it feels personalized and different each time



---

## 5. Navigation Structure

Desktop: persistent topbar with nav links. Mobile (≤768px): hamburger menu overlay with auto-hiding header on scroll-down.

```
├── Home / Dashboard
│   ├── Verdict Generation
│   ├── Verdict History (up to 3 most recent verdicts)
|   ├── Share to social media or save as an image
├── Home / Swipe Queue
│   ├── Schedule Overview (filterable, swipeable cards)
│   ├── Swiping for Regret/Satisfaction
├── Home / Resources
│   ├── Educational Content
├── Home / Profile
│   ├── Profile Summary
│   ├── Full Purchase History
│   ├── Full Verdict History
│   ├── Onboarding Quiz
│   ├── Email Syncing
│   ├── Tour of the app
│   ├── Preferences (language, theme, currency, etc.)
│   └── Logout
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
| Unauthenticated | Sign up / sign in with email + password | Free User | ✅ done |
| Unauthenticated | Try to access protected route (`/`, `/swipe`, `/profile`) | Unauthenticated (redirect to `/auth`) | ✅ done |
| Free User | Complete or edit onboarding/profile answers | Free User | ✅ done |
| Free User | Submit purchase decision form (up to 3/week) | Free User | ❌ not yet (no cap enforced) |
| Free User | Mark verdict decision (`bought` / `hold` / `skip`) | Free User | ✅ done |
| Free User | Add / edit / delete purchases | Free User | ✅ done |
| Free User | Swipe for regret/satisfaction (including undo) | Free User | ✅ done |
| Free User | View purchase stats | Free User | ✅ done |
| Free User | View verdict history | Free User | ✅ done |
| Free User | Import purchases from email | Free User | ✅ done |
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
- **LLM:** Direct `fetch` to OpenAI Chat Completions + Embeddings
- **Email import:** Gmail REST API / Microsoft Graph API + GPT-5-nano receipt parsing

**Not yet implemented:** share verdict endpoint, educational content API, settings API, verdict rate limiting (free tier cap), premium tier billing/upgrade flow, Chrome Extension APIs, spending analytics endpoints.

---

## 8. Error Handling & Edge Cases

Error messages use inline `.status` banners (`error` / `success` / `info`). Rules:

- Keep messages under ~120 characters
- State the problem first, then the next step
- Never expose internal schema/table names to end users
- Preserve user input and scroll position on recoverable errors
- Show confirm step before irreversible actions (delete purchase/verdict)

**Still needed:** offline detection, session expiry handling, explicit fallback verdict message.
