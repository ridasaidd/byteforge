# Documentation Prune Proposal

Date: 2025-11-03
Branch: feature/page-builder

This proposal consolidates overlapping phase/"complete"/"plan" documents into a smaller, friendlier set. After review, we can archive (move to `DEVELOPMENT_DOCS/ARCHIVE/`) or remove the listed files.

## Keep (actively referenced)

- README.md (index) – updated
- CURRENT_STATUS.md – updated snapshot
- ROADMAP.md – concise roadmap – updated
- API_DOCUMENTATION.md – API reference
- FRONTEND_ARCHITECTURE_PLAN.md – high-level structure (keep; update when needed)
- THEME_SYSTEM_ARCHITECTURE.md – architecture reference (keep)
- AUTH_STRATEGY.md – auth/tenancy details (keep)
- DEVELOPMENT_PRINCIPLES.md – coding principles (keep)
- AI_COLLABORATION_GUIDE.md – optional but useful (keep)
- TESTING_STRATEGY.md – keep
- TESTING_CREDENTIALS.md – keep
- TESTING_CHECKLIST.md – keep

## Archive (superseded by code + current docs)

These can be moved to `ARCHIVE/` for historical reference:

- ADVANCED_CONTROLS_COMPLETE.md (covered by implemented Puck components and ThemeProvider)
- PROFESSIONAL_CONTROLS_IMPLEMENTATION.md (historical; superseded)
- PUCK_COMPONENTS_THEME_REQUIREMENTS.md (rolled into implemented components + Theme system)
- PUCK_PAGE_BUILDER_IMPLEMENTATION_PLAN.md (implementation complete; superseded)
- MEDIA_LIBRARY_COMPLETE.md (feature implemented; reflected in code/UI)
- FRONTEND_RBAC_COMPLETE.md (now part of app; roles/permissions UI in Central)
- CENTRAL_ROLES_PERMISSIONS_COMPLETE.md (same as above)
- BACKEND_API_COMPLETE.md (duplicate of API_DOCUMENTATION.md; archive this one)
- THEME_BACKEND_COMPLETE.md (covered by THEME_SYSTEM_ARCHITECTURE.md + code)
- PHASE2_MERGE_COMPLETE.md (historical)
- VITEST_INTEGRATION_TESTS_COMPLETE.md (tests live with code; keep TESTING_* docs instead)
- INTEGRATION_TESTING_COMPLETE.md (historical; keep TESTING_STRATEGY.md instead)
- REUSABLE_COMPONENTS_COMPLETE.md (historical; superseded by shared components folder)
- SHARED_COMPONENTS_PHASE1_COMPLETE.md (historical; superseded)
- DOCUMENTATION_CLEANUP_SUMMARY.md (meta; replace with this proposal)
- NEXT_STEPS.md (merge into ROADMAP.md; archive)

## PHASES folder

- PHASES_1-4_BACKEND_COMPLETED.md – move to ARCHIVE/ (kept as history)
- PHASE_5_FRONTEND_IMPLEMENTATION.md – move to ARCHIVE/ (work now implemented)
- PHASE_5_PROGRESS.md – move to ARCHIVE/ (historical log)

## After approval

1. Move the files above into `DEVELOPMENT_DOCS/ARCHIVE/` (or delete if you prefer a clean tree).
2. Ensure README.md, CURRENT_STATUS.md, ROADMAP.md are the primary entry points.
3. Update any internal links if needed.

## Rationale

- Reduce cognitive load: fewer docs, clearer entry points.
- Avoid drift: remove "complete"/"plan" docs once features land in code.
- Keep a short, durable set: Status, Roadmap, Architecture, API, Testing, Principles.

## Notes

- We can always regenerate deeper design docs later from code if needed.
- If any archived doc still has unique, non-overlapping content, we can merge the relevant snippets into the remaining core docs before archiving.
