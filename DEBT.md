# Debt

## Interesting / Niche Ideas

- Add lightweight community support right after verdict delivery.
- Add placeholders for social media accounts where brand presence will live.
- Add simplified social-proof copy like "85% of users who skipped felt satisfied later" or curated testimonials on landing/about pages.

## MVP Launch Blockers

- Implement user data deletion and data export.
  Why: Required for GDPR/CCPA and App Store-style trust/compliance expectations.
- Publish Privacy Policy and Terms of Service.
  Why: Required for OAuth verification, trust, and liability protection.
- Write About page content.
  Why: Users need to understand the product, the "IQ tax" framing, and who built it.
- Write Support page content.
  Why: MVP support can be simple, but a visible help/contact surface is required.
- Enable anonymous auth in Supabase dashboard.
  Why: `signInAnonymously` is part of the core first-visit flow.
- Wire real `user_tier` into `trackVerdictRequested`.
  Why: Premium/internal testing and analytics should reflect real DB state instead of a hardcoded `'free'`.
- Add warning modal dialog if the justification is too short (`<10` words).
  Why: Verdict quality depends on having minimally useful reasoning from the user.

## Recommended Before Launch

- Implement SEO optimization for resources page.
  Why: Shared links and indexed resources need basic metadata and OG previews to avoid looking broken.
- Generate a simple SEO optimization rule/document for future content publishing.
- Add a confidence indicator to verdict cards/modal from stored `confidence_score`.

## Deferred / Post-Launch

### Product / Growth

- Implement `purchase_stats` aggregation and surface segmented regret insights.
- Stripe webhook for `paywall_conversion_completed`.
- Community verdict stats engine backed by real data.

### Premium / Expansion

- Chrome extension and shopping-site friction flows.
- Ongoing premium analytics and reporting.

### Prompt / Model Work

- Reevaluate prompts and alternative-solution generation separately from launch polish.

## Completed / Archived

### `fix/[]`

- [x] Add a loading bar during evaluation and regeneration, implement Claude-like words (e.g., fidgeting, coalescing)
- [x] Adapt for mobile web browser size and layout
- [x] Add guiding questions for writing justification

### `feat/purchase-email-import-flow`

- [x] Outlook implementation
- [x] Reevaluate the strategy/architecture for filtering and parsing the emails (maybe consult Opus 4.6 before implementing)
- [x] ~~Generate test email sets according to vendor data~~
- [x] ~~Some emails are image-based instead of text-based, skipping lots of those ones~~ Not true

### `feat/settings-route-user-preferences`

- [x] Create modal dialog of user preferences
- [x] Generate a list of functions for user preferences
- [x] Implement the preference functions

### `feat/verdict-share-capability`

- [x] Design the verdict share card UI
- [x] Add the verdict share card generation as a modal dialog
- [x] Implement social media sharing handles
- [x] Implement image saving and sending to text message or email

### `feat/daily-limit`

- [x] PaywallModal has no CSS — add `.paywall-modal`, `.paywall-modal-close`, `.paywall-cta-btn`, `.paywall-signup-link`, `.paywall-email-input` styles to App.css
- [x] `verdictsRemainingToday` is never populated from successful API responses (verdicts_remaining in response body not yet read back into state)
