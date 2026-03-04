# Phase 9: Execution Checklist

**Branch:** `feature/phase9-analytics-foundation`  
**Last Updated:** March 4, 2026  
**Rule:** Do not proceed to the next gate until the current gate's tests pass.

---

## Active Strategies

### ✅ TDD (Test-Driven Development) — Primary
Write the test first. Run it (red). Implement minimum code to make it pass (green). Refactor.  
Every new service method, model scope, and API endpoint gets a test _before_ its implementation.

### ✅ Tenant Isolation Pattern — Mirrors Activity Log
`tenant_id = NULL` → platform/central.  
`tenant_id = UUID` → tenant-scoped.  
All queries use explicit scopes (`forTenant()`, `platformLevel()`). Never rely on ambient tenancy context alone in queries. This is the same contract used by `TenantActivity` and `ActivityLogController`.

### ✅ Service Layer (Thin Controllers)
Business logic lives in `AnalyticsService` and `AnalyticsQueryService`. Controllers validate the request, call the service, and return the response. No query logic in controllers.

### ✅ Append-Only Event Log
The `analytics_events` table is **never updated**. Records are only inserted. Corrections = new events. No `UPDATE` calls anywhere in analytics code.

### ✅ CQRS (Light) — writes vs reads are separate classes
`AnalyticsService` = writes (`record()`).  
`AnalyticsQueryService` = reads (all aggregation methods).  
They must not call each other.

### ✅ YAGNI
`booking.*` and `payment.*` event types are defined as constants now (so the enum is complete), but no logic fires them until Phases 10/11. Do not implement aggregation queries for booking or payment in Phase 9.

### ✅ Consistent Response Envelope
All analytics API responses use:
```json
{
  "data": { ... },
  "period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "generated_at": "ISO8601"
}
```
No exceptions. Frontend depends on this shape.

---

## Stop/Go Gates

```
Gate 1 ──► Gate 2 ──► Gate 3 ──► Gate 4 (done)
 9.1         9.2        9.3+9.4+9.5   PR
```

**Gate 1** (before starting 9.2): Unit tests for `AnalyticsService::record()` and all `AnalyticsEvent` scopes pass.  
**Gate 2** (before starting 9.3): Feature tests for both API endpoint groups (tenant + central) pass, including isolation assertions.  
**Gate 3** (before marking phase done): `page.viewed` fires on a real page load in a seeded test. All acceptance criteria below are checked.  
**Gate 4**: All existing backend tests still pass (`php artisan test`). CURRENT_STATUS.md and ROADMAP.md updated.

---

## Sub-Phase 9.1 — Event Schema + Service + Model

### TDD Order

1. Write `AnalyticsServiceTest` (unit) — assert `record()` writes a row with correct `tenant_id`, `event_type`, `properties`, `occurred_at`.
2. Write `AnalyticsEventScopesTest` (unit) — assert `forTenant()`, `platformLevel()`, `ofType()`, `between()` filter correctly.
3. Implement migration(s) and model to make tests pass.
4. Implement `AnalyticsService::record()` to make service test pass.
5. Refactor.

### Files to Create

| File | Notes |
|------|-------|
| `database/migrations/YYYY_MM_DD_create_analytics_events_table.php` | See schema in PHASE9_ANALYTICS_FOUNDATION.md |
| `database/migrations/YYYY_MM_DD_create_analytics_aggregates_table.php` | Optional roll-up table; can defer |
| `app/Models/AnalyticsEvent.php` | Casts, 4 query scopes, no foreign key on tenant_id |
| `app/Services/AnalyticsService.php` | Only `record()` method + private `resolveTenantId()` |
| `app/Events/Analytics/AnalyticsEventFired.php` | Queued Laravel event; fired after insert |
| `tests/Unit/AnalyticsServiceTest.php` | Written FIRST |
| `tests/Unit/AnalyticsEventScopesTest.php` | Written FIRST |

### Schema (do not deviate)

```
analytics_events
  id              bigint unsigned AUTO_INCREMENT PRIMARY KEY
  tenant_id       varchar(255) NULL
  event_type      varchar(100) NOT NULL
  subject_type    varchar(255) NULL
  subject_id      varchar(255) NULL
  actor_type      varchar(255) NULL
  actor_id        varchar(255) NULL
  properties      json NOT NULL
  occurred_at     timestamp NOT NULL
  created_at      timestamp NOT NULL

  INDEX (tenant_id, event_type)
  INDEX (tenant_id, occurred_at)
  INDEX (event_type, occurred_at)
```

### Event Type Constants (define all now, implement only `page.*` now)

```php
// app/Models/AnalyticsEvent.php — as class constants
const TYPE_PLATFORM_TENANT_CREATED       = 'tenant.created';
const TYPE_PLATFORM_TENANT_DELETED       = 'tenant.deleted';
const TYPE_PLATFORM_TENANT_ACTIVATED     = 'tenant.activated';
const TYPE_PLATFORM_TENANT_SUSPENDED     = 'tenant.suspended';
const TYPE_PLATFORM_SUBSCRIPTION_CREATED = 'platform.subscription.created';
const TYPE_PLATFORM_SUBSCRIPTION_CANCELLED = 'platform.subscription.cancelled';
const TYPE_PLATFORM_ERROR                = 'platform.error';
const TYPE_PAGE_VIEWED                   = 'page.viewed';
const TYPE_PAGE_PUBLISHED                = 'page.published';
const TYPE_THEME_ACTIVATED               = 'theme.activated';
const TYPE_MEDIA_UPLOADED                = 'media.uploaded';
// Phase 10 — defined, not consumed
const TYPE_PAYMENT_CAPTURED              = 'payment.captured';
const TYPE_PAYMENT_REFUNDED              = 'payment.refunded';
const TYPE_PAYMENT_FAILED                = 'payment.failed';
// Phase 11 — defined, not consumed
const TYPE_BOOKING_CREATED               = 'booking.created';
const TYPE_BOOKING_CONFIRMED             = 'booking.confirmed';
const TYPE_BOOKING_CANCELLED             = 'booking.cancelled';
const TYPE_BOOKING_COMPLETED             = 'booking.completed';
```

### Gate 1 Checklist

- [ ] Migration creates `analytics_events` with all columns and indexes
- [ ] `AnalyticsEvent::forTenant($tenantId)` filters by `tenant_id = $tenantId`
- [ ] `AnalyticsEvent::platformLevel()` filters by `tenant_id IS NULL`
- [ ] `AnalyticsEvent::ofType($type)` filters by `event_type`
- [ ] `AnalyticsEvent::between($from, $to)` filters by `occurred_at`
- [ ] `AnalyticsService::record()` writes a row with resolved `tenant_id`
- [ ] `record()` uses `tenancy()->initialized ? tenant('id') : null` for tenant resolution
- [ ] `record()` accepts explicit `$tenantId` override (for events fired outside tenant context)
- [ ] `occurred_at` defaults to `now()` but can be passed explicitly
- [ ] All Gate 1 unit tests pass in isolation (no database seeding required)

---

## Sub-Phase 9.2 — Query Service + API Endpoints

### TDD Order

1. Write `AnalyticsQueryServiceTest` (unit) — assert each aggregation method returns correct shape.
2. Write `TenantAnalyticsApiTest` (feature) — assert auth, response envelope, tenant isolation.
3. Write `CentralAnalyticsApiTest` (feature) — assert superadmin-only, platform-level rows only.
4. Write `AnalyticsIsolationTest` (feature) — Tenant A cannot see Tenant B events; central cannot see tenant events.
5. Implement `AnalyticsQueryService` to make unit tests pass.
6. Implement controllers + register routes to make feature tests pass.

### Files to Create

| File | Notes |
|------|-------|
| `app/Services/AnalyticsQueryService.php` | Read-only; depend on `AnalyticsEvent` model |
| `app/Http/Controllers/Api/AnalyticsController.php` | Tenant-scoped; uses `auth:api` middleware |
| `app/Http/Controllers/Api/PlatformAnalyticsController.php` | Superadmin-only |
| `tests/Unit/AnalyticsQueryServiceTest.php` | Written FIRST |
| `tests/Feature/Api/TenantAnalyticsApiTest.php` | Written FIRST |
| `tests/Feature/Api/CentralAnalyticsApiTest.php` | Written FIRST |
| `tests/Feature/Api/AnalyticsIsolationTest.php` | Written FIRST |

### Routes to Register (add to existing route files, do not create new ones)

```php
// routes/api.php — central routes
Route::middleware(['auth:api', 'superadmin'])->prefix('superadmin/analytics')->group(function () {
    Route::get('overview',         [PlatformAnalyticsController::class, 'overview']);
    Route::get('tenants/growth',   [PlatformAnalyticsController::class, 'tenantGrowth']);
    Route::get('platform/usage',   [PlatformAnalyticsController::class, 'featureUsage']);
});

// routes/tenant.php — tenant-scoped routes
Route::middleware('auth:api')->prefix('analytics')->group(function () {
    Route::get('overview',  [AnalyticsController::class, 'overview']);
    Route::get('pages',     [AnalyticsController::class, 'pages']);
    Route::get('bookings',  [AnalyticsController::class, 'bookings']);   // returns empty until Phase 11
    Route::get('revenue',   [AnalyticsController::class, 'revenue']);    // returns empty until Phase 10
});
```

### AnalyticsQueryService Methods (9.2 scope only)

```php
// Tenant queries (always scoped to $tenantId)
public function tenantPageViews(string $tenantId, Carbon $from, Carbon $to): array
public function tenantTopPages(string $tenantId, int $limit = 10): array

// Central queries (only platform-level events, tenant_id IS NULL or cross-tenant aggregates)
public function platformTenantGrowth(Carbon $from, Carbon $to): array
public function platformFeatureUsage(): array
```

### Gate 2 Checklist

- [ ] `GET /api/analytics/overview` returns 401 for unauthenticated requests
- [ ] `GET /api/analytics/overview` returns correct envelope `{ data, period, generated_at }`
- [ ] Tenant A's overview contains only Tenant A's events (zero from Tenant B)
- [ ] `GET /api/superadmin/analytics/overview` returns 403 for non-superadmin
- [ ] Central overview contains no rows with a non-null `tenant_id`
- [ ] `bookings` and `revenue` endpoints return `data: {}` / empty arrays (not 404, not 500)
- [ ] All Gate 1 checks still pass

---

## Sub-Phase 9.3 — `page.viewed` Tracking + Web Analytics Passthrough

### TDD Order

1. Write `PageViewTrackingTest` (feature) — assert that a public page request fires a `page.viewed` row.
2. Implement the `AnalyticsService::record()` call in `PageController::show()`.
3. Optionally: add `analytics_tracking_id` to tenant settings and inject script tag in blade.

### Files to Modify

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/PageController.php` | Inject `AnalyticsService`; call `record()` in `show()` |
| `tests/Feature/Api/PageViewTrackingTest.php` | Written FIRST |

> **Scope boundary:** Web analytics passthrough (GA4/Plausible script injection) is optional and must not block 9.4. Add `analytics_tracking_id` to settings only if time allows; otherwise stub the field for Phase 9.5.

### Gate 3 Checklist (partial — before frontend)

- [ ] Requesting a public page creates one `analytics_events` row with `event_type = 'page.viewed'`
- [ ] Row contains `{ page_id, slug, referrer, user_agent_type }` in `properties`
- [ ] Row `tenant_id` matches the page's tenant
- [ ] Requesting the same page twice creates two rows (append-only confirmed)
- [ ] No 500 errors if analytics write fails (fire-and-forget where needed)

---

## Sub-Phase 9.4 — Tenant Analytics Dashboard (Frontend)

### Files to Create

| File | Notes |
|------|-------|
| `resources/js/shared/components/ui/chart.tsx` | shadcn ChartContainer + ChartTooltip wrappers |
| `resources/js/shared/services/api/analytics.ts` | API client for tenant + central analytics endpoints |
| `resources/js/shared/services/api/types.ts` | Add `AnalyticsOverview`, `AnalyticsPageView`, etc. |
| `resources/js/apps/central/components/pages/AnalyticsPage.tsx` | Tenant analytics dashboard page |
| `resources/js/shared/components/molecules/AnalyticsWidget.tsx` | Reusable stat card + chart widget |

### Packages Required

```bash
npm install recharts
# shadcn chart.tsx is hand-added (not a package) — create the file directly
```

Add chart CSS variables to `resources/css/app.css` (values in PHASE9_ANALYTICS_FOUNDATION.md).

### Widget map (stick to this, no extras in 9.4)

| Widget | Chart type | Data source |
|--------|-----------|-------------|
| Page views over time | `AreaChart` | `GET /api/analytics/pages` |
| Top pages by views | `BarChart` (horizontal) | `GET /api/analytics/pages` |
| Active visitors KPI | Stat card | `GET /api/analytics/overview` |
| Booking status (Phase 11) | Placeholder / empty state | — |
| Revenue trend (Phase 10) | Placeholder / empty state | — |

### Date range control

3 tab options only: `7d / 30d / 90d`. Drives `from`/`to` query params via React Query. No custom date pickers in Phase 9.

### Testing (frontend)

| Test file | What it covers |
|-----------|---------------|
| `analytics.test.ts` | API client request shapes |
| `AnalyticsPage.test.tsx` | Renders loading / error / empty states with mocked data |
| `AnalyticsWidget.test.tsx` | Stat card renders value + trend indicator |

### Gate 3 (frontend part)

- [ ] `/dashboard/analytics` route exists and is accessible to authenticated users
- [ ] Page views area chart renders with mocked response
- [ ] Loading skeleton shown while data is fetching
- [ ] Empty state shown cleanly when no data exists (no chart errors)
- [ ] Booking and revenue widgets show explicit "Available in a future update" placeholder

---

## Sub-Phase 9.5 — Central Analytics Dashboard (Frontend)

### Files to Create / Modify

| File | Notes |
|------|-------|
| `resources/js/apps/central/components/pages/PlatformAnalyticsPage.tsx` | Central-only dashboard |
| Update menu config: `resources/js/apps/central/config/menu.ts` | Add Analytics link |

### Widget map (9.5 only)

| Widget | Chart type | Data source |
|--------|-----------|-------------|
| Tenant growth over time | `AreaChart` or `LineChart` | `GET /api/superadmin/analytics/tenants/growth` |
| Feature adoption | `BarChart` (grouped) | `GET /api/superadmin/analytics/platform/usage` |
| New tenants KPI | Stat card | `GET /api/superadmin/analytics/overview` |
| Platform revenue (Phase 10) | Placeholder / empty state | — |

---

## Phase Done Acceptance Criteria

These map directly to the acceptance criteria in PHASE9_ANALYTICS_FOUNDATION.md. All must be checked before merging to `main`.

- [ ] `analytics_events` table exists (migration applied in all contexts)
- [ ] `AnalyticsService::record()` writes correct row with resolved `tenant_id`
- [ ] Tenant queries never return another tenant's events
- [ ] Central queries never return tenant-scoped events
- [ ] `page.viewed` fires on every public storefront page load
- [ ] Tenant analytics API returns overview with page views
- [ ] Central analytics API returns tenant growth data
- [ ] `/dashboard/analytics` route has working widgets
- [ ] Empty states displayed cleanly for booking/revenue
- [ ] `php artisan test` — all existing + new backend tests pass
- [ ] `npm run test:run` — all existing + new frontend tests pass (or documented skip reasons)
- [ ] CURRENT_STATUS.md updated (Phase 9 marked complete)
- [ ] ROADMAP.md updated (Phase 9 ✅, Phase 10 next)
- [ ] Phase 9 doc moved to `archive/completed-phases/`

---

## What We Are NOT Doing in Phase 9

- ❌ Aggregating `booking.*` or `payment.*` events
- ❌ Building subscription/revenue charts
- ❌ `analytics_aggregates` table (defer unless page view queries are slow)
- ❌ Custom date range picker (7d/30d/90d tabs only)
- ❌ Web analytics passthrough (nice to have, not a blocker)
- ❌ Cron jobs for pre-computed roll-ups (Phase Advanced Analytics)
- ❌ DDD domain folder refactor (current flat Services/ structure is fine for this phase)
