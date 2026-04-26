# ByteForge Roadmap

Status: canonical
Audience: human + AI agent
Last verified: 2026-04-26

This roadmap is intentionally future-facing. Completed work should live in
[CURRENT_STATUS.md](CURRENT_STATUS.md) and archived phase documents, not here.

## Planning Assumptions

- `main` already contains Phases 9 through 14.
- Booking and payment-booking integration are implemented.
- The active `feature/phase15-guest-auth` branch contains implemented Phase 15 work and early Phase 19 guest-portal/system-surface slices pending merge.
- Customer accounts, password recovery, and cross-tenant SSO remain future work.

## Next Up

### 1. Continue Shared Input Normalization Rollout

Goal:

- expand the reusable normalization layer for ordinary text/contact fields
  across suitable booking, payment, and auth flows

Key constraints:

- do not implement this as a blanket request-munging middleware
- normalize by field family, not by endpoint name alone
- never mutate passwords, tokens, signatures, webhook payloads, CSS, or
  structured builder JSON with the same rules used for customer text

Current implemented slice:

- booking customer-field normalization now delegates to the shared layer
- payment customer display fields and refund reason now use the shared layer
- auth name/email normalization now uses the shared layer without touching
  passwords or tokens

Next likely targets:

- other suitable payment human-text fields with clear test surfaces
- additional ordinary auth profile inputs as they are introduced
- later guest-auth human-input fields once that track begins

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
- transitional bearer-refresh fallback has been removed
- the remaining auth work is closeout and hardening: operational cookie/session
  settings, broader manual QA, and guest-auth prep

### 3. Guest Authentication System

Primary doc:

- [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)

Outcome:

- passwordless guest access to `/my-bookings`
- retroactive linking of anonymous bookings by email identity
- guest session model aligned with the HttpOnly auth migration

Current branch state:

- implemented on `feature/phase15-guest-auth` and pending merge into `main`
- canonical customer-facing route is `/guest-portal`, with `/my-bookings` kept as a compatibility alias
- no passwords, registration, forgot-password, reset-password, or cross-tenant customer accounts in this phase

### 4. Booking Product Follow-Ups

Primary docs:

- [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md)
- [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)

Likely focus areas:

- booking flow UX improvements
- notification consistency improvements
- ongoing security hardening and focused regression coverage

### 5. Platform and CMS Enhancements

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

### 6. Estimates and Quotes Add-on

Primary doc:

- [plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md](plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md)

Outcome:

- optional tenant add-on for request-first service estimation workflows
- guest quote requests, tenant-authored quotes, and later quote-to-booking or quote-to-payment conversions

### 7. Service Aggregator Platform

Primary doc:

- [plans/PHASE18_SERVICE_AGGREGATOR_PLATFORM.md](plans/PHASE18_SERVICE_AGGREGATOR_PLATFORM.md)

Outcome:

- separate cross-tenant discovery product for public service-provider listings
- consumes curated SaaS data through explicit public APIs or a read model rather than acting as a tenant add-on

### 8. System Pages / System Surfaces

Primary doc:

- [plans/PHASE19_SYSTEM_SURFACES.md](plans/PHASE19_SYSTEM_SURFACES.md)

Outcome:

- dedicated tenant CMS area for route-bound system pages such as login, forgot password, reset password, and guest portal
- fixed application logic with Puck-backed presentation editing and generated storefront-safe CSS
- widget-capable authenticated guest portal shell for bookings and future add-ons

Current branch state:

- system-surface foundations, tenant login runtime, and guest-portal runtime are implemented on the active Phase 15 branch
- `register`, `forgot_password`, and `reset_password` remain deferred implementation work
- customer-account pages are not part of the delivered Phase 15 guest-auth slice

## Out Of Scope For This Roadmap

- re-listing already completed phases as active work
- historical implementation detail better kept in archived phase docs
- broad speculative architecture not connected to a likely branch of work
