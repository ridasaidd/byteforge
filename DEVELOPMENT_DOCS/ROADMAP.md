# Roadmap (concise)

Last updated: January 24, 2026

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
- ✅ Theme CSS Architecture Decision (Jan 24) - Two-layer model finalized

—

## In flight / Priority Order

### M1: Central Admin Completion (in progress - next)
- ✅ Dashboard home page with stats & quick actions (Jan 22)
- ✅ Public/dashboard blade separation (Jan 22)
- ✅ Theme CSS Architecture Decision (Jan 24)
  - Two-layer CSS: shared base file + tenant overrides in DB
  - Atomic section saves in Theme Builder
  - Publish/merge flow for final CSS
  - See: [THEME_CSS_IMPLEMENTATION_GUIDE.md](THEME_CSS_IMPLEMENTATION_GUIDE.md)
- **Theme CSS Implementation** (~8-12 hours total) ← **Starting now**
  - **Phase 3:** Backend services + API (2-3 hrs)
    - `ThemeCssSectionService`, `ThemeCssPublishService`, `ThemeCssController`
    - Migration: `custom_css` column
  - **Phase 4:** Frontend aggregator (1-2 hrs)
    - `PuckCssAggregator.ts`, `themeCss.ts` API
  - **Phase 5:** Theme Builder integration (2-3 hrs)
    - Section saves on step transitions
    - Publish button on final step
  - **Phase 6-7:** Blade/SPA injection + Editor (1.5 hrs)
  - **Phase 8-10:** Tenant customization, component migration, testing (3-4 hrs)
  - **Branch:** `feature/theme-css-v3`
  - **Tests required:** Unit + Feature for services, API, aggregator
- Theme customization UI (live token editing, preview, reset) (~6-8 hours)
- Dashboard stats endpoint optimization (~2 hours)
- **Est:** 16-22 hours remaining

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
