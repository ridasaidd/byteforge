# Roadmap (concise)

Last updated: January 19, 2026

—

## Delivered ✅

- ✅ Backend phases 1–4 complete (auth, tenancy, RBAC, pages, navigation, media, settings, logs)
- ✅ Page Builder with Puck; themed components and advanced controls (merged Jan 19)
- ✅ Theme system (sync/activate/reset/duplicate/export) + ThemeProvider
- ✅ Public page rendering with active theme + metadata injection
- ✅ Central admin UI for core domains (pages, themes, media, users, tenants, activity, settings)
- ✅ Full test suite (577 frontend + 123 backend, all passing)
- ✅ Dashboard home page with real stats, recent tenants, activity, and permission-based visibility (Jan 21)

—

## In flight / Priority Order

### M1: Central Admin Completion (in progress - next)
- ✅ Dashboard home page with stats & quick actions (Jan 21)
- Theme customization UI (live token editing, preview, reset)
- Settings management UI (email, SMTP, general config)
- **Est:** 5-7 hours remaining

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

- M1 (now): Theme customization UI + editor polish
- M2: Navigation enhancements + public menu helpers
- M3: Cache/SSG + CI pipelines
- M4: Tests coverage uplift (frontend + backend) and docs pass
