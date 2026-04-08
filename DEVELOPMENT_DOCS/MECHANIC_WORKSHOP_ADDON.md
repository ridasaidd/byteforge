# Mechanic Workshop Directory — Add-on Plan

**Status:** Implementation Ready  
**Feature flag:** `mechanic_workshop_directory`  
**Addon slug:** `mechanic-workshop-directory`

---

## Problem & Context

A ByteForge customer wants to build a **location-based search engine for car mechanic workshops** — similar to Airbnb but for mechanics. Key requirements:

- A directory of mechanic workshops with location data
- End-customers can search and filter workshops by proximity, city, or service type
- Workshop owners can manage their own listing, services, and bookings
- The customer (company) manages the entire directory as a **ByteForge tenant**
- Must integrate with the existing multi-tenant, RBAC, and billing infrastructure

---

## Architecture Decision

### Option A: Mechanics as listings within a tenant ✅ (chosen)

| Concern | Decision |
|---------|----------|
| Who is the ByteForge tenant? | The directory company (one tenant) |
| What are mechanics? | Workshop listings (resources within the tenant) |
| What are end-customers? | Users with the `customer` role inside the tenant |
| Database | Uses the existing single central database, row-scoped by `tenant_id` |
| Multi-tenancy | No changes needed — existing Stancl/Tenancy 3.x handles it |

**Why not "each mechanic as a tenant"?**  
The existing platform already supports multiple tenants and isolated billing per tenant. However, if each mechanic needs their own CMS, themes, navigation, and billing, that model works too (deploy a second instance of ByteForge and let mechanics register as tenants). That approach requires no code changes and is documented in Option B below.

### Option B: Mechanics as separate tenants (alternative)

If each mechanic workshop needs its own fully isolated CMS + billing:

1. Deploy a separate ByteForge instance (or use the same instance)
2. Each workshop **registers as a tenant** (existing flow)
3. A custom central directory tenant aggregates public data from all tenants via a cross-tenant query service
4. This requires exposing a public "list all tenants" API — not yet implemented but technically feasible given the shared central database

---

## User Roles (New Roles Added to TenantRbacService)

| Role | Who | Permissions |
|------|-----|-------------|
| `admin` (extended) | Directory manager | All existing + full workshop/review/booking management |
| `workshop_owner` | Mechanic / garage owner | Create & edit own listing, manage own services & bookings |
| `customer` | End-user searching for mechanics | Browse workshops, submit reviews, create & cancel bookings |

Roles map to `memberships.role`:

```
memberships.role = 'workshop_owner' → RBAC role 'workshop_owner'
memberships.role = 'customer'       → RBAC role 'customer'
```

---

## Database Schema (New Tables)

### `mechanic_workshops`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `tenant_id` | varchar FK → tenants | Row-level tenant scoping |
| `owner_user_id` | bigint FK → users (nullable) | Workshop owner account |
| `name` | varchar(255) | Workshop display name |
| `slug` | varchar unique | URL-friendly identifier |
| `description` | text | About the workshop |
| `address` | varchar(500) | Street address |
| `city` | varchar(100) | City (used for city-filter) |
| `state` | varchar(100) | State / region |
| `country` | char(2) | ISO 3166-1 alpha-2 |
| `postal_code` | varchar(20) | Postal code |
| `latitude` | decimal(10,7) | WGS-84 latitude |
| `longitude` | decimal(10,7) | WGS-84 longitude |
| `phone` | varchar(30) | Contact phone |
| `email` | varchar(255) | Contact email |
| `website` | varchar(500) | Workshop website |
| `status` | varchar (enum) | `active`, `inactive`, `pending` |
| `rating_average` | decimal(3,2) | Pre-computed aggregate rating |
| `rating_count` | unsigned int | Number of published reviews |
| `deleted_at` | timestamp | Soft delete |

### `mechanic_services`

Services offered by each workshop (e.g. oil change, tyre replacement).

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | |
| `workshop_id` | bigint FK → mechanic_workshops | |
| `name` | varchar(255) | Service name |
| `description` | text | Service description |
| `price_min` | unsigned int | Minimum price (minor units) |
| `price_max` | unsigned int | Maximum price (minor units) |
| `currency` | char(3) | ISO 4217 currency code |
| `duration_minutes` | unsigned smallint | Expected duration |
| `is_active` | boolean | Show/hide service |
| `sort_order` | unsigned smallint | Display order |

### `mechanic_reviews`

Customer reviews (one per customer per workshop).

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | |
| `workshop_id` | bigint FK → mechanic_workshops | |
| `reviewer_user_id` | bigint FK → users | Reviewer account |
| `rating` | tinyint | 1–5 stars |
| `title` | varchar(255) | Review headline |
| `comment` | text | Review body |
| `status` | varchar | `published`, `pending`, `rejected` |

### `mechanic_bookings`

Service bookings made by customers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | |
| `workshop_id` | bigint FK → mechanic_workshops | |
| `service_id` | bigint FK → mechanic_services (nullable) | Requested service |
| `customer_user_id` | bigint FK → users | Customer account |
| `scheduled_at` | timestamp | Requested appointment time |
| `status` | varchar | `pending`, `confirmed`, `cancelled`, `completed` |
| `notes` | text | Customer notes |
| `cancellation_reason` | text | Reason if cancelled |

---

## API Endpoints

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workshops/search` | Search workshops. Params: `lat`, `lng`, `radius_km`, `city`, `query`, `per_page` |
| `GET` | `/api/workshops/cities` | List cities that have active workshops |
| `GET` | `/api/workshops/{id}` | Get a single workshop with its services |
| `GET` | `/api/workshops/{id}/services` | List active services for a workshop |
| `GET` | `/api/workshops/{id}/reviews` | List published reviews (paginated) |

### Authenticated — Workshop Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/workshops` | `workshops.create` | Create a new workshop |
| `PUT/PATCH` | `/api/workshops/{id}` | `workshops.edit` | Update workshop details |
| `DELETE` | `/api/workshops/{id}` | `workshops.delete` | Soft-delete a workshop |
| `POST` | `/api/workshops/{id}/services` | `workshops.edit` | Add a service |
| `PUT/PATCH` | `/api/workshops/{id}/services/{sid}` | `workshops.edit` | Update a service |
| `DELETE` | `/api/workshops/{id}/services/{sid}` | `workshops.edit` | Remove a service |

### Authenticated — Reviews

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/workshops/{id}/reviews` | `reviews.create` | Submit a review |
| `PUT` | `/api/workshops/{id}/reviews/{rid}` | `reviews.manage` | Moderate a review (admin) |
| `DELETE` | `/api/workshops/{id}/reviews/{rid}` | `reviews.manage` | Delete a review (admin) |

### Authenticated — Bookings

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/workshops/{id}/bookings` | `bookings.create` | Create a booking (customer) |
| `GET` | `/api/workshops/{id}/bookings` | `bookings.view` | List bookings for a workshop |
| `PUT/PATCH` | `/api/workshops/{id}/bookings/{bid}` | `bookings.manage` | Confirm/cancel booking (owner) |
| `GET` | `/api/my-bookings` | `bookings.view` | Customer's own bookings |
| `POST` | `/api/my-bookings/{bid}/cancel` | `bookings.create` | Customer cancels a booking |

---

## Location Search

The Haversine formula is applied directly in MySQL via a raw SQL expression on the `nearby()` scope:

```sql
SELECT *, (
  6371 * acos(
    cos(radians(:lat)) * cos(radians(latitude)) *
    cos(radians(longitude) - radians(:lng)) +
    sin(radians(:lat)) * sin(radians(latitude))
  )
) AS distance_km
FROM mechanic_workshops
WHERE tenant_id = :tid AND status = 'active'
HAVING distance_km <= :radius
ORDER BY distance_km ASC
```

> **Production note:** For very large datasets (10 000+ workshops), consider adding a bounding-box pre-filter (latitude BETWEEN ?, longitude BETWEEN ?) before the Haversine HAVING clause to allow the B-tree index on `(tenant_id, latitude, longitude)` to narrow the result set.

---

## Add-on Activation Flow

1. Tenant subscribes to the `mechanic-workshop-directory` add-on (existing billing flow)
2. The `TenantAddon` record is created with `activated_at` set
3. Feature flag `mechanic_workshop_directory` gates workshop endpoints
4. Tenant admin creates the first workshop listings and invites workshop owners
5. Workshop owners claim their listing; customers register and search

---

## Key Code Locations

| Artefact | Path |
|----------|------|
| Migrations | `database/migrations/2026_03_23_000001-4_*.php` |
| Models | `app/Models/MechanicWorkshop.php`, `MechanicService.php`, `MechanicReview.php`, `MechanicBooking.php` |
| Search service | `app/Services/WorkshopSearchService.php` |
| Controllers | `app/Http/Controllers/Api/MechanicWorkshopController.php`, `MechanicServiceController.php`, `MechanicReviewController.php`, `MechanicBookingController.php` |
| Routes | `routes/tenant.php` — `workshops/*` prefix |
| RBAC | `app/Services/TenantRbacService.php` — `workshop_owner` and `customer` roles |
| Permissions | `database/seeders/RolePermissionSeeder.php` |
| Addon seeder | `database/seeders/AddonSeeder.php` |
| Tests | `tests/Feature/Api/MechanicWorkshopApiTest.php` |

---

## Future Enhancements (Phase 14+)

- **Map integration**: Pass lat/lng to a frontend map component (Leaflet / Google Maps)
- **Opening hours**: Add `mechanic_workshop_hours` table with day/time ranges
- **Media**: Use Spatie Media Library to attach photos to workshop listings
- **Notifications**: Email/SMS confirmation when a booking is confirmed or cancelled
- **Geofencing index**: PostGIS extension or spatial index for sub-millisecond geo queries on very large datasets
- **Mechanics as tenants** (Option B): if workshops need isolated CMS, register each as a tenant and build a cross-tenant discovery API
