# Nopamine MVP - Rational Decision Engine

## Executive Summary

A text-only decision-support application that intercepts impulsive purchases by scoring justification through a lightweight psychometric model. The MVP targets two platforms:

- **Web App (React/Vite):** Maximum accessibility with sub-30-second onboarding for immediate value demonstration. Ideal for user acquisition and viral sharing.
- **Mobile App (React Native):** Comprehensive calibration for higher accuracy, optimized for sustained daily use with offline-first performance.

**Revenue Model:** Freemium with limited daily decisions; premium tier unlocks unlimited decisions and advanced analytics.

**Distribution:** Web for broad reach, App Store/Play Store for retention-focused users.

---

## Psychological Framework (Core Logic)

The application operationalizes the user's value hierarchy to shift decision-making from System 1 (impulsive) to System 2 (deliberative).

### The Stupid Tax Formula

**Rho (Rationality Coefficient):**

$$ρ = (U_{net} × (1 + δ_{freq})) / (C_{impact} × (1 + λ × E_{state}))$$

**Variables:**
- **U_net:** Net utility score (0-10), composite of instrumental and hedonic value
- **δ_freq:** Usage frequency modifier (0.0-1.0, daily=1.0, annual=0.05)
- **C_impact:** Financial displacement ratio (price / disposable budget remaining)
- **E_state:** Emotional interference (0.0-1.0, calm to high arousal)
- **λ:** Impulsivity constant (1.0-3.0, from quiz calibration)

### Decision Thresholds

| ρ Score | Verdict | Intervention |
|---------|---------|--------------|
| ρ < 1.0 | **STUPID TAX** | Hard block with opportunity cost display |
| 1.0 ≤ ρ < 2.5 | **COOLING OFF** | 24-hour mandatory delay |
| ρ ≥ 2.5 | **JUSTIFIED** | Purchase approved, logged for review |

---

## Technical Architecture

### A. Stack & Infrastructure

**Frontend:**
- **Web:** React 18 + Vite + TypeScript + Tailwind CSS
- **Mobile:** React Native 0.74 + TypeScript + Expo Router

**Backend:**
- **API:** FastAPI (Python 3.11) with Pydantic v2
- **Database:** supabase
- **LLM:** OpenAI gpt-5-mini
- **Auth:** JWT-based with HTTP-only cookies, optional OAuth via Google/Apple
- **Hosting:** Render (API) + Vercel (Web) + Expo (Mobile builds)

**Data Strategy:**
- Sensitive financial data (income, budget) stored encrypted at rest in PostgreSQL
- Decision inputs processed without storing raw purchase descriptions long-term
- Analytics aggregate patterns without PII for product improvement

### B. Core Modules

```
src/
├── decision-engine/      # Pure function rationality calculator
├── auth/                 # JWT handling, OAuth flows
├── analytics/            # Aggregated metrics, retention tracking
├── onboarding/           # Quiz flows (quick vs comprehensive)
└── api/                  # FastAPI endpoints, Pydantic schemas
```

---

## User Flows

### Web App: Speed-First Onboarding (Target: <30 seconds)

**Phase 1: Instant Quiz (3 questions)**
1. What is your monthly disposable income? (slider or quick select)
2. How often do you regret purchases? (Never → Always, 5-point scale)
3. Top category you overspend on? (optional, select one)

**Phase 2: Immediate Decision Mode**
- User inputs: Product name, price, intended usage justification (plain text)
- System returns instant verdict with brief explanation
- Optional: Save to history for weekly review

**UX Priority:** Minimize friction; single-screen quiz → immediate value.

### Mobile App: Accuracy-First Calibration (5-7 minutes)

**Phase 1: Comprehensive Quiz**
- Income and expense tracking setup
- Category-by-category utility ratings (instrumental vs hedonic)
- Impulsivity assessment (behavioral questions)
- Financial goal setting (saving, investing, debt payoff)

**Phase 2: Daily Decision Mode**
- Quick add via text input or voice-to-text
- Friction features: reflection prompts, cooldown timers
- Weekly swipe review for pattern reinforcement

**UX Priority:** Depth of calibration for higher accuracy; habit-forming daily touchpoints.

---

## Feature Sprints

### Sprint 1: Foundation (2 weeks)
- [ ] React + Vite web scaffold with TypeScript
- [ ] FastAPI backend with PostgreSQL schema
- [ ] JWT authentication (email/password + Google & Apple OAuth)
- [ ] Basic decision engine implementation
- [ ] Web onboarding flow (3-question quiz)
- [ ] Single-input decision interface
- [ ] Verdict display with explanation

**Deliverable:** Web app functional with auth, quiz, and basic decision.

### Sprint 2: Web Polish & Retention (2 weeks)
- [ ] Weekly decision history view
- [ ] "Tinder" review interface (swipe left/right)
- [ ] Decision patterns dashboard (simple charts)
- [ ] Rate limiting and freemium tiers
- [ ] Mobile-responsive optimizations
- [ ] Analytics tracking (retention, conversion)

**Deliverable:** Web app ready for beta launch with retention features.

### Sprint 3: Mobile App Core (3 weeks)
- [ ] React Native scaffold with Expo Router
- [ ] Comprehensive quiz implementation
- [ ] Offline storage (SecureStore/AsyncStorage)
- [ ] Text input decision flow with voice option
- [ ] Notification system for cooling-off reminders
- [ ] Biometric authentication (FaceID/TouchID)

**Deliverable:** Mobile app functional with depth calibration.

### Sprint 4: Mobile Polish & Sync (2 weeks)
- [ ] Cross-platform data sync (user preferences, history)
- [ ] Advanced analytics (category breakdowns, trends)
- [ ] Push notification strategy (weekly review prompts)
- [ ] App Store / Play Store submission prep
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (bundle size, start time)

**Deliverable:** Production mobile app with sync and store readiness.

### Sprint 5: Growth & Premium (2 weeks, post-launch)
- [ ] Premium subscription flow (Stripe integration)
- [ ] Advanced insights (savings projections, comparison benchmarks)
- [ ] Social features (share achievements, invite referrals)
- [ ] A/B testing framework for quiz optimization
- [ ] Customer support flow (in-app chat or email)

**Deliverable:** Monetization and virality loops operational.

---

## Clean Code Principles

### Code Organization
- **Single Responsibility:** Each module handles one domain (auth, decisions, analytics)
- **Dependency Inversion:** Business logic depends on interfaces, not concrete implementations
- **Composition over Inheritance:** Prefer functional composition and hooks over class hierarchies

### Naming Conventions
- **Files:** kebab-case for components, PascalCase for React components, snake_case for Python modules
- **Functions:** descriptive verbs (e.g., `calculateRationality`, `validateSession`)
- **Variables:** camelCase (JS/TS) or snake_case (Python); avoid abbreviations except for standard domains

### Error Handling
- **Fail Fast:** Validate inputs early with descriptive error messages
- **Graceful Degradation:** UI shows fallback states when services are unavailable
- **Logging:** Structured JSON logs for debugging; avoid logging sensitive data

### Testing Strategy
- **Unit Tests:** 80%+ coverage on decision engine, auth, and utility functions
- **Integration Tests:** API endpoints tested with real database connections
- **E2E Tests:** Critical user flows (quiz → decision → verdict) automated
- **CI/CD:** GitHub Actions run tests and type checking on every PR

### Documentation
- **Self-Documenting Code:** Prefer clear naming over inline comments
- **API Docs:** Auto-generated OpenAPI schemas with examples
- **README:** Quick start, environment setup, and contribution guidelines

---

## API Specification (Key Endpoints)

### Authentication
```
POST /auth/register          # Email/password registration
POST /auth/login             # JWT token issuance
POST /auth/refresh           # Refresh access token
GET  /auth/me                # Current user profile
```

### Decisions
```
POST   /decisions            # Create new decision request
GET    /decisions            # List decision history
GET    /decisions/{id}       # Single decision detail
DELETE /decisions/{id}       # Remove decision record
```

### Onboarding
```
POST /onboarding/quick       # Web quick quiz (3 questions)
POST /onboarding/complete    # Mobile comprehensive quiz
GET  /onboarding/status      # Quiz completion status
```

### Analytics
```
GET /analytics/summary       # Weekly/monthly patterns
GET /analytics/categories    # Category breakdown
GET /analytics/trends        # Rho score trends over time
```

---

## Security Considerations

- **Data Minimization:** Store only essential user data; anonymize analytics
- **Encryption:** TLS 1.3 in transit; AES-256 at rest for PostgreSQL
- **Rate Limiting:** Redis-based limits per user tier (free: 10 decisions/day)
- **Input Sanitization:** Pydantic validation + HTML escaping for display
- **Session Management:** Short-lived JWTs (15 min) + secure refresh tokens

---

## Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Time-to-first-decision (web) | <30 seconds |
| Quiz completion rate | >70% |
| Day-7 retention | >25% |
| Premium conversion | >5% |
| Decision accuracy rating | >4.0/5.0 (user feedback) |

---

## Next Steps

1. Initialize monorepo with React (web), React Native, and FastAPI scaffolds
2. Implement Sprint 1 foundation with decision engine core
3. Set up CI/CD pipeline and deployment workflows
4. Conduct internal QA sprint before beta release
5. Soft launch web app to early adopters for feedback