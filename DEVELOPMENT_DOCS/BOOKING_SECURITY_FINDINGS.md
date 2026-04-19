# Booking Security Findings

Last updated: 2026-04-18

## Scope

This document tracks the booking-system security review for the public booking,
hold, payment handoff, and webhook-confirmation flow.

It is intended to be used as a remediation checklist. Each finding should be
checked off only after:

1. the production code is fixed,
2. the relevant test passes, and
3. the focused verification command is re-run.

## Focused verification command

```bash
php artisan test tests/Feature/Api/Booking/BookingPaymentSecurityTest.php tests/Feature/Api/Booking/BookingPaymentIntegrationTest.php
```

```bash
npm run test:run -- resources/js/apps/public/components/__tests__/bookingPaymentSessionToken.test.ts
```

## Current baseline

- `BookingPaymentSecurityTest`: 17 passed
- `BookingPaymentIntegrationTest`: 17 passed
- Focused backend suite status: 34 passed, 0 failed
- Focused frontend token-helper suite status: 4 passed, 0 failed

## Confirmed findings

### [x] BF-BOOKING-SEC-001 Duplicate payment creation for the same booking

- Severity: High
- Category: OWASP A04 Insecure Design / race-condition correctness
- Status: Remediated and covered by regression test
- Test: `test_create_payment_for_booking_does_not_create_duplicates_for_same_booking`
- Test file: `tests/Feature/Api/Booking/BookingPaymentIntegrationTest.php`
- Relevant code:
  - `app/Services/BookingPaymentService.php`
  - `app/Http/Controllers/Api/Booking/PublicBookingController.php`

#### What happens

Calling `BookingPaymentService::createPaymentForBooking()` more than once for the
same booking creates a new payment record instead of reusing or rejecting the
existing payment. This makes duplicate provider-side payment intents possible if
two requests enter the payment-initiation path close together.

#### Risk

- duplicate charges or duplicate provider payment intents,
- orphaned payment records,
- booking/payment linkage drift,
- harder refund and reconciliation paths.

#### Fix target

- enforce idempotency before the external provider call,
- lock the booking row while initiating payment,
- return the existing payment when the booking is already linked to one.

#### Done when

- the regression test passes,
- no second payment record can be created for the same booking,
- the booking keeps a stable `payment_id` across repeated initiation attempts.

## Verified controls currently holding

These were re-checked in the current focused run and are currently passing.

### [x] BF-BOOKING-CTRL-001 Public management token is tenant-scoped

- Tests:
  - `test_public_token_is_scoped_to_issuing_tenant`
  - `test_public_payment_session_token_is_scoped_to_issuing_tenant`

### [x] BF-BOOKING-CTRL-002 Expired management tokens are rejected

- Tests:
  - `test_expired_management_token_is_rejected_with_410`
  - `test_expired_management_token_cannot_access_payment_session`

### [x] BF-BOOKING-CTRL-003 Public payment responses do not expose Stripe secrets

- Test:
  - `test_payment_response_never_exposes_stripe_secret_key`

### [x] BF-BOOKING-CTRL-004 Unsigned Stripe webhooks are rejected

- Test:
  - `test_stripe_webhook_without_signature_is_rejected`

### [x] BF-BOOKING-CTRL-005 Unverifiable Swish callbacks are not silently accepted

- Test:
  - `test_swish_callback_without_verifiable_status_is_rejected`

### [x] BF-BOOKING-CTRL-006 Invalid booking service input is rejected

- Tests:
  - `test_booking_service_rejects_negative_price`
  - `test_requires_payment_with_zero_price_never_initiates_payment`
  - `test_booking_service_name_length_is_enforced`

## Review findings not yet backed by a failing automated test

These came from code review and should be treated as hardening items. They are
not currently represented by a red test in the focused suite.

### [x] BF-BOOKING-HARDEN-001 Make tenant scoping explicit in availability booking queries

- Severity: Medium
- Relevant code:
  - `app/Services/BookingAvailabilityService.php`
- Notes:
  - Booking overlap queries now use explicit `Booking::forTenant(...)` scoping.
  - Regression tests verify that a forged foreign-tenant booking row cannot
    block slot or range availability on another tenant.

### [x] BF-BOOKING-HARDEN-002 Tighten payment reference parsing in webhook booking confirmation

- Severity: Low-Medium
- Relevant code:
  - `app/Http/Controllers/Api/PaymentWebhookController.php`
- Notes:
  - Malformed or empty booking references are now rejected before booking
    confirmation is attempted.
  - Regression coverage verifies that the payment can complete without moving
    the booking to `confirmed` when the metadata reference is malformed.

### [x] BF-BOOKING-HARDEN-003 Revisit guest-token exposure in browser-visible payment URLs

- Severity: Low-Medium
- Relevant code:
  - `routes/tenant.php`
  - `app/Http/Controllers/Api/Booking/PublicBookingController.php`
- Notes:
  - The public payment page now uses a static request path and places the token
    in the URL fragment instead of the browser-visible request path.
  - The fragment token is persisted to session storage and stripped from the URL
    after page load to reduce path logging, history, and referrer exposure.
  - Regression coverage verifies both the backend handoff URL format and the
    frontend fragment-token parsing and cleanup behavior.

## Next verification step after each fix

After any remediation, re-run:

```bash
php artisan test tests/Feature/Api/Booking/BookingPaymentSecurityTest.php tests/Feature/Api/Booking/BookingPaymentIntegrationTest.php
```

All currently tracked booking findings in this document are now covered by
focused regression tests.
