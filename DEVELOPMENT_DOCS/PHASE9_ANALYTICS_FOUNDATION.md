# Phase 9: Analytics Foundation

**Status**: In Progress 🚧  
**Started**: March 3, 2026  
**Branch**: `feature/phase9-analytics-foundation`  
**Depends on**: Phase 8 (complete), Navigation v2 (complete)  
**Unblocks**: Phase 10 (Payments), Phase 11 (Booking Integration)

---

## Goal

Build a single, extensible event pipeline that every future analytics type (booking, revenue, platform, web) can consume. The entire system mirrors the existing activity log isolation pattern (`tenant_id = NULL` for central, `tenant_id = UUID` for tenants) so no new tenancy logic is invented.

---

## Core Principle

> One event store, many aggregation consumers.

```
Action occurs in the app
  (page.viewed, booking.created, payment.captured, tenant.activated, ...)
        ↓
AnalyticsService::record($event)          ← single fire point
        ↓
analytics_events table (append-only log)
        ↓
Multiple consumers reading the same rows:
  → Tenant dashboard widgets   (tenant_id scoped)
  → Central superadmin stats   (tenant_id IS NULL or platform-level)
  → Booking analytics          (event_type = 'booking.*')
  → Revenue reports            (event_type = 'payment.*')
  → Web analytics passthrough  (settings field per tenant, no DB needed)
```

Adding a new analytics type = fire a new event + write an aggregation query. No new infrastructure.

---

## Visibility Rules

### Central (Superadmin) only sees:

| Metric | Event types |
|--------|-------------|
| Total tenants / growth over time | `tenant.created`, `tenant.deleted` |
| Per-tenant feature usage | `page.published`, `booking.enabled`, `media.uploaded` |
| Platform revenue (subscription fees) | `platform.subscription.*` |
| System-level errors / failed jobs | `platform.error` |
| Which themes/features are active per tenant | `theme.activated` |

Central **cannot** see a tenant's customer bookings, their revenue, or their customers' data.

### Tenants only see (scoped to their own `tenant_id`):

| Metric | Event types |
|--------|-------------|
| Storefront page views / visitor traffic | `page.viewed` |
| Booking volume, status, cancellations | `booking.*` |
| Revenue from their customers | `payment.*` |
| Popular services / peak hours | `booking.created` (aggregated) |
| Team/CMS activity | already covered by activity log |

---

## Database Schema

### `analytics_events` table

```sql
id              bigint unsigned AUTO_INCREMENT PRIMARY KEY
tenant_id       varchar(255) NULL         -- NULL = platform event, UUID = tenant event
event_type      varchar(100) NOT NULL     -- e.g. 'page.viewed', 'booking.created'
subject_type    varchar(255) NULL         -- e.g. 'App\Models\Page'
subject_id      varchar(255) NULL         -- e.g. '42'
actor_type      varchar(255) NULL         -- who triggered it (User, System, Guest)
actor_id        varchar(255) NULL
properties      json NOT NULL             -- arbitrary event payload
occurred_at     timestamp NOT NULL        -- when it happened (not created_at)
created_at      timestamp NOT NULL        -- when it was written

INDEX idx_tenant_type (tenant_id, event_type)
INDEX idx_tenant_occurred (tenant_id, occurred_at)
INDEX idx_event_type_occurred (event_type, occurred_at)
```

**Key decisions:**
- `occurred_at` is separate from `created_at` so queued events retain the correct timestamp.
- `properties` is flexible JSON — each event type documents its own shape.
- No foreign key on `tenant_id` to keep the table append-only and fast under high insert load.
- Table is **never updated** — append-only log. Corrections = new corrective events.

### `analytics_aggregates` table (optional, Phase 9.3)

Pre-computed daily/weekly roll-ups for widgets that would be slow if computed on every request:

```sql
id              bigint unsigned AUTO_INCREMENT PRIMARY KEY
tenant_id       varchar(255) NULL
metric          varchar(100) NOT NULL     -- e.g. 'daily_page_views'
period_type     enum('hour','day','week','month') NOT NULL
period_start    date NOT NULL
value           decimal(15,4) NOT NULL    -- numeric aggregate
dimensions      json NULL                 -- e.g. {"page_slug": "home"}
created_at      timestamp NOT NULL
updated_at      timestamp NOT NULL

UNIQUE INDEX idx_agg_unique (tenant_id, metric, period_type, period_start, dimensions(500))
```

---

## Event Type Registry

Defined as PHP constants and TypeScript enums so both sides stay in sync.

### Platform events (`tenant_id = NULL`)
```
tenant.created
tenant.deleted
tenant.activated
tenant.suspended
platform.subscription.created
platform.subscription.cancelled
platform.error
```

### Tenant content events (`tenant_id = UUID`)
```
page.viewed              properties: { page_id, slug, referrer, user_agent_type }
page.published           properties: { page_id, slug }
theme.activated          properties: { theme_id, theme_name }
media.uploaded           properties: { media_id, size_bytes, mime_type }
```

### Booking events (Phase 11, pre-registered now)
```
booking.created          properties: { booking_id, service_id, amount }
booking.confirmed        properties: { booking_id }
booking.cancelled        properties: { booking_id, reason }
booking.completed        properties: { booking_id, duration_minutes }
```

### Payment events (Phase 10, pre-registered now)
```
payment.captured         properties: { payment_id, amount, currency, provider }
payment.refunded         properties: { payment_id, amount }
payment.failed           properties: { payment_id, reason }
```

---

## Package Decisions

### Backend: `spatie/laravel-stats`
Lightweight Spatie package for aggregating counts over time periods on any Eloquent model. Sits on top of `analytics_events` and removes the need to hand-roll every aggregation query.

```bash
composer require spatie/laravel-stats
```

### Frontend: shadcn charts (Recharts wrapper)
shadcn's chart component is a thin composition layer over Recharts — you write raw Recharts components (`BarChart`, `AreaChart`, etc.) inside `<ChartContainer>`. Not a wrapper lock-in: any Recharts feature works directly.

```bash
npm install recharts
```
Then add `resources/js/shared/components/ui/chart.tsx` (shadcn's `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`).

Also add chart CSS variables to `resources/css/app.css`:
```css
@layer base {
  :root {
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.714);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
  }
  .dark {
    --chart-1: oklch(0.488 0.243 264.376);
    --chart-2: oklch(0.696 0.17 162.48);
    --chart-3: oklch(0.769 0.188 70.08);
    --chart-4: oklch(0.627 0.265 303.9);
    --chart-5: oklch(0.645 0.246 16.439);
  }
}
```

### Web/Visitor analytics: Plausible (self-hosted, optional)
For tenant storefront visitor tracking (sessions, referrers, geo). Just a settings field per tenant (`analytics_tracking_id`) + a `<script>` tag injected in `public-central.blade.php`. No custom build required — not a Phase 9 blocker.

---

## Backend Implementation

### Phase 9.1 — Event Schema & Service (2–3 hrs)

**Files to create:**
- `database/migrations/YYYY_MM_DD_create_analytics_events_table.php`
- `database/migrations/YYYY_MM_DD_create_analytics_aggregates_table.php`
- `app/Models/AnalyticsEvent.php`
- `app/Services/AnalyticsService.php`
- `app/Events/Analytics/AnalyticsEventFired.php` (queued Eloquent event)

**`AnalyticsService`:**
```php
class AnalyticsService
{
    public function record(
        string $eventType,
        array $properties = [],
        ?string $tenantId = null,
        ?Model $subject = null,
        ?Model $actor = null,
        ?Carbon $occurredAt = null
    ): AnalyticsEvent {
        return AnalyticsEvent::create([
            'tenant_id'    => $tenantId ?? $this->resolveTenantId(),
            'event_type'   => $eventType,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject?->getKey(),
            'actor_type'   => $actor ? get_class($actor) : null,
            'actor_id'     => $actor?->getKey(),
            'properties'   => $properties,
            'occurred_at'  => $occurredAt ?? now(),
        ]);
    }

    private function resolveTenantId(): ?string
    {
        return tenancy()->initialized ? tenant('id') : null;
    }
}
```

**`AnalyticsEvent` model:**
```php
class AnalyticsEvent extends Model
{
    protected $casts = ['properties' => 'array', 'occurred_at' => 'datetime'];

    // Scopes
    public function scopeForTenant($query, string $tenantId) { ... }
    public function scopePlatformLevel($query) { ... }
    public function scopeOfType($query, string $type) { ... }
    public function scopeBetween($query, Carbon $from, Carbon $to) { ... }
}
```

---

### Phase 9.2 — Query Service & API Endpoints (3–4 hrs)

**Files to create:**
- `app/Services/AnalyticsQueryService.php`
- `app/Http/Controllers/Api/AnalyticsController.php`       ← tenant-scoped
- `app/Http/Controllers/Api/PlatformAnalyticsController.php` ← superadmin only

**`AnalyticsQueryService` methods:**
```php
// Tenant
public function tenantPageViews(string $tenantId, Carbon $from, Carbon $to): array
public function tenantBookingSummary(string $tenantId, Carbon $from, Carbon $to): array
public function tenantRevenueSummary(string $tenantId, Carbon $from, Carbon $to): array
public function tenantTopPages(string $tenantId, int $limit = 10): array

// Central
public function platformTenantGrowth(Carbon $from, Carbon $to): array
public function platformFeatureUsage(): array
public function platformRevenue(Carbon $from, Carbon $to): array
```

**API routes (add to `routes/api.php` and `routes/tenant.php`):**
```
// Central
GET /api/superadmin/analytics/overview
GET /api/superadmin/analytics/tenants/growth
GET /api/superadmin/analytics/platform/usage

// Tenant
GET /api/analytics/overview
GET /api/analytics/pages
GET /api/analytics/bookings          ← returns empty until Phase 11
GET /api/analytics/revenue           ← returns empty until Phase 10
```

Response shape (consistent across all endpoints):
```json
{
  "data": { ... },
  "period": { "from": "2026-01-01", "to": "2026-03-03" },
  "generated_at": "2026-03-03T12:00:00Z"
}
```

---

### Phase 9.3 — Page View Tracking (1–2 hrs)

This is the first real event being fired, and it validates the pipeline end-to-end.

**Backend:** Fire `page.viewed` in `PageController::show()`:
```php
$this->analytics->record('page.viewed', [
    'page_id'         => $page->id,
    'slug'            => $page->slug,
    'referrer'        => $request->header('Referer'),
    'user_agent_type' => $this->classifyUserAgent($request),
], tenantId: $page->tenant_id);
```

**Frontend integration (web analytics passthrough):**
- Add `analytics_tracking_id` field to tenant settings (Google Analytics 4 Measurement ID / Plausible domain)
- Inject appropriate `<script>` tag in `public-central.blade.php` if set
- No custom event tracking needed — GA4/Plausible handles visitor-level detail

---

## Frontend Implementation

### Phase 9.4 — Tenant Analytics Dashboard (3–4 hrs)

**Files to create:**
- `resources/js/shared/components/ui/chart.tsx` — shadcn chart wrapper
- `resources/js/apps/central/components/pages/AnalyticsPage.tsx`
- `resources/js/shared/services/api/analytics.ts`
- `resources/js/shared/components/molecules/AnalyticsWidget.tsx`

**Widget → chart type mapping:**

| Widget | Chart type | Recharts component |
|--------|-----------|-------------------|
| Page views over time | Area (gradient, interactive) | `AreaChart` + `Area` |
| Top pages by views | Bar (horizontal, ranked) | `BarChart` + `Bar` |
| Booking status breakdown (Phase 11) | Pie or Radial | `PieChart` + `Pie` |
| Revenue trend (Phase 10) | Area (stacked) | `AreaChart` + multiple `Area` |
| Active visitors KPI | Stat card (number + trend) | `Card` + `Badge` |

**Booking and revenue widgets render an empty/placeholder state** until Phases 10–11 fire their events. No conditional feature flags needed — the API simply returns zero data.

**Date range selector:** 7d / 30d / 90d tabs (shadcn `Tabs`) driving `from`/`to` query params via React Query.

**Chart usage pattern:**
```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import { AreaChart, Area, XAxis, CartesianGrid } from 'recharts'

<ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  <AreaChart data={data}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="date" tickLine={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Area dataKey="views" fill="var(--color-views)" stroke="var(--color-views)" />
  </AreaChart>
</ChartContainer>
```

### Phase 9.5 — Central Analytics Dashboard (2–3 hrs)

**Widget → chart type mapping:**

| Widget | Chart type | Recharts component |
|--------|-----------|-------------------|
| Tenant growth over time | Area or Line | `AreaChart` / `LineChart` |
| Feature adoption rates | Bar (grouped) | `BarChart` + multiple `Bar` |
| Platform revenue trend (Phase 10) | Area (stacked) | `AreaChart` + `Area` |
| Top active tenants | Bar (ranked) | `BarChart` + `Bar` |
| New tenants this month KPI | Stat card | `Card` + trend indicator |

---

## Testing Plan

| Layer | What to test | Type |
|-------|-------------|------|
| `AnalyticsService::record()` | Correct tenant_id resolved, event stored | Unit |
| `AnalyticsEvent` scopes | `forTenant()`, `platformLevel()`, `ofType()`, `between()` | Unit |
| `AnalyticsQueryService` | Correct aggregation, period filtering | Unit |
| Tenant isolation | Tenant A cannot see Tenant B events | Feature |
| Central isolation | Platform endpoint excludes tenant events | Feature |
| `page.viewed` fires | Page view recorded on public page load | Feature |
| API endpoints | Auth, response shape, empty state | Feature |
| Frontend `AnalyticsPage` | Renders with mocked data, handles loading/error | Component |

All existing tests must continue passing. Target 80%+ coverage on new service code.

---

## Acceptance Criteria

- [ ] `analytics_events` table exists in all tenants and central DB
- [ ] `AnalyticsService::record()` writes correct row with resolved `tenant_id`
- [ ] Tenant queries never return other tenants' events
- [ ] Central queries never return tenant-scoped events
- [ ] `page.viewed` fires on every public storefront page load
- [ ] Tenant analytics API returns overview with page views
- [ ] Central analytics API returns tenant growth data
- [ ] Tenant dashboard has `/dashboard/analytics` route with working widgets
- [ ] Empty states displayed cleanly for booking/revenue until those phases land
- [ ] All new tests pass, no regressions

---

## Phase Summary

| Sub-phase | Description | Est. Time |
|-----------|-------------|-----------|
| 9.1 | Event schema + `AnalyticsService` + `AnalyticsEvent` model | 2–3 hrs |
| 9.2 | `AnalyticsQueryService` + API endpoints (tenant + central) | 3–4 hrs |
| 9.3 | `page.viewed` tracking + web analytics passthrough setting | 1–2 hrs |
| 9.4 | Tenant analytics dashboard (frontend) | 3–4 hrs |
| 9.5 | Central analytics dashboard (frontend) | 2–3 hrs |
| **Total** | | **~12–16 hrs** |

---

## What Phase 10+ Adds On Top

- **Phase 10 (Payments):** Fires `payment.captured`, `payment.refunded`, `payment.failed` into the pipeline. Revenue widgets activate automatically.
- **Phase 11 (Booking):** Fires `booking.*` events. Booking widgets activate automatically.
- **Any future type:** Define event shape → fire in domain code → write aggregation query → add widget. No schema changes.
