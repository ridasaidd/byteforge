# ByteForge Documentation Index

This folder holds a slim, up‑to‑date set of docs for contributors and reviewers. It replaces earlier phase-by-phase notes with a concise overview of what matters now.

—

## Quick navigation

- Current status: see CURRENT_STATUS.md
- Architecture (frontend/backend/high-level): see FRONTEND_ARCHITECTURE_PLAN.md
- API overview: see API_DOCUMENTATION.md
- Roadmap and next targets: see ROADMAP.md
- Principles and ways of working: see DEVELOPMENT_PRINCIPLES.md and AI_COLLABORATION_GUIDE.md
- Test accounts: see TESTING_CREDENTIALS.md

—

## What’s implemented (high level)

- Multi-tenant backend with Passport auth, RBAC, activity logging
- Full media library with folders, conversions, and React UI
- Puck-based Page Builder with themed components and advanced controls
- Theme system with disk sync, active theme, and theme editor endpoints
- Public page rendering using Puck data and active theme
- Central admin app with pages, themes, users, tenants, activity, settings

Key code entry points (examples):
- Page Builder config and components: resources/js/apps/central/components/pages/puck-components/
- Theme provider/hook: resources/js/shared/contexts/ThemeContext.tsx and shared/hooks/useTheme.ts
- API services and types: resources/js/shared/services/api/
- Public render: resources/js/apps/central/components/pages/PublicPage.tsx

—

## How to use these docs

1) Scan CURRENT_STATUS.md for an at-a-glance view (what’s done, what’s next).  
2) Use FRONTEND_ARCHITECTURE_PLAN.md for app structure and composition.  
3) Use API_DOCUMENTATION.md for endpoint shapes; cross-check types in resources/js/shared/services/api/types.ts.  
4) See ROADMAP.md to understand short-term focus and upcoming work.  

—

## Pruning and consolidation

We’ve drafted a removal/archive proposal in DOCS_PRUNE_PROPOSAL.md covering older “COMPLETE” and “IMPLEMENTATION_PLAN” files that are superseded by the code and this index. After review, we’ll archive or remove the listed files.

—

Last updated: November 3, 2025  
Current branch: feature/page-builder
