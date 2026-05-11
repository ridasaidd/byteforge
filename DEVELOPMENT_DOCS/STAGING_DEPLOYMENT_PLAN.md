# Staging Deployment Plan

Last updated: 2026-05-11
Status: active baseline
Audience: engineering

---

## Purpose

This document describes how staging should be deployed from GitHub Actions and
what should be verified after each deployment.

It is a deployment plan, not a final production runbook.

---

## Current State

The repository already has CI workflows for test execution:

- `.github/workflows/backend-tests.yml`
- `.github/workflows/playwright-smoke.yml`

What exists today:

- backend tests run on pull requests and on pushes to `main`
- Playwright smoke runs on pull requests and on pushes to `main`
- staging deployment workflow now exists on `main`: `.github/workflows/deploy-staging.yml`
- deploy workflow performs SSH deployment, database migration, asset build,
  cache refresh, queue restart, and post-deploy API smoke checks
- deploy workflow now also runs post-deploy Playwright central auth browser smoke

Implication:

- merges to `main` are validated in CI
- `main` can be promoted to staging through the deploy workflow

---

## Deployment Goal

After a commit is merged into `main` and the required CI checks pass, the exact
tested commit should be deployed to staging in a controlled way.

Recommended stance:

- deploy the tested commit SHA, not an arbitrary later `main` state
- keep staging deployment gated by environment approval at first
- run smoke checks after deployment and fail loudly if they regress

---

## Recommended Workflow Shape

### Trigger

Recommended options:

1. automatic after successful `main` CI
2. manual approval after successful `main` CI

Preferred starting point:

- `push` to `main` runs existing CI
- a dedicated staging deploy workflow runs only after CI succeeds
- the deploy job targets the same commit SHA that CI validated

---

## Implemented GitHub Actions Design

### Workflow Name

- `deploy-staging.yml`

### Trigger Strategy

Current:

- `push` to `main`
- `workflow_dispatch`

Future improvement:

- optionally switch to `workflow_run` if strict tested-SHA promotion becomes mandatory

### Environment

Current:

- repository-level secrets are used

Future improvement:

- migrate to `environment: staging` with approval gates and environment-scoped secrets

### Secrets Needed

Current workflow expects:

- `STAGING_HOST`
- `STAGING_USER`
- `STAGING_SSH_KEY`
- optional: `STAGING_BASE_URL`, `STAGING_SMOKE_EMAIL`, `STAGING_SMOKE_PASSWORD`

Server-side secrets should remain on the server and not be injected from GitHub
unless there is a clear reason.

---

## Deployment Method

Recommended first version:

- SSH into the staging server
- fetch the repository
- checkout the exact tested commit SHA
- install dependencies
- run migrations
- build assets
- clear and warm caches
- restart required services

Current server-side command sequence (simplified):

```bash
git fetch origin main
git checkout main
git reset --hard origin/main
composer install --no-interaction --prefer-dist --no-dev
npm ci
npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan queue:restart
```

Notes:

- if asset building should not happen on the server long-term, a later version
  can deploy a prebuilt artifact instead
- the first version should optimize for clarity over deployment sophistication

---

## Process Expectations On Staging

Staging is only useful if it behaves like the intended production model.

Required:

- HTTPS enabled
- queue worker running
- scheduler running
- production-like mail/callback configuration using safe staging endpoints
- production-like hostnames
- access restricted through Tailscale if staging is internal-only

Current mail baseline:

- staging uses Mailtrap Sandbox credentials in server-side environment config
- no production recipient delivery is expected from staging

---

## Post-Deploy Smoke Checks

These should run automatically after deployment.

### Tier 1: Fast HTTP and shell checks

- central login shell loads on the staging central host
- tenant login shell loads on a staging tenant host
- guest portal loads on a staging tenant host
- key asset responses return `200`

### Tier 2: Browser smoke checks

Prefer reusing existing Playwright coverage with staging URLs:

- central login shell smoke
- tenant login shell smoke
- guest portal public-navigation smoke

Current baseline:

- central auth browser smoke is implemented post-deploy via
  `npm run test:e2e:auth`
- tenant auth/permissions smoke is included when staging tenant URL/credentials
  are configured in deploy secrets
- guest portal public-navigation smoke now runs post-deploy via
  `tests/e2e/guest-portal-shell.spec.ts`

Current candidate specs already in the repo:

- `tests/e2e/central-login-shell.spec.ts`
- `tests/e2e/tenant-login-shell.spec.ts`
- `tests/e2e/public-navigation-utility-links.spec.ts`

### Tier 3: Environment realism checks

These may begin as manual checks, then become automated later:

- queued guest magic-link email arrives through the staging mail path
- media upload completes and derived assets are reachable
- booking reminder and hold-expiry scheduling paths run correctly
- sandbox payment callback flow completes successfully

Mail verification checklist (staging):

1. Trigger one known email path (guest magic-link or equivalent auth flow).
2. Confirm message appears in Mailtrap Sandbox inbox.
3. Confirm sender identity and subject match expected template.
4. Confirm at least one critical link in the email points to staging domains.
5. Record pass/fail in deploy notes for that run.

---

## Failure Handling

If post-deploy smoke fails:

1. mark the staging deployment workflow failed
2. keep the failing commit SHA visible in the workflow output
3. either roll back to the previous known-good SHA or block further promotion until fixed

The first implementation can be non-automatic about rollback, but the workflow
should still surface the exact SHA and failure step clearly.

---

## Rollout Order

1. keep current CI workflows as the required gate on `main`
2. add `deploy-staging.yml`
3. deploy by exact SHA to staging over SSH
4. run fast post-deploy smoke checks
5. add browser smoke checks against the staging URLs
6. later add rollback and artifact-based deployment improvements if needed

---

## Immediate Next Actions

1. Stabilize server-side ownership/permissions baseline (`/var/www/byteforge`, `storage`, `bootstrap/cache`) so deploy logs stay clean.
2. Document deploy-user bootstrap requirements (GitHub deploy key path, safe.directory, `known_hosts`) as a repeatable checklist.
3. Optionally move deployment secrets to a `staging` environment with manual approval gates.
4. Keep post-deploy browser smoke green for central, tenant, and guest flows as code changes land.
