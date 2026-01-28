# Roadmap (concise)

Last updated: January 28, 2026

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

—

## In flight / Priority Order

### M1: Theme Customization System (NEXT - 5-6 hrs)

**Phase 6: Theme Customization - Central + Tenants**

> **Detailed plan:** See [PHASE6_TENANT_CUSTOMIZATION_PLAN.md](./PHASE6_TENANT_CUSTOMIZATION_PLAN.md)

**Goal:** Enable both central (storefront) and tenants to customize activated themes (Settings, Header, Footer only). Central dogfoods the feature.

**Key Decisions:**
- Unified flow: Same customization for central storefront + tenant storefronts
- Reuse `ThemeBuilderPage` with `mode="customize"` prop
- Hide Info/Pages tabs in customize mode (both central and tenants)
- Store customization CSS in database columns (not files)
- CSS cascade: disk files (base) + database (overrides)
- System themes immutable, only theme instances can be customized

**TDD Task Breakdown:**

| # | Task | Est. |
|---|------|------|
| 1 | Migration: Add `settings_css`, `header_css`, `footer_css` columns | 30 min |
| 2 | Backend: `ThemeCustomizationController` API | 1 hr |
| 3 | Frontend: `ThemeBuilderPage` mode prop | 1 hr |
| 4 | Frontend: `themeCustomization` API client | 30 min |
| 5 | Blade: Cascade CSS loading (disk + DB) | 30 min |
| 6 | Tenant: Routes & `ThemeCustomizePage` | 30 min |
| 7 | Fix: Templates endpoint (use `page_templates` table) | 30 min |

**Est:** 5-6 hours

**Status**: Ready to implement. This closes the page builder.

---

### M2: Font System (Future - After Phase 6)

**Phase 7: Font System Architecture**

> **Detailed plan:** See [PHASE7_FONT_SYSTEM.md](./PHASE7_FONT_SYSTEM.md)

**Goal:** Build comprehensive font management for sans, serif, and mono families with preview and component-level selection.

**Key Features:**
- Multi-font support (sans, serif, mono)
- Font sources: System fonts, Google Fonts, FontBunny
- Font preview in theme builder and components
- Component font selection controls
- CSS variables and `@import` generation

**Est:** 7-11 hours (after Phase 6)

**Status**: Architecture designed, ready for implementation post-Phase 6.

---

### M3: Booking Integration (NEXT MAJOR PHASE - After Phase 6)

**Goal:** Integrate existing booking system (from booking-manager) into ByteForge multi-tenant architecture.

**Scope**: 
- Port appointment/scheduling models to multi-tenant context
- Adapt existing payment processing (Stripe + Swish) for multiple tenants
- Create booking management dashboard for tenants
- Build `<BookingWidget>` Puck component for embedding bookings in pages

**Est:** 6-8 weeks (booking logic already exists, this is integration + multi-tenancy)

See [SCOPE_CLARITY.md](./SCOPE_CLARITY.md) for details.

---

### M3: Analytics & Insights (Future)
- Analytics dashboard (activity, usage, trends)
- Booking analytics (revenue, popular times, cancellations)
- Performance monitoring
- **Est:** 6-8 hours

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
