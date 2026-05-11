# ByteForge Current Status

Status: canonical
Audience: human + AI agent
Last verified: 2026-05-11
Primary branch: `main`

## Snapshot

- ByteForge is a multi-tenant CMS and storefront platform with central and
  tenant dashboards, a Puck-based page builder, themes, media, analytics,
  payments, and booking.
- Phases 9 through 15 are implemented on `main`.
- Phase 19 system-surface foundations are partially implemented on `main`, specifically tenant login and guest-portal runtime slices.
- CI and deployment baseline were stabilized on `main` during 2026-05-11 updates:
  backend tests, frontend Vitest, Playwright auth smoke, and staging deployment
  workflow are now aligned and passing with the current environment model.
- The HttpOnly auth migration is underway in slices and now uses the hybrid
  browser model described in
  [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md):
  in-memory bearer access tokens plus a host-scoped HttpOnly refresh cookie.
- The frontend auth cutover is now in place: dashboard bearer tokens are kept
  in memory only, and session continuity is restored through the HttpOnly
  refresh cookie.
- Backend refresh-session groundwork now exists: `web_refresh_sessions`
  persistence, host-scoped HttpOnly refresh cookie issuance, and cookie-based
  refresh rotation are implemented server-side.
- Central and tenant dashboard refresh flows are both verified against the
  cookie-backed path, and the transitional bearer-based refresh fallback has
  been removed.
- Shared input normalization now exists via
  `app/Actions/Api/NormalizeInputFieldsAction.php` and is currently reused by
  booking customer fields, payment human-text fields, and auth name/email
  fields.
- Booking dashboard localization and booking guest-input hardening were merged
  on 2026-04-19.
- Phase 16 operator tooling is partially implemented on the current support
  branch: tenant inspection, limited central theme activation, and temporary
  read-only support access are in place; broader support remediation is
  intentionally deferred.

## Implemented Milestones

- Phase 9 Analytics Foundation: complete on `main`
- Phase 10 Payments Core: complete on `main`
- Phase 11 Dashboard Translation: complete on `main`
- Phase 12 Tenant Runtime Readiness: complete on `main`
- Phase 13 Booking System: implemented on `main`
- Phase 14 Payment x Booking Integration: implemented on `main`
- Phase 15 Guest Authentication: implemented on `main`
- Phase 19 System Surfaces: partially implemented on `main` (guest portal + tenant login slices)
- CI + Staging deployment baseline: implemented on `main` (backend + frontend + auth smoke + post-deploy API smoke)

## Current Recommended Work Order

1. Keep CI and staging deploy parity stable (backend suites + Vitest + Playwright central auth smoke + deploy smoke checks).
2. Tighten staging host operational permissions so deploy logs stay clean
   (no intermittent file ownership/permission warnings during build/runtime).
3. Continue the shared, field-family input normalization rollout without
   expanding it into blanket middleware.
4. Continue HttpOnly auth migration closeout and operational hardening.
5. Keep customer accounts, password recovery, and cross-tenant SSO in a later dedicated phase rather than extending Phase 15 ad hoc.
6. Do not expand support beyond the current bounded read-only workflow before launch.

## Current Reality Checks

These are the main state corrections that matter for future work.

- Booking is not planned work anymore; it already exists in production code.
- Payment x booking integration is not future design only; it already exists in
  production code, including booking payment creation, webhook confirmation,
  and refund-aware cancellation flows.
- Guest authentication exists on the active Phase 15 branch across routes,
  middleware, backend domain code, public UI, and focused tests now merged on
  `main`.
- The current guest-auth implementation is passwordless. It does not imply
  customer registration, forgot-password, reset-password, or cross-tenant SSO.
- System-surface keys for `register`, `forgot_password`, and `reset_password`
  are present as future route-owned surface types, but those runtime flows are
  not implemented on the current branch.
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

- browser auth still uses JavaScript-accessible bearer access tokens in memory,
  which is better than browser storage but still not equivalent to a fully
  cookie-authenticated API model
- shared normalization rollout is still partial; it should stay explicit and
  field-family scoped
- customer-account and SSO work is still future work

### Platform support follow-ups

- temporary support access now exists as a bounded read-only workflow on the
  active Phase 16 branch
- enhanced support remediation is intentionally deferred to
  [plans/PHASE16_ENHANCED_SUPPORT_REMEDIATION.md](plans/PHASE16_ENHANCED_SUPPORT_REMEDIATION.md)

## Verification Baseline

For safe focused checks, start with [TESTING.md](TESTING.md).

Recent booking-focused verification that is known green:

```bash
npm run test:run -- resources/js/apps/tenant/config/__tests__/menu.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingSettingsPage.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingsCalendarPage.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingDetailPage.test.tsx
```

```bash
php artisan test tests/Feature/Api/Booking/PublicBookingApiTest.php tests/Feature/Api/Booking/BookingHoldTest.php tests/Feature/Api/Booking/BookingCmsApiTest.php
```

Recent guest-auth/system-surface verification on `main`:

```bash
php artisan test tests/Tenant/Feature/Api/TenantGuestAuthTest.php tests/Tenant/Feature/Api/TenantGuestBookingsTest.php tests/Tenant/Feature/Api/TenantSystemSurfaceApiTest.php
```

```bash
npm run test:run -- resources/js/apps/public/components/__tests__/guestPortal.service.test.ts resources/js/apps/public/components/__tests__/GuestPortalPage.test.tsx resources/js/shared/utils/__tests__/routerNavigation.test.ts
```

```bash
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.byteforge.se npm run test:e2e -- tests/e2e/public-navigation-utility-links.spec.ts
```

Recent CI/staging baseline verification on `main`:

```bash
php artisan test --testsuite=Feature
php artisan test --testsuite=Central,Tenant,Unit
npm run test:run
npm run test:e2e:auth:central
```

```bash
# workflow
.github/workflows/deploy-staging.yml
# checks
/api/superadmin/dashboard/stats
/api/superadmin/themes/active
/api/themes/active (expected 404 on central domain)
```

## Read Next

- For exact next-work sequencing: [ROADMAP.md](ROADMAP.md)
- For agent operating context: [AGENT_START.md](AGENT_START.md)
- For testing and verification: [TESTING.md](TESTING.md)
- For auth/session work: [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)
- For booking and payment integration details: [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md) and [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md)
