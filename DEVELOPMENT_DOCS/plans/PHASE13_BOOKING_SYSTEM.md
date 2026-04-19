# Phase 13: Booking System

**Status**: Implemented on `main`; this file now mixes current state with historical planning detail  
**Historical branch target**: `feature/phase13-booking-system`  
**Depends on**: Phase 12 (Tenant Runtime Readiness) ✅, Addon Foundation ✅  
**Unlocks**: Phase 14 (Booking × Payment integration) ✅  
**Last Verified Against Code**: April 19, 2026

## Implementation Reality Check

Phase 13 is no longer planned work. The booking system exists in production code
on `main`, including:

- booking models, migrations, and availability services,
- public booking API and tenant booking CMS API,
- booking widget runtime and editor integration,
- booking CMS pages for services, resources, calendar, detail, and settings,
- tenant add-on gated booking routes and navigation.

Related follow-up work has also landed after the original phase implementation,
including booking payment integration, dashboard localization, navigation
localization, and booking customer-input hardening.

Use this file primarily for booking design context, known follow-ups, and older
planning rationale. Do not treat the older planning language below as proof that
the feature is still unimplemented.

## Current Follow-Ups Still Worth Tracking

- wizard order should move to `service -> date -> resource -> slot`
- the resource step should support an "Any available" option
- the resource step heading should respect the configured `resource_label`
- owner/staff notification behavior should be audited for consistency
- anonymous timeline rendering should avoid the dangling customer `#`

---

## Goal

Build a white-label booking engine that any service-based business can activate as an add-on. The same data model must serve radically different business types without forking — hairdressers, tattoo studios, nail salons, auto workshops, BnB hosts, yoga studios, escape rooms, and more.

The entire system lives behind the `addon:booking` middleware and is only visible to tenants who have purchased the add-on.

---

## Core Design Principle: Resources, not "Staff"

The central abstraction is a **Resource** — anything that can be booked. A resource has a `type` and a `booking_mode`:

| `type`        | `booking_mode` | Real-world examples                              |
|---------------|----------------|--------------------------------------------------|
| `person`      | `slot`         | Hairdresser, tattoo artist, personal trainer     |
| `space`       | `slot`         | Yoga class room (capacity > 1), massage room     |
| `equipment`   | `slot`         | Company car, camera rental, test-drive vehicle   |
| `space`       | `range`        | BnB room, vacation apartment, office suite       |
| `equipment`   | `range`        | Canoe rental, construction equipment             |

A **Service** defines what the booking is for (duration, price, booking_mode). A **Resource** defines who/what fulfils it. The many-to-many pivot `resource_services` links them.

This makes adding new business types zero-schema-work: just configure resources + services.

---

## Sub-phases

| Phase | Scope | Est. effort |
|-------|-------|------------|
| 13.1 | Data model — 6 migrations, models, factories | 1–2 days |
| 13.2 | Availability engine — slot computation, block checks, conflict detection | 2–3 days |
| 13.3 | Public API — unauthenticated guest booking flows | 1–2 days |
| 13.4 | CMS API — resources, services, blocks, booking management + reschedule | 1–2 days |
| 13.5 | Notifications — email templates, queued jobs, reminder scheduler | 2 days |
| 13.6 | BookingWidget — Puck component, multi-step wizard, slot hold | 2–3 days |
| 13.7 | CMS pages — calendar (with inline actions + block UI), resource/service managers | 2–3 days |

---

## Phase 13.1 — Data Model

### Schema

#### `booking_resources` table

```sql
id              BIGINT UNSIGNED PK
tenant_id       VARCHAR -- tenancy scope
name            VARCHAR(120)
type            ENUM('person', 'space', 'equipment')
capacity        TINYINT UNSIGNED DEFAULT 1  -- 1=one-on-one, N=group/multi-seat
resource_label  VARCHAR(60) NULLABLE        -- tenant override: "Therapist", "Room", "Vehicle"
user_id         BIGINT UNSIGNED NULLABLE FK -> users.id  -- links to a tenant user account
is_active       BOOLEAN DEFAULT TRUE
timestamps

INDEX (tenant_id, user_id)
```

> `capacity > 1` enables group classes (yoga), multi-seat spaces, etc.  
> `resource_label` lets tenants show "Choose your room" instead of "Choose your resource".  
> `user_id` links a `person` resource to their tenant user account. Enables: staff-scoped calendar view ("show only my bookings"), staff email notification with correct name resolution, and future self-service availability management. NULL for space/equipment resources.

#### `booking_services` table

```sql
id                    BIGINT UNSIGNED PK
tenant_id             VARCHAR
name                  VARCHAR(120)
description           TEXT NULLABLE
booking_mode          ENUM('slot', 'range')        -- appointment vs multi-day
duration_minutes      SMALLINT UNSIGNED NULLABLE   -- slot mode only; NULL = range
slot_interval_minutes SMALLINT UNSIGNED NULLABLE   -- step between offered slots; NULL = same as duration_minutes
                                                   -- e.g. 60-min service with 30-min interval = rolling starts
min_nights            TINYINT UNSIGNED NULLABLE    -- range mode minimum stay
max_nights            SMALLINT UNSIGNED NULLABLE   -- range mode maximum; NULL = unlimited
buffer_minutes        SMALLINT UNSIGNED DEFAULT 0  -- cleanup/gap after each booking (invisible to customer)
advance_notice_hours  SMALLINT UNSIGNED DEFAULT 0  -- minimum lead time before booking is accepted
max_advance_days      SMALLINT UNSIGNED NULLABLE   -- booking window cap; NULL = unlimited
price                 DECIMAL(10,2) NULLABLE       -- NULL = "price on request"
currency              CHAR(3) DEFAULT 'SEK'
is_active             BOOLEAN DEFAULT TRUE
timestamps
```

> **`slot_interval_minutes`** separates two related concepts:
> - `duration_minutes` = how long the appointment occupies the resource
> - `slot_interval_minutes` = how often slots are offered to customers
>
> Examples:
> - Hairdresser: 45-min cut, slots every 30 min (overlapping; one chair, tight schedule) → `duration=45, interval=30`
> - Massage: 60-min session, slots every 60 min (back-to-back) → `duration=60, interval=60` (or NULL)
> - Auto workshop: 90-min service, slots every 15 min (multiple bays) → `duration=90, interval=15`
>
> The availability engine will never offer a slot that would conflict with an existing booking when accounting for `duration_minutes + buffer_minutes`.

#### `booking_resource_services` (pivot)

```sql
resource_id  FK -> booking_resources.id
service_id   FK -> booking_services.id
PRIMARY KEY (resource_id, service_id)
```

#### `booking_availabilities` table

Defines when a resource is available (recurring weekly + one-off overrides).

```sql
id             BIGINT UNSIGNED PK
resource_id    FK -> booking_resources.id
day_of_week    TINYINT NULLABLE   -- 0=Sun … 6=Sat; NULL = specific date rule
specific_date  DATE NULLABLE      -- overrides weekly pattern for that date
starts_at      TIME               -- e.g. 09:00:00
ends_at        TIME               -- e.g. 17:00:00
is_blocked     BOOLEAN DEFAULT FALSE  -- TRUE = closed/holiday/vacation block
timestamps
```

> **Precedence**: `specific_date` rows always override `day_of_week` rows for that date.  
> **Breaks**: model as two windows (09:00–12:00 + 13:00–17:00) rather than one with a hole.

#### `booking_resource_blocks` table

For blocking one or more days from accepting new bookings (vacations, sick leave, maintenance). Separate from `booking_availabilities` because blocks often span date ranges and are created by staff/owners — not part of the regular schedule definition.

```sql
id           BIGINT UNSIGNED PK
resource_id  FK -> booking_resources.id
start_date   DATE               -- inclusive
end_date     DATE               -- inclusive; same as start_date for a single day
reason       VARCHAR(120) NULLABLE  -- e.g. "Annual leave", "Maintenance"
created_by   BIGINT UNSIGNED FK -> users.id  -- audit trail: which owner/admin created the block
timestamps

INDEX (resource_id, start_date, end_date)
```

> **Precedence over `booking_availabilities`**: any day falling inside a block is treated as fully unavailable, regardless of the weekly schedule.
>
> **Conflict detection on block creation**: the CMS API warns (but does not prevent) if confirmed bookings exist within the block range. The owner must handle those manually before or after creating the block.

#### `bookings` table

```sql
id               BIGINT UNSIGNED PK
tenant_id        VARCHAR
service_id       FK -> booking_services.id
resource_id      FK -> booking_resources.id

-- Customer info (guest-friendly)
customer_name    VARCHAR(120)
customer_email   VARCHAR(255)
customer_phone   VARCHAR(30) NULLABLE

-- Timing (UTC; always stored in UTC)
starts_at        DATETIME NULLABLE  -- slot mode start, range mode check-in datetime
ends_at          DATETIME NULLABLE  -- slot mode end, range mode check-out datetime

-- Status lifecycle
status           ENUM('pending','awaiting_payment','confirmed','completed','cancelled','no_show')
                 DEFAULT 'pending'
-- awaiting_payment: used when payment deposit is required before confirmation (Phase 14);
--   added now to avoid a breaking migration when payments × booking cross-addon ships.

-- Recurring booking link (seed for future; self-referential)
parent_booking_id BIGINT UNSIGNED NULLABLE FK -> bookings.id
-- NULL  = standalone booking
-- SET   = this is one occurrence of a recurring series rooted at parent_booking_id

-- Guest management
management_token VARCHAR(64) UNIQUE  -- hex(random_bytes(32)); for guest cancel/reschedule
token_expires_at DATETIME            -- starts_at + 24 hours (past-booking housekeeping)

-- Optional payment link (cross-addon)
payment_id       BIGINT UNSIGNED NULLABLE FK -> payments.id

-- Notes (split by visibility)
internal_notes   TEXT NULLABLE  -- tenant-only; never shown to customer
customer_notes   TEXT NULLABLE  -- customer provided ("I'm allergic to X", "vehicle reg: ABC123")
                                -- shown back to customer on management page + in staff calendar

cancelled_at     DATETIME NULLABLE
cancelled_by     ENUM('customer','tenant') NULLABLE

timestamps
softDeletes
```

> `management_token` is a hex-encoded `random_bytes(32)` — 64 chars, cryptographically secure.  
> Never returned in list responses. Only emailed once to the customer.  
> `awaiting_payment` preempts a breaking migration when Phase 14 payment deposits ship.  
> `parent_booking_id` seeds recurring booking support with zero application logic in v1 — just a nullable FK.

### DB-level uniqueness guard

```sql
UNIQUE INDEX no_double_book (resource_id, starts_at, ends_at)
-- enforced at DB level; application-level check runs first for user-friendly error
```

For group bookings (`capacity > 1`), this constraint does NOT apply — the application tracks headcount instead.

#### `booking_notifications` table

Replaces the "reminders_sent JSON column" pattern. A proper table means notifications are queryable, debuggable, and multi-channel-ready without any schema change when SMS or push channels are added.

```sql
id          BIGINT UNSIGNED PK
booking_id  FK -> bookings.id
type        VARCHAR(60)  -- 'confirmed', 'reminder_24h', 'reminder_1h', 'cancelled',
                         --  'rescheduled', 'completed', etc.
channel     ENUM('email','push','sms') DEFAULT 'email'
recipient   ENUM('customer','staff','admin')
sent_at     DATETIME

INDEX (booking_id, type, channel)
```

> Reminder scheduler queries: `WHERE booking_id = ? AND type = 'reminder_24h'` → if row exists, skip. Clean and fast.

#### `booking_events` table (audit log)

Every state transition on a booking is appended here. Immutable append-only log. Critical for resolving customer disputes ("I never cancelled it") and for the activity feed on `BookingDetailPage`.

```sql
id             BIGINT UNSIGNED PK
booking_id     FK -> bookings.id
from_status    VARCHAR(30) NULLABLE  -- NULL on first create
to_status      VARCHAR(30)
actor_type     ENUM('customer','tenant_user','system')
actor_id       BIGINT UNSIGNED NULLABLE  -- tenant user ID if actor_type = tenant_user
note           VARCHAR(255) NULLABLE     -- cancellation reason, reschedule note, etc.
created_at     DATETIME

INDEX (booking_id, created_at)
```

> Append only — no `updated_at`, no `softDeletes`. Records are never mutated.  
> `system` actor covers: auto-confirm, reminder dispatch, GDPR anonymisation, hold expiry.

### Key Models

- `BookingResource` — scoped by `tenant_id`, has `services()`, `availabilities()`, `blocks()`, `bookings()`, `user()` (nullable)
- `BookingService` — scoped by `tenant_id`, has `resources()`
- `BookingAvailability` — belongs to `BookingResource`
- `BookingResourceBlock` — belongs to `BookingResource`; date-range blocking (vacation, maintenance)
- `Booking` — scoped by `tenant_id`, belongs to `BookingResource` + `BookingService`; has `notifications()`, `events()`, `children()` (recurring)
- `BookingNotification` — append-only, belongs to `Booking`
- `BookingEvent` — append-only audit log, belongs to `Booking`

### Factories

Factories for all seven models covering: slot + range modes, various business types, active/inactive states, all status values (including `awaiting_payment`), single-day and multi-day blocks, notification history rows, and event log sequences.

---

## Phase 13.2 — Availability Engine

`BookingAvailabilityService` is a pure, no-HTTP service class. All methods are unit-testable.

### Core responsibilities

#### `getSlotsForDate(BookingService $service, BookingResource $resource, Carbon $date): Collection`

1. Check `BookingResourceBlock` — if `$date` falls inside any block for `$resource`, return empty collection immediately.
2. Load `BookingAvailability` windows for `$resource` on `$date` (specific_date overrides day_of_week).
3. If no active windows → return empty collection.
4. Walk the windows using **`$service->slot_interval_minutes ?? $service->duration_minutes`** as the step between candidate slot starts. Each candidate slot occupies `duration_minutes` on the resource timeline.
5. Apply `buffer_minutes`: a candidate slot is unavailable if it would start before `existing_booking.ends_at + buffer_minutes`.
6. Load confirmed + pending-hold bookings for `$resource` on `$date`; eliminate any candidate whose `[starts_at, starts_at + duration_minutes)` overlaps an existing booking's `[starts_at, ends_at + buffer_minutes)`.
7. Apply `advance_notice_hours`: eliminate slots where `candidate.starts_at < now() + advance_notice_hours`.
8. Apply `max_advance_days`: eliminate slots where `candidate.starts_at > today() + max_advance_days`.
9. Return `[{starts_at, ends_at, available: true|false}]` — callers can show greyed-out slots for context.

#### `isRangeAvailable(BookingService $service, BookingResource $resource, Carbon $checkIn, Carbon $checkOut): bool`

1. Validate `$checkOut > $checkIn`.
2. Validate minimum/maximum nights.
3. Check `BookingResourceBlock` — if any block overlaps the requested range, return `false`.
4. Check that all calendar days in the range have active availability windows (not `is_blocked`).
5. Check for any confirmed bookings that overlap the range.
6. Apply gap/buffer — if service has `buffer_minutes`, treat it as an extra blocked period after each booking.
7. Return `true` if all checks pass.

#### `getAvailableResources(BookingService $service, Carbon $startsAt, Carbon $endsAt): Collection`

Returns all resources that can fulfil the service for the given window. Powers the "any available" selection.

### Concurrency handling

The availability engine selects pessimistically under a DB row lock when creating a booking:

```php
DB::transaction(function () use ($resource, $startsAt, $endsAt) {
    BookingResource::where('id', $resource->id)->lockForUpdate()->first();
    // re-check availability inside the transaction
    // then create the booking
});
```

A DB-level unique index on `(resource_id, starts_at, ends_at)` is the final safety net for slot bookings.

### DST handling

All slot computation runs in the **tenant's configured timezone** using `Carbon::setTimezone($tenantTimezone)`. The resulting `starts_at` / `ends_at` values are converted to UTC before storing. `TenantSettings::$timezone` defaults to `Europe/Stockholm`.

DST edge case: 02:00 on a DST switch night is ambiguous. The engine uses `Carbon::createFromFormat` with explicit timezone, which resolves to the post-transition interpretation. Slots that would land in the missing hour are skipped.

---

## Phase 13.3 — Public API (guest-facing, no auth)

All routes under `/api/public/booking/`. Registered in `routes/tenant.php` without auth middleware but behind `addon:booking`.

### Endpoints

```
GET  /api/public/booking/services
     → {data: [{id, name, description, booking_mode, duration_minutes, price, currency}]}

GET  /api/public/booking/resources?service_id=&date=
     → {data: [{id, name, type, resource_label}]}
     // only returns resources linked to service + available on date (slot) or in window (range)

GET  /api/public/booking/slots?service_id=&resource_id=&date=
     → {data: [{starts_at, ends_at, available}]}
     // slot mode only; range mode uses availability check endpoint

GET  /api/public/booking/availability?service_id=&resource_id=&check_in=&check_out=
     → {available: true|false, message?: '...'}
     // range mode only

POST /api/public/booking
     body: {service_id, resource_id, starts_at, ends_at?, check_in?, check_out?,
            customer_name, customer_email, customer_phone?}
     → 201 {data: {booking_id, starts_at, ends_at, status: 'pending',
                   message: 'Confirmation email sent.'}}
     // management_token NEVER returned in body; email only

PATCH /api/public/booking/{token}/cancel
     → 200 {data: {status: 'cancelled'}}
     // token auth; rate-limited 10/min per IP

GET  /api/public/booking/{token}
     → {data: {booking summary without management_token, includes customer_notes}}
     // for "manage my booking" landing page

GET  /api/public/booking/next-available?service_id=&resource_id=
     → {data: {date: '2026-08-14', first_slot?: '10:00'}}
     // scans forward up to max_advance_days; returns the nearest date with ≥1 available slot
     // resource_id is optional: if omitted, returns next date any linked resource is free
     // prevents the customer from manually hunting an empty calendar
```

### Rate limiting

| Endpoint | Limit |
|----------|-------|
| `GET /slots` | 60/min per IP |
| `GET /availability` | 60/min per IP |
| `POST /booking` (create) | 5/min per IP |
| `PATCH /{token}/cancel` | 10/min per IP |
| `GET /{token}` | 20/min per IP |

---

## Phase 13.4 — CMS API (tenant-authenticated)

All routes inside `auth:api + tenant.membership + addon:booking`.

```
# Resources
GET    /api/booking/resources
POST   /api/booking/resources
GET    /api/booking/resources/{id}
PUT    /api/booking/resources/{id}
DELETE /api/booking/resources/{id}

# Resource availability windows (weekly schedule)
GET    /api/booking/resources/{id}/availability
POST   /api/booking/resources/{id}/availability        -- add/update time window
PUT    /api/booking/availability/{avail_id}
DELETE /api/booking/availability/{avail_id}

# Resource date-range blocks (vacation / sick leave / maintenance)
# Owner/admin only — blocked by permission check
GET    /api/booking/resources/{id}/blocks
POST   /api/booking/resources/{id}/blocks
       body: {start_date, end_date, reason?}
       → warns if confirmed bookings exist in range; creates block
DELETE /api/booking/resources/{id}/blocks/{block_id}

# Services
GET    /api/booking/services
POST   /api/booking/services
GET    /api/booking/services/{id}
PUT    /api/booking/services/{id}
DELETE /api/booking/services/{id}

# Resource ↔ Service links
POST   /api/booking/services/{id}/resources            -- attach
DELETE /api/booking/services/{id}/resources/{rid}      -- detach

# Bookings (management view)
GET    /api/booking/bookings?date=&status=&resource_id=&service_id=
GET    /api/booking/bookings/{id}
PATCH  /api/booking/bookings/{id}/confirm
PATCH  /api/booking/bookings/{id}/cancel
       body: {note?}   -- sends booking.cancelled (by_tenant) notification to customer
PATCH  /api/booking/bookings/{id}/reschedule
       body: {starts_at, ends_at}  -- availability re-checked; sends booking.rescheduled notification
PATCH  /api/booking/bookings/{id}/complete
PATCH  /api/booking/bookings/{id}/no_show

# Manual booking creation by tenant (owner books on behalf of a customer)
POST   /api/booking/bookings
       body: {service_id, resource_id, starts_at, ends_at, customer_name, customer_email,
              customer_phone?, internal_notes?, customer_notes?, force?}
       // force=true (owner permission required): bypasses availability check — useful for
       // accepting a VIP client into a nominally full day; recorded in booking_events
```

Bookings list respects tenant isolation — tenant A can never see tenant B's bookings. Response includes paginated, filterable results for the calendar view.

**Permission note**: resource block creation/deletion requires the `manage bookings` permission (owner or delegated admin role). Staff members with a linked user account (`booking_resources.user_id`) can log into the tenant CMS and see a calendar filtered to their own resource — read-only by default; they cannot create blocks or cancel other resources' bookings.

---

## Phase 13.5 — Notifications

Email-first. All notifications are queued jobs using Laravel's notification system.

### Notification triggers

| Event | Recipient | Template |
|-------|-----------|----------|
| `booking.created` (status=pending) | Customer | "Booking received — awaiting confirmation" |
| `booking.confirmed` | Customer | "Your booking is confirmed" + management link |
| `booking.confirmed` | Staff/resource (if person type + has email) | "New booking assigned to you" |
| `booking.cancelled` (by customer) | Tenant admin | "Booking cancelled by customer" |
| `booking.cancelled` (by tenant) | Customer | "Your booking has been cancelled" + reason if provided |
| `booking.completed` | Customer | "Thanks for your visit — leave a review?" (optional) |
| `booking.no_show` | — (internal log only) | — |
| `booking.reminder_24h` | Customer | "Reminder: your booking is tomorrow" |
| `booking.reminder_1h` | Customer | "Your booking is in 1 hour" |
| `booking.rescheduled` (by customer) | Customer | "Your booking has been rescheduled" |
| `booking.rescheduled` (by tenant) | Customer | "We've rescheduled your booking" + new time + management link |

### Reminder scheduler

A scheduled command `bookings:send-reminders` runs every 15 minutes. It queries bookings in `confirmed` status where `starts_at` is within the reminder window (24h / 1h ahead) and no corresponding row exists in `booking_notifications` for that `booking_id + type`. On dispatch, a `booking_notifications` row is inserted — idempotent by design.

**Tenant scoping** — Both `bookings:send-reminders` and `bookings:expire-holds` must only run against tenants that have the `booking` addon active. The commands resolve the eligible tenant set at startup:

```php
$tenantIds = TenantAddon::query()
    ->active()
    ->whereHas('addon', fn ($q) => $q->where('feature_flag', 'booking'))
    ->pluck('tenant_id');

foreach ($tenantIds as $tenantId) {
    tenancy()->initialize(Tenant::find($tenantId));
    // ... process reminders for this tenant
    tenancy()->end();
}
```

This ensures non-booking tenants are not queried and that no booking-related code runs in the central context.

### Management link (guest URL)

Management link format: `https://{tenant-domain}/booking/manage/{token}`

The token is embedded in the email body only. Never in URL query strings (leak to referrer headers / analytics). The management page (13.6 / 13.7) reads the token from the URL path.

---

## Phase 13.6 — BookingWidget (Puck Component)

A new Puck component that tenants drop onto any CMS page to expose booking to their customers.

### Multi-step wizard flow

```
Step 1: Select service
Step 2: Select resource (or "Any available")
Step 3: Select date
Step 4: Select time slot (slot mode) / select check-in + check-out (range mode)
Step 5: Customer details (name, email, phone)
Step 6: Confirm + submit
Step 7: Success screen (email confirmation notice)
```

Breadcrumb navigation allows stepping backward without losing state. State held in `useReducer` — not URL — so Back button doesn't fight wizard state.

### Widget config (Puck controls)

| Control | Type | Description |
|---------|------|-------------|
| `title` | text | Widget heading (e.g. "Book a session") |
| `serviceId` | select (from API) | Pre-select a specific service, or "All services" |
| `primaryColor` | color | Override booking widget accent colour |
| `showPrices` | toggle | Show/hide price in service selection |
| `successMessage` | textarea | Custom thank-you message after booking |

### Puck component registration

The `BookingWidget` component must only be registered in the Puck component registry when the tenant has the `booking` addon active. Registering it unconditionally means the Puck editor downloads the booking module for every tenant regardless of their subscription.

```tsx
// In the Puck config builder:
const { hasAddon } = useAddon();

const components = {
  // ...base components always registered
  ...(hasAddon('booking') ? { BookingWidget } : {}),
};
```

The component file itself should remain in a separate chunk (no static import at the config root) — import it with a dynamic `import()` so the module is only downloaded when actually needed.

### Slot reservation hold

When the customer reaches Step 5 (filling form), the widget calls `POST /api/public/booking/hold`:

- Creates a booking with `status = 'pending_hold'` and `hold_expires_at = now() + 10 minutes`.
- Returns a `hold_token` for the subsequent confirm call.
- A scheduled command `bookings:expire-holds` runs every minute and deletes expired holds.
- `POST /api/public/booking` (confirm) receives `hold_token` and transitions to `pending`.

This prevents two users simultaneously completing payment for the same slot.

### Error states

- **Slot taken between steps**: if submit returns 409, show "Sorry, that slot was just taken — please choose another" and return to Step 3/4 with the calendar refreshed.
- **Service unavailable**: if addon is deactivated mid-session, show friendly message.
- **Network error**: retry button, no data loss (form state preserved).

---

## Phase 13.7 — CMS Pages

Standard React pages inside the tenant dashboard, gated by `hasAddon('booking')` in the frontend.

| Page | Route | Description |
|------|-------|-------------|
| `BookingsCalendarPage` | `/cms/bookings` | Day/week/month view with booking actions + date-block creation |
| `BookingDetailPage` | `/cms/bookings/{id}` | Single booking detail, status changes, reschedule, notes |
| `ResourceManagerPage` | `/cms/booking/resources` | CRUD, weekly availability schedule, vacation/block management |
| `ServiceManagerPage` | `/cms/booking/services` | CRUD, pricing, duration, slot interval, buffer, resource linking |
| `BookingSettingsPage` | `/cms/booking/settings` | Timezone, auto-confirm, reminder windows, cancellation policy |

### Frontend integration with the addon system

**Code splitting** — All five booking pages must be lazy-loaded. They should not land in the main tenant bundle for tenants that do not have the addon:

```tsx
const BookingsCalendarPage = React.lazy(() => import('./booking/BookingsCalendarPage'));
const BookingDetailPage    = React.lazy(() => import('./booking/BookingDetailPage'));
const ResourceManagerPage  = React.lazy(() => import('./booking/ResourceManagerPage'));
const ServiceManagerPage   = React.lazy(() => import('./booking/ServiceManagerPage'));
const BookingSettingsPage  = React.lazy(() => import('./booking/BookingSettingsPage'));
```

Wrap them in `<Suspense fallback={<PageSkeleton />}>` at the route definition level. The router only renders these components when `hasAddon('booking')` is true, so the lazy import never triggers for non-booking tenants.

**Sidebar navigation** — The Bookings section of the CMS sidebar must be conditionally rendered using `hasAddon('booking')`. Non-booking tenants must not see the menu entries at all (not greyed out — absent). Follow the same pattern as the Payments section.

```tsx
const { hasAddon, isLoading } = useAddon();
// During isLoading, render nothing for addon-gated nav items to avoid flash.
if (!isLoading && hasAddon('booking')) {
  // render: Calendar, Resources, Services, Settings nav items
}
```

**Addon context refresh** — `BookingSettingsPage` (and whatever billing UI activates/deactivates the addon) must call `refetch()` from `useAddon()` after a successful activation so the sidebar and nav immediately reflect the new state without a page reload.

> **Pre-condition**: `refetch` is not currently exposed in `AddonContextType`. Before Phase 13.7 ships, add `refetch: () => Promise<void>` to the interface in [shared/context/AddonContext.ts](../resources/js/shared/context/AddonContext.ts) and wire `fetchFlags` to it in [shared/context/AddonContext.tsx](../resources/js/shared/context/AddonContext.tsx).

**Loading state guard** — During the initial `AddonProvider` fetch, `hasAddon('booking')` returns `false`. All booking-gated routes and sidebar items must check `isLoading` before rendering and show nothing (not an upgrade prompt) while the flags are in flight. This prevents a flash of the "addon not active" state on every page load.

### `BookingsCalendarPage` detail

A lightweight calendar grid (day / week / month toggle). No heavy external dependency needed — a custom grid renders better within the design system than a third-party calendar widget.

**Booking display**: each booking is a coloured chip on the grid, colour-coded by status:
- Pending → amber
- Confirmed → green
- Completed → grey
- Cancelled / No-show → red/muted

**Inline actions**: clicking a booking opens a slide-over panel with:
- Booking detail (customer info, service, resource, time)
- Action buttons: Confirm / Cancel / Reschedule / Mark Complete / Mark No-Show
- Notes field (internal, not visible to customer)
- Reschedule opens a mini date+time picker; on submit calls `PATCH .../reschedule` and sends customer notification automatically

**Date-range blocking from the calendar** (owner/admin only):
- Click-and-drag across days on the calendar (or "Block dates" button) → modal: select resource(s), date range, reason
- If confirmed bookings exist in the range, shows a warning list before allowing block creation
- Blocked days render with a striped/hatched pattern on the calendar
- Clicking a block shows reason + "Remove block" option

### `ResourceManagerPage` — availability tab

**Weekly schedule editor**: drag handles or time-pickers for each day of the week per resource. Multiple windows per day (morning + afternoon split) supported.

**Vacation / blocks tab**: list of current and upcoming blocks with create/delete controls. Mirrors what is visible on the main calendar.

---

## Edge Cases & Known Hard Problems

This section documents every non-obvious scenario that must be handled correctly. This is the primary input for testcase design.

---

### 1. Race Conditions — Double Booking

**Scenario**: Two customers submit `POST /api/public/booking` within milliseconds for the same slot.

**Mitigation stack (three layers)**:
1. **Hold system** (Phase 13.6): one user holds the slot at Step 5; the other sees it as unavailable.
2. **DB transaction + row-level lock**: `lockForUpdate()` on the resource inside a transaction; availability re-checked after acquiring lock.
3. **Unique DB index** on `(resource_id, starts_at, ends_at)`: final backstop — catches any gap in application logic.

**Response**: 409 Conflict `{message: "This slot is no longer available."}`. The user is prompted to re-select.

---

### 2. Group Bookings (Capacity > 1)

**Scenario**: A yoga class has capacity 20. 20 people should be able to book the same slot.

**Handling**:
- The unique index does NOT apply to capacity > 1 resources.
- `BookingAvailabilityService::getSlotsForDate` counts confirmed bookings per slot and compares to `resource.capacity`.
- Slot marked as `available: false` only when `existing_bookings >= capacity`.
- The `hold` system counts pending holds toward capacity to prevent overbooking under concurrent load.

---

### 3. Buffer Time Between Appointments

**Scenario**: A nail salon needs 15 minutes between clients for cleanup.

**Handling**:
- `booking_services.buffer_minutes` — included in slot computation.
- A slot from 10:00–11:00 with 15-min buffer blocks 10:00–11:15 for the resource.
- The next available slot starts at 11:15, not 11:00.
- Buffer is NOT visible to the customer (slot end-time shown is 11:00).

---

### 4. DST Transitions (Sweden: late March, late October)

**Scenario**: On the night Sweden switches clocks forward, 02:00–03:00 does not exist.

**Handling**:
- UTC storage makes stored data unambiguous.
- Slot generation runs in tenant timezone (`Carbon::setTimezone('Europe/Stockholm')`).
- Any slot whose computed `starts_at` falls in the missing hour is silently skipped.
- On clock-back nights (02:00 occurs twice), UTC storage is canonical; no duplicate slots are generated.

---

### 5. Bookings Crossing Midnight

**Scenario**: A club night slot from 23:00–01:00 spans two days.

**Handling**:
- `starts_at` is 23:00, `ends_at` is 01:00 the next day — both stored as full datetimes (UTC).
- The availability engine checks the window from `starts_at` to `ends_at`, so the availability windows for both calendar days must accommodate the slot.
- The bookings calendar (Phase 13.7) renders multi-day events correctly.

---

### 6. Same-Day / Last-Minute Bookings

**Scenario**: A customer tries to book a slot that starts in 5 minutes.

**Handling**:
- `advance_notice_hours` on `booking_services` (default 0 = same-day allowed).
- Slots where `starts_at < now() + advance_notice_hours` are excluded from `getSlotsForDate`.
- Server-side check only — client clock is not trusted.
- If `advance_notice_hours = 0` and the slot is 5 minutes away, it IS bookable.

---

### 7. Booking Window Cap

**Scenario**: A BnB host only wants to accept bookings up to 6 months in advance.

**Handling**:
- `booking_services.max_advance_days`: slot/range-start dates beyond `today() + max_advance_days` return empty/unavailable.
- The frontend date picker disables dates beyond this cap.
- Server-side validation also enforces this limit.

---

### 8. Staff/Resource Becomes Unavailable After Confirmation

**Scenario**: A booked hairdresser calls in sick, or a room undergoes emergency repairs.

**Handling**:
- Tenant can manually cancel the booking via CMS (`PATCH /api/booking/bookings/{id}/cancel` with `cancelled_by = tenant`).
- This triggers `booking.cancelled` email to the customer with an apology + management link to rebook.
- No automatic rebooking — the customer self-serves.
- Future: "offer alternative" flow (out of scope for 13.x).

---

### 9. Staff Leaves the Company

**Scenario**: A resource of type `person` is archived but has future confirmed bookings.

**Handling**:
- Soft-delete (or `is_active = false`) on `booking_resources`.
- Inactive resources still appear in existing bookings (FK preserved).
- On inactivation, a validation warning lists the number of future confirmed bookings on that resource.
- Tenant must manually cancel or reassign those bookings — no cascade auto-cancel.

---

### 10. Cancellation Deadlines

**Scenario**: A tenant requires 24-hour notice for cancellation.

**Handling**:
- `BookingSettingsPage` lets tenant configure a `cancellation_notice_hours` setting (stored in `TenantSettings`).
- `PATCH /api/public/booking/{token}/cancel` checks `now() + cancellation_notice_hours < booking.starts_at`.
- If within the window, return 422 `{message: "This booking can no longer be cancelled online. Please contact us directly."}`.
- Tenant can always cancel from CMS regardless of the window.

---

### 11. Late Cancellation Fee (Cross-Addon)

**Scenario**: Tenant charges customers who cancel within 2 hours.

**Handling**:
- Only possible when both `booking` and `payments` addons are active.
- Out of scope for 13.x. Architecture must not prevent it:
  - `bookings.payment_id` FK exists from day one.
  - Late-cancel fee hookpoint: `BookingCancelledEvent` → listener checks payment addon + policy.

---

### 12. No-Show Handling

**Scenario**: A customer has a confirmed booking but never arrives.

**Handling**:
- Tenant manually marks `PATCH /api/booking/bookings/{id}/no_show` from CMS.
- Status transitions to `no_show`.
- `booking.no_show` analytics event fires.
- No customer notification by default (tenant handles it).
- Future: automated no-show detection via scheduled job + repeat-offender tracking.

---

### 13. Rescheduling

**Scenario**: A customer wants to move their booking to a different time.

**v1 approach**:
- Management link (`/booking/manage/{token}`) shows a "Reschedule" button.
- Reschedule = cancel existing booking → create new booking in one atomic DB transaction.
- New management token is issued; old token is invalidated.
- `booking.rescheduled` notification sent to customer with new details.

**v2 consideration**:
- Native reschedule preserving booking ID and history (out of scope for 13.x; schema supports it via status column).

---

### 14. Duplicate Bookings by Same Customer

**Scenario**: A customer double-clicks Submit, or books the same service twice at overlapping times.

**Handling**:
- Idempotency check in `POST /api/public/booking`: if a confirmed/pending booking exists for `customer_email + resource_id + starts_at`, return 409 with `{message: "You already have a booking for this time."}`.
- The frontend `Submit` button disables after first click (loading state).

---

### 15. Price-on-Request Services

**Scenario**: A tattoo artist's price depends on the design — not fixed.

**Handling**:
- `booking_services.price = NULL` → "Price on request" displayed.
- No payment wiring attempted for NULL-price services.
- The booking is confirmed by the tenant after they agree on pricing out-of-band.

---

### 16. Range Booking Edge Cases (BnB)

**Check-in/check-out time precision**:
- `starts_at` = check-in datetime (e.g., `2026-08-10 15:00:00 UTC`), not just date.
- `ends_at` = check-out datetime (e.g., `2026-08-15 11:00:00 UTC`).
- Tenant configures default check-in/check-out times in `BookingSettingsPage`.

**Gap between stays (cleaning day)**:
- `booking_services.buffer_minutes` maps to hours/days for range mode.
- For a "1 cleaning day" gap: `buffer_minutes = 1440` (24h).
- Availability check for new bookings includes: `existing.ends_at + buffer < new.starts_at`.

**Minimum night violation**:
- API returns 422 `{message: "Minimum stay is {n} nights."}`.
- Frontend date picker enforces this by disabling check-out dates within the minimum distance.

**Partial availability**:
- A room available Mon–Fri but not weekends → modelled as two `day_of_week` windows (1–5) with no Saturday/Sunday entries.

---

### 17. "Any Available" Resource Selection Algorithm

**Scenario**: Customer picks "Any available stylist" rather than a specific person.

**Algorithm**: `BookingAvailabilityService::getAvailableResources()` returns all matching resources. The `POST /api/public/booking` handler picks one using **round-robin** (based on `count(confirmed bookings this week)` ascending — least-loaded first). This produces even distribution without manual configuration.

If no resource is available, return 409 `{message: "No availability for that time. Please try another slot."}`.

**Customer communication**: Confirmation email names the assigned resource (e.g., "You'll be seen by Anna").

---

### 18. Waitlist

**Schema design — not v1, but non-breaking to add later**:
- A `waitlist_position` nullable column on `bookings` (default NULL = not waitlisted).
- When a slot is full, a "Join waitlist" CTA appears (`capacity > 1` resources only).
- On cancellation, the next waitlisted customer is promoted and notified.

---

### 19. Guest Token Security

The management token must resist all practical attacks:

| Requirement | Implementation |
|-------------|----------------|
| Cryptographic randomness | `bin2hex(random_bytes(32))` — 256 bits of entropy |
| No leakage to analytics/logs | Token in URL **path** (`/booking/manage/{token}`), not query string |
| Expiry | `token_expires_at = starts_at + 24 hours` |
| Invalidation after cancel | On cancel, set `management_token = null` (or rotate) |
| Rate limiting | 10 req/min per IP on token-auth endpoints |
| No token in API list responses | `makeHidden(['management_token'])` on Booking model; only set during `created` event |

---

### 20. GDPR — Guest Data Retention

**Regulation**: GDPR Article 5(1)(e) — personal data kept no longer than necessary.

**Policy**:
- Guest customer data (name, email, phone) is **anonymised** 24 months after `ends_at`.
- Anonymisation: overwrite name → `[Anonymised]`, email → `anonymised_{id}@deleted.local`, phone → `null`.
- Booking record itself is retained for accounting/legal (revenue record).
- A scheduled command `bookings:anonymise-expired` runs monthly.
- Tenant future: "Request Data Deletion" form for customers (out of scope for 13.x).

---

### 21. Notifications — Delivery Edge Cases

| Scenario | Handling |
|----------|----------|
| Email bounce / invalid address | Log to `failed_jobs`; bubble to tenant activity log |
| Customer unsubscribes | Honour via `booking_notification_opt_out` flag on booking (set via management link) |
| Reminder already sent | `reminders_sent` JSON column prevents duplicate dispatches if scheduler re-runs |
| Staff email missing | Skip staff notification silently if resource `type = person` has no email configured |
| Booking cancelled before reminder | Reminder scheduler skips non-`confirmed` bookings |

---

### 22. Public Slot Endpoint Performance

**Risk**: `GET /slots?date=` is unauthenticated, hot, and potentially expensive (many availability/booking lookups).

**Mitigations**:
- Cache slot results with a 1-minute TTL key: `booking.slots.{resource_id}.{date}`.
- Bust cache on any booking create/cancel affecting that resource on that date.
- Eager-load availabilities + existing bookings in a single query pass per resource.
- Index: `(resource_id, starts_at, status)` on `bookings`.
- Index: `(resource_id, day_of_week)` and `(resource_id, specific_date)` on `booking_availabilities`.

---

### 23. Timezone Display for Customers

**Ambiguity**: Tenant is in Stockholm (CET/CEST). Customer may be in another timezone.

**Decision**: Display all times in the **tenant's timezone**, clearly labelled (e.g., "10:00 AM CET"). Rationale: service is delivered in the tenant's location; the customer must know the local time of their appointment.

The tenant's timezone is read from `TenantSettings::get('timezone', 'Europe/Stockholm')`.

---

### 24. Widget State During Page Navigation

**Scenario**: Customer is at Step 4 of the booking wizard and clicks the browser Back button.

**Handling**:
- Wizard state is held in `useReducer`, not in URL or `localStorage`.
- Browser Back navigates away from the page — wizard state is intentionally lost.
- If deep-linking into the wizard is needed in future, move state to URL hash params.

**Scenario**: Two `BookingWidget` Puck components on the same page (e.g., one per service).

**Handling**:
- Each widget is a fully isolated React subtree with its own `useReducer` state.
- No shared Booking context at the page level.

---

### 25. Onboarding — Empty State

**Scenario**: Tenant activates the `booking` addon but has not created any resources or services.

**Handling**:
- Public widget shows: `"No services are currently available for booking."` — no broken UI.
- CMS pages show an onboarding prompt: "Create your first service to start accepting bookings."
- No API errors — empty collection responses are valid.

---

### 26. Payment × Booking Cross-Addon (Future)

**When both `booking` and `payments` addons are active**:
- `POST /api/public/booking` can accept `payment_method_id` to collect a deposit or full payment at booking time.
- `bookings.payment_id` FK links to the existing `payments` table (Phase 10).
- On cancellation within the free window: automatic refund via `PaymentService::refund()`.
- On late cancellation: partial refund or no refund based on tenant policy.
- Out of scope for 13.x — schema is forward-compatible; wiring implemented in Phase 14.

---

### 27. Analytics Events from Bookings

All booking lifecycle events fire through the existing Phase 9 `AnalyticsService`:

| Event key | Payload |
|-----------|---------|
| `booking.created` | `{service_id, resource_id, booking_mode}` |
| `booking.confirmed` | `{booking_id, revenue: price or null}` |
| `booking.cancelled` | `{booking_id, cancelled_by}` |
| `booking.completed` | `{booking_id}` |
| `booking.no_show` | `{booking_id}` |
| `booking.rescheduled` | `{booking_id}` |

These activate booking-specific dashboard widgets automatically (same pipeline as payment events).

---

### 28. Multi-Resource Services (Future Architecture Note)

**Scenario**: A spa treatment requires both a therapist (person) and a treatment room (space) simultaneously.

**v1**: `bookings.resource_id` — single resource per booking.

**Forward-compatible path** (no migration needed in v1):
- In v2, introduce `booking_booking_resources(booking_id, resource_id)` pivot.
- `bookings.resource_id` moved to nullable + deprecated.
- Availability engine would check all required resources are simultaneously free.

No v1 schema changes needed; just don't add application logic that makes `resource_id` non-nullable at the ORM level.
---

### 29. Vacation Block With Existing Confirmed Bookings

**Scenario**: Owner creates a block for July 10–24 but three customers already have confirmed bookings during that period.

**Handling**:
- `POST /api/booking/resources/{id}/blocks` checks for confirmed bookings within `[start_date, end_date]`.
- If any exist, the 201 response includes a `warnings` array: e.g. `{message: "Block created.", warnings: ["3 confirmed bookings exist in this range. They have not been cancelled."]}`.
- The block is still created — blocking future bookings immediately.
- The owner must manually cancel or reschedule the conflicting existing bookings from the calendar view.
- **No cascade auto-cancel** — the customer relationship is the owner's responsibility to manage.

---

### 30. Tenant-Side Reschedule Notification

**Scenario**: An owner reschedules a customer's appointment via the CMS calendar (not the customer self-serving).

**Handling**:
- `PATCH /api/booking/bookings/{id}/reschedule` validates the new `{starts_at, ends_at}` against the full availability engine (blocks + availability windows + existing bookings + buffer).
- Returns 409 if the new slot is unavailable; 422 if the new time violates advance-notice or max-advance constraints.
- On success: atomically updates `bookings.starts_at/ends_at`, fires `booking.rescheduled (by_tenant)` notification to the customer.
- The notification email contains old time, new time, and the management link in case the customer cannot make the new time and wants to cancel.
- Tenant can optionally include a note (`reason` field in request body) that appears in the email.
- The `reminders_sent` record is reset on reschedule so the customer receives reminders at the correct new time.

---

### 31. Slot Interval Does Not Divide Evenly Into Availability Window

**Scenario**: Availability window is 09:00–17:00 (480 min). Slot interval is 35 minutes. Slots offered: 09:00, 09:35, 10:10, … The last slot that fits is 16:25 (ends at 17:10 if duration is 45 min — past window end).

**Handling**:
- The availability engine stops generating slots when `candidate.starts_at + duration_minutes > window.ends_at`.
- Partial slots are never offered — the full service must fit within the window.
- The last slot in the 09:00–17:00 window for a 45-min service is the latest `starts_at` where `starts_at + 45 <= 17:00`, i.e. `16:15`.
---

## Test Coverage Plan

### Unit tests (no DB)

- `BookingAvailabilityService::getSlotsForDate` — buffer math, DST slots, crossing-midnight, advance_notice cutoff, max_advance_days cutoff, slot_interval vs duration stepping, partial slot at window end excluded, block-day returns empty
- `BookingAvailabilityService::isRangeAvailable` — block overlap returns false, min/max nights, buffer gap between stays
- `Booking::generateToken()` — entropy, uniqueness, format (64 hex chars)
- `BookingAvailabilityService::getAvailableResources()` — round-robin selection, no-resource 409

### Feature/integration tests (DB)

- `EnsureAddonTest` — `addon:booking` blocks unauthenticated + tenants without addon
- `PublicBookingApiTest` — create slot booking, create range booking, get slots, cancel via token, rate limit, duplicate booking 409, capacity full 409, advance_notice 422, max_advance 422
- `CmsBookingApiTest` — resource CRUD, service CRUD, availability windows, block create/delete, tenant reschedule (success + 409 conflict), status transitions, tenant isolation
- `BookingRemindersCommandTest` — sent once per timing window, skips non-confirmed, skips cancelled, resets on reschedule

### Edge-case specific tests

- Race condition: two requests in one transaction → second gets 409
- DST: slot on DST-change night is skipped
- Token security: expired token 410, unknown token 404, rate-limited token endpoint
- GDPR anonymisation command: only anonymises past cutoff, keeps revenue record intact
- Cross-tenant isolation: tenant A cannot see tenant B bookings via any endpoint
- Block creation with existing bookings: 201 with `warnings` array in response
- Tenant reschedule: reminders_sent reset; customer notified with old + new time
- Slot interval: 35-min interval in 480-min window produces correct slot count; last partial excluded

---

## Open Decisions

| Question | Options | Decision |
|----------|---------|----------|
| Auto-confirm bookings? | Always auto-confirm vs manual confirm | ✅ Tenant-configurable in `BookingSettingsPage` (default: auto-confirm) |
| Reminder timing configurable? | Fixed 24h/1h vs tenant sets own windows | ✅ Tenant-configurable (default: 24h + 1h) |
| Slot interval per service? | Fixed = duration vs separate interval field | ✅ `slot_interval_minutes` on `booking_services`; NULL = same as duration |
| Resource date-range blocking? | Multiple `booking_availabilities` rows vs dedicated table | ✅ Dedicated `booking_resource_blocks` table |
| Tenant-side reschedule? | Cancel+rebook vs PATCH reschedule endpoint | ✅ CMS gets `PATCH reschedule`; customer self-serve = cancel+rebook via token |
| Customer notified of tenant reschedule? | Yes, with old + new time + management link | ✅ Yes |
| Reminder dedup strategy? | JSON column vs `booking_notifications` table | ✅ Dedicated `booking_notifications` table — queryable, multi-channel ready |
| Audit log? | Status columns only vs append-only event table | ✅ `booking_events` table — immutable, actor-typed |
| Staff ↔ user link? | No link vs `user_id` on `booking_resources` | ✅ Nullable `user_id` — staff calendar filter + notification name resolution |
| Note visibility? | Single `notes` column vs internal + customer split | ✅ `internal_notes` (tenant-only) + `customer_notes` (customer-provided) |
| Phase 14 status readiness? | 5-value enum vs include `awaiting_payment` now | ✅ Add `awaiting_payment` now; avoids breaking migration |
| Recurring bookings? | Not in v1 | ✅ Seed `parent_booking_id` nullable FK; no business logic in v1 |
| Next-available discovery? | Client hunts manually vs API endpoint | ✅ `GET /api/public/booking/next-available` in Phase 13.3 |
| Manual tenant booking (on behalf of customer)? | Not possible vs CMS API | ✅ `POST /api/booking/bookings` with `force` override (owner permission) |
| Hold duration configurable? | 10 min hardcoded vs setting | ✅ `BookingSettingsPage` setting (range 5–30 min, default 10) |
| iCal feed? | Not planned vs per-resource ICS endpoint | Phase 13.x stretch goal — `GET /api/booking/resources/{id}/calendar.ics?token=` |
| Custom booking fields per service? | Not in v1 | Phase 14 stretch — `booking_fields` table (form builder per service) |
| Waitlist in 13.x? | v1 no / v2 yes | No for v1 |
| Group class headcount on success screen? | Show "15 / 20 spots remaining" | Yes, show remaining capacity |
| TenantSettings `timezone` field | Already in TenantSettings? | Confirm + migrate if missing |

---

## Starting Point for Implementation

Start at **Phase 13.1**. Create branch `feature/phase13-booking-system` from `main`.

Completion criteria for 13.1:
- [ ] 8 migrations: `booking_resources`, `booking_services`, `booking_resource_services`, `booking_availabilities`, `booking_resource_blocks`, `bookings`, `booking_notifications`, `booking_events`
- [ ] 7 Eloquent models with scopes, relationships, casts
- [ ] `Booking::generateToken()` static helper using `bin2hex(random_bytes(32))`
- [ ] `Booking::recordEvent()` helper: appends to `booking_events` — called on every status transition
- [ ] 7 model factories covering all enum variants (including `awaiting_payment`)
- [ ] Migration runs clean on fresh DB: `php artisan migrate:fresh --seed`
- [ ] At least 1 unit test verifying token entropy and format

**Pre-conditions before any Phase 13 work begins:**
- [ ] Fix `AddonContextType` in [shared/context/AddonContext.ts](../resources/js/shared/context/AddonContext.ts): add `refetch: () => Promise<void>` to the interface and expose `fetchFlags` as `refetch` in the provider value
- [ ] Verify the `booking` addon seed row exists (`feature_flag = 'booking'`) in the central `addons` table

Then proceed to **13.2** (availability engine) — the engine is the hardest part and is fully testable in isolation before any HTTP layer exists.

---

## Post-Implementation Audit — April 7, 2026

Phase 13 shipped and is fully functional. The following gaps were identified after real-world use and stakeholder review. These are not regressions — the original spec was correct — they are UX and notification improvements that belong in a follow-up pass before Phase 13 is considered fully closed.

---

### Gap 1: Widget Resource Step — Human UX

**Current behaviour**: Step 2 of the booking widget always shows the heading "Choose a resource" regardless of what kind of resource is being selected.

**Expected behaviour**: The heading should read "Choose your [resource_label]" — e.g. "Choose your therapist", "Choose your room", "Choose your vehicle". `resource_label` is already a field on `BookingResource` and already returned by the public resources API. The widget just needs to use it in the step heading.

**Implementation note**: `state.resources[0].resource_label` is a reliable source for the category label since all resources linked to the same service should share a resource_label category. Fall back to "resource" if null.

---

### Gap 2: Widget Resource Step — "No Preference" Option

**Current behaviour**: The customer must always pick a specific named resource. There is no "Any available" option.

**Design decision**: Add an "Any available" card at the top of the resource list for `person` and `equipment` type resources. `space` types (rooms, apartments) should NOT get this option — you always want to know which room you booked.

**Backend support**: `BookingAvailabilityService::getAvailableResources()` already exists in the spec (Edge Case 17 above). The assignment algorithm is round-robin based on least-loaded resource (fewest confirmed bookings this week). The confirmation email should name the assigned resource: "You'll be seen by Anna."

**Slot hold with "any"**: The hold endpoint (`POST /api/public/booking/hold`) must resolve the actual resource at hold time and return `resource_id` in the hold response so the confirm step can show who the customer is booked with. The customer cannot switch resource after hold is placed.

---

### Gap 3: Widget Resource Step — Date-Filtered Resource List

**Current behaviour**: Resources are fetched at Step 2 (before the customer picks a date at Step 3). The API returns all active resources without any date-based filtering. A customer can choose a specific staff member, then discover at the slot step that this person is fully booked on the chosen date.

**Expected behaviour**: Two options, one better than the other:

- **Option A (Quick fix)**: After the customer picks a date (Step 3), re-fetch resources filtered by that date via `GET /api/public/booking/resources?service_id=&date=`. Move to a "Choose resource" sub-step after date selection if more than one resource has availability. Already supported by the backend — `date` is an optional query parameter on that endpoint.
- **Option B (Preferred UX)**: Reorder the wizard to `service → date → resource → slot`. This is more natural for most service businesses: the customer first picks when they want to come, then sees who is available on that day. This matches how most booking systems (e.g. Fresha, Timely) work.

**Recommendation**: Implement Option B. The wizard step order change is frontend-only. The backend already supports `GET /resources?service_id=&date=`. The `date` parameter fetches only resources with at least one available slot on that date.

**Revised wizard flow after this change**:
```
Step 1: Select service
Step 2: Select date
Step 3: Select resource (filtered to those available on chosen date, + "Any available")
Step 4: Select time slot / check-out date
Step 5: Customer details
Step 6: Confirm + submit
Step 7: Success
```

---

### Gap 4: Missing Owner Notification on New Booking

**Current behaviour**: When a guest submits a booking from the widget, only the customer receives an email (`BookingReceivedNotification`). The tenant owner receives no email notification.

**Expected behaviour**: The tenant owner (or a configurable notification email) should receive an email when a new booking arrives, when a booking is cancelled by a customer, and when a booking is rescheduled by a customer. These are the three events initiated by the customer side that the business needs to be aware of immediately.

**Implementation**:
- Add `notification_email` to `TenantSettings` (defaults to the owner membership user's email if not set). This gives tenants a single configurable destination for all operational notifications.
- Create `OwnerBookingReceivedNotification`, `OwnerBookingCancelledNotification`, `OwnerBookingRescheduledNotification` — or a single parameterised `OwnerBookingAlertNotification` with a `$event` type string.
- Fire alongside the existing customer notifications in `PublicBookingController::store()`, `confirmFromHold()`, and the customer cancel endpoint.

**Notification table**: The `booking_notifications` table already has `recipient ENUM('customer','staff','admin')` — the `admin` variant is unused. These owner notifications should be recorded with `recipient = 'admin'`.

---

### Gap 5: Staff Notification Timing

**Current behaviour**: `StaffBookingAssignedNotification` is only fired when a tenant user clicks "Confirm" from the CMS (`BookingManagementController::confirm()`). Staff linked to a resource receive no notification when a booking arrives — only when it is manually confirmed.

**Design decision**: Staff should be notified as soon as the booking is confirmed. This is already the behaviour for manually-confirmed bookings. The gap is for auto-confirmed bookings (if `auto_confirm` is enabled in `BookingSettingsPage`): in that case `confirmFromHold()` transitions directly to `confirmed` but does not fire the staff notification.

**Fix**: Move the staff notification dispatch into a shared private method `notifyStaffIfApplicable(Booking $booking, string $domain)` and call it from both `confirm()` and `confirmFromHold()` after every confirmed status transition.

---

### Gap 6: "by customer #" Display with No ID

**Current behaviour**: The `BookingDetailPage` event timeline renders `by customer #` with no number for anonymous guest bookings where `actor_id` is null.

**Fix**: In `BookingDetailPage` (and the `EventTimeline` sub-component), check `actor_id !== null` before rendering `#${actor_id}`. For `actor_type === 'customer'` with `actor_id === null`, render simply "by customer" (no hash, no null).

---

### Implementation Priority

| Gap | Priority | Effort |
|-----|----------|--------|
| Gap 3 (wizard reorder: service → date → resource → slot) | High | Medium — frontend only, affects widget state machine |
| Gap 4 (owner notification on new booking) | High | Low — add notification + `notification_email` setting |
| Gap 5 (staff notification timing for auto-confirm) | Medium | Low — extract shared method |
| Gap 2 ("Any available" option) | Medium | Medium — backend `getAvailableResources()` + widget card |
| Gap 1 (resource step heading) | Low | Trivial |
| Gap 6 (null actor display) | Low | Trivial |
