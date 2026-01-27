# Roadmap (concise)

Last updated: January 25, 2026

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
- ✅ Theme CSS Generation - Backend services, frontend aggregator, ThemeBuilder integration (Jan 24-25)
- ✅ CSS files stored on disk at `/storage/themes/{id}/{id}.css` (Jan 25)

—

## In flight / Priority Order

### M1: CSS Loading Validation & Architecture Refactor (in progress - next)

**Phase 6: Validate CSS Loading (IMMEDIATE - 1-2 hrs)**
- Load CSS from active theme to `<link>` tag in Blade head
- Test on actual storefront to confirm concept works
- Verify cache-busting and theme switching
- **This is a validation step before continuing**

**Phase 7: Architecture Refactor - Pivot Table (IF PHASE 6 WORKS - 3-4 hrs)**

Current architecture clones entire theme records per tenant. New approach:

```sql
-- themes table (templates only)
themes: id, name, slug, theme_data, is_system_theme

-- NEW: tenant_themes pivot table
tenant_themes:
  - tenant_id, theme_id (composite key)
  - is_active (boolean)
  - custom_css (tenant overrides)
  - activated_at
```

**Benefits:**
- No data duplication (theme_data stored once)
- Single DB query gets theme + customizations (JOIN)
- Easier template updates (change once, all tenants get it)
- Clean separation: templates vs activations

**Actions to Create (using laravel-actions):**
- `ActivateTheme` - Activate a theme for a tenant (insert/update pivot row)
- `SaveThemeCustomCss` - Save tenant customizations to pivot table

**Phase 8: Tenant Customization UI (4-6 hrs)**
- Live token editing (colors, typography, spacing)
- Save to `tenant_themes.custom_css`
- Preview before applying

**Phase 9: Puck Editor CSS (1-2 hrs)**
- Ensure editor preview loads theme CSS

**Phase 10: Extended Component Builders (2-3 hrs)**
- Add Link, Image, Form CSS builders

**Est:** 12-18 hours remaining

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
