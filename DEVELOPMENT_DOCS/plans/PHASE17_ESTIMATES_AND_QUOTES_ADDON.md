# Phase 17: Estimates and Quotations Add-on

Last updated: April 20, 2026
Status: Planned — discovery only, not yet started
Depends on: Phase 12 tenant runtime, Phase 13 booking, Phase 14 payments
Recommended branch later: `feature/phase17-estimates-and-quotes`

---

## Problem Statement

Some service businesses cannot confirm a fixed price or duration before reviewing
the request details. Car workshops are the clearest example, but the same need
appears in other verticals:

1. repair and diagnostics,
2. detailing and restoration,
3. bespoke beauty services,
4. home and field services,
5. any workflow where scope, duration, or materials are uncertain up front.

The current platform already supports bookings and payments, but those flows are
best when the tenant can publish a known service, price, and duration. They do
not fully cover request-first service businesses that need to assess work before
committing.

This phase would add a tenant-scoped Estimates and Quotes workflow so guests can
request an estimate and tenant staff can respond with time, price, and service
notes before any booking or payment is created.

---

## Core Product Decision

This should be an add-on, not a platform-wide mandatory feature.

Why:

1. it is valuable for some tenants but unnecessary noise for others,
2. it fits the existing `addons` and `tenant_addons` architecture,
3. it can be feature-gated in the tenant CMS and storefront,
4. it can later become a billable premium workflow.

The add-on should be framed as a general service-estimation capability, not as a
car-workshop-only vertical feature.

---

## Design Principles

1. Request-first, not accounting-first. This is a pre-service estimation workflow, not invoicing software.
2. Tenant-local, not cross-tenant. Quote data belongs to a single tenant and should follow existing tenant isolation rules.
3. Guest-friendly by default. Guests should be able to request a quote without mandatory account creation.
4. Add-on gated. No quote UI or routes should appear unless the feature flag is active.
5. Conversion-friendly. Accepted quotes should be able to feed later booking and payment workflows.
6. Audit important state changes. Quote sent, accepted, rejected, expired, and converted events should be visible to tenant staff.

---

## Recommended MVP

### Guest Flow

1. Guest opens a tenant quote-request form.
2. Guest describes the requested work.
3. Guest optionally uploads reference files or photos.
4. Guest submits contact details and request notes.
5. Guest receives confirmation that the tenant will review the request.

### Tenant Flow

1. Tenant staff review incoming quote requests in CMS.
2. Staff create a quote response with estimated price, estimated duration, notes, and validity window.
3. Staff send the quote to the guest.
4. Guest accepts, rejects, or ignores the quote.
5. Accepted quotes can later convert into a booking, payment request, or job record.

---

## Suggested Domain Model

### Quote Requests

Recommended fields:

1. `id`
2. `tenant_id`
3. `guest_name`
4. `guest_email`
5. `guest_phone` nullable
6. `service_category` nullable
7. `vehicle_or_subject_label` nullable
8. `request_description`
9. `status`
10. `submitted_at`
11. `reviewed_at` nullable
12. timestamps

Suggested statuses:

1. `submitted`
2. `under_review`
3. `quoted`
4. `accepted`
5. `rejected`
6. `expired`
7. `cancelled`

### Quotes

Recommended fields:

1. `id`
2. `tenant_id`
3. `quote_request_id`
4. `sent_by_user_id`
5. `currency`
6. `subtotal_minor`
7. `tax_minor` nullable
8. `total_minor`
9. `estimated_duration_minutes` nullable
10. `valid_until`
11. `customer_notes` nullable
12. `internal_notes` nullable
13. `status`
14. `accepted_at` nullable
15. `rejected_at` nullable
16. timestamps

### Quote Line Items

Recommended fields:

1. `quote_id`
2. `label`
3. `description` nullable
4. `quantity`
5. `unit_price_minor`
6. `line_total_minor`
7. `sort_order`

### Attachments

Quote requests should support attachments because some high-value use cases,
especially diagnostics and repair, depend on photos or files.

---

## Relation To Existing Features

### Booking

Accepted quotes should be able to seed a later booking flow, but this should be
optional and not required for the MVP.

Possible later conversions:

1. accepted quote creates a draft booking,
2. accepted quote pre-fills service and duration data,
3. accepted quote becomes a job that later schedules into booking.

### Payments

Quotes should not create payments automatically in the first slice.

Later integration could support:

1. deposit request from accepted quote,
2. quote-to-payment conversion,
3. partial approval or staged payment requests.

### Guest Auth

If guest auth exists later, quote history can become part of the same guest
portal. Until then, a guest can still receive email links to view their quote.

---

## Add-on Integration

Recommended add-on shape:

1. add a new `addons` row such as `estimates_quotes`,
2. use a feature flag such as `estimates_quotes`,
3. gate storefront routes and tenant CMS pages with `addon:estimates_quotes`,
4. expose active flags through the existing tenant add-on endpoint pattern.

Likely tenant permissions later:

1. `quotes.view`
2. `quotes.manage`
3. `quotes.send`

These should be tenant-scoped permissions, not central operator permissions.

---

## API Shape

### Tenant public API

Examples:

1. `POST /api/public/quotes`
2. `GET /api/public/quotes/{token}`
3. `POST /api/public/quotes/{token}/accept`
4. `POST /api/public/quotes/{token}/reject`

### Tenant CMS API

Examples:

1. `GET /api/quotes`
2. `GET /api/quotes/{id}`
3. `POST /api/quotes/{id}/send`
4. `POST /api/quotes/{id}/expire`
5. `POST /api/quotes/{id}/convert-to-booking`

---

## Non-Goals For First Slice

1. full invoicing,
2. accounting ledger exports,
3. multi-tenant quote marketplace,
4. approval workflows with complex signatures,
5. automated pricing engines,
6. deep ERP or parts-catalog integrations.

---

## Suggested Rollout Order

### 17.1 Core Quote Request Domain

1. quote request model and migrations,
2. public request form endpoint,
3. tenant CMS listing and detail view,
4. basic statuses and audit trail.

### 17.2 Quote Authoring And Sending

1. quote response model,
2. line items,
3. send flow,
4. guest view and accept or reject flow.

### 17.3 Conversion And Hardening

1. quote-to-booking conversion,
2. optional quote-to-payment deposit path,
3. notifications,
4. reporting and cleanup.

---

## Open Decisions

1. Should accepted quotes convert into bookings, jobs, payments, or a separate work-order concept?
2. Should line items be optional in the first slice, or required from day one?
3. Should quote requests support file uploads in the MVP or one slice later?
4. Should tenants be able to publish multiple request forms for different service categories?
5. Should quotes be public-token based only at first, or integrated into guest auth later?

Recommended answers for first implementation:

1. start with quote-to-booking later, not in the first slice,
2. allow simple total-only quotes first but design the schema for line items,
3. include attachments early because they are central to repair and estimation workflows,
4. start with one general quote-request flow,
5. use public-token flows first and integrate guest auth later.
