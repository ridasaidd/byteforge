# Roadmap (concise)

Last updated: January 22, 2026

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

—

## In flight / Priority Order

### M1: Central Admin Completion (in progress - next)
- ✅ Dashboard home page with stats & quick actions (Jan 22)
- ✅ Public/dashboard blade separation (Jan 22)
- **Theme CSS Architecture** (Feb 1-3, ~4-6 hours) ← **Starting now**
  - Generate and save base theme CSS to disk
  - Store customizations in database
  - Link CSS in public blade template
  - Convert 3-4 Puck components to use CSS variables (Hero, Card, Button, CTA)
  - Create ThemeCssGeneratorService with full test coverage
  - **Branch:** `feature/theme-css-architecture`
  - **Tests required:** Unit + Feature tests for CSS generation and theme activation
- Theme customization UI (live token editing, preview, reset) (Feb 4-5, ~6-8 hours)
- Dashboard stats endpoint optimization (dedicated `/superadmin/dashboard/stats` with 5-10min cache) (~2 hours)
- Settings management UI polish (if needed) (~2 hours)
- **Est:** 12-18 hours remaining

### M2: Analytics & Insights
- Analytics dashboard (activity, usage, trends)
- Performance monitoring
- **Est:** 6-8 hours

### M3: Business Features
- Payment/billing system (Stripe, subscriptions)
- Usage tracking & quotas
- **Est:** 10-12 hours

### M4: Tenant Access
- Tenant dashboard (scoped pages, media, themes)
- Multi-user support within tenants
- **Est:** 8-10 hours

### M5: Polish & Performance
- Loading states/splash screens
- Performance optimization & benchmarks
- Enhanced component presets
- Dashboard stats caching (create dedicated `/superadmin/dashboard/stats` endpoint with 5-10min cache)
- **Est:** 6-8 hours

—

## Future / Stretch

- Content/version history for pages
- Theme versioning & rollback
- Navigation drag-and-drop tree UI
- SEO controls (sitemaps, meta presets)
- CDN integration
- Role-scoped UI with feature flags

—

## Development Standards

**Branch Naming:**
- `feature/` - New features (e.g., `feature/theme-css-architecture`)
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
