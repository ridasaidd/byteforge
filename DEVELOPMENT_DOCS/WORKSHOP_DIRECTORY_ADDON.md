# Workshop Directory Addon

**Status:** Implementation complete – ready for tenant activation  
**Feature flag:** `workshop_directory`  
**Last updated:** March 23, 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Decision: Mechanics as Tenants](#2-architecture-decision-mechanics-as-tenants)
3. [How the Single-Database Model Handles This](#3-how-the-single-database-model-handles-this)
4. [Data Model](#4-data-model)
5. [API Endpoints](#5-api-endpoints)
6. [User Types & Roles](#6-user-types--roles)
7. [Addon Activation Flow](#7-addon-activation-flow)
8. [Enabling a Tenant as a Workshop](#8-enabling-a-tenant-as-a-workshop)
9. [Location Search Implementation](#9-location-search-implementation)
10. [Future Roadmap](#10-future-roadmap)
11. [Separate-Service Alternative](#11-separate-service-alternative)

---

## 1. Problem Statement

A customer wants to build an **Airbnb-style location search engine for car mechanic workshops**.

Key requirements:

| Requirement | Detail |
|------------|--------|
| List of mechanics | Each mechanic has a profile with location, specializations, opening hours |
| Location-based search | Customers browse mechanics sorted by proximity |
| Multiple user types | Customers (searchers) and Mechanics (service providers) |
| Tenant management | The customer (a ByteForge tenant) controls mechanics and their customers |
| Single database | ByteForge uses one shared database – no per-tenant DB isolation |

---

## 2. Architecture Decision: Mechanics as Tenants

After auditing the codebase two deployment models were evaluated:

### Option A – Mechanics as Entities Within One Tenant (Rejected)

```
ByteForge Tenant (The customer)
└── Workshop records (managed as CMS data)
    └── Customers (registered as end-users of the tenant)
```

**Rejected because:**
- All workshop data is crammed into one tenant's space; the tenant becomes a
  monolithic application rather than leveraging ByteForge's multi-tenancy.
- Mechanics cannot have individual subdomains, CMS pages, or theme customization.
- Does not scale – a second "directory" customer would need the same pattern reimplemented.
- Conflicts with Phase 13 (Booking System), which is designed per-tenant.

---

### Option B – Mechanics as Tenants ✅ (Recommended)

```
ByteForge Platform (Central domain: byteforge.se)
│
├── Directory Customer (Tenant)          ← The paying customer
│   └── Manages the discovery UI/CMS
│
├── Mechanic A (Tenant: mechanic-a.byteforge.se)
│   ├── WorkshopProfile  (location, specializations, hours)
│   └── Own CMS pages, theme, bookings
│
├── Mechanic B (Tenant: mechanic-b.byteforge.se)
│   └── ...
│
└── Central Discovery API
    GET /api/workshops/search?lat=&lng=&radius_km=
    (queries WorkshopProfile across all tenants in one DB call)
```

**Chosen because:**
- Each mechanic workshop is a first-class ByteForge tenant with its own subdomain,
  CMS, theme, and (Phase 13) booking calendar.
- The `workshop_profiles` table is a lightweight extension—one row per tenant—that
  adds location and directory data without changing existing tenant infrastructure.
- The central discovery API crosses tenant boundaries intentionally and safely,
  reading only the public `workshop_profiles` data.
- Fully compatible with the planned Phase 13 Booking System.
- Mechanics can self-onboard: create tenant → activate Workshop Directory addon → fill profile.

---

## 3. How the Single-Database Model Handles This

ByteForge uses **Stancl/Tenancy 3.9** in single-database mode (no per-tenant database).
Tenant data is isolated using explicit `tenant_id` columns with global query scopes.

The Workshop Directory addon works within this model by:

1. **`workshop_profiles` table** – one row per mechanic tenant, identified by `tenant_id`.
   Profile management routes (`/api/workshop-profile/*`) run in tenant context, so
   tenancy middleware already scopes all requests to the correct tenant.

2. **Central discovery API** – routes on the central domain (`byteforge.se`) query
   `workshop_profiles` directly, **without** initialising tenancy. This is intentional:
   the search is cross-tenant by design. Only publicly listed profiles (`is_listed = true`)
   are exposed.

3. **`workshop_reviews` table** – reviews reference `workshop_profile_id` (not `tenant_id`)
   and are written by central platform users. No tenant isolation is needed here since
   reviews are always public data.

This is the same pattern already used in ByteForge for central analytics
(`PlatformAnalyticsController` reads all tenants' `analytics_events`).

---

## 4. Data Model

### `workshop_profiles`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| tenant_id | string UNIQUE FK | One profile per mechanic tenant |
| display_name | string | Public-facing name |
| tagline | string nullable | Short headline |
| description | text nullable | Full description |
| phone | string nullable | |
| email | string nullable | |
| website | string nullable | |
| address | string | Street address |
| city | string | |
| state | string nullable | |
| country | char(2) | ISO 3166-1 alpha-2, default `SE` |
| postal_code | string nullable | |
| latitude | decimal(10,7) nullable | Indexed with longitude |
| longitude | decimal(10,7) nullable | |
| specializations | json nullable | Array of slugs, see allowed values below |
| opening_hours | json nullable | `{"mon":{"open":"08:00","close":"17:00"}, …}` |
| is_listed | boolean | Whether the workshop appears in search results |
| is_verified | boolean | Set by platform admin after verification |
| rating_avg | decimal(3,2) nullable | Denormalised; auto-updated after review changes |
| review_count | int | Denormalised; auto-updated |
| created_at / updated_at | timestamps | |

**Allowed specialization slugs:**
`engine_repair`, `brakes`, `tires`, `bodywork`, `electrical`, `ac_service`,
`oil_change`, `transmission`, `suspension`, `exhaust`, `diagnostics`,
`inspection`, `windscreen`, `detailing`, `other`

### `workshop_reviews`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workshop_profile_id | bigint FK | Cascades on delete |
| reviewer_user_id | bigint FK → users | Central platform user |
| rating | tinyint | 1–5 stars |
| comment | text nullable | |
| is_verified | boolean | Set to true when reviewer is a confirmed customer |
| created_at / updated_at | timestamps | |
| UNIQUE | (workshop_profile_id, reviewer_user_id) | One review per user per workshop |

---

## 5. API Endpoints

### Central Domain (`byteforge.se/api/workshops/*`)

These are public endpoints; no authentication required unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workshops/search` | — | Location-based search (Haversine) |
| GET | `/api/workshops/{tenantId}` | — | Single workshop profile |
| GET | `/api/workshops/{tenantId}/reviews` | — | List reviews |
| POST | `/api/workshops/{tenantId}/reviews` | ✓ auth:api | Submit a review |
| DELETE | `/api/workshops/{tenantId}/reviews/{id}` | ✓ auth:api | Delete own review |

**Search query parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| lat | float | ✓ | — | Searcher latitude (–90 to 90) |
| lng | float | ✓ | — | Searcher longitude (–180 to 180) |
| radius_km | float | — | 50 | Search radius in km (max 500) |
| specialty | string | — | — | Filter by specialization slug |
| q | string | — | — | Keyword search on name/city/description |
| per_page | int | — | 20 | Results per page (max 100) |

**Example request:**
```
GET https://byteforge.se/api/workshops/search?lat=59.3293&lng=18.0686&radius_km=25&specialty=engine_repair
```

**Example response item:**
```json
{
  "id": 1,
  "tenant_id": "mechanic-a",
  "display_name": "Södermalm Auto",
  "tagline": "Family-run, honest pricing since 1998",
  "city": "Stockholm",
  "country": "SE",
  "latitude": "59.3150000",
  "longitude": "18.0710000",
  "specializations": ["engine_repair", "brakes", "oil_change"],
  "rating_avg": "4.80",
  "review_count": 42,
  "is_verified": true,
  "distance_km": 2.4
}
```

---

### Tenant Domain (`{tenant}.byteforge.se/api/workshop-profile/*`)

Require authentication and appropriate permissions.

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/workshop-profile` | `workshop.view` | Get own profile |
| PUT | `/api/workshop-profile` | `workshop.manage` | Create or update profile |
| DELETE | `/api/workshop-profile` | `workshop.manage` | Delete profile |
| GET | `/api/workshop-profile/reviews` | `workshop.view` | List received reviews |
| GET | `/api/workshop-profile/specializations` | — | Get allowed slugs |

---

## 6. User Types & Roles

ByteForge already has a three-type user enum (`tenant_user`, `customer`, `superadmin`).
The workshop addon maps naturally onto the existing model:

| Actor | ByteForge User Type | Role | Context |
|-------|-------------------|------|---------|
| Platform admin | `superadmin` | superadmin | Central domain |
| Mechanic (workshop owner/staff) | `tenant_user` | admin / staff | Tenant domain |
| Customer (searcher / reviewer) | `customer` | — | Central domain |

**New permissions added to RolePermissionSeeder:**

| Permission | Purpose |
|-----------|---------|
| `workshop.view` | Read own workshop profile and reviews |
| `workshop.manage` | Create/update/delete own workshop profile |

Mechanic tenants should assign these permissions to their `admin` role (or a
custom `workshop_manager` role they create via the tenant CMS → Roles page).

---

## 7. Addon Activation Flow

The addon catalog entry is seeded by `WorkshopAddonSeeder`:

```php
php artisan db:seed --class=WorkshopAddonSeeder
```

Activation (existing Addon/TenantAddon system):

1. Superadmin activates the addon for a mechanic tenant via the central admin UI
   (`POST /api/superadmin/tenants/{id}/addons`).
2. A `TenantAddon` row is created linking the tenant to the `workshop-directory` addon.
3. The tenant's CMS dashboard can read the feature flag (`workshop_directory`) and
   show/hide the Workshop Profile section accordingly.
4. The mechanic fills in their profile and sets `is_listed = true` to appear in search.

> **Note:** The `stripe_price_id` in the seeder is a placeholder (`price_workshop_directory`).
> Replace with the real Stripe price ID when billing is configured for this addon.

---

## 8. Enabling a Tenant as a Workshop

Step-by-step from the superadmin perspective:

```bash
# 1. Create the mechanic tenant (existing flow)
POST /api/superadmin/tenants
{
  "name": "Södermalm Auto",
  "slug": "sodermalm-auto"
}

# 2. Assign domain (existing flow)
# → tenant gets subdomain: sodermalm-auto.byteforge.se

# 3. Activate the Workshop Directory addon (existing TenantAddon flow)
POST /api/superadmin/tenants/sodermalm-auto/addons
{
  "addon_slug": "workshop-directory"
}

# 4. The mechanic logs in to their CMS and fills the workshop profile
PUT https://sodermalm-auto.byteforge.se/api/workshop-profile
{
  "display_name": "Södermalm Auto",
  "address": "Götgatan 44",
  "city": "Stockholm",
  "country": "SE",
  "latitude": 59.315,
  "longitude": 18.071,
  "specializations": ["engine_repair", "brakes", "oil_change"],
  "is_listed": true
}

# 5. Workshop appears in the central discovery search
GET https://byteforge.se/api/workshops/search?lat=59.33&lng=18.07&radius_km=5
```

---

## 9. Location Search Implementation

The `WorkshopProfile::scopeNearby()` scope uses the **Haversine formula** via raw SQL,
which works on all supported databases (SQLite for development, MySQL/PostgreSQL for production):

```sql
SELECT *,
  (6371 * ACOS(
    COS(RADIANS(:lat)) * COS(RADIANS(latitude))
    * COS(RADIANS(longitude) - RADIANS(:lng))
    + SIN(RADIANS(:lat)) * SIN(RADIANS(latitude))
  )) AS distance_km
FROM workshop_profiles
WHERE is_listed = 1
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
HAVING distance_km <= :radius_km
ORDER BY distance_km ASC;
```

**Geocoding:** The current implementation requires `latitude`/`longitude` to be set
explicitly when the mechanic creates their profile. For production use, integrate a
geocoding service (e.g. Google Maps Geocoding API or OpenCage) to auto-fill coordinates
from the street address.

**Performance at scale:** For deployments with hundreds of workshops, consider adding a
spatial index (MySQL `SPATIAL INDEX` or PostGIS `GIST` index on a `GEOMETRY` column)
and replacing the Haversine scope with a PostGIS `ST_DWithin` query.

---

## 10. Future Roadmap

| Phase | Feature | Depends on |
|-------|---------|-----------|
| 13 | Booking system | This addon – mechanics manage availability per-tenant |
| 14 | Workshop photos | Existing media library (already tenant-scoped) |
| 14 | Verified reviews | Link reviews to completed bookings (Phase 13) |
| 15 | Customer app | React Native / PWA consuming the central search API |
| 15 | Push notifications | Booking confirmations per-tenant |
| 16 | Featured listings | Stripe billing per-impression or per-month |
| 16 | Mechanic leaderboards | Central analytics aggregation (Phase 9 pipeline) |

---

## 11. Separate-Service Alternative

The question was raised: *"Can we salvage this project and deploy it as a separate service?"*

**Yes – the platform can be forked and deployed standalone** as a workshop-only SaaS
with mechanics as tenants:

| Concern | Standalone Deployment |
|---------|----------------------|
| Multi-tenancy | Already built (Stancl/Tenancy) |
| Auth | Laravel Passport already in place |
| CMS per mechanic | Puck page builder already in place |
| Payments | Phase 10 – Stripe/Swish/Klarna already integrated |
| Analytics | Phase 9 – event pipeline already in place |
| Bookings | Phase 13 – planned and architecturally ready |
| Location search | This addon adds it |
| Customer app | New front-end consuming central API (not yet built) |

In a standalone deployment, the "directory customer" requirement disappears:
each mechanic signs up directly, pays a subscription, and manages their own workshop
profile. The central domain becomes the discovery platform, and tenant subdomains are
individual mechanic storefronts.

The main items that would need building for a standalone product:

1. **Self-service mechanic signup** (tenant creation + payment + onboarding wizard)
2. **Customer-facing search UI** (React SPA or Next.js on the central domain)
3. **Booking widget** (Phase 13 – planned)
4. **Mobile app** (optional – the REST API is already in place)
