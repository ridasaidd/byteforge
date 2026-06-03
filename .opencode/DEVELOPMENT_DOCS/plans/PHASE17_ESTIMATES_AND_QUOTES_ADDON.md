# Phase 17: Estimates and Quotes Add-on

Last updated: May 20, 2026
Status: Complete on the current branch - core request -> quote -> guest decision -> booking handoff, service-driven storefront entry, guest continuity, private request attachments, automated mail contract coverage, storefront quote-request browser coverage, guest-portal quote continuity browser coverage, development Mailtrap quote delivery verification, and final merge-readiness validation are implemented; deferred follow-ups remain intentionally out of the Phase 17 completion line
Depends on: Phase 12 tenant runtime, Phase 13 booking, Phase 14 payments, Phase 15 guest auth, Phase 19 system surfaces
Current branch: `feature/phase17-estimates-and-quotes`

Companion execution checklist:

- [PHASE17_EXECUTION_CHECKLIST.md](PHASE17_EXECUTION_CHECKLIST.md)
- [PHASE17_GUEST_QUOTE_CONTINUITY_PLAN.md](PHASE17_GUEST_QUOTE_CONTINUITY_PLAN.md)

Current implementation snapshot:

Completed:

1. add-on catalog seed, Pennant feature flag, and tenant add-on exposure,
2. quote permissions and tenant RBAC mapping,
3. public quote-request intake with tenant scoping and input normalization,
4. tenant CMS request inbox and request detail page,
5. first draft-quote creation from a request with quote and line-item persistence,
6. server-side line-total and quote-total calculation,
7. quote send flow from the tenant CMS,
8. public tokenized quote review UI reached from a secure emailed link,
9. guest accept and reject actions with idempotent handling,
10. accepted-quote conversion handoff into the existing booking composer,
11. persisted booking linkback via `bookings.source_quote_id` and quote status transition to `converted`,
12. booking-service-level `customer_flow` support in tenant service management,
13. public booking-service payloads that expose `customer_flow`,
14. service-driven quote branching inside the booking widget for `quote_request` and `either` services,
15. focused backend and frontend regression coverage for the implemented slices,
16. a first public quote request widget for storefront placement.

Still pending after Phase 17 branch completion:

1. any optional staging-specific mail verification if the target environment differs materially from development,
2. deferred quality-of-life work such as a dedicated public quote system page, PDFs, templates, richer quote authoring, and payment follow-ups.

Branch boundary for `feature/phase17-estimates-and-quotes`:

1. this branch owns the quote and estimate customer journey, including the guest continuity needed to make that journey complete,
2. Phase 15 guest auth is a dependency to reuse, not a separate feature stream to reopen,
3. Phase 19 system-surface work is relevant only where the existing guest portal shell or widget-zone contract is reused for quotes,
4. Phase 20 customer accounts remain reference-only and out of scope for this branch,
5. this branch should close Phase 17 by finishing the quote flow, not by expanding into unrelated customer-account or platform initiatives.

---

## Goal

Build an optional tenant-scoped Estimates and Quotes add-on for request-first
service businesses that cannot always publish a fixed price or confirm a slot
up front.

This add-on must work with the booking system already on `main`, not beside it.
The result should be:

1. a guest can request an estimate,
2. tenant staff can review and send a priced quote,
3. the guest can accept or reject it,
4. an accepted quote can flow into the existing booking workflow without
	introducing a second scheduling engine.

This is not invoicing software and should not turn into a general accounting
module.

---

## Representative Use Cases

This add-on is for service providers whose pricing and timing are not reliably
known when the customer first makes contact.

Examples:

1. a hairdresser needs to inspect long, damaged, or otherwise complex hair
	before committing to duration and price,
2. a car workshop needs to inspect the vehicle and identify what actually needs
	service before quoting labor, parts, and completion time,
3. a beauty or restoration provider needs to review scope, condition, and
	requested outcome before booking a definitive appointment,
4. a field-service business needs photos, description, or site details before
	deciding whether the work is a short visit, a half-day job, or a larger
	engagement.

The common pattern is the same across verticals:

1. the customer intent is real,
2. the provider wants to capture demand now,
3. price and duration are unknown until review,
4. booking should happen after the estimate, not before it.

That is why this add-on must integrate directly with the existing booking
system rather than acting as a disconnected proposal tool.

---

## Current Platform Anchors

This plan should follow the architecture already present in ByteForge.

### Add-on activation and gating already exist

Current implementation anchors:

1. `addons` and `tenant_addons` are already the source of truth for paid add-ons.
2. tenant feature flags are defined through Pennant in `AppServiceProvider`.
3. API route gating already uses `addon:{feature_flag}` via `EnsureAddon`.
4. tenant frontend gating already uses `/api/addons` and `AddonProvider`.
5. tenant RBAC already adds addon-specific permissions through `TenantRbacService`.

This add-on should use the same pattern rather than inventing parallel feature
switches.

### Booking already exists and should be reused

Relevant current realities:

1. booking services, resources, availability, holds, and CMS booking management
	are already implemented on `main`,
2. tenant manual booking creation now exists in the dashboard calendar,
3. quote-to-booking must reuse current booking validation and availability rules,
4. accepted quotes should feed the booking flow instead of duplicating booking
	concepts inside the quote system.

### Payments and guest access already exist

Relevant current realities:

1. payment infrastructure already exists but should remain optional for this
	add-on's first shipped slice,
2. guest auth and guest-portal runtime now exist on `main`,
3. first quote delivery can still use secure public tokens rather than waiting
	for guest-portal integration.

---

## Terminology

To avoid model confusion, use one internal vocabulary.

1. `quote_request`: the guest-submitted intake record.
2. `quote`: the tenant-authored response with price, duration, and terms.
3. `estimate`: a user-facing synonym only. Product copy can say "estimate" or
	"quote", but internal code and schema should prefer `quote`.
4. `conversion`: creating or pre-filling a later booking flow from an accepted
	quote.

This is cleaner than creating both `estimates` and `quotes` as separate domain
objects for the same workflow.

---

## Core Product Decisions

1. This is an add-on, not a core platform feature.
2. The primary workflow is request-first service intake, not accounting.
3. The first public customer interaction should be token-based and guest-friendly.
4. Booking integration should happen early, because that is the main platform
	advantage over standalone quote tools.
5. Payment conversion should remain a later slice, not a launch blocker.
6. Printable or PDF quote presentation is useful, but not first-slice critical; when added, it should be a ByteForge-owned quote document layer rather than an invoice-package-driven domain model.
7. Customer-selectable dynamic pricing from quote line items is explicitly out of
	scope for the first implementation.
8. Attachments are valuable, but they should not block the first end-to-end
	request -> quote -> accept -> booking path.
9. Booking services should decide whether the customer enters through direct booking, quote request, or either.
10. A generic quote form can exist for custom businesses, but it should not be the primary storefront model for service-led tenants.
11. Quote acceptance should represent commercial agreement only; confirmed calendar placement still belongs to booking creation.
12. Authenticated quote continuity should reuse Phase 15 guest auth and the Phase 19 guest portal before any new customer-account surface is introduced.
13. Current Phase 17 quote acceptance should not be marketed as a fully legally binding signature workflow; stronger legal claims require explicit terms capture, acceptance evidence, and ideally immutable sent-document snapshots.

---

## Guest Quote Flow Strategy

The quote addon should follow the same guest-experience layering that booking already uses.

### Layer 1. Anonymous-first quote flow remains the default

This is the current shipped flow and it should stay valid even after authenticated guest quote history exists.

Flow:

1. guest submits a quote request anonymously from the tenant storefront,
2. tenant staff reviews the request and sends a quote,
3. the guest receives an email with a secure quote link,
4. the guest can review and accept or reject the quote from that tokenized page,
5. if accepted, the provider can continue into the existing booking conversion flow.

This mirrors the existing anonymous-first booking philosophy: do not force registration before value is delivered.

### Layer 2. Guest-authenticated quote continuity should be additive

Phase 15 already shipped the guest-auth foundation and `/guest-portal` runtime for booking continuity. Quotes should plug into that same model instead of introducing a separate quote login surface.

Recommended rule:

1. anonymous quote links remain valid,
2. guest-authenticated quote history is additive,
3. the same guest can still act from an emailed token link without signing in,
4. authenticated portal access becomes the continuity surface for returning customers.

### Layer 3. Durable customer accounts stay separate

Phase 20 already defines durable customer accounts, password recovery, and possible broader account surfaces. Quote continuity should not wait for that phase, and Phase 17 should not overload `guest_users` into a full customer-account system.

Practical rule:

1. use guest auth for V1 authenticated quote continuity,
2. use Phase 20 customer accounts later for durable multi-tenant customer identity and password-backed account surfaces,
3. do not block the guest quote portal on future account architecture.

Scope rule for this branch:

1. authenticated quote continuity is in scope,
2. password-backed customer accounts are not,
3. cross-tenant SSO is not,
4. a standalone quotes-only authenticated shell is not,
5. generic system-surface platform expansion beyond what the current guest portal already supports is not.

### Public quote review surface strategy

The anonymous quote-review route and the authenticated guest portal should remain separate concerns.

Recommended rule:

1. `/quotes/:token` stays route-owned and token-based for anonymous one-off review,
2. `/guest-portal` stays the authenticated continuity surface for returning guests,
3. if tenant customization is later added to the public quote-review page, it should land as a dedicated system page/system surface rather than as a guest-portal block,
4. the guest portal may host quotes and estimates widgets, but it should not replace the secure public quote-review route.

Practical implication:

1. the current hardcoded `PublicQuotePage` is acceptable for Phase 17 completion,
2. the next customization step should align with Phase 19 system pages,
3. the quote summary, decision actions, token handling, and lifecycle rules must remain code-owned even if the surrounding shell becomes Puck-editable.

---

## Authenticated Quote Portal Plan

### Recommended authenticated quote surface

Use the existing guest portal route family from Phase 15:

1. canonical shell at `/guest-portal`,
2. compatibility alias behavior should remain consistent with existing guest portal routing,
3. quote UI should render as a first-party guest-portal widget or primary portal panel,
4. Phase 19 system surfaces should own the shell and widget-zone behavior rather than a quotes-specific standalone shell.

Why this is the right fit:

1. the authenticated guest runtime already exists,
2. booking continuity already trains the user to manage customer-facing data there,
3. Phase 19 explicitly calls out quotes and estimates as future authenticated guest widgets,
4. it avoids fragmenting the customer journey across multiple partially authenticated pages.

### Recommended guest quote capabilities inside `/guest-portal`

First authenticated quote capabilities:

1. list current quote requests and quotes for the authenticated guest on the current tenant,
2. show quote status groups such as active, accepted, expired, cancelled, rejected, and converted,
3. open quote detail from portal history,
4. accept or reject a sent quote from the authenticated portal,
5. show converted-booking traceability once a quote becomes a booking,
6. later show attachments and structured quote-thread conversation when those slices exist.

Deliberately defer from the first authenticated portal slice:

1. full guest-side quote editing,
2. customer-selectable line items,
3. payment checkout directly from the quote portal,
4. password-backed account settings.

### Data-linking plan for authenticated quote continuity

Quotes already key off `guest_email` through `quote_request`. That is sufficient for anonymous email delivery, but not enough for durable authenticated continuity.

Recommended next linkage:

1. add nullable guest-auth identity linkage to `quote_requests`, using the same actor model introduced in Phase 15,
2. when an authenticated guest submits a new quote request, store the guest identity immediately,
3. on first authenticated guest session, retroactively link quote requests by matching tenant + guest email where no guest identity is already attached,
4. derive quote ownership through `quote.quote_request_id` rather than adding a second customer-identity linkage directly on every quote row,
5. keep tenant scoping mandatory on every authenticated quote query.

This should mirror booking continuity rather than inventing a second linking strategy.

---

## Add-on Naming and Gating

Follow existing add-on naming conventions.

Recommended catalog entry:

1. name: `Estimates and Quotes`
2. slug: `estimates-quotes`
3. feature flag: `estimates_quotes`
4. Stripe env placeholder: `STRIPE_PRICE_ADDON_ESTIMATES_QUOTES`

Why this shape:

1. current single-word add-ons use the same value for slug and feature flag,
	but existing multi-word add-ons already use hyphenated slugs and snake_case
	feature flags,
2. this keeps billing, Pennant, and tenant frontend gating consistent with the
	current catalog.

Recommended implementation hooks:

1. add an `addons` seed row,
2. define `Feature::define('estimates_quotes', ...)` in `AppServiceProvider`,
3. gate tenant quote routes with `addon:estimates_quotes`,
4. expose the flag through the existing tenant add-on endpoint,
5. hide tenant navigation and public entry points when the flag is inactive.

Next agreed hooks:

1. add a booking-service-level `customer_flow` or equivalent field,
2. expose that field through tenant booking service CRUD and public booking-service payloads,
3. let storefront booking/service surfaces branch into direct booking or quote request based on that field.

---

## Booking Integration Strategy

This add-on should integrate with booking in three specific ways.

### 1. Quote requests can originate from booking services

Some services should not go straight to slot selection.

Shipped on the current branch:

1. booking services now expose `customer_flow` with `direct_booking`, `quote_request`, and `either`,
2. tenant service management exposes that field for service configuration,
3. the booking widget now branches into quote intake for `quote_request` services and offers both actions for `either` services.

Continuing rules:

1. add a service-level customer flow setting such as:
	- `direct_booking`
	- `quote_request`
	- `either`
2. do not overload `price = null` as the only indicator, because "price on
	request" and "free consultation" are not the same product rule.
3. prefer service-bound quote entry over a generic contact-style quote form.

This allows the existing booking catalog to remain the storefront entry point
for request-first services.

### 2. Quote acceptance must not bypass availability

An accepted quote is not automatically a valid booking.

Rules:

1. quote acceptance confirms commercial intent, not schedule validity,
2. actual booking creation must still pass through the existing booking
	availability and conflict rules,
3. if the quote includes a service and estimated duration, that data should
	pre-fill booking creation instead of creating a parallel scheduling model.

### 3. First conversion should reuse the current manual-booking composer

The shortest useful path is:

1. accepted quote -> tenant clicks `Convert to booking`,
2. the booking dashboard composer opens with customer and service data prefilled,
3. staff completes scheduling using the existing booking APIs,
4. later availability-picker improvements in booking should automatically
	improve quote conversion too.

This avoids building a second scheduling UI just for quotes.

### 4. The current quote widget is transitional

The first quote widget currently behaves as a standalone public request form.

That is acceptable as a transitional entry point, but it is not the target
product shape for service-led tenants.

Current state:

1. the widget should either be bound to a known booking service or offer an explicit tenant-approved service choice,
2. service-driven storefront entry should be preferred over open-ended inquiry forms,
3. the booking widget already follows service-driven quote branching on the current branch,
4. the remaining open item is presentation and shared-control convergence for the standalone quote request widget where that still adds value.

---

## Recommended MVP Outcome

The first production-worthy version should deliver all of the following:

1. tenant can purchase and activate the add-on,
2. guest can submit a quote request from the tenant storefront,
3. tenant staff can triage requests in CMS,
4. tenant staff can draft and send a quote with fixed line items,
5. guest can open a secure public quote link and accept or reject it,
6. accepted quote can prefill a booking conversion flow,
7. all major state changes are visible in tenant audit history,
8. no quote UI appears when the add-on is inactive.

Preferred storefront interpretation of that outcome:

1. customers should usually start from a booking service,
2. services that need custom price or duration should branch into quote request rather than slot selection,
3. purely generic quote requests should be reserved for tenants whose business model genuinely requires them.

This should be the minimum bar before adding templates, PDFs, dynamic customer
item toggles, or deeper payment flows.

---

## Recommended Domain Model

Use separate request and response records.

### Quote requests

Recommended table: `quote_requests`

Key fields:

1. `id`
2. `tenant_id`
3. `requested_booking_service_id` nullable FK -> `booking_services.id`
4. `origin_surface` enum or string
5. `guest_name`
6. `guest_email`
7. `guest_phone` nullable
8. `subject_label` nullable
9. `request_description`
10. `preferred_start_at` nullable
11. `preferred_end_at` nullable
12. `status`
13. `submitted_at`
14. `reviewed_at` nullable
15. `last_activity_at` nullable
16. timestamps

Recommended statuses:

1. `submitted`
2. `under_review`
3. `quoted`
4. `closed`
5. `cancelled`

Accepted or rejected should not live here, because those are quote decisions,
not request-intake states.

### Quotes

Recommended table: `quotes`

Key fields:

1. `id`
2. `tenant_id`
3. `quote_request_id`
4. `version`
5. `booking_service_id` nullable FK -> `booking_services.id`
6. `created_by_user_id`
7. `sent_by_user_id` nullable
8. `currency`
9. `subtotal_minor`
10. `tax_minor` nullable
11. `total_minor`
12. `estimated_duration_minutes` nullable
13. `customer_message` nullable
14. `internal_notes` nullable
15. `valid_until` nullable
16. `public_token`
17. `status`
18. `sent_at` nullable
19. `accepted_at` nullable
20. `rejected_at` nullable
21. `expired_at` nullable
22. `converted_at` nullable
23. timestamps

Recommended statuses:

1. `draft`
2. `sent`
3. `accepted`
4. `rejected`
5. `expired`
6. `cancelled`
7. `converted`

### Quote line items

Recommended table: `quote_line_items`

Key fields:

1. `id`
2. `quote_id`
3. `label`
4. `description` nullable
5. `quantity`
6. `unit_price_minor`
7. `line_total_minor`
8. `sort_order`
9. timestamps

First slice recommendation:

1. line items should be authored by staff,
2. totals should be computed server-side,
3. customer-selectable optional items are deferred.

### Request attachments

Recommended implementation direction:

1. make `QuoteRequest` the owning record for customer-submitted images or videos,
2. prefer a media-collection-backed attachment model over introducing a disconnected quote-only file store,
3. keep attachment access private or signed by default rather than inheriting generic public media URLs,
4. start with image attachments first and add short video only behind tighter validation and size limits,
5. treat attachments as intake evidence for diagnosis, not as customer-editable quote-document markup.

Recommended first-slice limits when this work starts:

1. allow a small capped number of files per request,
2. keep MIME types narrow and business-safe,
3. preserve tenant scoping on every attachment read and write,
4. avoid anonymous access to the general media library,
5. record attachment metadata and activity on the request lifecycle.

### Guest-auth identity linkage for quote continuity

Recommended later extension:

1. add nullable guest-auth identity linkage on `quote_requests`,
2. let authenticated quote history derive through the request rather than duplicating ownership state on every quote row,
3. keep `guest_email` for anonymous email delivery and retroactive linking,
4. treat retroactive linking as idempotent tenant-scoped continuity work, just like bookings.

### Booking linkback

When quote-to-booking conversion ships, add a nullable link from booking to its
origin quote.

Recommended field:

1. `bookings.origin_quote_id` nullable FK -> `quotes.id`

That link is important for audit, reporting, and future payment conversion.

---

## Permissions and Roles

Follow the existing tenant permission naming pattern.

Recommended permissions:

1. `quotes.view`
2. `quotes.manage`
3. `quotes.send`
4. `quotes.convert`

Recommended addon role mapping:

1. `admin`: all four permissions
2. `support`: `quotes.view`
3. `viewer`: `quotes.view`
4. `platform_support`: `quotes.view`

`quotes.send` and `quotes.convert` are worth separating from generic manage
rights so tenants can keep quote approval and booking conversion narrower than
basic editing.

---

## API Shape

Keep the public and CMS APIs separate, mirroring the booking architecture.

### Public API

Recommended endpoints:

1. `POST /api/public/quotes/requests`
2. `GET /api/public/quotes/{token}`
3. `POST /api/public/quotes/{token}/accept`
4. `POST /api/public/quotes/{token}/reject`

Currently implemented:

1. `POST /api/public/quotes/requests`

Possible later additions:

1. `POST /api/public/quotes/requests/{id}/attachments` or an equivalent request-scoped upload handshake once the public upload path is designed safely,
2. `POST /api/public/quotes/{token}/request-booking`

### Guest-authenticated API

Recommended later endpoints under the existing guest-auth runtime:

1. `GET /guest-auth/quotes`
2. `GET /guest-auth/quotes/{id}`
3. `POST /guest-auth/quotes/{id}/accept`
4. `POST /guest-auth/quotes/{id}/reject`

Design rule:

1. these endpoints should complement token routes, not replace them,
2. they should be powered by the same quote workflow services used by public-token actions,
3. tenant scoping and authenticated guest identity must both be enforced.

### Tenant CMS API

Recommended route group:

1. prefix: `/api/quotes`
2. middleware: `addon:estimates_quotes`

Recommended endpoints:

1. `GET /api/quotes/requests`
2. `GET /api/quotes/requests/{id}`
3. `PATCH /api/quotes/requests/{id}`
4. `POST /api/quotes/requests/{id}/quotes`
5. `GET /api/quotes/{id}`
6. `PATCH /api/quotes/{id}`
7. `POST /api/quotes/{id}/send`
8. `POST /api/quotes/{id}/expire`
9. `POST /api/quotes/{id}/convert-to-booking`

Currently implemented:

1. `GET /api/quotes/requests`
2. `GET /api/quotes/requests/{id}`
3. `POST /api/quotes/requests/{id}/quotes`

The conversion endpoint should call existing booking services or prefill the
manual-booking flow, not write booking records through duplicated quote logic.

---

## Frontend Surfaces

### Tenant CMS

Recommended first tenant surfaces:

1. request inbox page,
2. quote detail page,
3. quote authoring drawer or page,
4. accepted-quote conversion action,
5. tenant navigation entry gated by add-on flag and quote permissions.

Do not start with a heavy reporting dashboard. A fast inbox-to-send workflow is
the right first slice.

### Public storefront

Recommended first public surfaces:

1. quote request form page,
2. secure quote review page from tokenized email link,
3. accept and reject confirmation views.

Current shipped guest response model:

1. when staff send a quote, the guest receives an email with a secure public quote link,
2. that link opens the tokenized public quote page,
3. the guest can currently review the quote and accept or reject it there,
4. there is not yet a threaded conversation surface on the quote page,
5. follow-up discussion still falls back to ordinary business communication channels until a later guest-portal or quote-thread feature exists.

### Authenticated guest portal

Recommended authenticated quote surfaces:

1. quotes widget or quotes panel inside `/guest-portal`,
2. authenticated quote detail state for sent and closed quotes,
3. converted-to-booking visibility from the same portal shell,
4. later structured conversation and attachment review inside that same portal.

### Puck and system-surface integration

Recommended order:

1. do not block the first addon slice on a new Puck widget,
2. ship the core routes and React pages first,
3. add a lightweight booking-widget CTA or a later quote-request widget once the
	domain flow is stable,
4. consider guest-portal integration after the token-first workflow is proven.

---

## Notifications and Audit

Implemented first-slice notifications:

1. tenant receives new quote request notification,
2. guest receives quote sent notification with secure link,
3. tenant receives accepted, rejected, expired, or converted quote notification.

Implemented audit coverage for the shipped lifecycle transitions:

1. request submitted,
2. quote drafted,
3. quote sent,
4. quote accepted or rejected,
5. quote expired,
6. quote converted to booking.

Use the existing activity logging approach first. Add a dedicated notification
history table only if resend and reminder requirements make that necessary.

---

## Security and Data Integrity Rules

These rules should be treated as non-negotiable.

1. all tenant CMS routes stay behind both add-on gating and tenant permissions,
2. all public guest actions use long random tokens and never rely on sequential
	IDs alone,
3. quote totals are always recomputed server-side,
4. guest input should reuse the shared human-input normalization strategy where
	appropriate,
5. quote acceptance does not create a booking without re-running booking
	availability checks,
6. quote conversion should record the origin link between quote and booking,
7. attachment uploads, when added, must respect tenant scoping, file-type
	validation, and public access controls.

---

## Rollout Plan

### 17.1 Add-on foundation and request intake

Status: Complete on the current branch.

Scope:

1. add-on seed row and Pennant feature definition,
2. RBAC extension for quote permissions,
3. core migrations and models for quote requests and quotes,
4. public request endpoint and tenant inbox,
5. tenant navigation and frontend add-on gating.

Acceptance criteria:

1. inactive tenants see no quote UI,
2. active tenants can receive quote requests,
3. tenant staff can review requests in CMS,
4. focused backend and frontend tests cover add-on gating and request creation.

### 17.2 Quote authoring, sending, and guest decision

Status: Complete on the current branch, including notification and activity-log coverage for the shipped quote transitions.

Scope:

1. line items,
2. quote send flow,
3. public quote review page,
4. accept or reject actions,
5. notifications and audit entries.

Acceptance criteria:

1. tenant can send a quote from a request,
2. guest can review and accept or reject the quote from a secure link,
3. status changes remain coherent and idempotent,
4. totals and validity windows are enforced server-side.

Current state inside 17.2:

1. line items, quote draft persistence, request detail, and tenant draft-authoring UI are implemented,
2. draft totals are enforced server-side,
3. quote send endpoints and UI are implemented,
4. public tokenized quote review and guest decision endpoints and UI are implemented,
5. explicit sent, accepted, rejected, and converted tenant review states are implemented,
6. a first Puck-placeable public quote request widget is implemented for storefront entry, while secure quote review remains token-route owned,
7. tenant staff can create manual quote requests inside the CMS for phone-in or walk-in customers,
8. tenant staff can cancel sent quotes and delete draft-only mistakes without deleting refused quote history,
9. cancelled public quote links now resolve to a closed state instead of a broken token route,
10. the current guest response loop is email delivery plus secure token-page review and accept or reject, not an in-page quote conversation thread.

### 17.3 Booking integration

Status: In progress. Booking handoff and traceability are implemented; later booking-surface CTA work remains deferred.

Scope:

1. booking-service linkage on requests and quotes,
2. tenant conversion action from accepted quote to booking flow,
3. booking linkback field for converted records,
4. booking-widget or booking-service CTA for quote-required services.

Acceptance criteria:

1. accepted quotes can prefill the current booking composer,
2. booking creation still passes the existing booking validation rules,
3. converted bookings retain a traceable link back to the quote,
4. the quote path and booking path do not drift into separate scheduling logic.

Current state inside 17.3:

1. accepted quotes can open the existing manual booking composer with quote-derived prefill,
2. booking creation reuses the existing booking availability and validation path,
3. successful converted bookings persist `source_quote_id` on the booking record,
4. successful conversions mark the quote `converted` and stamp `converted_at`,
5. tenant quote detail now exposes the converted booking linkback,
6. booking services now expose `customer_flow` in both tenant and public surfaces,
7. the booking widget routes `quote_request` services directly into quote intake,
8. `either` services offer both direct booking and quote-request entry from the storefront service card.

### 17.3b Guest-authenticated quote continuity

Status: Implemented on the current branch. This reuses Phase 15 guest auth and the Phase 19 guest portal shell rather than introducing a quotes-specific auth surface.

Scope:

1. quote-request linkage to authenticated guest identity,
2. guest-portal quote history,
3. authenticated quote detail and accept or reject actions,
4. compatibility with the existing emailed token-link flow.

Acceptance criteria:

1. token-link quote review still works for anonymous one-off guests,
2. authenticated guests can see quote history in `/guest-portal`,
3. authenticated quote actions obey the same transition rules as token actions,
4. guest quote continuity remains tenant-scoped and does not imply cross-tenant quote access.

Current state inside 17.3b:

1. guest-auth route gating now allows the guest-auth family to run when either booking or estimates-quotes is active,
2. `quote_requests` now store `guest_user_id` and are retroactively linked on guest sign-in by tenant plus normalized email,
3. authenticated public quote intake now attaches guest identity when the submitted email matches the authenticated guest identity,
4. authenticated guest quote list, detail, accept, and reject endpoints now ship under `/api/guest-auth/quotes`,
5. `/guest-portal` now renders linked quote history and authenticated quote detail or accept or reject states alongside bookings,
6. focused backend and frontend tests now cover the guest quote continuity slice.

### 17.3a Tenant-initiated quote operations

Status: Implemented on the current branch.

Shipped decisions:

1. tenant staff can create a manual quote request inside the CMS for phone-in or walk-in customers,
2. manual tenant intake creates a normal `quote_request` record with `origin_surface = manual` so later draft, send, guest decision, and booking conversion stay unified,
3. refused quotes remain in the database as business history and are not auto-deleted,
4. tenant staff can cancel a sent quote when it is withdrawn,
5. tenant staff can delete draft-only mistakes, but only while the quote is still in `draft`,
6. cancelled public quote links resolve to a closed state instead of pretending the quote still needs a guest decision.

### 17.4 Hardening and quality-of-life follow-ups

Status: In progress. Manual tenant intake and basic tenant-side cleanup controls are now implemented; larger authoring productivity features remain deferred.

Candidates after the core flow is green:

1. private quote-request attachments for public and manual intake,
2. quote duplication,
3. reusable quote templates,
4. print-friendly or PDF-friendly presentation,
5. additional guest-portal quote refinements beyond the shipped continuity slice,
6. optional payment or deposit conversion,
7. richer multi-line manual quote authoring and service-specific intake fields,
8. stricter request-status synchronization if future reporting needs more than `submitted` vs `quoted` at the request layer,
9. a later quote-thread or guest-portal conversation surface if tenants need structured back-and-forth after quote delivery,
10. a later upgrade path from guest portal quote continuity into durable Phase 20 customer-account surfaces.

Explicitly not still open on this branch:

1. service-level `customer_flow` support,
2. service-bound storefront quote entry in the booking widget,
3. tenant configuration for direct booking versus quote request versus either.

---

## Testing Strategy

The first implementation should ship with focused regression coverage from day
one.

### Backend

1. add-on gating tests,
2. tenant CMS quote request and quote management API tests,
3. public token access tests,
4. state transition tests for send, accept, reject, expire, and convert,
5. booking-conversion tests that prove availability is rechecked.

### Frontend

1. tenant inbox and quote detail page tests,
2. public quote review page tests,
3. add-on-aware navigation tests,
4. conversion-flow tests around prefilled booking data,
5. guest-portal quote history and authenticated quote-detail tests once 17.3b starts.

### End-to-end

Recommended first scenario:

1. guest submits quote request,
2. tenant drafts and sends quote,
3. guest accepts quote,
4. tenant converts it into a booking.

Recommended guest-continuity scenario after the next guest-flow slice starts:

1. guest receives a quote email,
2. guest signs in through the existing magic-link guest-auth flow,
3. quote appears inside `/guest-portal`,
4. guest accepts or rejects it from the portal,
5. accepted quote still flows into tenant-side booking conversion without introducing a second scheduling model.

---

## What To Borrow From LaraEstimate

The external reference repo is useful for product ideas, not for direct
architecture reuse.

Useful ideas to borrow later:

1. strong line-item authoring UX,
2. shareable customer-facing quote links,
3. print-friendly quote presentation,
4. duplication and template support,
5. solid currency formatting and display rules.

Things not to copy into ByteForge's first slice:

1. its older Laravel 7 plus Vue architecture,
2. single-tenant assumptions,
3. customer-selectable dynamic pricing as the starting point,
4. estimate-first UX that is not deeply connected to booking conversion.

The ByteForge advantage is that accepted quotes can become bookings inside an
already-mature tenant booking system. That is the differentiator to preserve.

---

## Resolved Planning Decisions

These decisions should be treated as the current recommended path unless later
implementation evidence forces a change.

1. use `quote` terminology internally and keep `estimate` as copy only,
2. use add-on slug `estimates-quotes` and feature flag `estimates_quotes`,
3. ship token-based guest quote links before guest-portal integration,
4. support staff-authored fixed line items in the first quote authoring slice,
5. defer customer-selectable dynamic pricing,
6. reuse the current booking composer for the first quote-to-booking path,
7. treat attachments as important but not required to start development,
8. keep the current customer response path email-first with secure quote links until a dedicated quote conversation surface is intentionally designed,
9. build authenticated quote continuity on Phase 15 guest auth and `/guest-portal` before any Phase 20 credentialed customer-account surface is attempted,
10. keep the docs aligned with the actual shipped service-driven storefront state on this branch,
11. treat public quote review as a future dedicated system page rather than as a guest-portal widget,
12. prefer a ByteForge-owned PDF/document renderer over invoice-centric packages if downloadable quote documents are added,
13. keep the current explicit status model unless the lifecycle grows enough to justify a dedicated model-state package.

---

## Immediate Next Step When Development Starts

The branch is already past implementation prep. When work resumes, continue from
the current partial 17.2 state instead of reopening earlier discovery.

Next recommended resume point:

1. add send-quote backend tests and implementation behind `quotes.send`,
2. add tokenized public quote read and accept or reject tests before UI work,
3. wire guest quote review UI and confirmation states,
4. only move to conversion once send and guest decision paths are green.
