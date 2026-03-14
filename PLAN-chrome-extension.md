# Chrome Extension Implementation Plan

## Overview

TruePick Chrome Extension — a browser extension that provides real-time purchase protection by monitoring e-commerce browsing, intercepting checkout flows, and enabling opt-in website blocking.

## Features & Implementation Assessment

### 1. Session Awareness

**Difficulty:** Medium

**What it does:** Tracks browsing activity on e-commerce domains — time on site, pages viewed, visit frequency. Surfaces real-time indicators like "You've browsed 14 products in 22 minutes — this pattern matches impulse browsing."

**Key APIs:**
- `chrome.webNavigation` — detect page navigations on e-commerce domains
- `chrome.tabs` — track active tab and URL changes
- `chrome.storage.local` — persist session data (timestamps, page counts, domain visit history)
- Content script — inject notification bubble into the page DOM

**Implementation approach:**
- Maintain a curated list of e-commerce domain patterns (amazon.com, shopify stores, etc.)
- Background service worker listens for `webNavigation.onCompleted` events
- Track per-domain metrics: pages viewed, time spent, visit frequency
- Pattern detection via rules (e.g., X pages in Y minutes = impulse indicator)
- Content script injects a dismissible notification bubble when a pattern is detected
- Notification includes a CTA to run a TruePick verdict

**Challenges:**
- Curating and maintaining the e-commerce domain list (could use community-sourced list or heuristics like detecting product/cart pages)
- Manifest V3 service worker lifecycle — no persistent background page, must handle wake-ups
- Performance — content scripts must be lightweight to avoid slowing page loads

### 2. Checkout Interstitial

**Difficulty:** Medium-Hard

**What it does:** Detects checkout flows via URL patterns and DOM heuristics. Injects a dismissible decision overlay that routes the user through TruePick's verdict engine before completing the purchase.

**Key APIs:**
- `chrome.webNavigation` or `chrome.webRequest` — detect checkout page navigation
- Content script — inject overlay into the page DOM
- `chrome.runtime.sendMessage` — communicate between content script and background worker
- TruePick API — call verdict endpoint from extension

**Implementation approach:**
- URL pattern matching: `/checkout`, `/cart`, `/payment`, `/order`, `/buy`
- DOM heuristics (fallback): detect payment forms, "Place Order" buttons, credit card input fields
- When checkout detected, content script injects a full-page semi-transparent overlay
- Overlay includes: product info (scraped from page), "Before you buy..." prompt, option to run verdict or continue
- Auth: store TruePick session token in `chrome.storage.local` (obtained via login flow in extension popup)

**Challenges:**
- Cross-site compatibility: every e-commerce site structures checkout differently
- Single-page apps (SPAs) don't trigger `webNavigation` events — need `MutationObserver` or URL polling
- Scraping product info (name, price, image) varies wildly across sites
- Auth token management: how to authenticate the extension with TruePick API (OAuth flow vs. email/password in popup)

### 3. Website Blocking

**Difficulty:** Easy-Medium

**What it does:** Opt-in commitment device with customizable schedules. Soft block adds a 30-second reflection prompt; hard block fully prevents access with a cooldown period you control.

**Key APIs:**
- `chrome.declarativeNetRequest` — block URLs at the network level (hard block)
- Content script — inject reflection overlay (soft block)
- `chrome.storage.local` — persist block list and schedules
- `chrome.alarms` — schedule block/unblock windows
- Extension popup UI — configure blocked sites and schedules

**Implementation approach:**
- User configures blocked domains + schedule in extension popup
- Soft block: content script injects a full-page overlay with a countdown timer (e.g., 30 seconds). User can dismiss after timer expires.
- Hard block: `declarativeNetRequest` rules redirect blocked URLs to an extension page explaining the block + countdown
- Schedule support: `chrome.alarms` triggers enable/disable of block rules at configured times
- Cooldown: after unblocking, re-enable block after user-defined cooldown period

**Challenges:**
- `declarativeNetRequest` has a rule limit (MAX_NUMBER_OF_DYNAMIC_RULES = 5000, more than enough)
- Schedule management with `chrome.alarms` requires handling service worker wake-ups correctly
- UX for configuring schedules (time pickers, day-of-week selection) in a small popup

## Architecture

```
truepick-extension/
├── manifest.json              # Manifest V3 config
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Event listeners, alarm handlers, API calls
│   ├── content/
│   │   ├── session-tracker.ts # Session awareness monitoring
│   │   ├── checkout-detector.ts # Checkout page detection + overlay injection
│   │   └── site-blocker.ts    # Soft block overlay injection
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   └── popup.ts           # Settings, block list, login
│   ├── pages/
│   │   └── blocked.html       # Hard block redirect page
│   └── shared/
│       ├── api.ts             # TruePick API client
│       ├── domains.ts         # E-commerce domain patterns
│       └── storage.ts         # chrome.storage helpers
├── icons/                     # Extension icons (16, 48, 128px)
└── tsconfig.json
```

## Integration with TruePick Web App

- **Auth:** Extension popup includes login form (email/password or OAuth). Stores Supabase session token in `chrome.storage.local`. Token refreshed via background service worker.
- **Verdict API:** Checkout interstitial calls `POST /api/verdict/evaluate` with product details scraped from the page.
- **User profile:** Extension fetches user profile (values, spending habits) from TruePick API to personalize notifications.
- **Analytics:** PostHog events sent from extension via web API (not JS SDK — CSP restrictions in extensions).

## Estimated Timeline

| Phase | Duration | Scope |
|-------|----------|-------|
| Setup + Session Awareness | 1 week | Manifest V3 scaffold, domain detection, page tracking, notification bubble |
| Checkout Interstitial | 1 week | URL + DOM detection, overlay injection, verdict API integration |
| Website Blocking | 3-4 days | Block list UI, soft/hard block, schedules, cooldown |
| Polish + Store Submission | 3-4 days | Icons, screenshots, privacy policy, Chrome Web Store review |
| **Total** | **~3 weeks** | Solo developer estimate |

## Prerequisites

- Chrome Web Store developer account ($5 one-time fee)
- Privacy policy page (required for Web Store listing)
- TruePick API endpoints accessible from extension (CORS headers for extension origin)
- Extension icons in 16×16, 48×48, 128×128 sizes

## Key Decisions to Make

1. **Auth method:** Supabase email/password in popup vs. OAuth redirect flow vs. "link to existing TruePick account" approach
2. **E-commerce domain list:** Static curated list vs. community-sourced vs. heuristic detection (cart/checkout DOM elements)
3. **Product scraping:** Structured data (JSON-LD, Open Graph) vs. DOM scraping vs. user-provided product URL
4. **Monetization:** Extension free for Premium subscribers only, or freemium extension with limited features
5. **Build tooling:** Vite + CRXJS (Vite plugin for Chrome Extensions) vs. webpack + chrome-extension-tools
