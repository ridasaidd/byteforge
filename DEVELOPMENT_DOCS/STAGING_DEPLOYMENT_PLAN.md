# Staging Deployment Plan

Last updated: 2026-04-26
Status: planned
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
- there is no staging deployment workflow yet

Implication:

- merges to `main` are validated in CI
- no workflow currently promotes the tested commit to a staging server

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

## Recommended GitHub Actions Design

### Workflow Name

- `deploy-staging.yml`

### Trigger Strategy

Recommended:

- `workflow_run` triggered by successful completion of backend and smoke CI on `main`

Alternative:

- `workflow_dispatch` with a required commit SHA input

### Environment

- use GitHub Actions `environment: staging`
- require manual approval while the process is new
- store deployment secrets at the environment level

### Secrets Needed

- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT`
- `STAGING_SSH_USER`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_APP_DIR`
- optionally `STAGING_URL`

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

Typical server-side command sequence:

```bash
git fetch --all --tags
git checkout "$DEPLOY_SHA"
composer install --no-interaction --prefer-dist --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
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

1. Choose the staging hostname pair and server path.
2. Decide whether staging deployment should be automatic or approval-gated.
3. Create the GitHub Actions staging environment and secrets.
4. Add the deploy workflow.
5. Reuse the current Playwright smoke tests against staging URLs after deploy.
