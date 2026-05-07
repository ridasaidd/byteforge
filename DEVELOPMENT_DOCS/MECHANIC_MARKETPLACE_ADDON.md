# Mechanic Marketplace Add-on

_Added: March 2026_

---

## Overview

This document describes the architecture plan and implementation for building a
**location-based car mechanic marketplace** on top of the ByteForge platform.

The product is inspired by Airbnb: customers search for mechanic workshops near them,
browse profiles, and contact or book a workshop.

---

## Architecture Decision: Mechanics as Tenants

ByteForge already ships a full multi-tenant CMS.  The most natural fit for the mechanic
marketplace is to treat **each mechanic workshop as a ByteForge tenant**.

| Airbnb concept | ByteForge equivalent |
|---------------|----------------------|
| Host listing  | Mechanic tenant (workshop profile) |
| Listing page  | Tenant CMS pages (own subdomain) |
| Search results | Central public search API |
| Guest (traveler) | End-customer (unauthenticated search visitor) |
| Platform admin | ByteForge superadmin |

**Why this approach?**

- Every mechanic gets their own subdomain (`workshop-x.byteforge.se`) and a full CMS
  (pages, themes, media) out of the box — no extra work.
- The existing `Tenant`, `Membership`, `Plan`, and `Addon` models handle subscription
  billing for workshops.
- A thin public search API is the only net-new backend surface.
- Customers browsing the marketplace are **unauthenticated visitors** — no new user type
  is needed for read-only search.

### Alternative: Single-Tenant Add-on (not recommended)

The entire marketplace could live inside one ByteForge tenant with mechanics and customers
as internal user roles.  This works but loses multi-tenant isolation and prevents each
workshop from owning their own site and billing plan.

---

## What Was Implemented

### 1. Database — `mechanic_profiles` table

Migration: `database/migrations/2026_03_23_000001_create_mechanic_profiles_table.php`

| Column | Type | Purpose |
|--------|------|---------|
| `tenant_id` | varchar (unique) | One-to-one link to Tenant |
| `address` | varchar | Street address |
| `city`, `state`, `country`, `postal_code` | varchar | Location |
| `latitude`, `longitude` | decimal(10,7) | GPS coordinates |
| `phone`, `email`, `website` | varchar | Contact details |
| `description` | text | Workshop description |
| `services` | JSON | Array of offered services |
| `business_hours` | JSON | `{"monday": {"open": "08:00", "close": "17:00"}, …}` |
| `is_active` | boolean | Controls visibility in search |
| `is_verified` | boolean | Trust badge (set by superadmin) |

Composite indexes on `(latitude, longitude)`, `(city, is_active)`, and
`(country, is_active)` keep geo-queries fast without a spatial extension.

### 2. Model — `App\Models\MechanicProfile`

File: `app/Models/MechanicProfile.php`

Key query scopes:

| Scope | Purpose |
|-------|---------|
| `active()` | Only `is_active = true` |
| `verified()` | Only `is_verified = true` |
| `inCity(string)` | Case-insensitive city match |
| `inCountry(string)` | Case-insensitive country match |
| `offersService(string)` | JSON array contains service |
| `withCoordinates()` | Both lat/lng are NOT NULL |
| `withinBoundingBox(lat, lng, km)` | Rectangle pre-filter for GPS search |

The `distanceTo(lat, lng)` helper calculates the Haversine great-circle distance in km.

### 3. Tenant model — `mechanicProfile()` relationship

`Tenant::mechanicProfile()` returns the `hasOne(MechanicProfile::class)` relationship,
making it easy to eager-load workshop details alongside tenant data.

### 4. Backend Controllers

#### `MechanicProfileController` (tenant-side)

File: `app/Http/Controllers/Api/MechanicProfileController.php`  
Routes (in `routes/tenant.php`):

```
GET    /api/mechanic-profile        Show own profile (permission: view settings)
POST   /api/mechanic-profile        Create profile   (permission: manage settings)
PUT    /api/mechanic-profile        Upsert profile   (permission: manage settings)
DELETE /api/mechanic-profile        Delete profile   (permission: manage settings)
```

A workshop admin visits their CMS dashboard → Settings → Mechanic Profile and fills in
their address, services, and business hours.

#### `MechanicSearchController` (central, public)

File: `app/Http/Controllers/Api/MechanicSearchController.php`  
Routes (in `routes/api.php`):

```
GET  /api/mechanics/search    Location-based search (no auth, throttle: 120/min)
GET  /api/mechanics/{id}      Single profile by ID  (no auth, throttle: 120/min)
```

**Search parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `lat` | float | — | GPS latitude; enables distance sort |
| `lng` | float | — | GPS longitude |
| `radius` | float | 50 | Search radius in km (max 500) |
| `city` | string | — | Text city filter |
| `country` | string | — | Text country filter |
| `service` | string | — | Matches inside `services` JSON array |
| `verified` | bool | false | Restrict to verified workshops |
| `per_page` | int | 15 | Page size (max 100) |
| `page` | int | 1 | Page number |

**Distance algorithm**

1. Bounding-box pre-filter (cheap, no trig) reduces candidate set.
2. Haversine formula applied to candidates for exact distance.
3. Results sorted ascending by distance when GPS provided.

### 5. Puck Component — `MechanicListing`

File: `resources/js/shared/puck/components/content/MechanicListing.tsx`

A drag-and-drop page builder component that renders an interactive mechanic search widget.
Superadmins (or tenant owners using the central CMS) can drop it on any page.

Features:
- City and service text search
- Optional GPS "Use my location" button
- Distance display (km) when GPS is active
- Verified badge
- Services tag cloud
- "View Workshop" link to the mechanic's own subdomain
- Pagination
- All colors resolve from the active ByteForge theme

Configurable props:

| Prop | Default |
|------|---------|
| `heading` | "Find a Mechanic Near You" |
| `subheading` | "Browse trusted car workshops in your area" |
| `radiusKm` | 50 |
| `perPage` | 12 |
| `verifiedOnly` | false |
| `enableGps` | true |
| `apiBaseUrl` | `/api` |

The component appears in the Puck sidebar under **Mechanic Marketplace**.

---

## User Roles & Access

### Workshop owner (mechanic tenant admin)

- Role: `admin` (existing ByteForge tenant role)
- Can manage their own `mechanic-profile` via the CMS Settings page
- Can manage CMS pages, themes, and media for their workshop website

### End-customer (marketplace visitor)

- **No account required** for search
- Visits the central website (e.g. `byteforge.se`), uses the `MechanicListing` component
- Clicks "View Workshop" → lands on the mechanic's own tenant subdomain

### Platform superadmin

- Uses the existing superadmin dashboard
- Can set `is_verified = true` on mechanic profiles (manual trust review)
- Manages tenant billing/plans as normal

---

## Planned Next Steps

- [ ] Superadmin UI: list and verify mechanic profiles (`/superadmin/mechanic-profiles`)
- [ ] Tenant CMS UI: "Mechanic Profile" settings page in the tenant dashboard
- [ ] Booking integration (Phase 13): connect booking system to mechanic profiles
- [ ] Review & rating system: `mechanic_reviews` table linked to `mechanic_profiles`
- [ ] Mechanic-specific Puck component for the workshop's own site (services list, booking button)
- [ ] Map view: integrate a map library (e.g. Leaflet) in `MechanicListing`
- [ ] Image gallery: workshop photos via existing Spatie Media Library

---

## Running the Tests

```bash
php artisan test --filter MechanicSearchTest
```

All tests are in `tests/Feature/Api/MechanicSearchTest.php`.
