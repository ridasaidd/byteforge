# Environment Matrix

Last updated: 2026-04-26
Status: proposed baseline
Audience: engineering

---

## Purpose

This document defines the target hostname and environment-variable shape for
shared development, staging, and production.

It is intended to remove ambiguity around domain naming, queue/mail behavior,
and the env-driven config introduced in the app runtime.

---

## Hostname Strategy

Use one domain namespace that we control and separate environments with
subdomains.

Recommended shape:

| Environment | Central host | Example tenant host |
| --- | --- | --- |
| Development | `dev.byteforge.se` | `tenant-one.dev.byteforge.se` |
| Staging | `stage.byteforge.se` | `tenant-one.stage.byteforge.se` |
| Production | `byteforge.se` | `tenant-one.byteforge.se` |

Notes:

- staging may remain inside Tailscale even if it uses real hostnames
- production keeps the apex and public tenant subdomains
- avoid using the production apex in development or staging

---

## Domain Config Matrix

These are the exact domain-related env vars the app now expects.

### Development

```dotenv
APP_ENV=development
APP_URL=https://dev.byteforge.se
TENANCY_CENTRAL_DOMAINS=dev.byteforge.se
TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE=:tenant.dev.byteforge.se

VITE_CENTRAL_DOMAINS=dev.byteforge.se
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_PORT=5173
VITE_DEV_SERVER_ALLOWED_HOSTS=localhost,127.0.0.1,.dev.byteforge.se
VITE_DEV_SERVER_CORS_ORIGINS=localhost,127.0.0.1,.dev.byteforge.se
VITE_DEV_SERVER_HMR_HOST=dev.byteforge.se
VITE_DEV_SERVER_HMR_PROTOCOL=wss
```

### Staging

```dotenv
APP_ENV=staging
APP_URL=https://stage.byteforge.se
TENANCY_CENTRAL_DOMAINS=stage.byteforge.se
TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE=:tenant.stage.byteforge.se

VITE_CENTRAL_DOMAINS=stage.byteforge.se
```

Notes:

- staging should serve built assets, not rely on `npm run dev`
- `VITE_DEV_SERVER_*` vars are normally unused on staging

### Production

```dotenv
APP_ENV=production
APP_URL=https://byteforge.se
TENANCY_CENTRAL_DOMAINS=byteforge.se
TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE=:tenant.byteforge.se

VITE_CENTRAL_DOMAINS=byteforge.se
```

Notes:

- production should serve built assets only
- `VITE_DEV_SERVER_*` vars are normally unused in production

---

## Runtime Service Matrix

These values are not exhaustive, but they cover the environment decisions that
matter for readiness.

| Variable | Development | Staging | Production |
| --- | --- | --- | --- |
| `DB_CONNECTION` | `mysql` | `mysql` | `mysql` |
| `MAIL_MAILER` | `smtp` via MailHog | staging SMTP or mail sandbox | production SMTP/provider |
| `QUEUE_CONNECTION` | `database` or `sync` by explicit choice | `database` or `redis` with worker | `database` or `redis` with worker |
| `SESSION_DRIVER` | `database` | `database` | `database` |
| `CACHE_STORE` | `database` or `redis` | `redis` preferred | `redis` preferred |
| `SESSION_DOMAIN` | `null` | `null` | `null` |

Notes:

- keep sessions host-scoped unless a future auth design explicitly changes that
- for this app, staging should already behave like production with queue worker,
  scheduler, and HTTPS enabled

---

## Process Expectations By Environment

### Development

- may use MailHog
- may use `QUEUE_CONNECTION=sync` if simplicity is more important than async realism
- should still validate queued mail and media conversion on the shared dev server before staging

### Staging

- run a real queue worker
- run the scheduler
- enable HTTPS
- use production-like storage and callback URLs
- keep access restricted through Tailscale if desired

### Production

- run the same process model as staging
- swap staging secrets, staging mail endpoints, and staging callbacks for production equivalents

---

## Immediate Follow-Up

1. Update the shared development `.env` to match the chosen dev hostname.
2. Add a staging `.env` template owned outside the repository.
3. Patch remaining test/config references that still assume `byteforge.se` where they should use env variables instead.
4. Use [STAGING_DEPLOYMENT_PLAN.md](STAGING_DEPLOYMENT_PLAN.md) when wiring GitHub Actions deployment.
