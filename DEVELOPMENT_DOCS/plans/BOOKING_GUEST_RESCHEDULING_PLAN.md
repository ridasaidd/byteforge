# Booking Guest Rescheduling Plan

Status: implemented on `main`
Audience: human + AI agent
Last updated: 2026-05-25

---

## Purpose

This document defines the next concrete booking feature slice after the current
staging/auth closeout work: guest-facing self-service rescheduling through the
authenticated guest portal.

It is intentionally grounded in the current codebase, not in the older Phase
13 planning language.

---

## Current Reality

The guest booking flow in the merged baseline now includes list, detail,
cancel, and guest-owned rescheduling.

Implemented state on `main`:

- backend guest-owned reschedule support is now implemented under the existing
  guest-auth boundary
- the shared availability path now correctly distinguishes slot-mode versus
  range-mode reschedules and can ignore the current booking during conflict
  checks
- tenant-side rescheduling now uses that shared mode-aware availability path,
  closing a slot-mode correctness gap
- guest portal service/UI support and focused Vitest coverage are now in place
- Playwright happy-path and rejection-path coverage now exist and have been
  validated against the configured tenant browser-test environment

Current implementation anchors:

- `app/Http/Controllers/Api/Booking/GuestBookingController.php`
  now supports `index`, `show`, `cancel`, and `reschedule` for authenticated
  guest-owned bookings.
- `resources/js/apps/public/services/guestPortal.ts`
  now exposes the guest booking reschedule API alongside list/detail/cancel.
- `resources/js/apps/public/components/GuestPortalExperience.tsx`
  now renders guest reschedule controls on the booking detail surface.
- `tests/Tenant/Feature/Api/TenantGuestBookingsTest.php`
  now covers guest reschedule success and unavailable-slot rejection.
- `app/Http/Controllers/Api/Booking/BookingManagementController.php`
  already supports native tenant-side rescheduling via
  `PATCH /api/booking/bookings/{id}/reschedule`, and now shares the same
  mode-aware availability guard used by guest rescheduling.

That means the current remaining work is not booking infrastructure from
scratch. It is merge/push/CI confirmation plus any broader follow-up coverage
or rollout tasks.

---

## Key Planning Decision

Guest self-service rescheduling should use a native in-place booking update,
not the older `cancel + rebook` concept from historical Phase 13 notes.

Why this is the safer current direction:

- tenant-side rescheduling already updates the existing booking in place
- bookings may already carry payment linkage, refunds, and reminder logic
- guest cancellation currently triggers refund handling for paid bookings, so a
  forced cancel+rebook flow would be the wrong default for paid appointments
- preserving booking ID keeps analytics, audit trail, activity history, and
  guest portal continuity simpler

The old Phase 13 reschedule section remains useful as historical context, but
it should not be treated as the current implementation target.

---

## Recommended v1 Scope

Implement authenticated guest self-service rescheduling inside `/guest-portal`
for guest-owned bookings in statuses that are already cancellable today.

v1 outcomes:

- guests can open a linked booking in the guest portal and choose a new valid
  time
- backend re-checks availability against the existing booking service/resource
  rules before saving the change
- booking is updated in place rather than replaced
- customer-facing and tenant-facing notifications are sent for guest-initiated
  reschedules
- focused backend, frontend, and browser coverage proves the flow

v1 should stay deliberately narrow:

- no customer-account architecture
- no cross-tenant guest scheduling logic
- no generalized booking editing beyond the time/resource selection needed for
  reschedule
- no reopening of the old management-token-only customer flow as the primary UX

---

## Proposed Product Behavior

### Entry Point

- reschedule starts from the authenticated guest portal booking detail view
- only linked guest-owned bookings within the current tenant are eligible

### Eligibility

- start with the same status family already allowed for guest cancellation:
  `pending` and `confirmed`
- reject cancelled, completed, no-show, and other terminal states with `422`

### Availability

- reuse the existing booking availability engine rather than duplicating date
  logic in guest code
- reuse the public booking availability reads where practical so guest portal
  and storefront booking do not drift into different slot answers

### Mutation Shape

- guest reschedule should update `starts_at` and `ends_at` on the existing row
- preserve booking ID, guest linkage, payment linkage, and booking history
- record a booking event noting that the reschedule came from the customer/
  guest portal path

### Notifications

- notify the guest with the new booking details
- notify the tenant owner or booking-notification recipient that a customer has
  rescheduled

### Reminder Handling

- reminder scheduling/reset behavior must be explicitly verified as part of the
  implementation, because the historical booking docs treat reminder reset on
  reschedule as an invariant worth preserving

---

## Suggested Technical Shape

### Backend

Add a guest-owned reschedule endpoint under the existing guest-auth boundary,
for example:

```text
PATCH /api/guest-auth/bookings/{id}/reschedule
```

Likely backend responsibilities:

- resolve the booking through the existing guest ownership path
- validate allowed status and requested range
- load the current service/resource context
- check availability through the shared availability service
- update the booking in place
- write booking event/activity metadata for a customer-initiated reschedule
- trigger guest and tenant notifications

Implementation note:

- if tenant and guest reschedule paths begin to share too much logic, extract a
  dedicated booking reschedule action/service instead of duplicating controller
  code

### Frontend

Extend the guest portal service and experience with:

- a `rescheduleBooking(...)` client method
- booking detail actions for starting/cancelling/submitting a reschedule flow
- reuse of existing availability selection patterns where practical, rather
  than inventing a separate guest-only slot model

### Tests

Minimum expected coverage:

- backend guest booking test: successful reschedule of owned booking
- backend guest booking test: cannot reschedule another guest's booking
- backend guest booking test: conflict/unavailable slot returns `409`
- backend guest booking test: invalid status returns `422`
- backend guest booking test: payment-linked booking keeps its payment linkage
  and does not enter cancellation/refund path
- frontend guest portal test: reschedule action updates selected booking state
- Playwright guest portal coverage for the happy path and unavailable-slot
  rejection path when environment support exists

---

## Open Design Questions

These should be answered during implementation, not deferred indefinitely:

1. Should v1 let the guest change resource as well as time, or keep the same
   resource and only move the time window?
2. For range-mode services, should the first implementation support both slot
   and range parity immediately, or land slot-mode first behind explicit scope?
3. Which tenant-facing notification path should receive customer reschedule
   alerts: owner only, existing booking recipient, or configurable routing?
4. Should guest reschedule reuse the existing booking detail surface only, or
   also expose a lightweight standalone route under `/guest-portal/{id}`?

---

## Out Of Scope

- registration, passwords, forgot-password, reset-password, or customer SSO
- rewriting booking identity around customer accounts
- allowing guests to edit arbitrary booking metadata beyond the reschedule flow
- broad dashboard booking UX redesign beyond what guest reschedule needs

---

## Recommended Execution Order

1. confirm product rules for slot-mode vs range-mode and resource switching
2. add backend guest reschedule endpoint plus focused feature coverage
3. add guest portal service/state/UI support
4. add browser coverage for the happy path
5. update booking and testing docs with repeatable verification commands
