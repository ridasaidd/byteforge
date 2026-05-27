# ByteForge Current Status

Status: canonical
Audience: human + AI agent
Last verified: 2026-05-26
Primary branch: `main`

## Snapshot

- ByteForge is a multi-tenant CMS and storefront platform with central and
  tenant dashboards, a Puck-based page builder, themes, media, analytics,
  payments, and booking.
- Phases 9 through 15 are implemented on `main`.
- Phase 19 system-surface foundations are partially implemented on `main`, specifically tenant login and guest-portal runtime slices.
- Within Phase 19, tenant login is the only staff-facing system surface currently intended as a real route-owned product surface; `register`, `forgot_password`, and `reset_password` remain reserved placeholders for possible future guest/customer-account work and are not meant to become tenant staff self-service auth routes.
- Tenant login system-surface browser coverage now also verifies that tenant-host customization and reset of the shipped login surface keep the auth flow working end to end.
- Phase 17 guest-authenticated quote continuity is now implemented on the current working tree: guest-auth routes are available when booking or estimates-quotes is active, quote requests now persist guest linkage, and `/guest-portal` can list, view, accept, and reject linked quotes.
- CI and deployment baseline were stabilized on `main` during 2026-05-11 updates:
  backend tests, frontend Vitest, Playwright auth smoke, and staging deployment
  workflow are now aligned and passing with the current environment model.
- Staging deploy hardening continued after the Phase 17 rollout: the deploy
  workflow now seeds newly introduced global permission rows and billing
  catalog rows during deploy so new add-ons and tenant capabilities become
  usable without a destructive full reseed.
- Post-deploy browser smoke now covers central auth, tenant auth/permissions,
  and guest-portal shell runtime checks.
- Staging mail is now configured to Mailtrap Sandbox (2026-05-11) for
  QA-visible delivery checks without using production inboxes.
- Post-deploy staging mail smoke is now part of the deploy workflow via the
  guest magic-link request path, so each staging deployment verifies one real
  queued email trigger against the staging tenant host.
- The HttpOnly auth migration is now implemented on `main` with the hybrid
  browser model described in
  [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md):
  in-memory bearer access tokens plus a host-scoped HttpOnly refresh cookie.
- The frontend auth cutover is now in place: dashboard bearer tokens are kept
  in memory only, and session continuity is restored through the HttpOnly
  refresh cookie.
- Backend refresh-session groundwork now exists: `web_refresh_sessions`
  persistence, host-scoped HttpOnly refresh cookie issuance, and cookie-based
  refresh rotation are implemented server-side.
- Staff password changes now revoke outstanding `web_refresh_sessions` rows
  and clear the current refresh cookie, reducing stale multi-tab/browser
  continuity after credential rotation.
- Staff bearer tokens are now tied to refresh-session IDs, so central and
  tenant refresh rotation invalidates the prior bearer token and tenant
  support-access or membership removal also kills the affected session-tied
  bearer tokens.
- Central and tenant dashboard refresh flows are both verified against the
  cookie-backed path, and the transitional bearer-based refresh fallback has
  been removed.
- Playwright auth coverage now also checks session restore on reload and
  multi-tab logout invalidation for the central and tenant dashboard flows
  when the configured environment serves the login page correctly.
- Playwright auth coverage now also checks expired refresh-session restore for
  the central and tenant dashboards, asserting that a stale host-scoped cookie
  cannot restore the session and the browser is sent back to the login shell.
- Tenant Playwright auth coverage now also checks host scoping at the browser
  level by asserting that a valid central refresh cookie cannot restore a
  tenant-host dashboard session.
- Backend CI now also has a dedicated Node HTTP integration lane for the
  live central auth, authorization/permissions, superadmin user-management,
  and tenant admin API contracts.
- Focused auth regressions now verify that staff and guest refresh cookies do
  not restore sessions on the wrong host or tenant host.
- Guest session bootstrap now also has focused regression coverage for expired
  refresh sessions returning an empty payload, clearing the cookie, and
  revoking the expired row.
- Focused auth regressions now also verify multi-tab stale-cookie behavior:
  once a refresh session rotates, the old cookie can no longer restore a
  staff or guest session.
- Staff logout now has focused regression coverage for current bearer-token
  invalidation as well as refresh-cookie invalidation, and the tenant
  membership middleware now preserves the current Passport access token when it
  refreshes the authenticated user so tenant logout can revoke that bearer
  token correctly.
- The shared frontend HTTP auth client now has focused Vitest coverage for
  silent refresh retry, concurrent refresh deduplication, and failed-refresh
  in-memory token cleanup.
- Browser-level auth coverage now also includes reload-based session restore
  checks for the central and tenant dashboards, with the central Playwright
  spec cleanly skipping when the configured base URL does not actually serve
  the login page.
- Browser-level auth coverage for the central and tenant dashboards now also
  includes expired-session restore checks using a local Laravel bootstrap to
  seed stale refresh-session rows and verify redirect-to-login behavior.
- Browser-level tenant auth coverage now also verifies that a central-host
  refresh session cannot be replayed successfully on a tenant host.
- Browser-level tenant login system-surface coverage now also verifies that a
  tenant can customize the shipped login shell, still authenticate through the
  fixed form, reset the surface, and return to the standard login experience.
- The remaining HttpOnly closeout work is operational rather than code-facing:
  confirm staging/production-owned env templates or secret stores continue to
  carry the documented cookie/session values.
- The central Playwright auth flow, including reload-based session restore,
  was verified against both `http://dev.byteforge.se` and
  `https://stage.byteforge.se` on 2026-05-25.
- The tenant Playwright auth flow, including reload-based session restore,
  was verified against both `http://tenant-one.dev.byteforge.se` and
  `https://tenant-one.stage.byteforge.se` on 2026-05-25.
- The staging deploy workflow now performs an explicit auth/session config
  audit after `config:cache` and fails if HTTPS staging drifts away from the
  expected secure, host-only cookie posture.
- The staging deploy workflow now also fails early when the deploy user cannot
  read the GitHub deploy key or when staging runtime paths and Passport OAuth
  keys do not meet the expected ownership/permission baseline.
- The staging deployment and readiness docs now include a concrete closeout
  checklist for deploy-user bootstrap, runtime permissions, queue/scheduler
  expectations, and env ownership so the remaining staging work is explicit.
- The staging deployment plan now also includes a minimum bootstrap runbook
  snippet with concrete commands for deploy-user provisioning, writable
  runtime paths, OAuth key modes, and scheduler setup.
- The repo now also owns `.env.staging.example` for the expected staging
  auth/session/queue/mail posture and `scripts/staging/bootstrap_runtime.sh`
  for repeatable host bootstrap and runtime verification.
- Staging booking operations were manually verified on 2026-05-26: expired
  booking holds were cleaned up, `booking.reminder_24h` and
  `booking.reminder_2h` notifications were queued and delivered to Mailtrap,
  booking notification rows were confirmed to be recorded after successful
  delivery, and the deploy workflow's post-`queue:restart` worker check was
  validated against the supervised `laravel-queue.service` process using the
  writable `www-data` runtime user.
- Shared input normalization now exists via
  `app/Actions/Api/NormalizeInputFieldsAction.php` and is currently reused by
  booking customer fields, payment human-text fields, auth name/email
  fields, booking CMS resource and service human-text fields, booking tenant
  cancellation notes, tenant user-management create name/email fields, tenant
  custom role names, public analytics page titles, tenant
  settings site title/description fields, shared media-folder name/description
  fields, shared media upload metadata text fields, central theme metadata
  fields, central page-template name/description fields, central admin user
  and tenant management fields, central and tenant theme-part name fields,
  central and tenant page title fields, central and tenant navigation name
  fields, central and tenant layout name fields, central support access
  reasons, central general-settings human-text fields, and tenant CMS quote
  request and draft-quote human-text fields.
- The strongest CMS-adjacent normalization candidates on the current codebase
  are now largely covered. The remaining nearby surfaces are mostly structured
  payloads, identifier-like fields, or dead/unwired request classes and are
  intentionally left outside this normalization family.
- The current normalization-maintenance track is effectively closed on the
  repo side: there are no strong remaining request-boundary candidates in the
  shipped codebase, and future normalization should only be added
  opportunistically as new ordinary human-text fields are introduced.
- Booking dashboard localization and booking guest-input hardening were merged
  on 2026-04-19.
- Tenant booking dashboard manual-booking creation now exists on the current
  working tree: tenant users with booking-management permission can create
  confirmed bookings directly from the dashboard calendar using the existing
  CMS booking endpoint.
- Phase 16 operator tooling is now implemented on the current working tree:
  tenant inspection, limited central theme activation, temporary support
  access, and central tenant user management are in place; broader support
  remediation remains intentionally deferred.
- Tenant media upload/render regressions have been resolved in current code by
  removing tenant suffixing from the public disk path, making media temp
  storage explicitly writable, and hardening conversion URL generation.

## Implemented Milestones

- Phase 9 Analytics Foundation: complete on `main`
- Phase 10 Payments Core: complete on `main`
- Phase 11 Dashboard Translation: complete on `main`
- Phase 12 Tenant Runtime Readiness: complete on `main`
- Phase 13 Booking System: implemented on `main`
- Phase 14 Payment x Booking Integration: implemented on `main`
- Phase 15 Guest Authentication: implemented on `main`
- Phase 19 System Surfaces: partially implemented on `main` (guest portal + tenant login slices)
- CI + Staging deployment baseline: complete on `main` (backend + frontend + auth smoke + post-deploy API + browser smoke, plus 2026-05-26 staging host closeout verification and failed_jobs backlog clear in workflow run `26465691607`)

## Current Recommended Work Order

1. Keep CI and staging deploy parity stable (backend suites + Vitest + Playwright auth smoke + deploy smoke checks).
2. Continue HttpOnly auth migration closeout and operational hardening.
3. Keep shared, field-family input normalization as bounded maintenance for
  newly introduced safe text fields rather than a standalone front-of-queue
  phase.
4. Keep customer accounts, password recovery, and cross-tenant SSO in a later dedicated phase rather than extending Phase 15 ad hoc.
5. Do not expand support beyond the current bounded read-only workflow before launch.
6. Keep central tenant user management narrow: membership add/change/remove
  only, with explicit permissions, tenant-visible audit entries, owner
  notifications, and immediate tenant refresh-session plus session-tied bearer
  token revocation on removal.

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

The original booking UX gaps from the earlier Phase 13 follow-up list were
resolved by 2026-05-12.

Current booking follow-ups worth tracking now are:

- guest-facing self-service rescheduling is now merged on `main`: backend
  guest-auth reschedule support, the shared slot/range availability fix,
  guest portal UI wiring, focused backend + Vitest coverage, and Playwright
  guest-portal happy-path + rejection-path specs are all in place
- tenant dashboard manual booking creation is now availability-guided for both
  slot-mode and range-mode services; slot mode uses selectable slots while
  range mode uses check-in/check-out dates resolved through tenant/resource
  stay-time defaults plus availability checks, and focused Playwright browser
  coverage now exists for the tenant range-mode create flow
- booking reminder delivery semantics and staging queue-worker verification
  are now merged on `main`: tenant-configured reminder windows, post-delivery
  notification recording, clean deploy worker detection after
  `php artisan queue:restart`, and `2h` reminder email copy were all verified
  on staging on 2026-05-26; keep the worker and runtime-path expectations
  explicit in environment and deployment docs so this path stays reliable

### Quotes follow-ups

- the core Phase 17 quote flow is now complete on the current working tree and ready for staging/merge review: storefront quote entry, tokenized review, guest-portal continuity, tenant authoring, booking handoff, and focused validation are all in place
- authenticated guest quote continuity now exists on the current working tree through the existing guest-auth stack and `/guest-portal`
- quote-request attachments are now implemented on the current working tree as request-scoped private media with tenant-only review and download handling
- automated quote mail contract assertions now cover the actual tenant and guest action links, and development Mailtrap delivery verification succeeded for a real guest quote notification
- service-driven storefront quote-request browser coverage now exists, and guest-portal quote continuity browser coverage now exists with authenticated quote review and acceptance
- the public guest portal client now deduplicates in-flight guest verification and session restore requests so development Strict Mode no longer invalidates one-time guest auth flows during browser coverage
- public quote review tokens are now stored as hashes at rest; the plain review token is minted for the email link path without being persisted in the quotes table
- the tokenized public quote page is still a route-owned React surface rather than a tenant-editable system page; if customization is added later, it should be a dedicated system page instead of a guest-portal widget
- PDF/downloadable quote presentation is still deferred; when added, it should be implemented as ByteForge-owned quote document rendering rather than as invoice-package-led architecture
- optional staging-specific quote mail verification may still be useful, but it is no longer treated as a blocker for Phase 17 branch completion after development Mailtrap verification and the full merge-readiness validation pass

### Security and auth follow-ups

- browser auth still uses JavaScript-accessible bearer access tokens in memory,
  which is better than browser storage but still not equivalent to a fully
  cookie-authenticated API model
- shared normalization rollout is still partial; it should stay explicit and
  field-family scoped
- customer-account and SSO work is still future work

### Platform support follow-ups

- temporary support access now exists as a bounded workflow on the active
  Phase 16 implementation
- central tenant user management now exists as a separate workflow for
  permanent tenant memberships from the central app
- permanent membership changes initiated from central now notify tenant owners,
  write tenant-visible activity entries, and revoke tenant refresh sessions on
  removal
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

Recent Phase 17 guest-quote continuity verification on the current working tree:

```bash
php artisan test tests/Tenant/Feature/Api/TenantGuestAuthTest.php tests/Tenant/Feature/Api/TenantGuestQuotesTest.php tests/Feature/Api/Quotes/PublicQuoteRequestApiTest.php
```

```bash
npx vitest run resources/js/apps/public/components/__tests__/guestPortal.service.test.ts resources/js/apps/public/components/__tests__/GuestPortalPage.test.tsx
```

Recent Phase 17 quote-attachment verification on the current working tree:

```bash
php artisan test tests/Feature/Api/Quotes/PublicQuoteRequestApiTest.php tests/Feature/Api/Quotes/QuoteCmsApiTest.php
```

```bash
npx vitest run resources/js/shared/puck/components/quotes/__tests__/QuoteRequestWidget.test.tsx resources/js/shared/puck/components/booking/__tests__/BookingWidgetRuntime.test.tsx resources/js/apps/tenant/components/pages/Quotes/__tests__/QuoteRequestDetailPage.test.tsx
```

Recent Phase 17 notification and storefront-quote verification on the current working tree:

```bash
php artisan test tests/Feature/Api/Quotes/QuoteNotificationActivityTest.php
```

```bash
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.dev.byteforge.se npx playwright test tests/e2e/booking-storefront-appointment.spec.ts -g "guest can submit a service-driven quote request with a private attachment from a published storefront page"
```

Recent Phase 17 guest-portal continuity verification on the current working tree:

```bash
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.dev.byteforge.se npx playwright test tests/e2e/guest-portal-shell.spec.ts -g "authenticated guest can review and accept a linked quote from the guest portal"
```

```bash
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.byteforge.se npm run test:e2e -- tests/e2e/public-navigation-utility-links.spec.ts
```

Recent CI/staging baseline verification on `main`:

```bash
php artisan test --testsuite=Feature
php artisan test --testsuite=Central,Tenant,Unit
npm run test:run
npm run test:e2e:auth
npx playwright test tests/e2e/guest-portal-shell.spec.ts
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
