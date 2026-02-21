# Application Flow

## 1. Overview
<!-- High-level description of how a user moves through the application -->

### Guest user

User completes a 5-question quiz to improve verdict accuracy, then proceeds to enter the details of their purchase at hand. The app generates the verdict for them and prompts to ask the guest if they want to sign up and save their quiz and verdict results.

### Registered user

User completes the full 10-question quiz. After entering the details of their purchase at hand, the app generates the verdict for them.
User also has the option to import their 10-20 most recent purchases through email API. They will swipe for regret or satisfaction to generate aggregated purchase-regret trends in assisting the verdict service. If the verdict is not 'hold', it will automatically add the item to the swiping queue for future feedback on their regret/satisfaction on purchasing or not purchasing the item (regardless of the verdict decision).

### Shared features

The educational content is available for all users. The user can also share the verdict as an image to iMesssage, Messenger, Whatsapp, Instagram, etc.

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

```
[Dashboard] → [Swipe for Regret/Satisfaction] → [Purchase Stats Update]
```

### 4.4 Flow: Import receipts from Gmail

User clicks "Import Gmail"
  → OAuth flow (Google consent)
  → Store encrypted tokens in email_connections
  → Fetch recent 100 messages (gmail.users.messages.list)
  → Multi-stage filter pipeline (see 4.4.2)
  → Get message content (gmail.users.messages.get) for candidates
  → Clean HTML/strip noise
  → GPT-4o-mini extracts: {title, price, vendor, category, purchase_date}
  → Create purchases via purchaseService (source='email')
  → Update last_sync timestamp

#### 4.4.1 Edge Cases

- The user doesn't swipe on past purchases. The app will remind the user to swipe on their past purchases to build their regret patterns for better verdict accuracy.
- Token expiry: If the Gmail OAuth token expires, the user is prompted to reconnect Gmail.
- No receipts found: If no receipt emails match the search patterns, display a helpful message.
- Duplicate imports: Order ID deduplication prevents the same receipt from being imported twice.

#### 4.4.2 Multi-Stage Receipt Filtering

Before sending emails to GPT for parsing, a 3-stage filter pipeline rejects non-receipt emails:

| Stage | Filter             | Rejects                                                                  |
|-------|--------------------|--------------------------------------------------------------------------|
| 1     | Negative patterns  | Shipping notifications, refunds, returns, promotions, account management |
| 2     | Price detection    | Emails with no price patterns ($, €, £, total, amount)                   |
| 3     | Keyword confidence | Emails with low receipt keyword confidence (<0.5 weighted score)         |

**Emails rejected by the filter pipeline:**

| Email Type                  | Rejection Reason                               |
|-----------------------------|------------------------------------------------|
| "Your order has shipped"    | Stage 1: negative pattern (shipping)           |
| "Refund processed"          | Stage 1: negative pattern (refund)             |
| "Limited time offer!"       | Stage 1: negative pattern (promotional)        |
| "Password reset"            | Stage 1: negative pattern (account management) |
| Newsletter with "order now" | Stage 2: no price patterns                     |
| Generic "thank you" email   | Stage 3: low confidence                        |

**Emails that pass to GPT:**

| Email Type                   | Why It Passes                                 |
|------------------------------|-----------------------------------------------|
| Amazon order confirmation    | Price patterns + "order confirmation" keyword |
| Netflix subscription receipt | Price patterns + "receipt" keyword            |
| Uber Eats receipt            | Price patterns + "total" + "receipt"          |
| App Store purchase           | Price patterns + "invoice" keyword            |

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



---

## 5. Navigation Structure

```
├── Home / Dashboard
│   ├── Verdict Generation
│   ├── Verdict History (up to 3 most recent verdicts)
|   ├── Share to social media or save as an image
├── Home / Swipe Queue
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
| Guest User | Sign up / sign in with email + password | Registered User | ✅ done |
| Guest User | Complete the short quiz to improve verdict accuracy | Guest User | ❌ not yet |
| Guest User | Enter purchase details for instant verdict (no account) | Guest User | ❌ not yet |
| Guest User | Try to access protected route (`/`, `/swipe`, `/profile`) | Guest User (redirect to `/auth`) | ✅ done |
| Registered User | Complete or edit onboarding/profile answers | Registered User | ✅ done |
| Registered User | Submit purchase decision form and receive verdict | Registered User | ✅ done |
| Registered User | Mark verdict decision (`bought` / `hold` / `skip`) | Registered User | ✅ done |
| Registered User | Add / edit / delete purchases | Registered User | ✅ done |
| Registered User | Swipe for regret/satisfaction (including undo) | Registered User | ✅ done |
| Registered User | View purchase stats | Registered User | ✅ done |
| Registered User | View verdict history | Registered User | ✅ done |
| Registered User | Import purchases from email | Registered User | ✅ done |
| Registered User | Accept alternative solution from verdict | Registered User | ❌ not yet |
| Registered User | Swipe on accepted alternative (day3/week3/month3) | Registered User | ❌ not yet |
| Registered User | Logout | Guest User | ✅ done |

---

## 7. API Interaction Points
<!-- Where does the frontend call the backend? Map UI actions to API endpoints. -->

| UI Action | Method | Endpoint / Service Call | Notes | Implemented |
|-----------|--------|--------------------------|-------|-------------|
| Sign in | Supabase Auth | `supabase.auth.signInWithPassword` | Email/password auth in `App.tsx` | ✅ done |
| Sign up | Supabase Auth | `supabase.auth.signUp` | Email/password signup in `App.tsx` | ✅ done |
| Logout | Supabase Auth | `supabase.auth.signOut` | Session reset to guest | ✅ done |
| Sync user record on auth | Supabase Table | `upsert users` via `supabase.from('users').upsert(...)` | Updates `last_active` and email | ✅ done |
| Generate verdict | OpenAI + Supabase | `evaluatePurchase()` -> `fetch /v1/chat/completions`, then `insert verdicts` | Uses fallback scoring when API key missing/fails | ✅ done |
| Load verdict history | Supabase Table | `select verdicts` | Used by Dashboard/Profile | ✅ done |
| Update verdict decision | Supabase Table + RPC | `update verdicts` + `rpc add_purchase` (when bought) | Also removes verdict-linked purchase on reversal | ✅ done |
| Create purchase | Supabase RPC | `rpc add_purchase` | Manual purchase creation flow | ✅ done |
| Load purchases | Supabase Table | `select purchases` | Purchase history in Profile | ✅ done |
| Update / delete purchase | Supabase Table | `update purchases`, `delete purchases` | Deletion also updates linked verdict decision | ✅ done |
| Load swipe queue | Supabase Table | `select swipe_schedules` (+ joined purchase) | Supports due + upcoming queue | ✅ done |
| Create swipe | Supabase Table | `insert swipes`, `update swipe_schedules.completed_at` | Regret/satisfied/not_sure | ✅ done |
| Undo swipe | Supabase Table | `delete swipes`, `update swipe_schedules.completed_at = null` | 3s undo toast window | ✅ done |
| Load dashboard stats | Supabase Table | `select swipes`, `select verdicts` (hold status) | Computes completed swipes, regret rate, active holds | ✅ done |
| Connect Gmail | Google OAuth | `accounts.google.com/o/oauth2/v2/auth` | Implicit OAuth flow, stores token in `email_connections` | ✅ done |
| Import Gmail receipts | Gmail API + OpenAI | `gmail.users.messages.list`, `gmail.users.messages.get`, GPT-4o-mini | Extracts purchase data from receipt emails | ✅ done |
| Share verdict to social media or save as image | REST API | `POST /api/share` | Share endpoint not implemented in current scripts | ❌ not yet |
| View educational content | REST API | `GET /api/educational-content` | No educational-content API route in current scripts | ❌ not yet |
| View settings | REST API | `GET /api/settings` | No settings API route in current scripts | ❌ not yet |
| Accept alternative | Supabase RPC | `rpc accept_alternative` | Creates `verdict_alternatives` row + schedules day3/week3/month3 swipes | ❌ not yet |
| Load swipe queue (alternatives) | Supabase Table | `select swipe_schedules` (+ joined `verdict_alternatives`) | Extends existing queue query with `LEFT JOIN verdict_alternatives` | ❌ not yet |

---

## 8. Error Handling & Edge Cases

Use short, action-oriented status messages in the existing `.status` banner pattern (`error` / `success` / `info`). Prefer recoverable guidance over technical jargon.

### 8.1 Implemented Error Messages (Current Scripts)

| Flow | Trigger / Edge Case | User-Facing Message | Recovery Action | Implemented |
|------|----------------------|---------------------|-----------------|-------------|
| Auth | Missing Supabase env vars | `Missing Supabase config. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vite environment.` | Add env vars and restart app | ✅ done |
| Auth | Sign-in / sign-up failure | Supabase error message (`error.message`) | Retry credentials or sign up flow | ✅ done |
| Auth | Sign-out success | `Signed out.` | Redirect via auth guard to `/auth` | ✅ done |
| Dashboard | Empty title on verdict form | `Item title is required.` | Fill required input | ✅ done |
| Dashboard/Profile | Supabase mutation errors | Raw service error string (`setStatus(error)`) | Retry action; keep form state | ✅ done |
| Profile | Profile row missing + no email | `Profile not found and user email is missing.` | Re-authenticate or support path | ✅ done |
| Profile | Profile creation conflict | `Profile sync issue. Please contact support or try signing out and back in.` | Re-login; admin data repair if needed | ✅ done |
| Profile | Profile fetch catch-all | `Profile load error: <message>` | Retry and verify session | ✅ done |
| Profile | Invalid budget input | `Weekly fun budget must be a positive number.` | Correct input and resubmit | ✅ done |
| Profile | Invalid purchase fields | `Purchase title is required.` / `Purchase price must be a positive number.` / `Purchase date is required.` | Fix validation errors | ✅ done |
| Profile | Failed list loads | `Unable to load verdicts from Supabase. Check RLS policies.` / `Unable to load purchases from Supabase. Check RLS policies.` | Verify DB policies/session | ✅ done |
| Swipe | Queue fetch failure | `Failed to load purchases.` | Retry via refresh/reload | ✅ done |
| Swipe | Undo failure | `Failed to undo.` | Retry while item remains in context | ✅ done |
| Swipe | Swipe creation/update failure | Service error (`setStatus(error)`) | Retry swipe | ✅ done |

### 8.2 Edge Cases To Handle Explicitly Next

| Area | Edge Case | Recommended Message | Recommended Behavior | Implemented |
|------|-----------|---------------------|----------------------|-------------|
| OpenAI verdicting | API timeout / provider outage | `Verdict service is slow right now. Showing a fallback recommendation.` | Return deterministic fallback verdict; keep interaction under 8s | ⚠️ partial (fallback exists, message not explicit) |
| Network | Offline / transient network error | `You appear offline. Check your connection and try again.` | Detect offline state; disable submit buttons temporarily | ❌ not yet |
| Session | Expired/invalid auth session on protected actions | `Your session expired. Please sign in again.` | Force sign-out and redirect to `/auth` | ❌ not yet |
| Data consistency | Duplicate swipe attempt | `This purchase was already rated.` | Keep current index unchanged; show non-blocking info | ⚠️ partial (duplicate handled in service, message generic) |
| Profile bootstrap | Newly created profile not queryable immediately | `Profile created, but still syncing. Please refresh in a moment.` | Auto-retry fetch once before showing message | ⚠️ partial (message exists, no auto-retry) |
| Feature availability | Not-yet endpoints (`/api/share`, educational content API, settings API) | `This feature is coming soon.` | Hide unsupported actions or show disabled CTA with tooltip | ❌ not yet |

### 8.3 Messaging Rules

- Keep messages under ~120 characters when possible.
- State the problem first, then the next step.
- Avoid exposing internal schema/table names to end users (replace RLS-specific wording in production UI).
- For recoverable operations, preserve user input and scroll position.
- For irreversible actions (delete purchase/verdict), show confirm step before mutation.
