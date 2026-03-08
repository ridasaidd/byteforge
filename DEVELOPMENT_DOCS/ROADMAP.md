# Roadmap (concise)

Last updated: March 8, 2026

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

### M2: Payments Core (IN PROGRESS)

**Phase 10: Stripe + Swish, products/prices, tenant-scoped**

**Scope:**
- Stripe + Swish integration with webhook handling
- Products/prices model with tenant scoping
- Checkout flows and refund handling
- Fires `payment.*` events into analytics pipeline (activates revenue widgets automatically)

**Backend progress (Mar 8, 2026):**
- ✅ 10.1 Foundation schema/models/contracts/packages
- ✅ 10.2 Central billing APIs + webhook lifecycle sync
- ✅ 10.3 Tenant payment-provider config APIs
- ✅ 10.4 Stripe gateway + webhook flow
- ✅ 10.5 Swish gateway + callback flow
- ✅ 10.6 Klarna gateway/session-authorize-capture flow
- ✅ 10.7 Payment/refund orchestration + tenant payment APIs + analytics events

**Verification status:**
- Full backend suite run completed with `286 passed`, `15 skipped` (current suite policy treats warnings/skips as non-zero process exit).

**Remaining to close Phase 10:**
- Manual provider sandbox verification (Stripe, Swish MSS, Klarna Playground)
- Final QA pass + docs/verification checklist sign-off

**Est:** Backend core complete; frontend/manual closeout next
**Status:** In progress

---

### M3: Booking Integration (AFTER Phase 10)

**Phase 11: Port booking system into multi-tenant CMS**

**Scope:**
- Port appointment/scheduling models to multi-tenant
- Availability, confirmation, cancellation flows
- Build `<BookingWidget>` Puck component
- Fires `booking.*` events into analytics pipeline (activates booking widgets automatically)

**Est:** 6–8 weeks (booking logic exists, integration focus)  
**Status:** Planned, waiting for Phase 9 + 10

---

### M4: Advanced Analytics (FUTURE)
- Booking analytics: revenue trends, peak hours, popular services
- Platform analytics: subscription revenue, feature adoption
- Aggregation cron jobs for pre-computed roll-ups
- **Unlocked automatically** once Phase 9 + 11 are complete

---

### M5: Platform Enhancements (FUTURE)
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
