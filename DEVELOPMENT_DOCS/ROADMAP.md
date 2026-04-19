# ByteForge Roadmap

Status: canonical
Audience: human + AI agent
Last verified: 2026-04-19

This roadmap is intentionally future-facing. Completed work should live in
[CURRENT_STATUS.md](CURRENT_STATUS.md) and archived phase documents, not here.

## Planning Assumptions

- `main` already contains Phases 9 through 14.
- Booking and payment-booking integration are implemented.
- Guest authentication is still future work.
- Auth storage migration is still future work.

## Next Up

### 1. Shared Input Normalization Layer

Goal:

- introduce one reusable normalization layer for ordinary text/contact fields
  across booking, payment, and future auth flows

Key constraints:

- do not implement this as a blanket request-munging middleware
- normalize by field family, not by endpoint name alone
- never mutate passwords, tokens, signatures, webhook payloads, CSS, or
  structured builder JSON with the same rules used for customer text

Initial targets:

- payment customer display fields
- refund reasons and other human-entered short text
- future auth-related name/email fields

## Planned Work Tracks

### 2. Auth HttpOnly Migration

Primary doc:

- [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)

Outcome:

- replace persistent browser token storage with short-lived in-memory access
  tokens and host-scoped HttpOnly refresh sessions

### 3. Guest Authentication System

Primary doc:

- [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)

Outcome:

- passwordless guest access to `/my-bookings`
- retroactive linking of anonymous bookings by email identity
- guest session model aligned with the HttpOnly auth migration

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
- usage tracking and quotas
- content/version history
- navigation drag-and-drop tree UI
- selected static HTML generation capabilities for system pages

## Out Of Scope For This Roadmap

- re-listing already completed phases as active work
- historical implementation detail better kept in archived phase docs
- broad speculative architecture not connected to a likely branch of work
