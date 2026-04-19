# Phase 15: Guest Authentication System

Last updated: April 7, 2026
Status: Planned — not yet started
Depends on: Phase 13 (Booking), `AUTH_HTTPONLY_MIGRATION_PLAN.md` migration shipped
Recommended branch later: `feature/phase15-guest-auth`

---

## Problem Statement

The Phase 13 booking system intentionally supports anonymous guest bookings. Guests submit a booking, receive a cryptographic management token by email, and use that token to view or cancel their booking. This is the correct default — no forced registration.

The problem is continuity. A guest who makes three bookings over six months has three separate management tokens, no unified view of their history, and no way to reschedule without digging through their email inbox. If they change their email address, the management tokens become permanently orphaned.

Guest authentication solves this without breaking the anonymous-first model: it is a purely opt-in layer that a guest can activate after a successful booking, never before or during.

---

## Design Principles

1. **Anonymous remains the default.** Nothing in the booking flow changes. Guests are never asked to sign up or log in in order to book.
2. **Guest auth only surfaces when the booking add-on is active.** It is not a standalone platform feature.
3. **Separate identity from staff.** The central `users` table is for admin/staff. Guests live in a separate `guest_users` table on the central database. They never get CMS access, roles, or permissions.
4. **Magic link is the primary authenticator.** No password from day one. Email-first is correct for the infrequent usage pattern (a guest logs in a few times per year, not daily).
5. **Token model mirrors the staff HttpOnly auth refactor.** Guest access tokens are short-lived; refresh sessions are stored server-side; the refresh token is delivered as an HttpOnly cookie. The mechanism is structurally identical — only the actor type differs.
6. **Cross-domain auth is tenant-proxied.** Tenants have their own domains. Guest identity lives centrally (one guest, any tenant). Tenant API calls central to verify magic link tokens and centralises guest session creation — guests never get redirected to a central auth domain.
7. **Input normalization must be field-aware.** Normalize guest name/email and other ordinary contact text before validation, but never run the same sanitizer across passwords, magic-link tokens, refresh cookies, signatures, or other security-sensitive values.

## Input Normalization Follow-Up

The booking branch now normalizes booking customer text at the write boundary.
That pattern should be generalized later for guest-auth work, but only as a
shared reusable normalization layer, not as a global request middleware.

Recommended guest-auth boundary:

- normalize ordinary guest profile fields such as `name` and `email`,
- preserve exact values for passwords if a password-based guest flow is ever
  introduced later,
- preserve exact values for magic-link tokens, access tokens, refresh tokens,
  OTP codes, HMAC payloads, and cookie/session identifiers,
- prefer `FormRequest::prepareForValidation()` or explicit request-shaping in
  the owning action/controller so the behavior stays visible and testable.

---

## How This Fits the HttpOnly Auth Refactor

The `AUTH_HTTPONLY_MIGRATION_PLAN.md` introduces:

- `web_refresh_sessions` table with a `user_id` foreign key
- Short-lived Passport access tokens (in memory only, not localStorage)
- A `byteforge_refresh` HttpOnly cookie for session persistence
- `GET /auth/session` for app bootstrap
- Refresh rotation and host-scoped cookie isolation

Guest auth is **additive** to this model, not conflicting with it. The four integration points are:

### 1. `web_refresh_sessions` — add `guest_user_id`

Add a nullable `guest_user_id` column alongside the existing nullable `user_id`. Enforce at DB level that exactly one is set.

```sql
guest_user_id bigint unsigned null references guest_users(id) on delete cascade
```

DB constraint (MySQL/MariaDB):

```sql
constraint web_refresh_sessions_actor_check
  check (
    (user_id is not null and guest_user_id is null)
    or
    (user_id is null and guest_user_id is not null)
  )
```

No other columns change. Host isolation, rotation rules, and revocation behaviour are identical.

### 2. Guest access tokens — custom HMAC, not Passport

Passport's `createToken()` requires a model with `HasApiTokens`. Attaching that trait to a `guest_users` model would pull unrelated concerns in. Instead, guest access tokens are short-lived HMAC-signed payloads using the app key.

Token structure (non-Passport):

```json
{
  "sub": 42,
  "type": "guest",
  "tenant_id": 7,
  "iat": 1712500000,
  "exp": 1712500900
}
```

TTL: matches staff access token TTL (10–15 minutes). Signed with `hash_hmac('sha256', payload, config('app.key'))`. Verified by a dedicated `auth:guest` middleware on tenant routes.

This is intentionally minimal. It is not a full JWT library. It does not need one.

### 3. Separate cookie name — `byteforge_guest_refresh`

Staff cookie: `byteforge_refresh`
Guest cookie: `byteforge_guest_refresh`

Both are Secure, HttpOnly, SameSite=lax, host-only scoped. They can coexist on the same tenant host without conflict.

### 4. Separate bootstrap endpoint — `GET /guest-auth/session`

Staff bootstrap: `GET /auth/session` → reads `byteforge_refresh` → returns `{ user, token }`
Guest bootstrap: `GET /guest-auth/session` → reads `byteforge_guest_refresh` → returns `{ guest, token }`

The tenant frontend guest portal (`/my-bookings`) calls the guest bootstrap endpoint, not the staff one. The implementation is a parallel path with identical structure.

---

## Data Model

### Central database — `guest_users` table

```
id
email                 unique, varchar(255)
name                  varchar(255), nullable
email_verified_at     timestamp, nullable
created_at
updated_at
```

No password column initially. Magic link is the only authenticator.

Guests are central entities. One guest can have bookings across multiple tenants. Tenant-side records reference guests by `email` or a `guest_user_id` foreign key added to the `bookings` table.

### Tenant database — `bookings` table extension

Add a nullable `guest_user_id` column pointing to the central `guest_users` table.

This column is set when:
- A guest explicitly links their booking to an account after the fact.
- A guest authenticates and makes a new booking while logged in.

Anonymous bookings leave this column null. Their existing `customer_email` field is unchanged and continues to serve as the identity anchor for anonymous management.

---

## Authentication Flow

### Magic Link Request

```
POST /guest-auth/request-link
Body: { email: string }
```

Tenant API receives this request. It calls central:

```
POST /api/guest/issue-magic-link
Body: { email, tenant_id, redirect_url }
```

Central creates or retrieves the `guest_user` row for that email. It creates a single-use, time-limited token (15–30 minutes, stored hashed) and sends a magic link email to the guest from the central mailer.

The tenant receives `{ sent: true }`. The tenant-side UI shows "Check your inbox."

### Magic Link Verification and Session Issuance

Guest clicks the link, which goes to `tenant.com/guest/magic/{raw_token}`.

The tenant's client-side router intercepts this URL and calls:

```
POST /guest-auth/verify
Body: { token: string }
```

Tenant API calls central:

```
POST /api/guest/verify-magic-token
Body: { token, tenant_id }
```

Central validates the token (exists, not expired, not used, correct tenant). On success it returns `{ guest_user_id, email }` and marks the token as used.

Tenant then:
1. Creates or retrieves `guest_users` reference (the ID is central, so the tenant stores it as a foreign reference).
2. Creates a `web_refresh_sessions` row with `guest_user_id` set, `host` set, `tenant_id` set.
3. Issues a short-lived HMAC guest access token.
4. Sets `byteforge_guest_refresh` HttpOnly cookie.
5. Returns `{ guest: { id, email, name }, token }`.

### App Bootstrap

On guest portal load (`/my-bookings`):

```
GET /guest-auth/session
```

Reads `byteforge_guest_refresh` cookie. Validates the refresh session (not expired, not revoked, host matches, tenant matches). Rotates refresh session and cookie. Returns `{ guest, token }`.

If no cookie or invalid: returns 401. Guest portal shows a "view your bookings" email prompt.

### Logout

```
POST /guest-auth/logout
```

Revokes the current refresh session row. Clears `byteforge_guest_refresh` cookie. Returns success. Client clears in-memory token.

---

## Retroactive Booking Linking

After a successful anonymous booking, the success screen shows:

> "Save this booking to your account to manage all your bookings in one place."

Button: "Send me a link to sign in"

This triggers the magic link flow. On first sign-in, the system links all bookings matching `customer_email = guest.email` to the newly authenticated `guest_user_id`. Future bookings made while authenticated record `guest_user_id` directly.

This is a one-time migration per email address. It is idempotent — re-running it for the same email is a no-op.

---

## Guest Portal — `/my-bookings`

A fixed system route on each tenant, not a Puck page type.

Authenticated guests see:

- Upcoming bookings (with rescheduling if allowed)
- Past bookings
- Cancelled bookings
- Link to individual booking detail (same as management token view, but authenticated instead)

Unauthenticated visitors see a prompt to enter their email to receive a sign-in link.

The portal is only accessible when the booking add-on is active. If `addon:booking` is not active for the tenant, the route returns 404.

---

## Routes (Tenant Domain)

All under the tenant domain, no auth by default except where noted.

```
POST  /guest-auth/request-link        (public, throttled)
POST  /guest-auth/verify              (public, throttled)
GET   /guest-auth/session             (public, reads guest refresh cookie)
POST  /guest-auth/logout              (auth:guest)
GET   /my-bookings                    (served as SPA shell, guest auth enforced client-side)
GET   /guest/magic/{token}            (SPA shell route, handled client-side)
```

---

## Routes (Central Domain — Internal)

Only callable by tenant API server-to-server, not by browsers:

```
POST  /api/guest/issue-magic-link     (service token auth)
POST  /api/guest/verify-magic-token   (service token auth)
```

These should be authenticated with a pre-shared service token (existing `CENTRAL_SERVICE_TOKEN` or equivalent config value), not exposed to the public internet.

---

## Middleware

`auth:guest` — tenant-side middleware for guest-authenticated routes.

Verification steps:
1. Extract bearer token from `Authorization` header.
2. Verify HMAC signature.
3. Check `exp` claim.
4. Verify `tenant_id` in token matches current tenant.
5. Check `guest_user_id` exists in `web_refresh_sessions` (live session, not revoked).
6. Set `app('guest_user')` for controller access.

This does not use the Passport guard. It is a dedicated lightweight middleware.

---

## Implementation Phases

### Phase 15.1 — Central Guest Identity

- Create `guest_users` migration on central database.
- Create `GuestUser` Eloquent model (no `HasApiTokens`).
- Create `MagicLinkToken` table: `id`, `guest_user_id`, `token_hash`, `tenant_id`, `expires_at`, `used_at`.
- Create `GuestMagicLinkService` — issue, verify, expire tokens.
- Create central API routes: `issue-magic-link`, `verify-magic-token` with service-token guard.
- Send magic link email from central mailer.

### Phase 15.2 — Refresh Session Extension

- Add `guest_user_id` column to `web_refresh_sessions` (requires `AUTH_HTTPONLY_MIGRATION_PLAN` Phase 1 to be shipped first).
- Add DB constraint: exactly one of `user_id` / `guest_user_id` must be set.
- Update `WebRefreshSessionService` to handle guest sessions (create, rotate, revoke).

### Phase 15.3 — Tenant Guest Auth Endpoints

- Create `GuestAuthController` with: `requestLink`, `verify`, `session`, `logout`.
- Create `GuestTokenService` — HMAC sign/verify for guest access tokens.
- Create `auth:guest` middleware.
- Register tenant routes.
- Add `guest_user_id` nullable FK to `bookings` table migration.

### Phase 15.4 — Retroactive Linking

- On first authenticated guest session: run `BookingLinkingService::linkByEmail(guest_user_id, email, tenant_id)`.
- Query `bookings` by `customer_email` where `guest_user_id` is null; set `guest_user_id`.
- Idempotent: safe to re-run, uses upsert semantics.

### Phase 15.5 — Guest Portal UI

- Build `/my-bookings` React page (outside DashboardLayout, same pattern as ThemeBuilder).
- Unauthenticated state: email prompt → request link.
- Authenticated state: booking list grouped by status.
- Guest session bootstrap via `GET /guest-auth/session` on mount.
- `byteforge_guest_refresh` cookie drives persistence across reloads.

### Phase 15.6 — Booking Widget Integration

- After successful booking, show "Sign in to save" prompt on success step.
- Trigger `POST /guest-auth/request-link` with the email used in the booking form.
- Display confirmation message. No forced redirect.

### Phase 15.7 — Testing

Backend:
- `GuestMagicLinkServiceTest` — issue, verify, expire, replay prevention
- `GuestAuthControllerTest` — full happy path + error cases per endpoint
- `WebRefreshSessionTest` — guest session create/rotate/revoke
- `BookingLinkingServiceTest` — retroactive link, idempotency

Playwright:
- Guest requests magic link, clicks it, lands on `/my-bookings` with bookings visible
- Reload persists session via refresh cookie
- Logout clears session
- Anonymous booking → "save to account" flow → linked booking appears in portal

---

## Dependency on Auth HttpOnly Refactor

Phase 15.2 requires the `web_refresh_sessions` table to exist (Phase 1 of `AUTH_HTTPONLY_MIGRATION_PLAN`). The full staff auth refactor does not need to be complete — only Phase 1 (schema) needs to exist before Phase 15.2 starts.

The remaining guest auth phases (15.1, 15.3–15.7) are independent and can start before the full auth refactor ships.

Recommended sequencing:

```
AUTH_HTTPONLY Phase 1 (schema) → Phase 15.2 (extend schema)
Phase 15.1 (central identity) → can start anytime
Phase 15.3+ (tenant endpoints, UI) → after 15.1 and 15.2
```

---

## Open Decisions (Deferred)

| Question | Default Assumption | Revisit When |
|---|---|---|
| Should guests be able to set a password later? | No, magic link only in V1 | After portal ships and usage patterns are clear |
| Should the guest portal be a Puck page type eventually? | No, fixed system route for now | If tenants request deep customisation |
| Should guest sessions span tenants (true SSO)? | No, per-tenant sessions in V1 | If multi-tenant guest use case is validated |
| Should guest auth gate on its own add-on flag? | No, bundle with `addon:booking` | Only if non-booking guest auth use cases emerge |
| Multi-device: should logout be all-devices or current-device? | Current device only in V1 | After session management UI is considered |
