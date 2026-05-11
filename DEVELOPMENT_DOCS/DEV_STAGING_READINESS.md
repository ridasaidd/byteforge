# Development and Staging Readiness

Last updated: 2026-05-11
Status: working baseline
Audience: engineering

---

## Purpose

This document defines what ByteForge should have working in development before
we treat a shared environment as staging.

It is intentionally not a production deployment runbook.

The goal is to answer two questions:

1. What is already true in the active development environment?
2. What still needs to work reliably before we promote that setup into a
   staging-like environment?

Companion docs:

- [ENVIRONMENT_MATRIX.md](ENVIRONMENT_MATRIX.md)
- [STAGING_DEPLOYMENT_PLAN.md](STAGING_DEPLOYMENT_PLAN.md)

---

## Environment Terminology

Recommended naming:

- **Development**: local or personal/shared engineering environment used for
  active implementation and debugging
- **Staging**: pre-production environment intended to behave like production as
  closely as practical, but still restricted to internal users/testers
- **Production**: the live public environment

For current planning, "staging server" is the better name than "production test
server".

Reason:

- it clearly implies pre-production validation
- it avoids implying that production traffic or production DNS should terminate
  there
- it leaves the apex production domain free for the real public launch

Recommended direction:

- keep staging inside Tailscale if the intent is internal-only validation
- do not bind the final public apex to staging if production will later use it
- use HTTPS on staging so cookies, callbacks, auth redirects, and payment flows
  are tested under realistic conditions

---

## Domain Naming Recommendation

The simplest-looking option is not the safest one here.

Using names like `byteforge.dev` and `byteforge.staging` sounds convenient, but
they have different constraints:

- `.dev` is a real public TLD and is HSTS-preloaded in browsers, which means
  HTTPS is effectively mandatory
- `.staging` is not a standard public TLD to plan around for real deployment
  parity

Recommended approach:

- keep one domain namespace that you control
- use subdomains to separate environments

Suggested shape:

- production: `byteforge.se`, `tenant-one.byteforge.se`
- staging: `stage.byteforge.se`, `tenant-one.stage.byteforge.se`
- shared development: `dev.byteforge.se`, `tenant-one.dev.byteforge.se`

Why this is preferred:

- it preserves a production-like host structure for central and tenant domains
- it avoids consuming the production apex early
- it makes TLS, callbacks, cookie scope, and tenancy rules easier to reason
  about
- it keeps the eventual production cutover simpler

If the team wants a purely internal namespace instead, use a deliberately
non-production environment such as a controlled `.test` setup or an internal DNS
zone, but do not assume that `.staging` behaves like a production-grade public
domain.

---

## Near-Term Execution Plan

This is the recommended order of work.

### Stage 1: Normalize Environment Naming

Goal:

- stop treating the current shared dev host as a temporary one-off

Actions:

1. Choose central and tenant hostnames for shared development.
2. Choose central and tenant hostnames for staging.
3. Document those hostnames in env examples and readiness docs.
4. Keep production hostnames out of development and staging.

Expected result:

- environment identity stops drifting
- future deployment and certificate work has a stable target

### Stage 2: Make Domain Config Env-Driven

Goal:

- remove hardcoded `byteforge.se` assumptions from runtime and tooling

Actions:

1. Move Vite dev-server host, CORS, and allowed-host settings behind env vars.
2. Make `TENANCY_CENTRAL_DOMAINS` explicit in each environment.
3. Update `.env.example` so shared-development defaults no longer suggest
   sqlite-only local assumptions.
4. Add a minimal environment matrix for dev, staging, and production.

Expected result:

- the same app build can be configured cleanly per environment
- staging can be introduced without hidden host coupling

### Stage 3: Make Development QA Realistic

Goal:

- make the shared development server behave closely enough to staging to find
  operational bugs earlier

Actions:

1. Switch development mail from `log` to MailHog.
2. Decide whether shared development runs queue workers continuously or uses
   `sync` deliberately.
3. Document scheduler expectations.
4. Verify uploads, media conversions, and queued notifications on the shared
   development server.

Expected result:

- development catches the same class of issues that staging would otherwise
  discover first

### Stage 4: Stand Up Production-Like Staging

Goal:

- create the internal pre-production environment that most closely resembles
  final hosting

Actions:

1. Provision staging on VPS-style infrastructure, not shared hosting.
2. Keep staging inside Tailscale if access should remain private.
3. Enable HTTPS.
4. Run a real queue worker and scheduler.
5. Use production-like storage, mail, and callback configuration where safe.

Expected result:

- staging becomes the place where environment realism is validated before
  production

### Stage 5: Add Controlled Staging Deployment

Goal:

- ensure `main` can promote tested code into staging consistently

Actions:

1. Keep GitHub Actions as the first CI gate.
2. Add a staging deployment workflow that deploys the tested `main` commit.
3. Add a post-deploy smoke pass against the real staging URLs.
4. Keep deployment approval manual if automatic deploys feel too aggressive.

Expected result:

- staging is updated from known-good commits rather than ad hoc server pulls

Current state (2026-05-11):

- implemented baseline on `main` via `.github/workflows/deploy-staging.yml`
- deployment now validates required SSH secrets before attempting remote steps
- deployment includes post-deploy API smoke checks for central auth/theme health

---

## Verified Current Development State

These points are verified from the current repository and active environment.

### Database

- Active development environment uses **MySQL**, not sqlite
- `.env` currently uses `DB_CONNECTION=mysql`
- `.env.example` still defaults to `DB_CONNECTION=sqlite`

Implication:

- sqlite is an example/default bootstrap convenience only
- the example env no longer matches the actual shared development server

### Mail

- development may still use `MAIL_MAILER=log` depending on local setup
- staging is now configured to Mailtrap Sandbox for QA-safe inbox visibility
- guest auth depends on email delivery for magic-link flows

Implication:

- staging mail delivery is now observable end-to-end without using production
  recipients
- development should still move to MailHog or an equivalent local SMTP sink
  for local QA parity

### Queueing

- active env currently uses `QUEUE_CONNECTION=database`
- media conversions are queued by default in
  `config/media-library.php`
- guest email notifications may also depend on queued delivery depending on how
  notifications are dispatched

Implication:

- queued behavior exists today
- if no worker is running, some features will appear incomplete or flaky in
  development

### Scheduler

- scheduled tasks exist for booking hold expiry, booking reminders, and support
  access expiry in `routes/console.php`

Implication:

- development and staging need either cron or an explicit manual verification
  routine for scheduler-backed behavior

### Domain Model

- Vite currently hardcodes `byteforge.se` in dev CORS, allowed hosts, and HMR
  host configuration
- tenancy central domains default to `byteforge.se` when
  `TENANCY_CENTRAL_DOMAINS` is not explicitly set
- active `.env` uses `APP_URL=http://byteforge.se`

Implication:

- the current setup works for the existing dev hostnames
- domain handling is still too environment-specific and should be parameterized
  before staging

---

## What Must Work Before Staging

This is the practical readiness gate.

### 1. Domain and URL Configuration Must Be Env-Driven

Before staging, the app should stop assuming one hardcoded domain shape.

Required outcomes:

- `APP_URL` reflects the actual central environment URL
- `TENANCY_CENTRAL_DOMAINS` is explicitly set per environment
- Vite dev server host, allowed hosts, and CORS origins are derived from env
  rather than hardcoded `byteforge.se`
- tenant hostnames are documented for development and staging

Why this matters:

- tenant routing, auth redirects, refresh cookies, and guest portal behavior all
  depend on correct host boundaries
- staging should not force reuse of the final production apex

### 2. Mail Must Be Testable End-to-End

Before staging, magic-link and notification mail should be observable.

Recommended development setup:

- use MailHog for development
- point Laravel SMTP config at MailHog instead of `log`

Required outcomes:

- guest magic-link request and verify flow can be tested without reading logs
- tenant/staff booking emails can be observed during development QA

### 3. Queue Strategy Must Be Explicit

Before staging, choose queue behavior deliberately rather than implicitly.

Recommended split:

- development: either `sync` for simplicity or `database` with an always-on
  worker
- staging: run a real worker process

Required outcomes:

- queued mail is delivered reliably
- media conversions complete reliably
- failures are visible and diagnosable

Minimum commands to own operationally:

```bash
php artisan queue:work
php artisan queue:failed
php artisan queue:retry all
```

### 4. Scheduler-Backed Features Must Be Verified

Before staging, scheduler-backed features need an explicit validation pass.

Required outcomes:

- booking hold expiry runs correctly
- booking reminders run correctly
- support-access expiry runs correctly

Minimum command to own operationally:

```bash
php artisan schedule:run
```

### 5. Deferred Auth Surfaces Must Stay Deliberately Deferred

Current status is acceptable only if it stays explicit.

Still deferred today:

- customer registration
- forgot password
- reset password
- customer-account and cross-tenant SSO flows

Before staging, ensure:

- these routes are not presented as working customer-facing features unless they
  are implemented
- CMS/system-surface editing does not create the false impression that these
  flows are live
- copy and navigation do not advertise unavailable auth capabilities

### 6. Booking and Payment Follow-Ups Need Focused QA

Booking and payment code exist, but there are still product-level follow-ups
called out in `CURRENT_STATUS.md`.

Before staging, validate at least:

- the current booking wizard order is acceptable or intentionally deferred
- service/resource/slot selection UX is coherent
- booking confirmation and cancellation email flows behave as expected
- payment-required bookings work end-to-end with realistic callback handling
- refund-on-cancel behavior is exercised in a safe test setup

### 7. Storage Behavior Must Be Explicitly Tested

There is no single storage-infrastructure phase document today, so this needs a
small readiness pass.

Before staging, validate at least:

- public uploads are accessible through the expected disk and symlink setup
- tenant-aware media paths resolve correctly
- media conversions complete and produce reachable URLs
- backup/retention expectations are defined for the shared environment

### 8. HTTPS Must Exist On Staging

HTTPS is optional on pure development environments but should be considered
required on staging.

Why:

- auth cookies and redirect behavior should be exercised realistically
- provider callbacks and cross-origin flows are more faithful under HTTPS
- mixed-content and secure-cookie surprises should be found before production

For the shared development server, HTTPS is strongly recommended once the team
is using stable dev hostnames over Tailscale. It is not as mandatory as staging,
but enabling it early reduces environment drift.

---

## Current Before-Staging Audit

This is the current engineering view based on the repository state.

### Ready or Mostly Ready

- MySQL-backed development environment is already in use
- tenancy, tenant runtime, booking, payments, guest auth, and partial system
  surfaces exist on `main`
- focused backend, frontend, and Playwright validation exists for the recent
  guest-auth and system-surface work
- backend + frontend + Playwright auth smoke are now first-class CI gates on `main`
- staging deployment workflow now exists and has been validated end-to-end

### Not Ready Yet

- example env defaults do not reflect the actual shared development setup
- mail delivery is still log-based instead of QA-friendly
- queue-worker expectations are not yet documented as part of normal setup
- scheduler expectations are not yet documented as part of normal setup
- staging server filesystem ownership/permissions still need a stable baseline
  so deploy logs stay clean (composer/npm/storage/cache permissions)
- customer-account surfaces remain intentionally unimplemented and need clear
  product boundaries
- storage readiness exists in code/config but not yet as an explicit checklist

### Non-Blocking but Important

- browser auth is improved via the hybrid HttpOnly refresh model but is not yet
  the end-state cookie-only model
- payment has documented implementation phases, but storage/infrastructure does
  not yet have an equally explicit planning track

---

## Recommended Next Actions

### Immediate

1. Lock staging file ownership and group permissions for app, `storage`, and
  `bootstrap/cache` to remove deploy-time permission drift.
2. Document deploy-user prerequisites (GitHub deploy key path, safe.directory,
  host-key trust) as mandatory staging bootstrap steps.
3. Keep Mailtrap Sandbox as the staging default and add a short post-deploy
  mail verification checklist.
4. Decide and document the development queue mode: `sync` or worker-backed
  `database`.
5. Capture scheduler/queue runtime expectations in a short runbook snippet.

### Before Creating Staging

1. Create a small environment matrix for development, staging, and production.
2. Run one focused QA pass for queue-backed mail, scheduler-backed booking
   behavior, media conversion, and payment callback handling.
3. Stand up staging behind Tailscale if access should remain internal.
4. Enable HTTPS on staging.

### After Staging Exists

1. Write a real staging-to-production deployment runbook.
2. Validate remaining deferred auth/customer-account scope boundaries again
   before exposing new public auth surfaces.

---

## Suggested Environment Shape

Recommended target shape:

- **Development**: can be HTTP, can use MailHog, may use `sync` queue mode for
  convenience
- **Shared development server**: should match actual team workflow and should no
  longer rely on sqlite defaults in docs
- **Staging**: Tailscale-restricted, HTTPS-enabled, production-like domains,
  real worker process, scheduler running, realistic mail and callback testing
- **Production**: public DNS, production mail, production secrets, production
  observability, hardened operational runbook

This keeps staging useful without burning the final production apex early.
