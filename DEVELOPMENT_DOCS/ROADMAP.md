# Roadmap (concise)

Last updated: November 3, 2025

—

## Delivered (kept short)

- Backend phases 1–4 complete (auth, tenancy, RBAC, pages, navigation, media, settings, logs)
- Page Builder with Puck; themed components and advanced controls
- Theme system (sync/activate/reset/duplicate/export) + ThemeProvider
- Public page rendering with active theme
- Central admin UI for core domains (pages, themes, media, users, tenants, activity, settings)

—

## In flight / near-term

1) Theme customization UI
- Live edit tokens (colors, typography, spacing, components)
- Preview + versioning; reset to defaults

2) Editor UX polish
- Better focus states, keyboard nav, accessible fields
- Additional component presets and templates

3) Navigation enhancements
- Drag & drop tree, rich link types, preview
- Public menu rendering helpers

4) Performance & delivery
- Cache public render output; optional static export/SSG for published pages
- Image delivery tuning (responsive sizes, modern formats)

5) Testing & CI
- Expand feature tests (themes/pages/media folders/editor flows)
- Simple PHP + Node pipelines; smoke tests on PR

—

## Stretch after that

- Content/version history for pages
- Role-scoped UI (feature flags/permissions by role)
- Bulk media operations and tags
- SEO controls (sitemaps, meta presets)

—

## Milestones snapshot

- M1 (now): Theme customization UI + editor polish
- M2: Navigation enhancements + public menu helpers
- M3: Cache/SSG + CI pipelines
- M4: Tests coverage uplift (frontend + backend) and docs pass
