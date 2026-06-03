# Phase 20: Customer Accounts and Cross-Tenant SSO Architecture

Last updated: April 26, 2026
Status: Planned — not started
Recommended branch later: `feature/phase20-customer-accounts-sso`
Depends on:

- Phase 15 guest authentication shipped on `main`
- Phase 19 system-surface foundations partially shipped on `main`
- `plans/AUTH_HTTPONLY_MIGRATION_PLAN.md` baseline shipped

---

## Problem Statement

Phase 15 solved guest continuity for booking users without creating normal
accounts. That was the correct move.

It did not solve the broader customer identity problem:

- a returning customer may interact with multiple tenants over time,
- some tenants will want durable account features rather than magic-link-only
  guest access,
- register, forgot-password, reset-password, and long-lived account management
  should not be modeled as extensions of `guest_users`,
- cross-tenant sign-in requires an explicit identity architecture rather than
  per-tenant guest sessions.

This phase defines that future architecture.

---

## Scope Boundary

This phase is intentionally separate from guest auth.

Guest auth remains:

- passwordless,
- optional,
- booking-oriented,
- tenant-session-based,
- optimized for infrequent usage.

Customer accounts should become:

- durable,
- explicit,
- capable of password and password-recovery flows,
- suitable for cross-tenant identity continuity,
- extensible for future account-level preferences, consent, quotes, estimates,
  and other customer-facing modules.

The key architectural rule is: **do not evolve `guest_users` into customer
accounts in place.**

---

## Core Decisions

1. **Keep `guest_users` as a separate actor type.** It remains the lightweight,
   booking-first identity for magic-link continuity.
2. **Introduce a dedicated customer identity model.** Customer accounts should
   not share the `users` staff model or the `guest_users` model.
3. **Use central identity with tenant linkage.** The durable customer identity
   should be global; tenant-specific profile, entitlements, and presentation
   should remain tenant-aware.
4. **Treat SSO as a first-party brokered flow.** Cross-tenant SSO should be
   implemented through a dedicated ByteForge customer identity service rather
   than improvised tenant-to-tenant session forwarding.
5. **Do not replace guest flows.** Guests must still be able to book and manage
   bookings without forced account creation.

---

## Goals

- support customer registration and durable sign-in,
- support forgot-password and reset-password flows,
- allow one customer identity to access multiple tenant experiences,
- preserve tenant isolation and authorization,
- allow verified upgrade paths from guest usage into customer accounts,
- keep the existing HttpOnly browser auth posture.

## Out Of Scope

- replacing guest auth,
- giving customer accounts CMS access,
- introducing tenant-to-tenant staff federation,
- implementing enterprise SAML/OIDC for tenant admins,
- social login in the first iteration,
- MFA in the first iteration unless a concrete demand appears.

---

## Proposed Domain Model

### Central Models

Recommended new central tables:

- `customer_identities`
  - durable customer actor
  - canonical email, status, verification timestamps
- `customer_credentials`
  - password hash and credential metadata
  - separate from the identity row so auth factors can evolve later
- `customer_email_verifications`
  - verification and email-change tokens
- `customer_password_reset_tokens`
  - reset tokens and expiry
- `customer_global_sessions`
  - customer SSO session state on the central auth domain

Optional later tables:

- `customer_mfa_methods`
- `customer_identity_links`
  - for future social auth or external identity providers

### Tenant-Aware Linkage

Recommended tenant-scoped linkage model:

- `customer_tenant_profiles`
  - `customer_identity_id`
  - `tenant_id`
  - per-tenant profile fields, status flags, preferences, consent metadata,
    and timestamps

This linkage can live centrally if cross-database constraints remain awkward,
with tenant runtime consuming it as the source of truth.

### Booking Linkage

Bookings should eventually support both:

- `guest_user_id` for guest continuity
- `customer_identity_id` for durable customer accounts

During migration windows, one booking may temporarily be linkable to both a
guest history and a customer identity, but the long-term customer-facing model
should prefer `customer_identity_id`.

---

## Session Architecture

### Central Customer Session

Customer SSO requires a dedicated central auth origin, for example:

- `accounts.byteforge.se`

That origin should own:

- the durable customer login session,
- password reset flows,
- email verification callbacks,
- cross-tenant SSO handoff issuance.

The central session should use an HttpOnly cookie and server-side session store
mirroring the current auth-session posture.

### Tenant Runtime Session

Tenants should continue using host-scoped access and refresh session mechanics,
because tenant APIs already assume host isolation.

Recommended model:

1. Customer signs in on the central auth origin.
2. Central auth issues a short-lived tenant handoff token.
3. Tenant validates the handoff token with the central service.
4. Tenant creates a host-scoped customer refresh session and in-memory access
   token for that tenant domain.

This keeps:

- SSO central,
- tenant API auth host-scoped,
- browser storage aligned with the existing HttpOnly strategy.

---

## Runtime Surface Implications

Phase 19 introduced the right surface vocabulary for this work.

This phase should provide real runtime implementations for:

- `register`
- `forgot_password`
- `reset_password`

It should also introduce or define:

- a durable customer account route such as `/account` or `/portal`
- whether `guest_portal` remains guest-only or gains an upgrade/handoff path
  into a distinct authenticated customer portal

Recommended rule:

- keep `guest_portal` guest-focused,
- introduce a separate customer account portal surface when durable account
  features exceed the current guest-booking shell.

---

## Guest Upgrade Path

Customer accounts should be able to absorb prior guest activity without
destroying the guest model.

Recommended upgrade path:

1. Customer registers with a verified email.
2. The platform links matching historical `guest_users` by verified email.
3. Matching guest-linked bookings become visible through the customer account.
4. Guest auth can continue to function for legacy links, but the account portal
   becomes the preferred durable surface.

Important guard rail:

- linking must require verified control of the email address used by the guest
  records.

---

## Security Guard Rails

1. Customer accounts must remain separate from staff `users`.
2. Password reset and email verification tokens must never reuse guest token
   tables.
3. Central SSO sessions and tenant runtime sessions must be independently
   revocable.
4. Tenant authorization must still check tenant linkage, not just a valid
   global identity.
5. Guest magic links must not silently become account sessions.
6. Cross-tenant SSO must not imply cross-tenant data access; tenant linkage and
   per-tenant authorization remain mandatory.

---

## Implementation Phases

### 20.1 Central Customer Identity Foundation

- create customer identity and credential models
- implement registration and email verification
- implement durable central customer login

### 20.2 Password Recovery

- forgot-password and reset-password token flows
- route-owned runtime surfaces for recovery
- focused backend and browser coverage

### 20.3 Tenant Linkage And Runtime Sessions

- customer-to-tenant linkage model
- tenant session issuance from central handoff
- account bootstrap API on tenant domains

### 20.4 Cross-Tenant SSO Broker

- central handoff endpoint design
- redirect and return flows
- logout propagation strategy

### 20.5 Guest Upgrade And Data Linking

- verified guest-to-customer linking
- booking visibility migration rules
- UX rules for guest portal versus account portal

---

## Testing Requirements

### Backend

- registration and verification
- password reset issuance and consumption
- tenant linkage authorization
- SSO handoff validation
- guest-to-customer linking correctness

### Frontend Runtime

- register surface submission
- forgot/reset surfaces with saved system-surface presentation
- account bootstrap on tenant domains
- upgrade path from guest portal into account flow

### Browser / E2E

- register on one tenant, sign into another via SSO
- central logout and tenant logout behavior
- guest booking upgraded into account visibility
- unauthorized tenant access blocked despite valid global identity

---

## Open Questions

1. Should the first customer account release ship with password login only, or
   support passwordless email login in parallel?
2. Should customer account profiles live centrally, tenant-scoped, or as a
   hybrid model with central core fields plus tenant-local extensions?
3. Should `/account` be a new system surface family, or should the portal stay
   route-owned with widget zones similar to the guest portal model?
4. How should logout behave when multiple tenant tabs are open under one active
   SSO session?

---

## Recommended Outcome

At the end of this phase, ByteForge should have:

- real customer accounts distinct from guest identity,
- durable registration and password-recovery flows,
- first-party cross-tenant SSO,
- a verified upgrade path from guest continuity into full customer accounts,
- no architectural pressure to overload `guest_users` or the guest portal with
  responsibilities they were never meant to carry.
