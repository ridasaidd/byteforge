# ByteForge Current Status

Status: canonical
Audience: human + AI agent
Last verified: 2026-04-19
Primary branch: `main`

## Snapshot

- ByteForge is a multi-tenant CMS and storefront platform with central and
  tenant dashboards, a Puck-based page builder, themes, media, analytics,
  payments, and booking.
- Phases 9 through 14 are implemented on `main`.
- Phase 15 guest authentication is not implemented yet.
- The HttpOnly auth migration is planned, but browser auth still uses a
  bearer-token storage model described in
  [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md).
- The first auth hardening slice is now in place: browser bearer tokens are
  session-scoped in `sessionStorage` plus memory instead of persistent
  `localStorage`.
- Shared input normalization now exists via
  `app/Actions/Api/NormalizeInputFieldsAction.php` and is currently reused by
  booking customer fields, payment human-text fields, and auth name/email
  fields.
- Booking dashboard localization and booking guest-input hardening were merged
  on 2026-04-19.

## Implemented Milestones

- Phase 9 Analytics Foundation: complete on `main`
- Phase 10 Payments Core: complete on `main`
- Phase 11 Dashboard Translation: complete on `main`
- Phase 12 Tenant Runtime Readiness: complete on `main`
- Phase 13 Booking System: implemented on `main`
- Phase 14 Payment x Booking Integration: implemented on `main`

## Current Recommended Work Order

1. Keep the documentation baseline accurate and authoritative.
2. Continue the shared, field-family input normalization rollout without
  expanding it into blanket middleware.
3. Keep extending normalization only to suitable human-input fields while
  leaving passwords, tokens, signatures, and provider payloads untouched.
4. Continue with the HttpOnly auth migration groundwork.
5. Build guest authentication after the auth/session foundation is ready.

## Current Reality Checks

These are the main state corrections that matter for future work.

- Booking is not planned work anymore; it already exists in production code.
- Payment x booking integration is not future design only; it already exists in
  production code, including booking payment creation, webhook confirmation,
  and refund-aware cancellation flows.
- Guest authentication does not yet exist in routes, middleware, or backend
  domain code.
- The docs previously drifted on these points, so agents should trust this file
  over older phase headers unless a newer canonical document says otherwise.

## Active Known Gaps

### Booking follow-ups

These remain the main booking product gaps still worth tracking:

- booking wizard order should become `service -> date -> resource -> slot`
- resource step should support an "Any available" option
- resource step heading should reflect the configured `resource_label`
- tenant owner should receive a new-booking email where appropriate
- staff assignment notifications should cover auto-confirm paths consistently
- anonymous timeline entries should not render a dangling customer `#`

### Security and auth follow-ups

- browser auth still uses JavaScript-accessible bearer tokens; the current
  reduction is session-scoped storage, not the full HttpOnly refresh-cookie
  migration
- shared normalization rollout is still partial; it should stay explicit and
  field-family scoped
- guest authentication is still future work

## Verification Baseline

For safe focused checks, start with [TESTING.md](TESTING.md).

Recent booking-focused verification that is known green:

```bash
npm run test:run -- resources/js/apps/tenant/config/__tests__/menu.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingSettingsPage.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingsCalendarPage.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingDetailPage.test.tsx
```

```bash
php artisan test tests/Feature/Api/Booking/PublicBookingApiTest.php tests/Feature/Api/Booking/BookingHoldTest.php tests/Feature/Api/Booking/BookingCmsApiTest.php
```

## Read Next

- For exact next-work sequencing: [ROADMAP.md](ROADMAP.md)
- For agent operating context: [AGENT_START.md](AGENT_START.md)
- For testing and verification: [TESTING.md](TESTING.md)
- For auth/session work: [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)
- For booking and payment integration details: [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md) and [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md)
