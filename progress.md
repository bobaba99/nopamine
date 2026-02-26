# Project Progress

## Status Legend
- 🟢 Complete
- 🟡 In Progress
- 🔴 Blocked
- ⚪ Not Started

---

## Current Sprint
**Sprint:** MVP Stabilization + Freemium Alignment
**Dates:** 2026-02-17 — 2026-03-02
**Goal:** Stabilize free tier web app (quiz + capped verdicts + resources), align docs with freemium model, close security gaps before premium expansion.

---

## Overall Progress

| Phase | Status | Progress | Notes |
|-------|--------|----------|-------|
| Project Setup | 🟢 | 95% | Monorepo, Supabase schema/RLS, auth routing, seed flow in place |
| Core Backend | 🟡 | 65% | Supabase-first backend works; missing API hardening and analytics logging |
| Core Frontend | 🟡 | 80% | Auth, Dashboard, Profile, Swipe, mobile adaptation done |
| Feature Completion | 🟡 | 55% | Core loop done; sharing/resources/free tier cap not done |
| Polish & QA | 🟡 | 35% | Linting improved; no full NFR validation yet |
| Deployment & Launch | ⚪ | 15% | No launch pipeline or launch readiness checklist yet |

---

## Completed Tasks

- [x] Rewrote core project docs to reflect actual implementation: `TECH_STACK.md`, `FRONTEND_GUIDELINES.md`, `BACKEND_GUIDELINES.md`.
- [x] Updated product docs with concrete content and tables: `PRD.md` and `APP_FLOW.md`.
- [x] Implemented and lint-fixed major web flows in `apps/web`: Dashboard, Swipe, Profile, verdict detail modal, filters, and kinematics-related issues.
- [x] Added verdict algorithm option `llm_only` across UI/service/types/modal and DB schema constraint in initial migration.
- [x] Improved auth compatibility in `supabase/seed.sql` by making seed user creation auth-backed and cleaning orphan profile rows.
- [x] Fixed Profile empty-state alignment so verdict empty card aligns with purchase history cards.
- [x] Implement purchase import from email route/page — **Branch:** `feat/purchase-email-import-flow`
- [x] Tighten verdict evaluation path robustness and UX messaging for LLM failure/timeout cases — **Branch:** `fix/verdict-llm-timeout-handling`
- [x] Mobile viewing adaptation (swipeable queue cards, touch gestures, responsive layout) — **Branch:** `ui/mobile-adaptation`
- [x] Trimmed canonical docs: removed ~880 lines of redundant content from PRD.md, FRONTEND_GUIDELINES.md, APP_FLOW.md
- [x] Populated CLAUDE.md with project intelligence (architecture, patterns, gotchas, commands)
- [x] Integrated freemium tier model into APP_FLOW.md and README.md from `freemium_features.md`
- [x] Implement settings route/page with theme, currency, verdict tone, hold duration — **Branch:** `feat/settings-route-user-preferences`

---

## In Progress

- [ ] Implement share verdict capability (image export to social media) — **Branch:** `feat/verdict-share-capability`
- [ ] Implement alternative solution branching (budget vs. emotional) and queue accepted alternatives for swiping — **Branch:** `feat/alternative-solution`
- [ ] Implement user data deletion and data export (GDPR Art. 17, 20) — **Branch:** `feat/account-data-request-deletion`
- [ ] Implement educational content route/page — **Branch:** `feat/resources-page`
- [ ] Implement SEO optimization for resources page (OG tags, metadata) — **Branch:** `feat/resources-page-seo-optimization`
- [ ] Implement behavioural responses telemetry and analytics — **Branch:** `feat/behavioral-telemetry-analytics`

---

## Blocked

- [ ] Secure OpenAI key handling — **Blocker:** LLM calls currently executed from frontend with env exposure risk — **Status:** 🔴

---

## Upcoming

### Free Tier (Phase 1 — current)

- [ ] Enforce free tier verdict rate limit (3 per week) with UI feedback when cap reached — **Priority:** High
- [ ] Add justification-length guidance flow in Dashboard (`<10` and `>100` words) — **Priority:** Medium
- [ ] Move OpenAI verdict generation to backend/Edge Functions and remove frontend key usage — **Priority:** High
- [ ] Add confidence indicator in verdict cards/modal from stored `confidence_score` — **Priority:** Medium
- [ ] Implement `purchase_stats` aggregation population and surface segmented regret insights — **Priority:** High
- [ ] Add hold duration and email reminder for "hold" verdicts (4.5.5) — **Priority:** Medium

### Premium Tier (Phase 2 — after web app traction)

- [ ] Premium tier billing/upgrade flow (Stripe or equivalent) — **Priority:** High
- [ ] Unlimited verdicts with full rationale for premium users — **Priority:** High
- [ ] Chrome Extension: session awareness on e-commerce domains — **Priority:** Medium
- [ ] Chrome Extension: checkout interstitial friction with verdict routing — **Priority:** Medium
- [ ] Chrome Extension: opt-in website blocking (soft/hard modes) — **Priority:** Low

### Premium Analytics (Phase 3 — requires purchase history data)

- [ ] Weekly/monthly spending pattern reports with charts and trend lines — **Priority:** Medium
- [ ] Personalized LLM-generated spending insights (override rates, timing patterns) — **Priority:** Medium
- [ ] Ongoing email syncing with post-purchase satisfaction tracking (7/14/30-day check-ins) — **Priority:** Medium
- [ ] Conversational agent for querying purchase history (gated behind 10+ verdicts) — **Priority:** Low

---

## Change Log

| Date | Change | Reason | Impact |
|------|--------|--------|--------|
| 2026-02-25 | Integrated freemium tier model into APP_FLOW.md, README.md, progress.md | Align docs with `freemium_features.md` product strategy | State transitions, verdict flow, and roadmap now reflect free/premium split |
| 2026-02-25 | Trimmed ~880 lines from PRD.md, FRONTEND_GUIDELINES.md, APP_FLOW.md | Remove redundant content duplicating source code or backend docs | Leaner, more maintainable canonical docs |
| 2026-02-25 | Populated CLAUDE.md with project intelligence | Give AI assistants concrete project context | Faster onboarding, fewer repeated questions |
| 2026-02-09 | Added `llm_only` verdict algorithm mode | Support LLM-direct recommendation mode without score computation | New product option in Dashboard and persisted scoring model |
| 2026-02-09 | Consolidated scoring model constraint into initial schema migration | Keep one source of truth for local reset flow | Simplifies migration chain for new environments |
| 2026-02-09 | Updated seed strategy to require auth-backed user | Prevent signup conflict and manual DB cleanup | Smoother local auth/signup testing |

---

## Notes & Decisions
- Freemium model replaces the old guest/registered user split. Free tier = authenticated users with capped verdicts. No unauthenticated verdict flow planned for MVP.
- Highest-risk gap: frontend LLM key exposure. Must move to server/Edge Functions before production.
- `purchase_stats` table exists in schema but app still derives headline stats mostly from `swipes`; aggregation job remains pending.
- Chrome Extension and premium analytics are Phase 2/3 — not started until free tier web app shows returning user growth.
- `Resources` and sharing flows remain expansion items for Phase 1 completion.
