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

### M1: Theme Customization System ✅ COMPLETE (Jan 30, 2026)

**Phase 6: Theme Customization - Central + Tenants - DONE**

All steps complete:
- ✅ Database schema (settings_css column, settings enum)
- ✅ Backend API (ThemeCustomizationController)
- ✅ Frontend (ThemeBuilderPage with mode prop)
- ✅ API client (themeCustomization.ts)
- ✅ CSS loading cascade (disk + database)
- ✅ Tenant routes and pages
- ✅ Templates endpoint fixed

**Status:** Merged to main. Theme customization working end-to-end.

---

### M2: Theme Manager Refinements (NEXT PRIORITY - 2-3 days)

**Phase 6.1: Theme Manager Polish**

> **Detailed plan:** See [CURRENT_STATUS.md](./CURRENT_STATUS.md#theme-manager---refinements--critical-features)

**Critical Issues (Safety & UX):**
1. **Deletion Protection** - Prevent deleting active themes
2. **Theme Switch Warning** - Alert about customization data loss
3. **Theme Rollback** - Reset customizations to blueprint defaults

**Settings Tab Enhancements:**
4. **Color Preview Panel** - Visual palette display
5. **Typography Preview** - Live text preview
6. **Spacing & Border Radius Tokens** - Visual grids
7. **CSS Variables Export** - Download theme as CSS
8. **Theme Metadata UI** - Author, version, license, preview image

**Est:** 2-3 days

**Status:** Ready to implement after Phase 7 fonts (or in parallel)

---

### M3: Font System (NEXT - 5-7 days)

**Phase 7: Font System Architecture**

> **Detailed plan:** See [PHASE7_FONT_SYSTEM.md](./PHASE7_FONT_SYSTEM.md)

**Goal:** Multi-font support (sans, serif, mono) with Google Fonts + FontBunny integration.

**Key Features:**
- Font family selection in Settings tab (central only)
- Google Fonts + FontBunny integration (API)
- Font preview with live rendering
- CSS variables + @import generation
- Component-level font usage
- Tenants inherit fonts from central (no custom uploads)

**Timeline:**
- 7a: Font Data & Backend API - 2-3 hrs
- 7b: UI & Preview Components - 2-3 hrs
- 7c: CSS Generation & Loading - 1.5-2 hrs
- 7d: Component Integration & Testing - 2 hrs
- **Total:** ~9 hours

**Parallel Enhancements:** Settings tab improvements (color picker, typography preview, spacing grid, CSS export, metadata)

**Est:** 5-7 days (full week)

**Status:** Architecture designed, ready for implementation

---

### M4: Booking Integration (FUTURE - After Theme System Complete)

**Goal:** Integrate existing booking system into ByteForge multi-tenant CMS

**Scope:**
- Port appointment/scheduling models to multi-tenant
- Adapt payment processing (Stripe + Swish)
- Create booking management dashboard
- Build `<BookingWidget>` Puck component

**Est:** 6-8 weeks (booking logic exists, integration focus)

**Status:** Scoped, waiting for theme system completion

---

### M5: Analytics & Insights (FUTURE)
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
