# ByteForge Roadmap

Status: canonical
Audience: human + AI agent
Last verified: 2026-05-26

This roadmap is intentionally future-facing. Completed work should live in
[CURRENT_STATUS.md](CURRENT_STATUS.md) and archived phase documents, not here.

## Planning Assumptions

- `main` already contains Phases 9 through 15.
- Booking and payment-booking integration are implemented.
- `main` now also contains the implemented Phase 15 guest-auth stack and early Phase 19 guest-portal/system-surface slices.
- Customer accounts, password recovery, and cross-tenant SSO remain future work.

## Next Up

### 0. Shared Input Normalization Maintenance

Goal:

- keep the reusable normalization layer opportunistic and bounded for newly
  introduced ordinary text/contact fields without expanding it into blanket
  middleware

Current state:

- the currently shipped repo-side normalization slices are effectively
  complete; the strongest ordinary human-text write boundaries are now covered
- future normalization work should be opportunistic when newly introduced
  ordinary text/contact fields appear with clear request-boundary ownership

Current implemented slice:

- booking customer-field normalization now delegates to the shared layer
- booking CMS resource/service text fields and cancellation notes now use the shared layer at the request boundary
- tenant user-management create name/email fields now use the shared layer at the request boundary
- tenant custom-role names now use the shared layer at the request boundary
- public analytics page titles now use the shared layer at the request boundary
- tenant settings site title/description fields now use the shared layer at the request boundary
- shared media-folder name/description fields now use the shared layer at the request boundary
- shared media upload metadata text fields now use the shared layer at the request boundary
- central theme metadata fields now use the shared layer at the request boundary
- central page-template name/description fields now use the shared layer at the request boundary
- central and tenant theme-part name fields now use the shared layer at the request boundary
- central and tenant page title fields now use the shared layer at the request boundary
- central and tenant navigation name fields now use the shared layer at the request boundary
- central and tenant layout name fields now use the shared layer at the request boundary
- payment customer display fields and refund reason now use the shared layer
- auth name/email normalization now uses the shared layer without touching
  passwords or tokens
- central admin user/tenant/settings/support-access text fields and tenant CMS quote request/draft text fields now use the shared layer or field-family sanitizers

Practical note:

- the strongest currently shipped CMS-adjacent metadata surfaces are now covered; remaining nearby matches are mostly structured payloads, identifier-like names, or dead/unwired requests and should not be forced into this phase

### 1. Auth/Session Operational Hygiene

Goal:

- keep the now-implemented HttpOnly auth model aligned across staging and
  production-owned env templates, secret stores, and deploy/runtime checks

Key constraints:

- treat this as deployment hygiene, not a reason to reopen browser-auth
  architecture or reintroduce bearer persistence in JavaScript
- preserve the current secure, host-only cookie posture captured in the env
  matrix and staging deploy checks

Current state:

- the repo-side HttpOnly migration is complete on `main`; remaining follow-through is deployment-owned env and secret-store hygiene plus keeping existing CI/deploy checks aligned with the documented cookie/session contract

## Planned Work Tracks

### 2. Auth HttpOnly Migration

Primary doc:

- [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)

Outcome:

- replace persistent browser token storage with short-lived in-memory access
  tokens and host-scoped HttpOnly refresh sessions

Current state before that migration:

- dashboard bearer tokens now live in memory only on the frontend
- token-bearing auth responses now send `Cache-Control: no-store`
- server-side refresh sessions and host-scoped HttpOnly refresh cookie issuance
  now exist in the backend
- frontend bootstrap and silent refresh now use the HttpOnly cookie
- central and tenant refresh flows are both verified against the cookie-backed
  path
- focused regressions now cover host-scoped staff and guest refresh-cookie use
  across central and tenant hosts
- focused guest-auth regressions now cover expired refresh-session bootstrap
  handling as well
- focused auth regressions now also cover stale refresh-cookie reuse after a
  successful rotation in central, tenant, and guest flows
- focused staff-auth regressions now also cover refresh-session rotation
  invalidating the prior bearer token across central and tenant hosts
- tenant membership removal now revokes both tenant refresh sessions and the
  corresponding session-tied bearer tokens for that removed user
- tenant support-access revoke and expiry paths now revoke the associated
  refresh sessions and any session-tied tenant bearer tokens for that support
  user
- focused auth regressions now also cover logout invalidation of the current
  bearer token and refresh cookie in central, tenant, and guest flows
- the shared frontend auth client now has focused unit coverage for silent
  refresh retry, concurrent refresh deduplication, and failed-refresh token
  cleanup
- Playwright auth coverage now also checks reload-based session restore for
  central and tenant dashboard flows when the configured environment serves the
  login page correctly
- staff password changes now revoke outstanding refresh sessions and clear the
  current refresh cookie
- transitional bearer-refresh fallback has been removed
- the remaining auth work is closeout and hardening: operational cookie/session
  ownership in real env templates plus broader manual QA around session expiry
  and remaining multi-tab/logout edge cases

### 3. Guest Authentication System

Primary doc:

- [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)

Outcome:

- passwordless guest access to `/my-bookings`
- retroactive linking of anonymous bookings by email identity
- guest session model aligned with the HttpOnly auth migration

Current state on `main`:

- implemented on `main`
- canonical customer-facing route is `/guest-portal`, with `/my-bookings` kept as a compatibility alias
- no passwords, registration, forgot-password, reset-password, or cross-tenant customer accounts in this phase

### 4. Booking Product Follow-Ups

Primary docs:

- [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md)
- [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)
- [plans/BOOKING_GUEST_RESCHEDULING_PLAN.md](plans/BOOKING_GUEST_RESCHEDULING_PLAN.md)

Current state on `main`:

- guest self-service reschedule flow is implemented
- tenant manual booking creation is availability-guided for slot and range modes
- tenant-configured reminder windows, post-delivery notification recording,
  and staging reminder/queue-worker verification are implemented and validated

Likely focus areas:

- booking flow UX improvements that reuse existing availability and notification paths
- ongoing security hardening and focused regression coverage

### 5. Environment Hardening and Production-Like Staging

Primary doc:

- [DEV_STAGING_READINESS.md](DEV_STAGING_READINESS.md)

Supporting docs:

- [ENVIRONMENT_MATRIX.md](ENVIRONMENT_MATRIX.md)
- [STAGING_DEPLOYMENT_PLAN.md](STAGING_DEPLOYMENT_PLAN.md)

Outcome:

- shared development and staging environments with explicit domains,
  production-like security posture, and repeatable deployment/testing flow

Likely focus areas:

- remove hardcoded environment-domain assumptions from runtime and tooling
- align env examples with the actual MySQL-backed shared development setup
- introduce MailHog or equivalent QA-visible mail handling for development
- make queue worker and scheduler expectations explicit per environment
- stand up a Tailscale-restricted, HTTPS-enabled staging environment on VPS-like
  infrastructure
- add controlled deployment from tested `main` commits into staging with a
  post-deploy smoke pass

### 6. Platform and CMS Enhancements

Examples:

- tenant dashboard access refinements
- post-launch follow-up for enhanced support remediation after real demand is known
- estimates and quotations add-on for request-first service businesses
- usage tracking and quotas
- content/version history
- navigation drag-and-drop tree UI
- selected static HTML generation capabilities for system pages

Guidance:

- prefer inspection and bounded support workflows over broad central cross-tenant CRUD
- temporary read-only tenant support access is a good pre-launch stopping point; defer broader support remediation until usage pressure exists
- do not expand central into a second full tenant CMS unless repeated operational needs justify it

### 7. Estimates and Quotes Add-on

Primary doc:

- [plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md](plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md)

Outcome:

- optional tenant add-on for request-first service estimation workflows
- guest quote requests, tenant-authored quotes, and later quote-to-booking or quote-to-payment conversions

### 8. Service Aggregator Platform

Primary doc:

- [plans/PHASE18_SERVICE_AGGREGATOR_PLATFORM.md](plans/PHASE18_SERVICE_AGGREGATOR_PLATFORM.md)

Outcome:

- separate cross-tenant discovery product for public service-provider listings
- consumes curated SaaS data through explicit public APIs or a read model rather than acting as a tenant add-on

### 9. System Pages / System Surfaces

Primary doc:

- [plans/PHASE19_SYSTEM_SURFACES.md](plans/PHASE19_SYSTEM_SURFACES.md)

Outcome:

- dedicated tenant CMS area for route-bound system pages such as login, forgot password, reset password, and guest portal
- fixed application logic with Puck-backed presentation editing and generated storefront-safe CSS
- widget-capable authenticated guest portal shell for bookings and future add-ons

Current state on `main`:

- system-surface foundations, tenant login runtime, and guest-portal runtime are implemented on `main`
- tenant login now also has focused browser coverage proving that system-surface customization and reset preserve the route-owned auth flow
- `register`, `forgot_password`, and `reset_password` remain deferred implementation work
- customer-account pages are not part of the delivered Phase 15 guest-auth slice

### 10. Customer Accounts and Cross-Tenant SSO

Primary doc:

- [plans/PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md](plans/PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md)

Outcome:

- durable customer accounts distinct from `guest_users`
- real register, forgot-password, reset-password, and account-management flows
- cross-tenant customer identity with first-party SSO and explicit tenant linkage

## Out Of Scope For This Roadmap

- re-listing already completed phases as active work
- historical implementation detail better kept in archived phase docs
- broad speculative architecture not connected to a likely branch of work
