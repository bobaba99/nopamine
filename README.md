# TruePick

AI-powered purchase decision tool that helps users avoid unnecessary spending. Submit a product and receive a reasoned buy / hold / skip verdict powered by GPT-5-nano.

## Free Tier (Web App)

- **Onboarding quiz** — profiles spending tendencies and impulse triggers
- **3 AI verdicts per week** — one-line reasoned recommendation with limited rationale depth
- **Educational resources** — curated content on consumer psychology and decision frameworks

## Premium Tier

- **Unlimited verdicts** with full rationale referencing user profile and values
- **Chrome Extension** — session awareness on e-commerce sites, checkout interstitial friction, opt-in website blocking
- **Spending analytics** — weekly/monthly reports, trend lines, personalized LLM-generated insights
- **Alternative recommendations** — cheaper options, DIY approaches, or emotional reframing when verdict is "skip"
- **Ongoing email syncing** — auto-log purchases from Gmail/Outlook, close the feedback loop with post-purchase satisfaction tracking
- **Conversational agent** — query past purchases, regret patterns, and override rates

See `freemium_features.md` for the full tier comparison and implementation sequence.

## Setup

```bash
# Clone and install
git clone https://github.com/bobaba99/truepick.git
cd truepick
npm install

# Start local Supabase (Postgres, Auth, Studio)
supabase start

# Copy environment config
cp apps/web/.env.example apps/web/.env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY, etc.

# Start dev servers (API + web)
npm run dev
```

## Key Commands

```bash
npm run dev           # Start API + web concurrently
npm run dev:web       # Web only (Vite)
npm run dev:api       # API only (Express + tsx watch)
npm run build:web     # TypeScript check + Vite production build
npm --workspace apps/web run lint   # ESLint

supabase db reset     # Reset DB with migrations + seed
supabase migration new <name>   # Create new migration
```

## Project Structure

```
truepick/
├── apps/
│   ├── web/          # React 19 + Vite + react-router-dom v7
│   ├── api/          # Express scaffold (health check only)
│   └── mobile/       # Expo / React Native scaffold
├── packages/shared/  # Shared types (scaffold)
├── supabase/
│   ├── migrations/   # Schema, RLS, functions, triggers
│   ├── seed.sql      # Dev seed data
│   └── config.toml   # Local Supabase config
└── docs/             # Canonical project docs
```

## Documentation

| Doc | Purpose |
|-----|---------|
| `TECH_STACK.md` | Technology choices and architecture diagram |
| `FRONTEND_GUIDELINES.md` | Component patterns, styling, routing, accessibility |
| `BACKEND_GUIDELINES.md` | Supabase schema, RLS, API contracts, email import pipeline |
| `APP_FLOW.md` | User flows, navigation, state transitions |
| `PRD.md` | Product requirements and feature specifications |
| `freemium_features.md` | Free vs. premium tier breakdown and implementation phases |
| `progress.md` | Current sprint status and task tracking |
