# AGENTS.md

## Orientation

Read `.opencode/DEVELOPMENT_DOCS/AGENT_START.md` first. It defines doc precedence, sensitive areas, and the comments policy. When docs conflict, trust order: AGENT_START > CURRENT_STATUS > ROADMAP > phase plans > reference docs > archive/. For authoritative runtime state (tasks, plans, refs, runs, routing, execution state), use the SQLite database at `.opencode/runtime/opencode-state.sqlite`.

## Orchestrator Executor Mode

- Workflow contract: `.opencode/DEVELOPMENT_DOCS/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`
- Packet template: `.opencode/DEVELOPMENT_DOCS/execution/EXECUTION_PACKET_TEMPLATE.md`
- In this mode, the executor should read only `AGENTS.md`, `.opencode/DEVELOPMENT_DOCS/AGENT_START.md`, and the assigned execution packet before any task-specific docs.
- Executor responses must use the workflow's success/failure schemas, including `task_ref` and `schema_version`.
- `buildPacketFromTask()` / `build-packet --task-id <id>` generates executor packets from SQLite task state. This is the intended long-term path; manually authored packet YAML files remain the current handoff format.

### Gate 0 Clarification Policy

- Before generating an execution packet, the orchestrator must run a preflight refinement check on the human prompt.
- If target files, architectural surfaces, or acceptance criteria are still ambiguous, do not emit an execution packet.
- Instead, emit exactly one `status: clarify` YAML packet with up to 3 direct questions and the missing gaps.
- The local broker must treat a clarification packet as a pause condition, not as executor failure.
- Packet IDs must be treated as unique run identifiers; avoid reusing completed IDs for new clarify packets.
- If packet ID continuity is uncertain, resolve state first (for example from SQLite context) before emitting a new packet.

### Default Handoff Policy (No Reminder Mode)

- Treat executor delegation as default for non-trivial work.
- Orchestrator should only do minimal preflight (health, status, tiny scope check), then issue a packet.
- Delegate when task requires file edits, stash/diff triage, more than two file reads, or validation commands after edits.
- Keep orchestration token usage low by using compact state context and packet deltas instead of long conversational context.
- Only keep work in orchestrator when it is a tiny operational check or explicit local git plumbing.

## State Architecture

SQLite is the authoritative runtime state. Markdown bootstrap docs are canonical for behavioral rules.

| Layer | What it holds | Authority on divergence |
|---|---|---|
| SQLite (`tasks`, `plans`, `refs`, `runs`, `packets`, `routing`) | Task definitions, phase plan content, reference doc content, run history, execution state, routing metadata | Wins for task/plan/ref/run/routing/execution state |
| Markdown bootstrap docs | Behavioral rules, workflow contracts, orchestration policies, return schemas, system conventions, architecture descriptions | Wins for behavioral rules and conventions |

- Orchestrators should query SQLite compact context (`opencode:state:context`) instead of reconstructing project state from markdown documents.
- `buildPacketFromTask()` / `build-packet --task-id <id>` is the intended path for generating executor packets from SQLite task state.
- Packet YAML files remain the current executor handoff format but are transitioning toward generated execution artifacts.
- Use `opencode:state:ingest-all` to bulk-ingest plans, refs, and packets into SQLite.

## Current Project Truth

- primary branch: `main`
- implemented on `main`: Phases 9 through 15
- implemented on `main`: the shipped Phase 19 system-surface slices for tenant login and guest portal
- current focus: keep staff login as a lightweight branded utility surface and continue the guest-facing Phase 19 follow-on work for add-on-gated guest-portal widgets and widget-zone expansion
- auth storage follows the hybrid in-memory access token plus HttpOnly refresh-cookie model
- shared input normalization is field-family driven through `app/Actions/Api/NormalizeInputFieldsAction.php`

## Architecture

Laravel 12 multi-tenant SaaS (stancl/tenancy) with three independent React 18 frontend apps bundled by Vite:

- **Central admin** — `resources/js/superadmin.tsx` → `dash-central.blade.php` → `/dashboard/*`
- **Tenant CMS** — `resources/js/tenant.tsx` → tenant subdomain
- **Public renderer** — `resources/js/public.tsx` → `public-central.blade.php` → `/`, `/pages/:slug`

Backend: PHP 8.2+, Passport OAuth2, Spatie permissions/settings/activitylog/medialibrary, Puck page builder (`@puckeditor/core`), Stripe via Cashier, Swish payments.

Frontend: React Router v6, React Query (server state), Zustand (client state), shadcn/ui + Radix + Tailwind v4, Zod + React Hook Form, i18next.

`@` alias → `resources/js/` in both TS and Vite config.

## Commands

```bash
composer dev                    # starts Laravel server + queue + pail + vite concurrently
composer test                   # config:clear then php artisan test

npm run lint                    # ESLint (ts/tsx, zero warnings)
npm run type-check              # tsc --noEmit
npm run test:run                # vitest single run (frontend unit/component)
npm run test:http-integration   # Node HTTP integration specs (needs booted Laravel server)
npm run test:e2e                # Playwright (tests/e2e/)
npm run test:e2e:auth           # central + tenant auth + tenant permissions smoke
npm run build                   # tsc && vite build
```

CI runs in this order: `composer audit` → PHP syntax lint → `npm audit` → `npm run build` → `php artisan test --testsuite=Feature` → `php artisan test --testsuite=Central,Tenant,Unit` → `npm run test:run` → (separate job) boot Laravel server → `npm run test:http-integration` → (separate workflow) Playwright auth smoke.

PHP formatting: `./vendor/bin/pint` (Laravel Pint, already in dev deps).

## Backend Testing

- Tests use **`DatabaseTransactions`** against **MySQL/MariaDB** (not SQLite, not `RefreshDatabase`).
- Run `php artisan migrate:fresh --seed` **once** before first test run. `TestFixturesSeeder` seeds users, tenants, roles. Do not re-seed between runs.
- **Never create users in tests** — use seeded fixtures. All seeded user passwords are `password`.
- Auth helpers (return `$this` for chaining): `$this->actingAsSuperadmin()`, `$this->actingAsCentralAdmin()`, `$this->actingAsCentralViewer()`, `$this->actingAsTenantOwner('tenant-one')`, `$this->actingAsTenantEditor('tenant-one')`, `$this->actingAsTenantViewer('tenant-one')`.
- Tenant context: `$this->withinTenant('tenant-one', fn () => ...)`.
- Seeded tenants: `tenant-one`, `tenant-two`, `tenant-three`.
- User lookup: `TestUsers::centralSuperadmin()`, `TestUsers::tenantOwner('tenant-one')`.
- Activity logging is **disabled** in `TestCase::setUp()` to avoid UUID column mismatch.
- Extend `Tests\TestCase` — it provides `DatabaseTransactions`, auth helpers, tenancy helpers. Do not add `RefreshDatabase`.
- Run a single suite: `php artisan test --testsuite=Feature` or `php artisan test --filter=ThemeTest`.

## Frontend Testing

- Vitest tests live at `resources/js/**/*.{test,spec}.{ts,tsx}`.
- HTTP integration tests live at `tests/integration/` (separate config: `vitest.http-integration.config.ts`).
- Puck component test utilities: `resources/js/shared/puck/__tests__/testUtils.tsx` — use `renderPuckComponent()`, `renderPuckComponentWithDragRef()`, `mockThemeResolver()`.
- Mock `@puckeditor/core` `usePuck` when testing components outside Puck context.

## ESLint Boundary Rule

Puck page-builder components (`resources/js/apps/central/components/pages/puck-components/**`) **must not** import from `@/shared/components/ui/*` (shadcn/ui). This prevents dashboard-only UI from leaking into public-facing Puck renders. Enforced via `no-restricted-imports`.

## Multi-Tenancy Gotchas

- Central domain vs tenant domain is enforced at route/middleware level (`InitializeTenancyByDomain`, `PreventAccessFromCentralDomains`).
- Tenant-scoped queries need explicit `tenant_id` constraints — never rely on route model binding alone.
- Background jobs, webhooks, and analytics queries can lose tenant context — verify scoping.
- `pages.tenant_id` is NULL for central pages, set for tenant pages.

## Auth

- Hybrid model: in-memory bearer access token + HttpOnly refresh cookie (`byteforge_refresh`, path `/api/auth`).
- Guest auth uses separate refresh cookie (`byteforge_guest_refresh`, path `/api/guest-auth`).
- Cookies are host-scoped (no shared `session.domain`), SameSite=Lax, Secure in staging/prod.
- Password changes revoke outstanding refresh sessions. Logout revokes current bearer + refresh session.
- Do not mutate tokens, codes, signatures, or refresh-cookie values.

## Input Normalization

Field-family-driven, not global. Shared normalizer: `app/Actions/Api/NormalizeInputFieldsAction.php`. Each controller/action applies normalization at the request boundary for its specific field families. Never apply one sanitizer globally.

## Sensitive Areas

Tenancy boundaries, auth/session storage and refresh flows, payment provider callbacks and signature verification, booking holds/status transitions/management tokens, public-input normalization and output escaping.

## Staging Deploy

Push to `main` → `.github/workflows/deploy-staging.yml` → SSH deploy → `composer install --no-dev` → `npm ci && npm run build` → `migrate --force` → `RolePermissionSeeder` + `BillingCatalogSeeder` → Passport keys → config cache → queue restart with worker subscription verification → scheduler audit → post-deploy API smoke + mail smoke + Playwright auth smoke.
