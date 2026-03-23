# Mechanic Directory Addon — Architecture & Implementation Plan

Last updated: March 23, 2026

---

## Overview

This document describes the architecture and implementation plan for the **Mechanic Workshop Directory** addon — a location-based search engine for car mechanic workshops, similar in concept to Airbnb's listing search.

The addon is designed to be activated on a **single tenant** of the ByteForge platform. The tenant (e.g., a mechanic directory business) manages both **mechanic workshop listings** and the **customers** who search for them.

---

## Problem Statement

A customer wants to deploy a location-based search engine where:

- **Mechanics** (workshop owners) list their service centres with address, specialisations, and contact info.
- **Customers** (end users) search for mechanics by their current GPS location and find the nearest workshops.
- The directory operator is the **tenant** on ByteForge who manages the entire platform.

---

## Architecture Decision

### Single-Tenant Model (Recommended)

The mechanic directory operator runs **as a single tenant** on ByteForge. Within this tenant:

| Actor | Role | Access |
|-------|------|--------|
| Tenant admin | Manages all workshop listings and users | Full CMS access |
| Mechanic | Can be linked to a workshop profile (optional) | CMS access with limited scope |
| Customer | Searches workshops via the public storefront | No auth required |

**Why not make mechanics their own tenants?**

Making each mechanic a separate ByteForge tenant would introduce:
- Billing complexity (each mechanic pays separately)
- Cross-tenant data aggregation difficulty for the search engine
- Significantly more infrastructure overhead

The single-tenant model allows **one central listing database** scoped to the directory tenant's `tenant_id`, which is ideal for fast location queries.

### Alternative: Mechanic-as-Tenant

If the business model requires mechanics to self-manage their own CMS dashboards (custom pages, media, themes), each mechanic can be a tenant. In this case:
- Each mechanic subdomain (`mechanic1.directory.se`) gets a full ByteForge CMS instance.
- The "directory" storefront would call a cross-tenant API to aggregate listings.
- This requires a **Platform API** (central) endpoint that queries all workshops across tenants.

This is **architecturally supported but more complex**. Start with the single-tenant approach and migrate if needed.

---

## Database

### `workshops` Table

```sql
CREATE TABLE workshops (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       VARCHAR(255) NULLABLE INDEXED,    -- ByteForge tenant isolation
  user_id         BIGINT UNSIGNED NULLABLE,          -- Optional linked mechanic user
  name            VARCHAR(255) NOT NULL,
  description     TEXT NULLABLE,
  phone           VARCHAR(50) NULLABLE,
  email           VARCHAR(255) NULLABLE,
  website         VARCHAR(255) NULLABLE,
  address         VARCHAR(255) NULLABLE,
  city            VARCHAR(100) NULLABLE,
  state           VARCHAR(100) NULLABLE,
  postal_code     VARCHAR(20) NULLABLE,
  country         CHAR(2) DEFAULT 'SE',
  latitude        DECIMAL(10,7) NULLABLE,
  longitude       DECIMAL(10,7) NULLABLE,
  specializations JSON NULLABLE,     -- Array of strings: ["Oil change", "Tyres"]
  opening_hours   JSON NULLABLE,     -- {"monday": "08:00-17:00", ...}
  is_active       BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP,
  INDEX (tenant_id, is_active),
  INDEX (tenant_id, latitude, longitude)
);
```

### Location Search (Haversine Formula)

The `Workshop::scopeNearbyWithinKm()` scope uses the **Haversine formula** to calculate great-circle distance. This works on MySQL and SQLite without any spatial extensions:

```php
$workshops = Workshop::where('tenant_id', $tenantId)
    ->active()
    ->nearbyWithinKm($lat, $lng, $radiusKm)
    ->paginate(15);
```

Each result includes a virtual `distance_km` column ordered from nearest to furthest.

**Scalability note:** For very large datasets (>100 000 listings), consider adding a [spatial index](https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html) with `POINT` columns and using ST_Distance_Sphere, or switching to PostGIS on PostgreSQL.

---

## API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workshops/search` | Location-based search using Haversine |
| GET | `/api/workshops/public/{id}` | Single workshop public profile |

**Search parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lat` | float | required | Customer latitude |
| `lng` | float | required | Customer longitude |
| `radius` | float | 50 | Search radius in km (max 500) |
| `q` | string | optional | Name/city text filter |
| `per_page` | int | 15 | Results per page |
| `page` | int | 1 | Page number |

**Example response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Sthlm Auto Service",
      "city": "Stockholm",
      "address": "Drottninggatan 15",
      "distance_km": 1.24,
      "specializations": ["Oil change", "Tyres", "Brakes"],
      "phone": "+46 8 000 00 00",
      "is_verified": true
    }
  ],
  "meta": { "total": 3, "current_page": 1, "last_page": 1, "per_page": 15 },
  "search": { "latitude": 59.3293, "longitude": 18.0686, "radius_km": 50 }
}
```

### Protected (Tenant CMS — Requires Auth)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/api/workshops` | `workshops.view` | List all workshops for tenant |
| POST | `/api/workshops` | `workshops.manage` | Create a workshop |
| GET | `/api/workshops/{id}` | `workshops.view` | Show workshop detail |
| PUT/PATCH | `/api/workshops/{id}` | `workshops.manage` | Update a workshop |
| DELETE | `/api/workshops/{id}` | `workshops.manage` | Delete a workshop |

---

## User Roles Within the Tenant

ByteForge uses **Spatie Permissions** with team scoping per tenant. For the mechanic directory, the following roles are recommended:

| Role | Permissions | Use Case |
|------|------------|---------|
| `admin` | All permissions including `workshops.manage` | Directory operator |
| `mechanic` | `workshops.view` (own listing only — extend controller) | Workshop owner |
| `viewer` | `workshops.view` | Staff / read-only |

Customers (end users) do **not** need a ByteForge account. They use the public search API anonymously.

**To restrict mechanics to only editing their own workshop**, extend the `WorkshopController` to check `$workshop->user_id === $request->user()->id` before allowing mutations.

---

## Frontend Components

### Tenant CMS — `WorkshopsPage`

Located at `/cms/workshops` in the Tenant CMS app. Allows the tenant admin to:
- List all workshops with search and pagination
- Create, edit, and delete workshop listings
- Mark workshops as active/inactive and verified

**Route:** `/cms/workshops`
**Permission gate:** `workshops.view`

### Public Storefront — `WorkshopSearch` (Puck Component)

A drag-and-drop Puck component under the **"Mechanic Directory"** category in the Page Builder. When dropped onto a public page it renders:

1. A search bar with optional text filter (specialization) and radius selector
2. A **"Use My Location"** button that triggers `navigator.geolocation.getCurrentPosition()`
3. A scrollable list of workshop cards sorted by proximity, each showing:
   - Name, address, distance in km
   - Verified badge (if `is_verified = true`)
   - Specialization tags
   - Contact links (phone, email, website)

This component fetches from `/api/workshops/search` with the user's GPS coordinates. No login required.

---

## File Locations

| File | Purpose |
|------|---------|
| `database/migrations/2026_03_23_000001_create_workshops_table.php` | Schema |
| `app/Models/Workshop.php` | Eloquent model with Haversine scope |
| `app/Http/Controllers/Api/WorkshopController.php` | CRUD (protected) |
| `app/Http/Controllers/Api/WorkshopSearchController.php` | Public search |
| `routes/tenant.php` | API route registration |
| `resources/js/shared/services/api/workshops.ts` | Frontend API service |
| `resources/js/shared/services/api/types.ts` | TypeScript types |
| `resources/js/apps/tenant/components/pages/WorkshopsPage.tsx` | CMS management page |
| `resources/js/shared/puck/components/content/WorkshopSearch.tsx` | Puck storefront component |
| `resources/js/shared/puck/config/index.tsx` | Puck component registration |

---

## Implementation Checklist

- [x] Database migration (`workshops` table with lat/lng indexes)
- [x] `Workshop` Eloquent model with `nearbyWithinKm` scope (Haversine)
- [x] `WorkshopController` — tenant-scoped CRUD with permission middleware
- [x] `WorkshopSearchController` — public unauthenticated location search
- [x] Tenant API routes (public search + protected CRUD)
- [x] TypeScript types (`Workshop`, `WorkshopSearchResult`, etc.)
- [x] Frontend API service (`workshops.ts`, `workshopSearch`)
- [x] `WorkshopsPage` — Tenant CMS management UI
- [x] `WorkshopSearch` — Public Puck storefront component
- [x] Registered in Puck config under "Mechanic Directory" category
- [x] Added to Tenant CMS navigation menu (Wrench icon)
- [ ] Seed example workshops (optional, for demo tenant)
- [ ] Add `workshops.view` / `workshops.manage` to the permission seeder
- [ ] Write Feature tests for `WorkshopController` and `WorkshopSearchController`

---

## Next Steps

1. **Run the migration:** `php artisan migrate`
2. **Seed permissions:** Add `workshops.view` and `workshops.manage` to the Spatie permission seeder and assign to the `admin` role for the mechanic directory tenant.
3. **Create a demo workshop** via the CMS at `/cms/workshops`.
4. **Add `WorkshopSearch` to a public page** via the Puck page builder — it will appear in the "Mechanic Directory" category in the component panel.
5. **Test the search** using browser geolocation on the public storefront.

---

## Scaling Considerations

| Scale | Recommendation |
|-------|---------------|
| < 10 000 workshops | Current Haversine SQL implementation is sufficient |
| 10 000–100 000 | Add MySQL spatial index (`POINT` + `ST_Distance_Sphere`) |
| > 100 000 | Consider Elasticsearch with geo_distance queries, or PostGIS |

For **multi-tenant deployments** where many directory operators each have their own tenant, the `tenant_id` column already isolates data correctly. Each operator's data remains completely separate.
