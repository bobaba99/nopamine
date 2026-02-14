# Scalability Plan v2 (200-500 Concurrent Users)

**Goal:** Reliably support **200-500 concurrent users** with predictable latency, no client-side secret exposure, and controlled OpenAI/database cost.

**Target SLOs:**

- P95 page API latency < 700ms for read-heavy flows
- P95 verdict evaluation latency < 2.5s
- Error rate < 1%
- No secrets (OpenAI, Google, service keys) exposed to the browser
- No auth bypass for AI or import endpoints

**Stack:** Supabase (Postgres, Auth, Realtime), Express API (`apps/api/`), React 19 + Vite (`apps/web/`), OpenAI API

---

## What Changed from v1

| v1 Assumption | Reality | v2 Correction |
| --- | --- | --- |
| `supabase/functions/verdict-evaluate/index.ts` exists | `supabase/functions/` directory does not exist | New routes on existing Express API (`apps/api/`) instead of Edge Functions |
| `apps/web/src/lib/queryClient.ts` exists | `apps/web/src/lib/` does not exist; React Query is not installed | Greenfield: install `@tanstack/react-query`, create provider, extract hooks |
| `apps/web/src/hooks/*` exists | No `hooks/` directory; hooks are inline in components | Must create directory and extract data-fetching logic |
| Email dedup needs to be built | 5-layer dedup pipeline already exists in `emailImportDedupService.ts` | Focus on async job model, not dedup rebuild |
| Only OpenAI key is exposed | `VITE_GOOGLE_CLIENT_SECRET` also exposed; CORS allows all origins | Broader security scope in Phase 1 |
| Express backend (`apps/api/`) not mentioned | Existing Express server with admin routes and service role key | Route LLM calls through Express, not Edge Functions |
| Stats are computed somewhere server-side | `statsService.ts` makes 2 separate Supabase queries client-side | Replace with server-side RPC |
| Embedding model uses 1536 dimensions | `embeddingService.ts` uses `text-embedding-3-small` (1536 default) | Embedding cache uses `vector(1536)` -- correct |
| `get_user_stats` counts `active_holds` via `user_decision = 'hold'` | `statsService.ts` currently checks `predicted_outcome = 'hold'` + `hold_release_at` | RPC uses `user_decision` which is more accurate; existing client code should be retired |
| `purchase_stats` table not mentioned | Table exists in schema (`20260214095402_core_domain_tables.sql`) with RLS policies, but zero code populates or queries it | Dead code — decide to repurpose for pre-aggregation or drop |
| Email connection needs migration | `email_connections` already has `unique(user_id, provider)` and `emailConnectionService.ts` uses `onConflict: 'user_id,provider'` | Phase 1.4 marked as DONE — no migration needed |
| Dashboard query count not quantified | Dashboard makes 7-8 separate Supabase queries per load (swipes, holds, purchases, stats, categories, etc.) | Phase 2.3 expanded to address query consolidation |
| Receipt parser is just an API key swap | `receiptParser.ts` initializes full OpenAI SDK client-side with `dangerouslyAllowBrowser: true` | Full module migration needed, not just key removal |
| Realtime used for import progress | App uses zero Supabase Realtime channels today | Start with polling; defer Realtime to reduce integration risk |

---

## Scope and Non-Goals

### In Scope

- Remove all secrets from browser bundle (OpenAI key, Google client secret)
- Server-side LLM proxy via Express API with auth + rate limiting
- Fix CORS to restrict origins
- Server-side stats aggregation via Postgres RPC
- React Query adoption for client-side caching
- Async email import with job status tracking
- Embedding cost control via cache table
- Realistic load testing against authenticated API flows

### Out of Scope (for this milestone)

- 1000+ concurrent users
- Multi-region active/active deployment
- Complex queue infrastructure beyond Supabase-native primitives
- Horizontal Express scaling (single instance is sufficient for 500 users)
- Mobile app (`apps/mobile/`) scaling

---

## Current Risks (Verified Against Codebase)

1. **CRITICAL: OpenAI API key in browser bundle.** `VITE_OPENAI_API_KEY` is read in `Dashboard.tsx:103`, `Profile.tsx:551`, `EmailSync.tsx:36` and passed to `verdictLLM.ts:64` (direct `fetch` to `api.openai.com`) and `receiptParser.ts:92` (`dangerouslyAllowBrowser: true`). Any user can extract it from DevTools.

2. **CRITICAL: Google client secret in browser bundle.** `VITE_GOOGLE_CLIENT_SECRET` is exposed via the `VITE_` prefix. Client secrets must never be client-side.

3. **HIGH: CORS allows all origins.** `apps/api/src/index.ts:9` has `app.use(cors())` with no origin restriction. `CORS_ORIGINS` is defined in `.env.example` but never read or applied.

4. **HIGH: No rate limiting on LLM calls.** Any authenticated user can trigger unlimited verdict evaluations and email parsing, all charged to the project's OpenAI key.

5. **MEDIUM: Stats computed client-side.** `statsService.ts` makes 2 unbounded Supabase queries per page load: (1) `swipes.select('outcome').eq('user_id', userId)` fetches ALL swipe rows then filters/counts in JS, (2) `verdicts.select('id').eq('user_id', userId).eq('predicted_outcome', 'hold').gt('hold_release_at', ...)` fetches all active holds. Both scale linearly with user activity.

6. ~~**DONE: Email connection schema allows only one provider.**~~ Fixed — `email_connections` now has `unique(user_id, provider)` and `emailConnectionService.ts` upserts with `onConflict: 'user_id,provider'`.

7. **MEDIUM: No client-side caching layer.** Every page navigation triggers fresh Supabase queries. No React Query, no stale-while-revalidate.

8. **LOW: `/email-sync` route not wrapped in `RequireAuth`.** `App.tsx` renders `EmailSync` outside the auth guard. The component checks `session` internally but the route is unprotected.

9. **LOW: `purchase_stats` table is dead code.** Defined in `20260214095402_core_domain_tables.sql` with RLS in `20260214095447_rls_policies.sql`, but zero application code populates or queries it. Should be either repurposed for the `get_user_stats` RPC materialization or dropped to reduce schema debt.

10. **LOW: Supabase plan tier limits unknown.** At 500 concurrent users, database connection limits (~60 on Pro), Realtime connection limits, and Edge Function invocation quotas become relevant. These need to be verified before load testing.

---

## Phase 1: Security + Correctness (P0, Ship First)

### 1.1 Remove OpenAI Key from Browser

**Goal:** Zero OpenAI-related secrets in client bundle.

**New Express routes in `apps/api/src/index.ts`:**

```bash
POST /api/verdict/evaluate    -- proxies to OpenAI chat completions
POST /api/embeddings/search   -- proxies to OpenAI embeddings
POST /api/email/parse-receipt -- proxies to OpenAI for receipt extraction
```

**Auth middleware (reuse existing pattern from `requireAdmin`, but for any authenticated user):**

```ts
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  req.user = { id: user.id, email: user.email }
  next()
}
```

**Rate limiting (per-user, in-memory for now):**

```ts
// Simple sliding window: max 20 LLM calls per user per minute
const rateLimits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

const rateLimitLLM = (req, res, next) => {
  const userId = req.user.id
  const now = Date.now()
  const timestamps = (rateLimits.get(userId) ?? []).filter(t => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' })
  }

  timestamps.push(now)
  rateLimits.set(userId, timestamps)
  next()
}
```

**Client-side changes:**

- Remove `VITE_OPENAI_API_KEY` from `apps/web/.env` and `.env.example`
- Update `verdictLLM.ts` to call `/api/verdict/evaluate` instead of `api.openai.com` directly
- Update `embeddingService.ts` to call `/api/embeddings/search`
- Update `receiptParser.ts` to call `/api/email/parse-receipt`, remove `dangerouslyAllowBrowser: true`
  - **Scope note:** `receiptParser.ts` currently initializes the full OpenAI SDK client-side with `new OpenAI({ dangerouslyAllowBrowser: true })`. The entire parsing pipeline (prompt construction, streaming response handling, JSON extraction) must move server-side — this is not just an API key swap but a full module migration.
- Remove `openaiApiKey` parameter threading from `Dashboard.tsx`, `Profile.tsx`, `EmailSync.tsx`

**Files to modify:**

- `apps/api/src/index.ts` (add routes, auth middleware, rate limiting)
- `apps/web/src/api/verdict/verdictLLM.ts` (repoint to Express API)
- `apps/web/src/api/verdict/embeddingService.ts` (repoint to Express API)
- `apps/web/src/api/email/receiptParser.ts` (repoint to Express API)
- `apps/web/src/pages/Dashboard.tsx` (remove API key reading)
- `apps/web/src/pages/Profile.tsx` (remove API key reading)
- `apps/web/src/pages/EmailSync.tsx` (remove API key reading)
- `apps/web/.env`, `apps/web/.env.example` (remove `VITE_OPENAI_API_KEY`)
- `apps/api/.env`, `apps/api/.env.example` (add `OPENAI_API_KEY`)

### 1.2 Remove Google Client Secret from Browser

**Move `VITE_GOOGLE_CLIENT_SECRET` to Express API.**

- Add `POST /api/auth/google/token` route that handles the OAuth token exchange server-side
- Remove `VITE_GOOGLE_CLIENT_SECRET` from `apps/web/.env`
- `VITE_GOOGLE_CLIENT_ID` can remain client-side (needed for OAuth initiation)

**Files to modify:**

- `apps/api/src/index.ts` (add Google OAuth token exchange route)
- `apps/web/src/api/email/gmailClient.ts` (call Express for token exchange)
- `apps/web/.env`, `apps/web/.env.example` (remove `VITE_GOOGLE_CLIENT_SECRET`)
- `apps/api/.env` (add `GOOGLE_CLIENT_SECRET`)

### 1.3 Fix CORS Configuration

**File:** `apps/api/src/index.ts:9`

```ts
// Before (INSECURE)
app.use(cors())

// After
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
```

### 1.4 Fix Email Connection Data Model — ALREADY DONE

The `email_connections` table already has `unique(user_id, provider)` in the current schema (`20260214095417_ingestion_tables.sql`), and `emailConnectionService.ts` already upserts with `onConflict: 'user_id,provider'`. No migration needed.

### 1.5 Protect `/email-sync` Route

**File:** `apps/web/src/App.tsx`

Move the `<EmailSync>` route inside the `<RequireAuth>` wrapper so unauthenticated users cannot access it.

### 1.6 Rotate Compromised Secrets

**Action items (manual, not code):**

- Rotate the OpenAI API key (`sk-proj-...`) -- it is embedded in the client bundle and must be considered compromised if the app has ever been deployed
- Rotate the Google Client Secret (`GOCSPX-...`)
- Verify Supabase anon key vs service role key are different values

---

## Phase 2: Server-Side Performance (P1)

### 2.1 Server-Side Stats RPC

**Migration:** `supabase/migrations/<next>_stats_function.sql`

Replaces client-side `statsService.ts` which currently makes 2 separate queries (all swipe outcomes, then active holds) and counts in JavaScript.

Schema-verified values:

- `swipes.outcome` check: `'satisfied' | 'regret' | 'not_sure'`
- `verdicts.user_decision` check: `'bought' | 'hold' | 'skip'`
- `verdicts.user_hold_until` is the user's self-imposed hold expiry

```sql
create or replace function get_user_stats(p_user_id uuid)
returns table(
  total_swipes bigint,
  regret_count bigint,
  satisfied_count bigint,
  not_sure_count bigint,
  regret_rate numeric,
  active_holds bigint,
  total_purchases bigint,
  total_spent numeric
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where s.outcome is not null) as total_swipes,
    count(*) filter (where s.outcome = 'regret') as regret_count,
    count(*) filter (where s.outcome = 'satisfied') as satisfied_count,
    count(*) filter (where s.outcome = 'not_sure') as not_sure_count,
    case
      when count(*) filter (where s.outcome is not null) = 0 then 0
      else round(
        (count(*) filter (where s.outcome = 'regret'))::numeric
        / (count(*) filter (where s.outcome is not null)) * 100,
        2
      )
    end as regret_rate,
    (
      select count(*)
      from verdicts v
      where v.user_id = p_user_id
        and v.user_decision = 'hold'
        and v.user_hold_until is not null
        and v.user_hold_until > now()
    ) as active_holds,
    (select count(*) from purchases p where p.user_id = p_user_id) as total_purchases,
    (select coalesce(sum(p.price), 0) from purchases p where p.user_id = p_user_id) as total_spent
  from swipes s
  where s.user_id = p_user_id;
$$;
```

**Client-side change:**

- Replace `statsService.ts` implementation with single `supabase.rpc('get_user_stats', { p_user_id: userId })`

**Cleanup:** The `purchase_stats` table exists in the schema but is never populated or queried. Either repurpose it as a materialized view backing `get_user_stats` (for pre-aggregation at scale), or drop it to reduce schema debt. Decision should be made during this phase.

### 2.2 Index Review

**Existing indexes** (from `20260214095432_indexes.sql`):

| Index | Status |
|---|---|
| `idx_purchases_user_date` on `purchases(user_id, purchase_date desc)` | EXISTS |
| `idx_swipes_user_created` on `swipes(user_id, created_at desc)` | EXISTS |
| `idx_verdicts_user_created` on `verdicts(user_id, created_at desc)` | EXISTS |
| `idx_verdicts_user_hold` on `verdicts(user_id, user_hold_until) where user_decision = 'hold'` | EXISTS |
| `idx_email_processed_messages_lookup` on `email_processed_messages(user_id, provider, email_id)` | EXISTS |

**Missing index for `get_user_stats` hot path:**

The `swipes` table index is on `(user_id, created_at desc)` but `get_user_stats` queries `swipes where user_id = ?` and filters on `outcome`. A covering index would help:

```sql
-- Migration: <next>_stats_covering_index.sql
create index concurrently if not exists idx_swipes_user_outcome
  on swipes(user_id, outcome);
```

Also verify `purchases` has an index useful for `sum(price) where user_id = ?`:

- `idx_purchases_user_date` on `(user_id, purchase_date desc)` covers the `user_id` filter. Acceptable.

### 2.3 React Query Adoption

**This is a significant refactor.** Currently all data fetching uses `useState` + `useEffect` with direct Supabase calls in page components. Each Dashboard load triggers 7-8 separate Supabase queries (swipes, holds, purchases, stats, categories, etc.) with no batching, parallelization, or caching. This phase introduces structured caching and query consolidation.

**Step 1: Install and configure**

```bash
npm install @tanstack/react-query --workspace=apps/web
```

**Step 2: Create provider** (`apps/web/src/lib/queryClient.ts` -- new file)

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // 2 minutes default
      gcTime: 10 * 60 * 1000,       // 10 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Wrap `App.tsx` with `<QueryClientProvider>`.

**Step 3: Extract hooks** (new `apps/web/src/hooks/` directory)

Start with the highest-traffic pages:

| Hook | Page | staleTime | Notes |
|---|---|---|---|
| `useUserStats` | Dashboard, Profile | 5 min | Calls `get_user_stats` RPC |
| `usePurchases` | Dashboard | 2 min | Paginated purchase list |
| `useSwipeSchedule` | Swipe | 1 min | Due swipes for today |
| `useUserProfile` | Profile | 10 min | Profile + onboarding data |
| `useVerdicts` | Dashboard | 2 min | Recent verdict history |

**Step 4: Targeted invalidation**

```ts
// After a new swipe is recorded
queryClient.invalidateQueries({ queryKey: ['user-stats', userId] })
queryClient.invalidateQueries({ queryKey: ['swipe-schedule', userId] })
// Do NOT invalidate purchases or profile
```

**Estimated effort:** 2-3 days. This is the largest single work item in the plan.

---

## Phase 3: Async Email Import (P1)

### 3.1 Current State (Already Implemented, Retain)

The 5-layer dedup pipeline in `emailImportDedupService.ts` is well-implemented:

1. **Email ID dedup** -- `getProcessedEmailIds()` checks `email_processed_messages`
2. **Pre-AI order_id extraction** -- `extractCandidateOrderIds()` regex extraction + `getExistingOrderIds()` checks `purchases`
3. **AI parsing** -- `receiptParser.ts` (only if layers 1-2 pass)
4. **Fingerprint dedup** -- `hasExistingPurchaseFingerprint()` checks normalized title + price + date
5. **DB unique constraint** -- `unique(user_id, vendor, order_id)` as last resort

**No changes needed to the dedup logic itself.** Focus is on making the import non-blocking.

### 3.2 Async Import Jobs

**Migration:** `supabase/migrations/<next>_import_jobs.sql`

```sql
create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  provider text not null check (provider in ('gmail', 'outlook')),
  status text not null check (status in ('pending', 'processing', 'completed', 'failed'))
    default 'pending',
  total_messages int default 0,
  processed_messages int default 0,
  imported_count int default 0,
  skipped_count int default 0,
  error_count int default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table import_jobs enable row level security;

create policy "Users can view own import jobs"
  on import_jobs for select
  using (auth.uid() = user_id);

create index idx_import_jobs_user_status
  on import_jobs(user_id, status);
```

**API contract:**

```bash
POST /api/email/import { provider: 'gmail' | 'outlook' }
  -> { jobId: string }

// Client subscribes to import_jobs via Supabase Realtime
// for live progress updates
```

**Processing:** The Express API route creates the `import_jobs` row, returns immediately, then processes emails in the background (within the same Node process, using `setImmediate` to avoid blocking the event loop). Status updates are written to `import_jobs` as processing progresses.

**Recommended approach: Start with polling, upgrade to Realtime later.**

The app currently uses zero Supabase Realtime channels. Introducing Realtime for the first time adds integration risk (channel management, connection lifecycle, error handling). For v1:

- Poll `import_jobs` every 2s while `status in ('pending', 'processing')`
- Stop polling on `completed` or `failed`
- This avoids Realtime connection limits and is simpler to debug

Upgrade to Realtime subscription later once the polling approach is validated and the team has Realtime experience.

**Note on Realtime capacity (future):** At 500 concurrent users with active import subscriptions, Supabase Realtime connection limits become relevant (200 on Free, 500 on Pro). Mitigate by only subscribing during active imports and unsubscribing on completion.

**UI changes in `EmailSync.tsx`:**

- On import click: call `POST /api/email/import`, receive `jobId`
- Poll `import_jobs` where `id = jobId` every 2s (upgrade to Realtime later)
- Show progress bar with `processed_messages / total_messages`
- Show final summary (imported, skipped, errors) on completion

---

## Phase 4: Embedding Cost Control (P2)

### 4.1 Embedding Cache Table

**Migration:** `supabase/migrations/<next>_embedding_cache.sql`

```sql
create extension if not exists vector;

create table if not exists embedding_cache (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  embedding vector(1536) not null,  -- matches text-embedding-3-small default
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

create index if not exists idx_embedding_cache_hash on embedding_cache(content_hash);
create index if not exists idx_embedding_cache_expires on embedding_cache(expires_at);
```

**Implementation in Express API:**

```ts
// POST /api/embeddings/search handler
async function getOrCreateEmbedding(contentHash: string, input: string): Promise<number[]> {
  // 1. Check cache
  const { data } = await supabase
    .from('embedding_cache')
    .select('embedding')
    .eq('content_hash', contentHash)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (data) return data.embedding

  // 2. Cache miss -- call OpenAI
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
  })

  // 3. Store in cache
  await supabase.from('embedding_cache').upsert({
    content_hash: contentHash,
    embedding: embedding.data[0].embedding,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'content_hash' })

  return embedding.data[0].embedding
}
```

**Daily cleanup** (pg_cron or scheduled Edge Function):

```sql
delete from embedding_cache where expires_at < now();
```

---

## Phase 5: Load Testing (Required Gate)

### 5.1 Prerequisites (None of This Exists Yet)

- **Install k6** locally or in CI
- **Create test data:** seed script with 500 test users, each with 20-50 purchases and 10-30 swipes
- **Auth token generation:** k6 script that authenticates via Supabase Auth and uses the JWT for subsequent requests
- **Test environment:** staging Supabase project (do NOT load test production)
- **Monitoring:** Supabase dashboard (DB connections, CPU, memory), Express `/health` endpoint, k6 built-in metrics

### 5.2 Scenarios

**Scenario A: Dashboard reads (highest frequency)**

- Login, fetch stats RPC, fetch recent purchases, fetch swipe schedule
- Expected: P95 < 700ms

**Scenario B: Verdict evaluation**

- Login, submit a verdict evaluation request to Express API
- Expected: P95 < 2.5s (includes OpenAI API latency)

**Scenario C: Email import trigger**

- Login, trigger import job, verify job creation
- Expected: P95 < 500ms (just job creation, not full import)

### 5.3 Ramp Profile

```markdown
Stage 1: Ramp to 200 VUs over 2 min, hold 5 min
Stage 2: Ramp to 350 VUs over 2 min, hold 5 min
Stage 3: Ramp to 500 VUs over 2 min, hold 3 min
Stage 4: Ramp down to 0 over 1 min
```

### 5.4 Pass/Fail Thresholds

```js
thresholds: {
  'http_req_failed': ['rate<0.01'],           // <1% error rate
  'http_req_duration{scenario:dashboard}': ['p(95)<700'],
  'http_req_duration{scenario:verdict}': ['p(95)<2500'],
  'http_req_duration{scenario:import}': ['p(95)<500'],
}
```

### 5.5 Capacity Checks (Manual)

Before load testing, verify your Supabase plan supports:

| Resource | Free Tier | Pro Tier | Needed for 500 VUs |
| --- | --- | --- | --- |
| DB connections (direct) | 60 | 60 (pooler: 200) | ~100-200 via pooler |
| Realtime connections | 200 | 500 | 500 (if all users subscribe) |
| Edge Function invocations/day | 500K | 2M | N/A (using Express) |
| DB size | 500MB | 8GB | Sufficient |

If on Free tier, upgrade to Pro before load testing.

---

## Rollout Sequence

```markdown
Phase 1 (Security) ─────────> GATE: all secrets removed from client bundle
                                     CORS restricted
                                     keys rotated
                                     ↓
Phase 2 (Performance) ──────> GATE: stats RPC deployed
                                     React Query integrated on Dashboard + Profile
                                     ↓
Phase 3 (Async Import) ─────> GATE: import_jobs table live
                                     EmailSync uses async flow
                                     ↓
Phase 4 (Embedding Cache) ──> GATE: cache table deployed
                                     cache hit rate > 50% after 1 week
                                     ↓
Phase 5 (Load Test) ────────> GATE: all thresholds pass at 500 VUs
                                     no DB connection saturation
                                     ↓
Gradual traffic ramp ────────> 50 → 100 → 200 → 350 → 500 users
```

**Rule: Do not proceed past a gate until all conditions are met.**

---

## Decision Log

### Why Express API Instead of Edge Functions?

v1 proposed Supabase Edge Functions for LLM proxying. v2 uses the existing Express API (`apps/api/`) because:

1. **It already exists** with auth middleware (`requireAdmin`) that can be adapted to `requireAuth`
2. **Single deployment target** -- no need to manage both Express and Edge Function deploys
3. **Shared infrastructure** -- rate limiting, CORS, logging are centralized
4. **No cold start penalty** -- Edge Functions have cold starts; Express stays warm
5. **Simpler debugging** -- one Node.js process vs distributed Deno functions

Edge Functions remain a valid option for future isolation (e.g., if verdict evaluation needs independent scaling), but for 500 users it is unnecessary complexity.

### Why Not Refactor All Pages to React Query at Once?

Phase 2 targets Dashboard and Profile first because:

- These are the highest-traffic pages (every session hits Dashboard)
- They make the most Supabase queries per load
- Other pages (About, FAQ, Terms, HowItWorks) are static and need no caching
- `EmailSync` will be refactored in Phase 3 as part of async import work
- Remaining pages can be migrated incrementally after load testing validates the approach

---

## Expected Outcomes (200-500 Concurrency)

| Metric | Current State | Target After Plan |
| --- | --- | --- |
| Safe concurrent users | ~50-100 (estimate) | 200-500 (validated) |
| P95 dashboard latency | 2-3s (multiple sequential queries, no cache) | <700ms (single RPC + React Query cache) |
| Duplicate email processing | Near-zero (dedup exists) | Near-zero (retained) |
| OpenAI key exposure | **In browser bundle** | Server-side only |
| Google client secret exposure | **In browser bundle** | Server-side only |
| CORS policy | Allow all origins | Restricted to app domains |
| Per-user LLM rate limiting | None | 20 req/min sliding window |
| Import UX | Synchronous, 20-30s blocking | Async + real-time progress |
| Embedding cost per query | Always calls OpenAI | Cached, ~50%+ hit rate |
| Stats query cost | 2 Supabase queries + JS aggregation | 1 Postgres RPC |

---

## Checklist

### Phase 1: Security (P0)

- [ ] `VITE_OPENAI_API_KEY` removed from `apps/web/.env` and all client code
- [ ] `VITE_GOOGLE_CLIENT_SECRET` removed from `apps/web/.env` and all client code
- [ ] OpenAI calls routed through `apps/api/` with `requireAuth` middleware
- [ ] Google OAuth token exchange moved to `apps/api/`
- [ ] CORS restricted to configured origins in `apps/api/src/index.ts`
- [ ] Per-user rate limiting on LLM proxy routes
- [x] `email_connections` supports one row per `(user_id, provider)` — already implemented
- [ ] `/email-sync` route wrapped in `RequireAuth`
- [ ] OpenAI API key rotated
- [ ] Google Client Secret rotated
- [ ] Supabase anon key vs service role key verified as different values

### Phase 2: Performance (P1)

- [ ] `get_user_stats` RPC deployed and matches schema (`not_sure`, `user_decision`)
- [ ] `statsService.ts` refactored to use RPC
- [ ] Covering index `idx_swipes_user_outcome` added
- [ ] `@tanstack/react-query` installed and provider configured
- [ ] `useUserStats` hook created and used in Dashboard + Profile
- [ ] `usePurchases` hook created and used in Dashboard
- [ ] Targeted invalidation on mutations (not broad invalidation)
- [ ] `purchase_stats` table: decide to repurpose for pre-aggregation or drop

### Phase 3: Async Import (P1)

- [ ] `import_jobs` table created with RLS policies
- [ ] Express route `POST /api/email/import` creates job and processes async
- [ ] `EmailSync.tsx` polls `import_jobs` for progress (Realtime upgrade deferred)
- [ ] Import completion shows summary (imported/skipped/errors)

### Phase 4: Embedding Cache (P2)

- [ ] `embedding_cache` table created with `vector` extension
- [ ] Express embedding route checks cache before calling OpenAI
- [ ] Daily cleanup job for expired cache rows
- [ ] Cache hit rate monitored (target >50% after 1 week)

### Phase 5: Load Testing (Required)

- [ ] k6 installed and test scripts written
- [ ] Test data seeded in staging environment
- [ ] Auth token generation working in k6
- [ ] All 3 scenarios pass thresholds at 500 VUs
- [ ] DB connection count stable (no saturation)
- [ ] Supabase plan tier confirmed sufficient
