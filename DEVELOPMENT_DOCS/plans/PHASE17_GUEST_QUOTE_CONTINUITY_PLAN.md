# Phase 17: Guest Quote Continuity Plan

Last updated: May 19, 2026
Status: Implemented on the current branch
Execute inside current branch: `feature/phase17-estimates-and-quotes`
Depends on:

- [PHASE15_GUEST_AUTH.md](PHASE15_GUEST_AUTH.md)
- [PHASE17_ESTIMATES_AND_QUOTES_ADDON.md](PHASE17_ESTIMATES_AND_QUOTES_ADDON.md)
- [PHASE19_SYSTEM_SURFACES.md](PHASE19_SYSTEM_SURFACES.md)
- [PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md](PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md)

---

## Purpose

This document turned the Phase 17 guest-flow direction into the implementation plan for the guest quote continuity slice that is now shipped on the current branch.

The target is not a brand-new customer-account product. The target is authenticated quote continuity for returning guests, using the guest-auth stack that already exists for bookings.

That means:

1. tokenized quote links stay valid for anonymous one-off use,
2. authenticated quote history lives inside `/guest-portal`,
3. quote continuity reuses guest magic-link auth instead of inventing a quotes-only login,
4. durable password-backed customer accounts remain later Phase 20 work.

Branch rule:

1. this plan is part of Phase 17 completion work and should stay on the current branch,
2. it should not be spun out into a separate quote-portal or customer-account branch,
3. it may reuse shipped guest-auth and guest-portal code, but it should not reopen unrelated Phase 19 or Phase 20 workstreams.

Current implementation result:

1. guest-auth route gating now works when either booking or estimates-quotes is active,
2. `quote_requests` now persist `guest_user_id` and retroactively link to authenticated guests by tenant plus email,
3. authenticated public quote intake now attaches guest identity when the guest email matches the authenticated session,
4. `/api/guest-auth/quotes` now provides authenticated guest quote list, detail, accept, and reject endpoints,
5. `/guest-portal` now shows linked quotes and supports authenticated quote decisions alongside bookings,
6. tokenized public quote review remains valid for anonymous one-off use.

---

## Current Code Anchors

The implementation should reuse these existing surfaces rather than inventing a parallel architecture.

### Guest auth and session surfaces

1. `routes/tenant.php`
   - guest-auth route group already exists under `Route::prefix('guest-auth')`
   - guest session bootstrap, verify, and logout already ship
2. `app/Http/Controllers/Api/GuestAuthController.php`
   - issues guest sessions from magic links
   - restores session from the guest refresh cookie
   - now links both bookings and quote requests on guest verification
3. `app/Services/Guest/GuestMagicLinkService.php`
   - central guest identity and magic-link issuance or verification
4. `app/Services/Guest/GuestAccessTokenService.php`
   - short-lived authenticated guest bearer token
5. `app/Services/Guest/GuestSessionResolver.php`
   - resolves authenticated guest plus refresh session from bearer token

### Booking continuity pattern to mirror

1. `app/Services/Guest/BookingGuestLinkingService.php`
   - tenant-scoped retroactive booking linking by email
   - direct helper for attaching authenticated guest identity during writes
2. `app/Http/Controllers/Api/Booking/GuestBookingController.php`
   - authenticated guest list, detail, and cancel endpoints
   - tenant and guest ownership rules already ship here
3. `resources/js/apps/public/services/guestPortal.ts`
   - public client runtime for guest-auth session bootstrap and authenticated booking APIs
4. `resources/js/apps/public/components/GuestPortalExperience.tsx`
   - current guest portal runtime and booking-space UX

### Quote flow surfaces to extend

1. `app/Http/Controllers/Api/Quotes/PublicQuoteRequestController.php`
   - anonymous quote request intake and tokenized guest quote actions
2. `app/Http/Controllers/Api/Quotes/QuoteRequestController.php`
   - tenant-side quote request lifecycle and quote authoring
3. `app/Models/QuoteRequest.php`
   - current quote intake record with guest email as the continuity anchor
4. `app/Models/Quote.php`
   - commercial response record with public token and status transitions
5. `app/Services/QuoteWorkflowService.php`
   - lifecycle logging and notifications
6. `resources/js/apps/public/components/PublicQuotePage.tsx`
   - current tokenized quote review page
7. `app/Notifications/Quotes/QuoteSentNotification.php`
   - current email delivery surface for secure quote review links

### Guest portal shell and future widget zone

1. `resources/js/apps/public/components/GuestPortalPage.tsx`
2. `resources/js/apps/public/App.tsx`
3. `PHASE19_SYSTEM_SURFACES.md`

These anchors confirm that the next quote slice should plug into the existing guest portal, not create a standalone authenticated quote shell.

---

## Problem Statement

Today the quote flow is continuous only through email links.

That is enough for one-off quote review, but it does not solve continuity for a returning customer who has:

1. multiple quote requests over time,
2. one or more accepted quotes that later became bookings,
3. a need to review old estimates without digging through email,
4. a desire to manage quote history in the same authenticated area as bookings.

Phase 15 already solved this continuity problem for bookings. Phase 17 should reuse that pattern for quotes.

There is one architectural wrinkle: guest auth is currently bundled behind `addon:booking`. Quote continuity requires broadening that assumption so guest auth and the guest portal can exist when `estimates_quotes` is active, even if booking is not.

---

## Recommended Product Decision

### Near-term authenticated customer page

The near-term authenticated customer page should be the guest portal.

Do not build a second authenticated quote-only area.

Recommended rule:

1. anonymous quote link remains the first response path,
2. `/guest-portal` becomes the authenticated continuity surface for quotes,
3. quote history appears there as a widget or primary portal panel,
4. if booking is also active, bookings and quotes coexist in the same authenticated shell.

In-scope for this branch:

1. tenant-scoped quote continuity for authenticated guests,
2. quote history and quote detail inside `/guest-portal`,
3. authenticated quote accept or reject actions,
4. route and gating adjustments needed to let quotes participate in the existing guest-auth runtime.

### Later durable customer accounts

If the product later needs password-backed customer credentials, cross-tenant SSO, or a broader account portal, that belongs to Phase 20.

Recommended rule:

1. Phase 17 should not create passwords,
2. Phase 17 should not rename guest auth into customer accounts,
3. Phase 17 should not wait for Phase 20 to ship before adding authenticated quote continuity.

Out of scope for this branch:

1. password-backed customer accounts,
2. registration, reset-password, or durable account settings,
3. cross-tenant SSO,
4. a net-new customer-account portal outside `/guest-portal`,
5. unrelated system-surface platform expansion beyond what quote continuity directly needs.

---

## Required Precondition

### Broaden guest-auth gating

Previous constraint:

1. `/api/guest-auth/*` is gated behind `addon:booking`,
2. the guest portal is effectively booking-owned,
3. quote continuity cannot ship cleanly for a tenant that has quotes active without booking.

Implemented change:

1. guest auth and guest portal access should be available when either `booking` or `estimates_quotes` is active,
2. authenticated guest modules inside the portal should remain independently add-on gated,
3. booking-only portal widgets should remain hidden when booking is inactive,
4. quote widgets should remain hidden when `estimates_quotes` is inactive.

Implementation note:

1. introduce an `addon any-of` gate or equivalent code-level policy for the guest-auth route family,
2. keep module-level gating inside the portal runtime so authenticated guests only see features that are active for the current tenant.

---

## Proposed Domain Changes

### 1. Add guest-auth linkage to `quote_requests`

Add a nullable `guest_user_id` column to `quote_requests`.

Recommended behavior:

1. set it when an authenticated guest submits a quote request with the same email as their guest identity,
2. retroactively link it on first guest sign-in by matching current tenant plus normalized email,
3. never overwrite a non-null `guest_user_id` during retroactive linking,
4. derive quote ownership through `quote_request_id` rather than duplicating `guest_user_id` onto `quotes`.

Recommended schema shape:

1. `guest_user_id` nullable unsigned big integer,
2. indexed with tenant and guest lookup in mind,
3. no cross-database foreign key requirement, mirroring the established booking pattern.

### 2. Add a guest scope on `QuoteRequest`

Recommended model additions:

1. include `guest_user_id` in fillable attributes,
2. add `scopeForGuest($guestUserId)` to mirror `Booking::scopeForGuest()`,
3. optionally add a `guestUser()` relation for consistency with `Booking`, but do not rely on it for tenant query correctness.

### 3. Add quote-linking service

Create `QuoteGuestLinkingService` mirroring `BookingGuestLinkingService`.

Recommended methods:

1. `linkByEmail(GuestUser $guestUser, string $tenantId): int`
2. `guestUserIdForCustomerEmail(?GuestUser $guestUser, string $customerEmail): ?int`

Expected behavior:

1. link only quote requests for the current tenant,
2. match email case-insensitively,
3. only update rows where `guest_user_id` is null,
4. treat reruns as idempotent.

---

## Backend Plan

### 1. Extend guest verification flow

Update `GuestAuthController::verify()` so guest sign-in performs quote linking as well as booking linking.

Current behavior:

1. verify magic link,
2. call `BookingGuestLinkingService::linkByEmail()`,
3. issue guest refresh session and access token.

Recommended behavior:

1. verify magic link,
2. link bookings by email,
3. link quote requests by email,
4. issue guest refresh session and access token.

### 2. Attach guest identity during quote-request creation

Update public quote request intake so authenticated guests get direct linkage without waiting for retroactive linking.

Recommended implementation:

1. resolve authenticated guest from the request using the existing guest-session pattern,
2. if a guest session exists and the submitted email matches the guest identity, set `guest_user_id`,
3. if the emails do not match, keep `guest_user_id = null` and preserve the anonymous request behavior,
4. do not force sign-in during public quote submission.

This mirrors booking creation, where authenticated continuity is additive rather than mandatory.

### 3. Add authenticated guest quote controller

Create `GuestQuoteController` under the quotes API namespace.

Recommended endpoints:

1. `index(Request $request): JsonResponse`
2. `show(Request $request, int $id): JsonResponse`
3. `accept(Request $request, int $id): JsonResponse`
4. `reject(Request $request, int $id): JsonResponse`

Recommended ownership model:

1. resolve the authenticated guest from `auth.guest`,
2. query `QuoteRequest::forTenant(...)->forGuest($guestUser->id)`,
3. resolve the latest quote or the requested quote detail only through owned requests,
4. never trust raw email alone at read time.

### 4. Reuse current transition guards

Authenticated guest accept or reject must not introduce a second state machine.

Recommended rule:

1. public token actions and authenticated portal actions should use the same workflow rules,
2. if needed, extract the shared accept or reject logic behind a reusable quote decision action or service,
3. both flows must preserve idempotency and expired or converted guards.

### 5. Payload shape

Authenticated guest quote payloads should stay close to the public quote payload, with extra context for portal history.

Recommended list payload fields:

1. quote id,
2. request id,
3. status,
4. subject or service name,
5. total,
6. validity window,
7. converted booking summary when present,
8. last activity timestamps.

Recommended detail payload fields:

1. everything needed by the current token page,
2. request-level intake summary,
3. attachment summaries when that later slice ships,
4. converted booking link summary if already converted.

---

## Route Plan

### Tenant API routes

Recommended additions under the existing guest-auth family:

```text
GET   /api/guest-auth/quotes
GET   /api/guest-auth/quotes/{id}
POST  /api/guest-auth/quotes/{id}/accept
POST  /api/guest-auth/quotes/{id}/reject
```

Recommended route rules:

1. keep these behind `auth.guest`,
2. keep current token routes under `/api/public/quotes/*`,
3. do not redirect token-route traffic into authenticated routes,
4. preserve throttling and addon gating appropriate to guest-access surfaces.

### Public runtime routes

Recommended guest portal route map:

1. `/guest-portal`
2. `/guest-portal/bookings/:bookingId`
3. `/guest-portal/quotes/:quoteId`
4. `/my-bookings` and `/my-bookings/:bookingId` remain compatibility aliases for bookings only

Recommended rule:

1. do not create a separate `/my-quotes` compatibility alias unless product demand proves it necessary,
2. keep quote continuity inside the shared guest portal shell.

---

## Frontend Plan

### 1. Extend guest portal service

Update `resources/js/apps/public/services/guestPortal.ts` with quote methods and types.

Recommended additions:

1. `GuestPortalQuote` type,
2. `listQuotes()`
3. `getQuote(quoteId)`
4. `acceptQuote(quoteId)`
5. `rejectQuote(quoteId)`

Recommended rule:

1. continue using the same in-memory guest access token strategy,
2. keep request helpers shared with current booking portal calls,
3. clear the token on `401` exactly the way the current service does.

### 2. Add portal quote experience component

Recommended structure:

1. keep `GuestPortalExperience` as the owning shell,
2. extract a dedicated quotes panel or widget component,
3. keep bookings and quotes as separate authenticated modules inside the shell,
4. feature-gate the quotes module on `estimates_quotes`.

### 3. Reuse public quote presentation where practical

Recommended rule:

1. do not duplicate all quote rendering logic between `PublicQuotePage` and the guest portal,
2. extract shared presentational fragments if divergence starts to grow,
3. keep token-page and portal detail states visually consistent enough that users understand they are looking at the same quote artifact.

### 4. Portal UX priorities

The authenticated quote view should quickly answer:

1. which quotes are awaiting my decision,
2. which quote requests are still under review,
3. which quotes were already accepted, rejected, cancelled, expired, or converted,
4. which accepted quotes turned into bookings.

Recommended first portal groupings:

1. action needed,
2. awaiting provider response,
3. closed or historical.

### 5. Token-page bridge

The secure quote email should continue to open the tokenized quote page.

Recommended later UX addition:

1. add a secondary CTA on the public quote page inviting the guest to sign in to see all quotes in the guest portal,
2. keep the primary action focused on the current quote decision,
3. do not force portal sign-in before the guest can accept or reject the quote.

---

## Security Rules

These should be treated as mandatory.

1. authenticated guest quote reads must require both current tenant scope and `guest_user_id` ownership,
2. retroactive linking must never link quotes across tenants,
3. portal reads must not rely on email-only lookups at request time,
4. token routes must remain opaque and non-enumerable,
5. authenticated quote actions must obey the same status-transition guards as token routes,
6. guest-auth gating broadening must not expose booking-only guest routes when booking is inactive,
7. quote attachments, when later added, must follow private or signed-access rules inside the guest portal as well.

---

## Rollout Sequence

### Step 1. Broaden guest-auth and guest-portal gating

1. allow guest auth when `booking` or `estimates_quotes` is active,
2. confirm the guest portal shell can load without booking widgets present,
3. keep widget-level add-on checks intact.

### Step 2. Add quote request linkage

1. migration for `quote_requests.guest_user_id`,
2. `QuoteGuestLinkingService`,
3. `GuestAuthController` linkage hook,
4. direct linkage during authenticated public quote request submission.

### Step 3. Add authenticated guest quote APIs

1. list,
2. detail,
3. accept,
4. reject.

### Step 4. Add guest portal quote module

1. service methods,
2. portal widget or panel,
3. route handling for quote detail,
4. status-aware detail rendering.

### Step 5. Add polish and cross-surface reuse

1. portal quote history grouping,
2. converted-booking visibility,
3. optional token-page CTA into guest portal,
4. later attachment and conversation support.

---

## Testing Plan

### Backend

Recommended new tests:

1. `tests/Tenant/Feature/Api/TenantGuestQuotesTest.php`
2. retroactive quote linking by email within current tenant only,
3. authenticated guest quote list returns only owned quote requests,
4. authenticated guest quote detail rejects cross-tenant or cross-guest access,
5. authenticated guest accept or reject matches public token transition behavior,
6. guest-auth quote endpoints respect addon gating.

### Frontend

Recommended new tests:

1. `resources/js/apps/public/components/__tests__/GuestPortalQuotesWidget.test.tsx`
2. guest portal quote history rendering,
3. authenticated quote detail rendering,
4. action-needed versus closed-state grouping,
5. quote accept or reject success and failure paths.

### Browser / E2E

Recommended new scenario:

1. guest submits quote request,
2. tenant drafts and sends quote,
3. guest requests a magic link or restores an existing guest session,
4. quote appears in `/guest-portal`,
5. guest accepts or rejects it from the portal,
6. accepted quote still converts through the tenant booking flow.

Recommended file:

1. `tests/e2e/guest-portal-quotes-flow.spec.ts`

---

## Non-Goals For This Slice

1. password-backed customer accounts,
2. cross-tenant customer SSO,
3. account registration,
4. quote-side payment checkout,
5. full quote conversation threads,
6. customer-side quote editing,
7. replacing the token-link flow.

These remain future work, primarily under Phase 20 or later Phase 17 follow-ups.

---

## Recommended Outcome

At the end of this slice, ByteForge should have:

1. the current anonymous quote link flow still working exactly as it does now,
2. authenticated guest quote history inside `/guest-portal`,
3. one consistent guest-auth stack for bookings and quotes,
4. tenant-scoped retroactive quote continuity by email,
5. no architectural pressure to invent a second customer-auth product before Phase 20.
