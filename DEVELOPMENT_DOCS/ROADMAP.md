# Roadmap (concise)

Last updated: April 6, 2026

—

## Delivered ✅

- ✅ Backend phases 1–4 complete (auth, tenancy, RBAC, pages, navigation, media, settings, logs)
- ✅ Page Builder with Puck; themed components and advanced controls (merged Jan 19)
- ✅ Theme system (sync/activate/reset/duplicate/export) + ThemeProvider
- ✅ Public page rendering with active theme + metadata injection
- ✅ Central admin UI for core domains (pages, themes, media, users, tenants, activity, settings)
- ✅ Full test suite (577 frontend + 123 backend, all passing)
- ✅ Dashboard home page with real stats, recent tenants, activity, and permission-based visibility (Jan 21)
- ✅ Public/dashboard blade template separation for performance (Jan 22)
- ✅ Stats API service with permission-based data fetching (Jan 22)
- ✅ Theme CSS Generation - Complete system merged to main (Jan 24-27)
- ✅ All 15 Puck components using buildLayoutCSS/buildTypographyCSS
- ✅ CSS files validated and generating correctly
- ✅ Dual-mode rendering: runtime CSS in editor, files on storefront
- ✅ Removed Tailwind from public pages (loading spinner, 404 page cleanup)
- ✅ **Phase 6: Theme Customization** - Blueprint/instance separation, scoped customizations (Jan 30)
- ✅ **Phase 6.1: Theme Manager Refinements** - Safety features, preview images, responsive image optimization (Jan 31)
- ✅ **Phase 7: Font System** - Self-hosted variable fonts, RichText, storefront parity (Feb 2)
- ✅ **Phase 8: Page System Refactor** - Header/footer/layout decoupled from legacy page columns (Feb 2)
- ✅ **Navigation v2 Refactor** - Field-group driven navigation architecture merged to `main` (Mar 3)
- ✅ **Phase 9: Analytics Foundation** - Event pipeline, tenant/central dashboards, third-party integrations (Mar 5)
- ✅ **Phase 10: Payments Core** - Central billing + tenant providers + payment/refund orchestration (Mar 8)
- ✅ **Phase 11: Dashboard Translation (i18n)** - `en/sv/ar`, locale persistence, RTL hardening (Mar 14)

—

## In flight / Priority Order

### M1: Analytics Foundation ✅ COMPLETE (Mar 5, 2026)

**Phase 9: Event pipeline + tenant/central dashboards**

> **Archived plan:** See [archive/completed-phases/PHASE9_ANALYTICS_FOUNDATION.md](./archive/completed-phases/PHASE9_ANALYTICS_FOUNDATION.md)

**Sub-phases — all complete:**
- 9.1: Schema + `AnalyticsService` + `AnalyticsEvent` model ✅
- 9.2: `AnalyticsQueryService` + API endpoints ✅
- 9.3: `page.viewed` tracking ✅
- 9.4: Tenant analytics dashboard ✅
- 9.5: Central analytics dashboard ✅
- 9.6: Third-party analytics integrations (GA4, GTM, Clarity, Plausible, Meta Pixel) + public page view beacon + tenant CMS settings page ✅

**Merged:** `feature/phase9-analytics-foundation` → `main` (`6f7bd1d`)

---

### M2: Payments Core ✅ COMPLETE

**Phase 10: Stripe + Swish, products/prices, tenant-scoped**

**Scope:**
- Stripe + Swish integration with webhook handling
- Products/prices model with tenant scoping
- Checkout flows and refund handling
- Fires `payment.*` events into analytics pipeline (activates revenue widgets automatically)

**Delivered (Mar 8, 2026):**
- ✅ 10.1 Foundation schema/models/contracts/packages
- ✅ 10.2 Central billing APIs + webhook lifecycle sync
- ✅ 10.3 Tenant payment-provider config APIs
- ✅ 10.4 Stripe gateway + webhook flow
- ✅ 10.5 Swish gateway + callback flow
- ✅ 10.6 Klarna gateway/session-authorize-capture flow
- ✅ 10.7 Payment/refund orchestration + tenant payment APIs + analytics events

**Closeout hardening (Mar 8, 2026):**
- ✅ Webhook idempotency guard + processed event tracking
- ✅ Webhook route rate limiting
- ✅ Disabled Cashier default `/stripe/webhook` route (wrong model target for tenancy)
- ✅ Checkout-return subscription sync path

**Verification status:**
- Full regression run completed with `304 passed`, `15 skipped`.

**Merged:** `feature/phase10-frontend` -> `main` (`8473575`)
**Status:** Complete

---

### M3: Dashboard Translation ✅ COMPLETE (Mar 14, 2026)

**Phase 11: Localization / i18n for central + tenant dashboards**

**Scope:**
- Add i18n infrastructure for React dashboard apps
- Extract hardcoded strings into locale dictionaries
- Ship Swedish (`sv`) + English (`en`) locales
- Persist language preference per user/session
- Localize formatting for dates/times/numbers/currency

**Status:** Complete and archived
**Archived plan:** See [archive/completed-phases/PHASE11_DASHBOARD_TRANSLATION.md](./archive/completed-phases/PHASE11_DASHBOARD_TRANSLATION.md)

---

### M4: Tenant Runtime Readiness ✅ COMPLETE (Apr 4, 2026)

**Phase 12: Tenant storefront + auth + dashboard production readiness**

**Delivered:**
- Tenant login/runtime routes, membership enforcement, permission-gated CMS routes, storefront parity, tenant isolation test coverage
- GDPR cookie consent: `vanilla-cookieconsent` React implementation replacing PHP package; 18 Playwright E2E tests (banner + enforcement + revocation)

**Verification:** PHP `355 passed`; Playwright `18 passed`

---

### M5: Booking Integration ✅ COMPLETE (Apr 7, 2026)

**Phase 13: Universal booking engine for service-based tenants**

**Design doc:** [DEVELOPMENT_DOCS/PHASE13_BOOKING_SYSTEM.md](./PHASE13_BOOKING_SYSTEM.md)

**Scope:**
- `Resource` abstraction (person / space / equipment) covers hairdressers, BnB, auto workshops, yoga studios, and more
- Slot-mode (appointments) + range-mode (multi-day stays/rentals)
- Guest bookings with cryptographic management token; soft account conversion
- Availability engine: weekly windows + specific-date overrides, buffer time, DST-safe UTC storage
- Public API (unauthenticated); CMS API (tenant-authenticated + `addon:booking`)
- Email-first notifications: created / confirmed / reminder 24h /1h / cancelled / rescheduled
- `BookingWidget` Puck component — multi-step wizard with slot hold (10-min reservation)
- `booking.*` analytics events into Phase 9 pipeline
- Forward-compatible with Phase 14 (payment × booking cross-addon)

**Sub-phases:**
- 13.1 — Data model (migrations, models, factories) ✅
- 13.2 — Availability engine ✅
- 13.3 — Public API ✅
- 13.4 — CMS API ✅
- 13.5 — Notifications ✅
- 13.6 — BookingWidget Puck component ✅
- 13.7 — CMS pages ✅

**Status:** Planning complete; implementation starting with 13.1

---

### M6: Payment × Booking Integration (FUTURE — Phase 14)

**Strategic decision (Apr 7, 2026):**

The Payment add-on has no standalone utility for tenants in the current architecture — without something to sell (like bookings), activating it alone does nothing. This has two implications:

1. **The payment add-on should be bundled free** with any paid add-on that consumes it (initially: booking). Tenants should not be charged separately for payment capability — it's an enhancement to booking, not a product in itself. Its value is in converting free bookings to paid ones, which drives tenant retention and willingness to pay for the booking add-on itself.

2. **Payment should not be surfaced as a standalone add-on toggle** in the UI. Instead, payment configuration (API keys, provider selection) should live inside the Booking settings page and only appear when the booking add-on is active. The `addon:payment` middleware check should piggyback on the booking add-on check.

**Design doc:** [DEVELOPMENT_DOCS/PHASE13_BOOKING_SYSTEM.md](./PHASE13_BOOKING_SYSTEM.md) (see Phase 14 forward-compatibility note)

**Scope (when ready to implement):**
- Per-service `requires_payment` flag on `BookingService` (some services free, some paid — more flexible than per-tenant)
- Widget flow: after hold → if `requires_payment` and payment add-on keys configured → `STATUS_AWAITING_PAYMENT` → provider checkout → webhook confirms → `STATUS_PENDING` / `STATUS_CONFIRMED`
- If payment add-on not configured, skip payment step regardless of flag
- Booking analytics events fire `booking.payment_received` into Phase 9 pipeline
- Refund path: `BookingManagementController::cancel()` triggers refund via existing payment orchestration if booking was paid

---

### M7: Guest Authentication System (FUTURE — Phase 15)

**Design doc:** [DEVELOPMENT_DOCS/PHASE15_GUEST_AUTH.md](./PHASE15_GUEST_AUTH.md)

**Dependencies:**
- Phase 13 (Booking) — ✅ complete
- `AUTH_HTTPONLY_MIGRATION_PLAN.md` Phase 1 (schema) must ship first for `web_refresh_sessions` extension

**Scope:**
- Central `guest_users` table — separate from `users` (admin/staff), one identity per email across all tenants
- Magic link (passwordless) as primary authenticator; no password in V1
- Cross-domain auth is tenant-proxied: guest authenticates on tenant domain → tenant API calls central to verify magic link → tenant issues guest session via HttpOnly cookie
- Guest sessions mirror the HttpOnly auth refactor model: short-lived HMAC access token (not Passport), `byteforge_guest_refresh` HttpOnly cookie, `web_refresh_sessions` row with nullable `guest_user_id` alongside existing `user_id`
- `auth:guest` tenant middleware — HMAC-based, no Passport guard
- Retroactive booking linking: after first sign-in, all anonymous bookings matching `customer_email` are linked to the `guest_user_id`
- Guest portal at `/my-bookings` (fixed system route, not a Puck page type; only visible when `addon:booking` active)
- Post-booking "Save to your account" prompt in BookingWidget success step

**Implementation sub-phases:**
- 15.1 — Central `guest_users` + `MagicLinkToken` + `GuestMagicLinkService` + central internal API
- 15.2 — Add `guest_user_id` to `web_refresh_sessions` (depends on AUTH refactor Phase 1)
- 15.3 — Tenant guest auth endpoints + `auth:guest` middleware
- 15.4 — Retroactive booking linking
- 15.5 — Guest portal UI (`/my-bookings`)
- 15.6 — BookingWidget "save to account" integration
- 15.7 — Tests + Playwright E2E

---

### M8: Advanced Analytics (FUTURE)
- Booking analytics: revenue trends, peak hours, popular services
- Platform analytics: subscription revenue, feature adoption
- Aggregation cron jobs for pre-computed roll-ups
- **Unlocked automatically** once Phase 9 + 13 are complete

---

### M9: Platform Enhancements (FUTURE)
- Tenant dashboard access (scoped pages, media, themes for tenant users)
- Subscription billing and usage quotas
- Navigation drag-and-drop tree UI

—

## Future / Stretch

### CMS Enhancements
- Content/version history for pages
- Theme versioning & rollback
- Navigation drag-and-drop tree UI
- SEO controls (sitemaps, meta presets)
- CDN integration
- Role-scoped UI with feature flags

### Static HTML Generation (Error Pages & Splash Screens)
- **Error Pages**: Tenant-customizable 404/500/503 pages built with Puck
  - New page types: `error_404`, `error_500`, `error_403`, `error_503`, `maintenance`
  - Static HTML generation (no React dependency on errors)
  - Laravel exception handler integration
  - Pre-rendered, theme-aware error pages
- **Splash Screens**: Tenant-customizable loading states
  - Page type: `splash_screen`
  - Static HTML output (no Tailwind needed)
  - Inline CSS or theme CSS file reference
- **Technical Requirements**:
  - Add `html_compiled` column to pages table
  - Server-side rendering using ReactDOMServer (Node/Bun)
  - Constraint: One page per special type per tenant
  - No dynamic data/API calls (pre-render only)
  
**Scope Note**: These features expand the CMS capabilities but don't align with original booking manager vision. Consider prioritizing core business domain features first.

—

## Development Standards

**Branch Naming:**
- `feature/` - New features (e.g., `feature/theme-css-v3`)
- `fix/` - Bug fixes (e.g., `fix/modal-overflow`)
- `refactor/` - Code improvements (e.g., `refactor/puck-components-ddd`)
- `docs/` - Documentation only

**Before Every PR:**
- ✅ All tests pass: `npm run test && php artisan test`
- ✅ Linting passes: `npm run lint && php artisan lint`
- ✅ CURRENT_STATUS.md updated with changes
- ✅ Branch is clean (no merge commits, rebased on latest main)

**Testing Requirements by Type:**
- **New Service:** Unit + Feature tests (80%+ coverage)
- **New API Endpoint:** Feature tests for happy/error paths
- **New Component:** Component tests for props and interactions
- **Refactoring:** All existing tests still pass (no regressions)
