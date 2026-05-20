# Phase 17: Execution Checklist

Branch: `feature/phase17-estimates-and-quotes`
Last updated: May 20, 2026
Rule: do not proceed to the next gate until the current gate's focused tests pass.
Current status: Gate 5 is complete on the current branch. Service-driven storefront entry, guest quote continuity inside `/guest-portal`, private quote-request attachments, focused backend/frontend/browser coverage, and development Mailtrap delivery verification are in place. The branch is ready for staging/merge review, with any staging-specific mail verification treated as an optional environment check rather than a Phase 17 blocker.

Detailed guest continuity plan:

- [PHASE17_GUEST_QUOTE_CONTINUITY_PLAN.md](PHASE17_GUEST_QUOTE_CONTINUITY_PLAN.md)

Branch guardrail for the current branch:

1. complete the remaining quote and estimate journey inside `feature/phase17-estimates-and-quotes`,
2. reuse shipped Phase 15 guest auth and the existing guest portal runtime instead of opening a separate customer-auth feature stream,
3. treat Phase 19 references as implementation anchors to reuse, not as a reason to reopen general system-surface platform work,
4. treat Phase 20 references as explicit out-of-scope boundaries, not as work to start on this branch,
5. do not split guest quote continuity into a second feature branch while Phase 17 is still open.

Current implementation snapshot:

Completed now:

1. addon seed, feature flag, and tenant add-on exposure,
2. quote permissions and tenant RBAC wiring,
3. public quote-request intake with normalization and tenant scoping,
4. tenant request inbox, request detail page, and draft-quote authoring page,
5. quote and line-item persistence with server-side total calculation,
6. quote send flow, guest email delivery, public quote review, and guest accept or reject actions,
7. accepted-quote booking handoff with persisted booking linkback and quote conversion status,
8. a guest-facing Puck quote request widget for storefront entry,
9. booking-service-level `customer_flow` support in tenant service management and public booking-service payloads,
10. service-driven storefront quote branching in the booking widget for `quote_request` and `either` services,
11. tenant manual quote-request intake for phone-in or walk-in customers,
12. tenant-side sent-quote cancellation and draft-only deletion actions,
13. guest-auth route gating that works when either booking or estimates-quotes is active,
14. quote-request `guest_user_id` linkage on authenticated public intake and retroactive guest sign-in,
15. authenticated guest quote list, detail, accept, and reject endpoints,
16. `/guest-portal` quote history and detail states inside the existing guest portal runtime,
17. private quote-request attachments on the request itself with tightly limited image and video intake, tenant detail visibility, and authenticated download handling,
18. focused backend and frontend tests for the implemented slices.

Gate 5 close-out result:

1. final merge-readiness review for the shipped quote flow completed on the current branch,
2. optional staging-specific outbound mail verification remains environment-specific and does not block Phase 17 branch completion.

Documented next-step decisions after branch closure:

1. if the public quote-review page becomes tenant-customizable, model it as a dedicated system page rather than as a guest-portal widget,
2. if quote PDFs are added, implement them as ByteForge-owned quote document rendering rather than as invoice-package-driven domain architecture,
3. current Phase 17 acceptance remains a commercial-agreement flow unless later work adds stronger legal terms capture and immutable document evidence.

Phase 17 completion line for this branch:

1. customers can enter the quote flow from the correct storefront service surface,
2. customers can receive, review, and respond to quotes anonymously by secure link,
3. returning authenticated guests can see quote continuity inside `/guest-portal`,
4. accepted quotes still hand off into booking without duplicating scheduling logic,
5. docs, mail verification, and focused E2E cover the shipped Phase 17 scope,
6. no Phase 20 customer-account work or unrelated platform work is started in order to close this branch.

---

## Working Rules

### TDD is required for critical logic

This add-on touches tenant scoping, public tokens, state transitions, and
booking conversion. Those areas should follow red -> green -> refactor rather
than implementation-first.

Write tests first for:

1. public request intake,
2. tenant add-on gating and RBAC,
3. quote state transitions,
4. quote public-token access,
5. quote-to-booking conversion and availability rechecks.

UI-only rendering polish can be tested after implementation, but workflow logic
must be test-led.

### Security boundaries are explicit

Every quote workflow change must preserve all of these boundaries:

1. tenant isolation in reads and writes,
2. add-on gating,
3. permission checks,
4. request validation,
5. field-family input normalization only where appropriate,
6. opaque public tokens that are not guessable,
7. server-side total calculation,
8. explicit state-transition guards.

### Reuse booking, do not duplicate it

Quote acceptance is not booking confirmation.

Rules:

1. do not create a second scheduling engine inside the quote domain,
2. do not let quote acceptance bypass booking availability checks,
3. do not copy booking conflict logic into quote controllers,
4. reuse booking services or booking APIs for actual scheduling.

---

## Stop/Go Gates

```text
Gate 1 -> Gate 2 -> Gate 3 -> Gate 4 -> Gate 5
17.1      17.2      17.3      Hardening  Ready to merge
```

Gate 1:

1. status: complete,
2. add-on activation, RBAC, and public request-intake tests pass.

Gate 2:

1. status: complete,
2. tenant quote authoring tests for request detail and draft creation pass,
3. send-flow tests pass,
4. public quote token access tests pass.

Gate 3:

1. status: complete for the current branch,
2. quote accept and reject transition tests pass,
3. quote-to-booking prefill and availability-recheck tests pass,
4. expired and converted quote reuse is blocked by status enforcement.

Gate 4:

1. status: complete for the current branch,
2. focused security regressions pass,
3. add-on inactive behavior is verified across backend and frontend,
4. audit and notification behavior is verified for critical transitions.

Gate 5:

1. status: not started,
2. focused backend and frontend suites for touched areas pass,
3. no known tenant-isolation or token-exposure gaps remain,
4. docs reflect shipped scope and deferred scope clearly,
5. service-driven storefront behavior is implemented for booking services that require quoting.

---

## First Branch Scope

The first development branch should stay narrow.

Target outcome:

1. add-on foundation exists,
2. guest can submit quote request,
3. tenant can review request,
4. tenant can draft and send quote,
5. guest can accept or reject quote,
6. tenant can start booking conversion from an accepted quote.

Explicitly defer from the first branch:

1. private quote-request attachments,
2. PDFs and print layouts,
3. quote templates,
4. customer-selectable optional line items,
5. payment or deposit conversion,
6. guest-portal quote history and authenticated quote conversation.

Next implementation slice after the current branch hardening:

1. complete final merge-readiness review for the branch,
2. verify staging outbound quote mail only if that environment differs materially from development.

Attachment implementation note for the shipped slice:

1. attach evidence to `quote_request`, not to `quote`, because the media describes the problem intake rather than the commercial response,
2. reuse the existing media infrastructure where possible, but do not route anonymous customer uploads through the current tenant-authenticated media library endpoints,
3. store customer-submitted attachments on the private `local` disk rather than the public media disk,
4. expose attachment review only through tenant-authenticated request detail and download handling,
5. keep intake limited to tightly scoped image and video MIME types and reject broader document or SVG uploads,
6. the existing customer response path remains email -> secure quote link -> accept or reject, with threaded quote conversation deferred.

Guest quote continuity planning note:

1. keep the current token-link flow as the anonymous default, exactly like anonymous booking tokens remain valid even after guest auth exists,
2. reuse Phase 15 guest auth for authenticated quote history instead of inventing a quote-specific login system,
3. place authenticated quote history inside `/guest-portal`, reusing the Phase 19 portal-shell and widget-zone direction,
4. link quote requests to authenticated guests by email and `guest_user_id` the same way bookings are linked for continuity,
5. let authenticated guests review active, accepted, rejected, cancelled, converted, and expired quote records from one place,
6. keep guest accept or reject rules consistent between token routes and authenticated portal actions by reusing the same backend workflow services,
7. treat durable password-backed customer accounts as later Phase 20 work, not as a reason to delay guest-portal quote continuity.

---

## Branch Sequence

### Slice A: Add-on foundation and request intake

Status: Complete.

Write tests first:

1. backend test for `addon:estimates_quotes` gating,
2. backend test for quote permissions availability through tenant RBAC,
3. backend test for guest request creation with tenant scoping,
4. backend test for normalization and validation of guest contact fields,
5. frontend test for hidden navigation when addon is inactive,
6. frontend test for tenant request inbox loading when addon is active.

Then implement:

1. addon seed/catalog entry,
2. Pennant feature definition,
3. permission registration and tenant role mapping,
4. quote request migration, model, request validation, and controller,
5. tenant inbox page and API client,
6. public request page.

Slice A acceptance:

1. inactive tenants cannot access quote APIs,
2. guest can submit request only to the current tenant,
3. tenant staff with quote permission can see the request in CMS,
4. another tenant cannot read or mutate the request.

### Slice B: Quote authoring and send flow

Status: Complete on the current branch, including send-notification wiring.

Write tests first:

1. backend test for quote draft creation from a request,
2. backend test for server-side total calculation from line items,
3. backend test for unauthorized user blocked from send action,
4. backend test for tokenized guest quote view,
5. frontend test for tenant authoring form,
6. frontend test for guest quote review page.

Then implement:

1. quote and line-item migrations/models,
2. quote authoring API,
3. quote send action,
4. notification wiring,
5. tenant quote detail UI,
6. public quote review UI.

Completed inside Slice B:

1. quote and line-item migrations and models,
2. request-detail API,
3. draft quote authoring API,
4. server-side total calculation from line items,
5. tenant quote request detail UI and draft-authoring form,
6. send action tests and implementation,
7. tokenized guest quote read tests and implementation,
8. guest quote review UI,
9. focused tests for request detail, draft creation, send flow, and guest review.

Remaining inside Slice B:

1. sent-quote immutability or explicit versioning rules if later business rules require stricter version handling.

Slice B acceptance:

1. quote totals are not trusted from the browser,
2. only allowed staff can send quotes,
3. guest quote access requires a valid token,
4. sent quotes are immutable in the ways required by business rules or clearly
   versioned.

### Slice C: Guest decision and booking conversion handoff

Status: Complete on the current branch, including transition notifications and tenant activity-log coverage.

Write tests first:

1. backend test for accept transition idempotency,
2. backend test for reject transition idempotency,
3. backend test for expired quote rejection,
4. backend test for convert-to-booking requiring accepted status,
5. backend test proving booking availability is rechecked during conversion,
6. frontend test for conversion action visibility only on accepted quotes.

Then implement:

1. accept and reject public actions,
2. expiration logic,
3. accepted-quote conversion action,
4. booking-prefill handoff,
5. origin quote linkback on converted bookings.

Completed inside Slice C:

1. public accept and reject actions with idempotent same-action handling,
2. automatic sent-quote expiration when `valid_until` has passed,
3. accepted-only conversion prefill endpoint,
4. accepted quote conversion action in the tenant UI,
5. booking-prefill handoff into the existing manual booking composer,
6. persisted `bookings.source_quote_id` linkback and `quotes.status = converted` on successful booking creation,
7. converted quote state and booking link rendering in the tenant detail UI.

Remaining inside Slice C:

1. no additional Slice C blockers on the current branch.

Slice C acceptance:

1. only valid sent quotes can be accepted or rejected,
2. expired or converted quotes cannot be reused improperly,
3. booking conversion uses booking rules rather than quote shortcuts,
4. tenant gets traceability from request to quote to booking.

### Slice D: Guest-authenticated quote continuity

Status: Implemented on the current branch.

Goal:

1. extend the existing token-first quote flow into the authenticated guest portal so returning customers can manage quote history the same way they already manage booking history.

Write tests first:

1. backend test for retroactive quote-request linkage by authenticated guest email,
2. backend test for tenant-safe guest quote listing scoped by current tenant and guest identity,
3. backend test proving authenticated guest accept or reject uses the same transition guards as token routes,
4. frontend test for quote history rendering inside the guest portal shell,
5. frontend test for authenticated guest quote detail actions and closed-state rendering,
6. browser test for emailed quote link -> optional guest sign-in -> quote appears in portal history.

Then implement:

1. add guest linkage on quote requests and a quote-linking service mirroring booking continuity,
2. add authenticated guest quote endpoints under the guest-auth route family,
3. build a first-party quotes widget or portal panel for the guest portal shell,
4. reuse existing quote detail payload mapping so portal and token pages do not drift,
5. add portal navigation states for active quotes, past quotes, and converted quotes,
6. preserve tokenized quote review for anonymous guests and one-off email interactions.

Slice D acceptance:

1. anonymous guests can still manage a quote from the emailed token link without being forced to sign in,
2. authenticated guests can see their quote history inside `/guest-portal`,
3. quote history links only records for the current tenant and the authenticated guest identity,
4. portal actions do not bypass existing quote status rules,
5. the guest portal remains the authenticated quote surface until later Phase 20 customer accounts exist.

Completed inside Slice D:

1. guest-auth route gating now works when either `booking` or `estimates_quotes` is active,
2. `quote_requests` now persist `guest_user_id` and retroactively link by tenant plus normalized email,
3. authenticated public quote intake now attaches guest identity when the submitted email matches the authenticated guest session,
4. authenticated guest quote list, detail, accept, and reject endpoints now ship under `/api/guest-auth/quotes`,
5. `/guest-portal` now shows linked quotes alongside bookings and supports authenticated quote detail and accept or reject actions,
6. focused backend and frontend tests cover the guest quote continuity slice.

### Slice E: Final Phase 17 hardening and release checks

Status: Complete on the current branch.

Goal:

1. close the branch with the remaining verification and deployment-readiness checks after the main quote journey is functionally complete.

Write tests first:

1. browser test for the service-driven storefront booking-widget quote path,
2. browser test for quote email delivery and tokenized review in a mail-capable environment when available,
3. browser test for authenticated guest quote continuity inside `/guest-portal`.

Then implement:

1. final mail verification in development or staging,
2. focused E2E coverage for service-bound quote entry, token review, and guest-portal continuity,

Completed so far inside Slice E:

1. automated notification assertions now verify the real guest and tenant action links,
2. storefront quote-request browser coverage now exercises private attachment submission end to end,
3. guest-portal quote continuity browser coverage now exercises authenticated quote review and acceptance,
4. development Mailtrap delivery verification succeeded for a real quote notification after reducing the check to a single message instead of a burst,
5. the public guest portal client now deduplicates in-flight guest verification and session-restore requests so development Strict Mode does not invalidate one-time guest auth flows.
6. final docs sync now distinguishes shipped scope from deferred Phase 19/system-page and PDF follow-ups,
7. final merge-readiness review for tenant isolation, tokens, add-on gating, backend suites, frontend suites, and focused browser coverage completed successfully.

Slice E acceptance:

1. the service-driven storefront quote path is covered by focused browser validation,
2. quote emails and secure guest links are verified in a real mail-capable environment,
3. authenticated guest quote continuity is covered by focused browser validation,
4. deferred items remain documented and no unrelated work leaks into the branch.

Slice E result:

1. acceptance criteria satisfied on the current branch,
2. the remaining non-blocking follow-up is optional staging-specific mail verification if that environment differs from development.

---

## Security Regression Checklist

These should be treated as required defended behaviors.

1. tenant A cannot read tenant B quote requests or quotes,
2. route model binding never substitutes for explicit tenant scoping,
3. add-on inactive tenants receive the expected forbidden response shape,
4. users lacking `quotes.send` cannot send quotes,
5. users lacking `quotes.convert` cannot start booking conversion,
6. public token endpoints do not leak whether another token exists,
7. public tokens are random, stored safely, and never exposed in CMS list APIs,
8. quote totals cannot be manipulated client-side,
9. normalized fields are limited to human text and contact fields,
10. quote acceptance does not create or confirm bookings without booking checks,
11. repeated accept or reject actions remain idempotent,
12. activity logs do not expose sensitive tokens.

## Product Alignment Notes

The current quote request widget is an interim storefront entry surface, not the final product shape.

Agreed direction:

1. booking services should own the customer entry mode,
2. supported service-level modes should be `direct_booking`, `quote_request`, and `either`,
3. quote requests should usually begin from a known service rather than from an unbounded contact-style form,
4. the generic quote widget should remain available only for truly custom-request businesses,
5. once a quote is accepted, it should still flow through booking availability and scheduling before becoming a confirmed calendar booking.

---

## Suggested Test Files

Backend:

1. `tests/Feature/Api/Quotes/PublicQuoteRequestApiTest.php`
2. `tests/Feature/Api/Quotes/PublicQuoteDecisionApiTest.php`
3. `tests/Feature/Api/Quotes/QuoteCmsApiTest.php`
4. `tests/Feature/Api/Quotes/QuoteAddonGateTest.php`
5. `tests/Feature/Api/Quotes/QuoteBookingConversionTest.php`
6. `tests/Unit/Quotes/QuoteTotalsCalculatorTest.php`
7. `tests/Unit/Quotes/QuoteStateMachineTest.php`

Frontend:

1. `resources/js/apps/tenant/components/pages/Quotes/__tests__/QuoteRequestsPage.test.tsx`
2. `resources/js/apps/tenant/components/pages/Quotes/__tests__/QuoteRequestDetailPage.test.tsx`
3. `resources/js/apps/public/components/__tests__/QuoteRequestPage.test.tsx`
4. `resources/js/apps/public/components/__tests__/PublicQuotePage.test.tsx`
5. `resources/js/apps/tenant/config/__tests__/menu.quote-addon.test.tsx`
6. `resources/js/apps/public/components/__tests__/GuestPortalQuotesWidget.test.tsx`

E2E candidate after the first slices are green:

1. `tests/e2e/tenant-quotes-flow.spec.ts`
2. `tests/e2e/guest-portal-quotes-flow.spec.ts`
3. `tests/e2e/booking-widget-quote-request-flow.spec.ts`

---

## Focused Verification Commands

Backend during TDD:

```bash
php artisan test tests/Feature/Api/Quotes tests/Unit/Quotes
```

Current green backend regression command:

```bash
php artisan test tests/Feature/Api/Booking/BookingCmsApiTest.php tests/Feature/Api/Quotes/QuoteCmsApiTest.php
```

Frontend during TDD:

```bash
npm run test:run -- resources/js/apps/tenant/components/pages/Quotes/__tests__ resources/js/apps/public/components/__tests__/QuoteRequestPage.test.tsx resources/js/apps/public/components/__tests__/PublicQuotePage.test.tsx resources/js/apps/tenant/config/__tests__/menu.quote-addon.test.tsx
```

Current green frontend regression command:

```bash
npm run test:run -- resources/js/apps/tenant/components/pages/Quotes/__tests__/QuoteRequestDetailPage.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingsCalendarPage.test.tsx
```

Before merge of the first feature branch:

```bash
php artisan test tests/Feature/Api/Quotes tests/Feature/Api/Booking tests/Unit/Quotes
npm run test:run -- resources/js/apps/tenant/components/pages/Quotes/__tests__ resources/js/apps/public/components/__tests__/QuoteRequestPage.test.tsx resources/js/apps/public/components/__tests__/PublicQuotePage.test.tsx resources/js/apps/tenant/config/__tests__/menu.quote-addon.test.tsx resources/js/apps/tenant/components/pages/Booking/__tests__/BookingsCalendarPage.test.tsx
```

Add one E2E path once the core flow is stable:

```bash
npx playwright test tests/e2e/tenant-quotes-flow.spec.ts
```

Add a guest-portal quote path once Slice D starts:

```bash
npx playwright test tests/e2e/guest-portal-quotes-flow.spec.ts
```

Add a service-driven storefront quote path before branch close:

```bash
npx playwright test tests/e2e/booking-widget-quote-request-flow.spec.ts
```

---

## Done Means

Do not call the first addon slice complete until all of these are true.

1. the addon is purchasable and gateable through the existing addon system,
2. guest quote request intake works on a tenant surface,
3. tenant staff can send a quote securely,
4. guest can accept or reject through a secure public link,
5. accepted quote can hand off into booking without bypassing booking rules,
6. focused regression tests cover tenant isolation, tokens, totals, permissions,
   and state transitions,
7. service-driven storefront quote entry is documented as shipped rather than left artificially open,
8. authenticated quote continuity is explicitly planned against Phase 15 guest auth and Phase 19 guest portal work instead of inventing a second customer-auth surface,
9. deferred items remain documented instead of sneaking into the branch,
10. `CURRENT_STATUS.md` and `ROADMAP.md` are updated only when implementation is
   actually merged.
