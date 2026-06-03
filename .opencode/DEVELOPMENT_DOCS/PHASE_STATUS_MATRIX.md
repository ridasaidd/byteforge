# Phase Status Matrix

Status: canonical
Audience: human + AI agent
Last verified: 2026-05-29

This file provides a fast, code-aware view of what is implemented versus what is still pending, phase by phase.

## Summary

- Completed on `main`: Phases 9 through 15.
- Implemented slices on `main`: Phase 19 tenant login + guest portal system-surface runtime.
- Implemented on current working tree (merge status should be confirmed per branch history): major Phase 16 and Phase 17 slices.
- Remaining forward phases: Phase 18 (not started), Phase 19 follow-on, and Phase 20.

## Phase-by-Phase Status

| Phase | Status | What exists now | What is left |
| --- | --- | --- | --- |
| 9 | Complete on `main` | Analytics foundation and events pipeline documented as implemented in current truth. | None phase-critical. |
| 10 | Complete on `main` | Payments core integrated in shipped platform. | None phase-critical. |
| 11 | Complete on `main` | Dashboard translation/localization shipped. | Ongoing i18n maintenance only. |
| 12 | Complete on `main` | Tenant runtime readiness and isolation hardening in place. | Ongoing hardening only. |
| 13 | Implemented on `main` | Booking APIs, CMS workflows, public booking endpoints, and broad tests. | Product-level UX improvements only. |
| 14 | Implemented on `main` | Booking-payment integration and related tests are present. | None phase-critical. |
| 15 | Implemented on `main` | Guest auth stack + cookie-backed session restore behavior shipped. | Keep account/password/SSO out of this phase. |
| 16 | Implemented on current working tree | Central tenant ops slices are documented as implemented in current status. | Enhanced support remediation intentionally deferred. |
| 17 | Implemented on current working tree | Quotes add-on, guest continuity, and quote tests exist in code. | Optional staging-specific mail verification and merge closeout checks. |
| 18 | Planned | Strategy docs exist. | Execution not started. |
| 19 | Partially implemented on `main` | Tenant login + guest portal system-surface slices shipped. | Guest-facing follow-on: restore public chrome where appropriate and add widget-zone/add-on-gated modules. |
| 20 | Planned | Architecture doc exists. | Full implementation not started. |

## Code Evidence Anchors

- Tenant/public routes for guest portal, quotes, guest auth, and system surfaces: [../routes/tenant.php](../routes/tenant.php)
- System-surface API/controller layer: [../app/Http/Controllers/Api/SystemSurfaceController.php](../app/Http/Controllers/Api/SystemSurfaceController.php)
- Tenant login and guest portal runtime usage of system surfaces:
  - [../resources/js/apps/tenant/components/pages/LoginPage.tsx](../resources/js/apps/tenant/components/pages/LoginPage.tsx)
  - [../resources/js/apps/public/components/GuestPortalPage.tsx](../resources/js/apps/public/components/GuestPortalPage.tsx)
- Quotes APIs (tenant and public clients):
  - [../resources/js/shared/services/api/quotes.ts](../resources/js/shared/services/api/quotes.ts)
  - [../resources/js/shared/services/api/publicQuotes.ts](../resources/js/shared/services/api/publicQuotes.ts)
- Auth refresh/session behavior (frontend + backend service):
  - [../resources/js/shared/services/http.ts](../resources/js/shared/services/http.ts)
  - [../app/Services/Auth/WebRefreshSessionService.php](../app/Services/Auth/WebRefreshSessionService.php)
- Representative test anchors:
  - [../tests/e2e/tenant-auth-flow.spec.ts](../tests/e2e/tenant-auth-flow.spec.ts)
  - [../tests/e2e/guest-portal-shell.spec.ts](../tests/e2e/guest-portal-shell.spec.ts)
  - [../tests/Tenant/Feature/Api/TenantSystemSurfaceApiTest.php](../tests/Tenant/Feature/Api/TenantSystemSurfaceApiTest.php)
  - [../tests/Feature/Api/Quotes/QuoteCmsApiTest.php](../tests/Feature/Api/Quotes/QuoteCmsApiTest.php)

## Usage Rules

- Use [AGENT_START.md](AGENT_START.md), [CURRENT_STATUS.md](CURRENT_STATUS.md), and [ROADMAP.md](ROADMAP.md) as canonical precedence.
- Treat this matrix as a concise operating index that should be updated whenever phase reality changes.
- If this file conflicts with canonical docs, canonical docs win and this file must be updated.
