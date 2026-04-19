# Security Playbook

Status: canonical
Audience: human + AI agent
Last verified: 2026-04-19

This document captures the security rules that should be treated as recurring
engineering constraints in ByteForge.

## Core Rule

Do not rely on a single control. Most sensitive flows need multiple layers:

- authorization
- tenant scoping
- validation
- input normalization where appropriate
- output escaping
- focused regression tests

## Tenant Isolation

- tenant-scoped data must be constrained explicitly in queries and write paths
- never assume route model binding alone is sufficient for multi-tenant safety
- be wary of background jobs, webhooks, analytics queries, and cross-domain
  flows where tenant context can be lost

## Auth And Session Handling

- do not mutate passwords, tokens, codes, signatures, or refresh-cookie values
- treat auth storage and refresh flows as security-sensitive, even when the UI
  behavior looks simple
- keep host and tenant context explicit when sessions or tokens are issued

Reference docs:

- [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)
- [reference/AUTH_STRATEGY.md](reference/AUTH_STRATEGY.md)
- [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)

## Input Handling

- validate all public and dashboard input
- normalize only field families that benefit from normalization, such as
  customer-facing text and contact fields
- do not use one sanitizer globally across all input types
- keep normalization behavior visible at the request or action boundary

Current implemented example:

- booking customer-field normalization in
  `app/Actions/Api/SanitizeBookingCustomerInputAction.php`

## Output Handling

- output escaping remains the primary XSS control
- treat input normalization as defense in depth, not as permission to render raw
  content unsafely
- avoid raw HTML rendering unless the feature explicitly requires it and the
  content path is designed for it

## Payments And Provider Callbacks

- verify signatures and callback authenticity before mutating business state
- keep idempotency explicit for provider-triggered state changes
- never normalize or rewrite opaque provider payloads with the same rules used
  for customer-facing form fields
- separate human-entered payment metadata from provider-generated identifiers

Reference docs:

- [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md)
- [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)

## Booking-Specific Security Rules

- management tokens must stay scoped and minimally exposed
- booking state transitions must remain explicit and test-covered
- hold, payment, confirm, and cancel flows should be regression-tested after
  security-sensitive changes

## Comments For Security-Critical Code

Use comments sparingly but deliberately in security-sensitive code.

Good comment targets:

- why a value is normalized here but not elsewhere
- why a route or callback must validate a particular boundary first
- why a token or status check exists before a transition

Do not use comments as a substitute for central policy. If a rule spans many
files, document it here and add local comments only where a future edit could
easily violate it.

## Verification Expectations

- add focused regression coverage for discovered vulnerabilities or hardening
  changes
- prefer test names that describe the defended behavior clearly
- document repeatable verification commands in the relevant domain docs

Start with [TESTING.md](TESTING.md) for standard commands.
