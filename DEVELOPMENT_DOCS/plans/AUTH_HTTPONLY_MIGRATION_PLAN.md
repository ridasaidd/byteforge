# Auth HttpOnly Migration Plan

Last updated: April 4, 2026
Status: Planned, deferred until cookie consent implementation is complete
Recommended branch later: `feature/auth-httponly-migration`

---

## Goal

Migrate ByteForge browser authentication away from persistent `localStorage` and `sessionStorage` token storage to a safer first-party browser model while keeping Laravel Passport as the backend token system.

Recommended target architecture:

- short-lived access token kept in memory only
- long-lived refresh token stored in a host-scoped `Secure`, `HttpOnly` cookie
- Passport retained for issuing access tokens
- refresh session persistence handled server-side

This plan is intentionally scheduled **after** the cookie consent work is shipped.

---

## Why This Sequencing Is Correct

This should happen after cookie consent, not in parallel.

Reasons:

1. Cookie consent is a legal/runtime storefront issue and should stay narrowly scoped until shipped.
2. Auth storage migration changes central and tenant dashboard login behavior, session lifecycle, and test assumptions.
3. Once cookie consent is in place, the new auth cookie can be documented cleanly as an essential cookie.
4. Mixing both changes would make debugging harder because both touch browser storage and cross-domain behavior.

This sequencing is sound.

---

## Current State Audit

### Backend

Current browser login flow uses Passport personal access tokens created directly in the auth controller.

Observed behavior:

- `POST /auth/login` returns `{ user, token }`
- `POST /auth/refresh` revokes current bearer token and returns a new access token
- `POST /auth/logout` revokes current bearer token

### Frontend

Current frontend behavior:

- token is stored in session-scoped browser storage via `tokenStorage.ts`
- token is sent as `Authorization: Bearer ...`
- app boot decides whether to fetch user based on token presence in storage
- auth responses carrying tokens should be treated as `no-store`

### Current Risks

The current model is operationally simple, but it still has one clear downside:

- a successful XSS can steal a JavaScript-accessible API token from browser storage

The recent hardening slice reduced persistence by removing `localStorage`
backing for dashboard auth tokens, but it did not solve the core exposure.

The goal of the migration is to remove that persistent credential from JavaScript-accessible storage.

---

## Recommended Target State

### Recommended Model

Keep Passport for API access tokens, but stop persisting those tokens in browser storage.

Target browser auth model:

1. login returns a short-lived access token in the response body
2. login also sets a host-scoped refresh cookie
3. frontend keeps the access token in memory only
4. on reload or token expiry, frontend silently refreshes using the HttpOnly cookie
5. logout revokes the refresh session, revokes the active access token, and clears the cookie

### Why This Model Fits ByteForge

This model works well for ByteForge because:

- central and tenant apps are same-origin with their own API paths on each host
- tenant custom domains are not a blocker because each host can have its own host-only cookie
- API calls can continue to use bearer tokens, so the app does not need a full cookie-authenticated API redesign
- the refresh cookie is not readable by JavaScript

### What We Are Explicitly Not Doing In This Phase

Not part of this migration:

- replacing Passport entirely
- introducing full OAuth Authorization Code + PKCE browser flow
- sharing one auth cookie across unrelated tenant top-level domains
- turning the whole API into session-based cookie auth

---

## Architecture Decision

### Chosen Direction

Use a hybrid first-party browser auth model:

- access token: short-lived, in memory only
- refresh token: opaque random token, stored server-side as a hashed value, delivered via `Secure` `HttpOnly` cookie

### Why Not Store The Access Token In An HttpOnly Cookie Too

That is possible, but it turns normal API requests into cookie-authenticated requests and broadens CSRF considerations across the whole dashboard API surface.

The hybrid model keeps most of the existing bearer-token request model while removing persistent token storage from browser JavaScript.

### Why Not Keep Using localStorage

Because `localStorage` is convenient but offers no protection against token theft if XSS occurs.

This migration reduces persistence and exposure, even though it does not make XSS harmless.

---

## Scope Boundaries

This migration applies to:

- central dashboard auth flow
- tenant dashboard auth flow
- shared frontend auth client
- server-side auth endpoints used by the dashboards

This migration does **not** change:

- public storefront rendering
- tenant membership logic
- Passport key loading
- API permission model
- third-party machine-to-machine API use cases, if introduced later

---

## Proposed Backend Design

### New Server-Side Refresh Session Store

Add a first-party refresh session persistence layer separate from Passport access tokens.

Recommended table: `web_refresh_sessions`

Suggested columns:

- `id`
- `user_id`
- `tenant_id` nullable
- `host`
- `token_hash`
- `user_agent` nullable
- `ip_address` nullable
- `last_used_at` nullable
- `expires_at`
- `revoked_at` nullable
- `rotated_from_id` nullable
- timestamps

### Why Store Host And Tenant Context

The refresh cookie should be valid only for the host where it was issued.

That gives the correct behavior for:

- central domain sessions
- tenant subdomains
- tenant custom top-level domains

This also keeps tenant and central dashboard sessions operationally separate.

### Cookie Attributes

Recommended refresh cookie attributes:

- `HttpOnly: true`
- `Secure: true` in production
- `SameSite: lax`
- host-only cookie domain by default
- path limited to `/api/auth` if practical

Recommended naming:

- one stable cookie name such as `byteforge_refresh`
- host-only scoping is enough to isolate central and tenant hosts

### Token Lifetime Strategy

Recommended initial defaults:

- access token TTL: 10 to 15 minutes
- refresh session TTL: 14 to 30 days

Refresh tokens should rotate on every successful refresh.

### Refresh Rotation Rules

On refresh:

1. validate the refresh cookie
2. validate host and, if present, tenant scope
3. revoke the previous refresh session
4. create a new refresh session and cookie
5. issue a new access token

This reduces replay risk if a refresh token is ever exposed elsewhere.

---

## Endpoint Contract Changes

### Login

Current:

- validates credentials
- returns `{ user, token }`

Target:

- validates credentials
- keeps tenant membership checks exactly as they are
- issues short-lived Passport access token
- creates refresh session row
- sets refresh cookie in response
- returns `{ user, token }`

Note:

- returning the access token in login response is acceptable because the SPA needs it immediately
- the key change is that the token is no longer persisted in `localStorage` or `sessionStorage`

### Refresh

Current:

- requires current bearer token
- revokes current access token
- returns a new token

Target:

- uses refresh cookie, not a persisted bearer token
- validates and rotates refresh session
- issues a new access token
- returns `{ token, user? }`

Recommendation:

- return both `token` and `user` from refresh in the new flow
- this lets app bootstrap restore auth state cleanly after reload

### Logout

Current:

- revokes current bearer token

Target:

- revokes current access token if present
- revokes current refresh session
- clears refresh cookie
- returns success response

### Session Bootstrap Endpoint

Two reasonable options:

1. Reuse `POST /auth/refresh` as bootstrap.
2. Add a dedicated `GET /auth/session` endpoint that consumes the refresh cookie and returns `{ user, token }`.

Recommendation:

- use a dedicated `GET /auth/session` endpoint for clarity

Reason:

- bootstrapping an app session is conceptually different from rotating a valid active session
- frontend code becomes easier to read

---

## Proposed Frontend Design

### Token Storage

Replace persistent token storage with an in-memory token store only.

That means:

- remove `localStorage` writes for auth token
- remove `sessionStorage` writes for auth token
- keep a process-memory token only while the tab is alive

### App Bootstrap

Current app boot logic depends on token presence in browser storage.

Target app boot logic:

1. app starts with no access token
2. app calls `/auth/session` on boot
3. if session exists, server returns `{ user, token }`
4. frontend stores token in memory and sets authenticated user state
5. if no session exists, app remains unauthenticated without redirect loops

### 401 Handling

Target behavior on expired access token:

1. request fails with 401
2. interceptor performs one silent refresh attempt using refresh cookie
3. if refresh succeeds, original request is retried once
4. if refresh fails, auth state is cleared and user is redirected to `/login`

Guardrails:

- do not retry auth endpoints recursively
- do not allow infinite refresh loops

### Login And Logout UX

Login:

- same UI
- same endpoint path
- stores access token only in memory
- no browser-storage persistence

Logout:

- same UI behavior
- clears in-memory token
- redirects to `/login`

### Multi-Tab Behavior

This model changes tab persistence behavior.

Expected result:

- each tab can re-bootstrap from refresh cookie on load
- in-memory token is not automatically shared between already-open tabs
- logout in one tab should invalidate the refresh session, so other tabs eventually fail refresh and redirect to login

This is acceptable for V1.

---

## Tenant And Central Scoping Strategy

### Refresh Cookie Scope

Use host-only cookies by default.

Examples:

- central session on `byteforge.se` stays on `byteforge.se`
- tenant session on `acme.byteforge.se` stays on `acme.byteforge.se`
- tenant session on `acme.com` stays on `acme.com`

### Refresh Session Record Scope

Store both:

- current host
- current `tenant_id` when tenancy is initialized

Validation rules:

- central refresh cookie must not restore a tenant dashboard session
- tenant refresh cookie must not restore a session on a different tenant host
- tenant membership must still be checked during session bootstrap and refresh

### Access Token Scope

Access tokens remain bearer tokens, but their effective permissions still depend on:

- current domain routing
- existing `tenant.membership` middleware
- existing `permission.team` middleware

This means the migration does not need a new tenant-specific access token format in V1.

---

## Detailed Migration Phases

### Phase 1. Backend Refresh Session Infrastructure

1. Create `web_refresh_sessions` migration.
2. Add model and service layer for issuing, rotating, and revoking refresh sessions.
3. Add cookie helper logic for issuing and clearing refresh cookies.
4. Add expiry and revocation rules.

### Phase 2. Auth Endpoint Upgrade

1. Update login to create refresh session and set cookie.
2. Add `GET /auth/session` bootstrap endpoint.
3. Update refresh to use refresh cookie instead of stored bearer token.
4. Update logout to revoke refresh session and clear cookie.
5. Keep tenant membership enforcement in login and session bootstrap.

### Phase 3. Frontend Client Refactor

1. Replace persistent token storage with in-memory store.
2. Update `AuthProvider` bootstrap behavior.
3. Add one-time silent refresh flow in HTTP interceptor.
4. Remove auth reliance on localStorage/sessionStorage.
5. Update login/logout handling.

### Phase 4. Test Refactor

1. Update frontend auth tests that assume localStorage.
2. Add backend feature tests for refresh cookie issuance and rotation.
3. Add central Playwright tests for reload persistence.
4. Add tenant Playwright tests for reload persistence and tenant-host isolation.

### Phase 5. Cleanup

1. Remove obsolete tokenStorage persistence helpers.
2. Update `reference/AUTH_STRATEGY.md` and testing documentation.
3. Document deploy behavior and one-time re-login expectations.

---

## Testing Plan

### Backend Feature Tests

Central:

- login sets refresh cookie
- session bootstrap returns user and access token when refresh cookie is valid
- refresh rotates refresh session and cookie
- logout clears refresh cookie and revokes refresh session
- revoked or expired refresh cookie cannot restore session

Tenant:

- login sets refresh cookie on tenant host
- session bootstrap fails for non-member user
- session bootstrap respects tenant membership and team context
- tenant A refresh cookie cannot restore tenant B session
- central refresh cookie cannot restore tenant session and vice versa

### Frontend Unit Tests

- auth service no longer writes access token to localStorage
- interceptor performs single refresh attempt on 401
- bootstrap flow sets user state from session endpoint

### Playwright

Central:

- login survives full page reload
- logout clears session and redirects to login

Tenant:

- login survives full page reload on tenant host
- logout clears session and redirects to tenant login
- tenant session isolation across hosts

---

## Deployment And Rollout Notes

### Deployment Shape

Because ByteForge ships backend and frontend together, this can be deployed as an atomic application change.

That means a temporary dual-storage compatibility layer is probably unnecessary.

### Expected User Impact

Users with existing localStorage-backed sessions will likely be logged out once during deployment.

This is acceptable and should be called out in release notes.

### Rollback Strategy

If rollout fails:

1. revert to current storage-backed auth flow
2. disable new bootstrap endpoint usage in frontend
3. clear newly issued refresh cookies

Because the current model is simpler, rollback is straightforward.

---

## Open Decisions

### 1. Should Refresh Return User Payload Or Only Token?

Recommendation:

- return both user and token for bootstrap simplicity

### 2. Should We Add Device Labels Or Session Management UI?

Recommendation for V1:

- no

Keep refresh session management internal until the core migration is stable.

### 3. Should Access Tokens Be Shortened Immediately?

Recommendation:

- yes, reduce browser access token lifetime when this migration ships

The whole value of the migration is higher when the access token is short-lived.

### 4. Should Locale Persistence Be Moved Too?

Recommendation:

- not part of this migration

Locale storage is a separate UX and compliance concern.

---

## Files Likely To Change

Backend:

- `app/Http/Controllers/Api/AuthController.php`
- new refresh session model/service files under `app/Models/` and `app/Services/`
- `routes/api.php`
- `routes/tenant.php`
- `app/Providers/AppServiceProvider.php`
- new migration file for refresh session persistence

Frontend:

- `resources/js/shared/services/http.ts`
- `resources/js/shared/services/auth.service.ts`
- `resources/js/shared/services/api/auth.ts`
- `resources/js/shared/services/tokenStorage.ts`
- `resources/js/shared/context/AuthContext.tsx`
- related auth tests and Playwright specs

Documentation:

- `DEVELOPMENT_DOCS/reference/AUTH_STRATEGY.md`
- `DEVELOPMENT_DOCS/TESTING.md`
- `DEVELOPMENT_DOCS/CURRENT_STATUS.md`

---

## Definition Of Done

This migration is done only when:

- no browser auth token is persisted in localStorage or sessionStorage
- login restores state after page reload via refresh cookie bootstrap
- tenant and central sessions remain host-scoped and isolated
- logout clears both in-memory state and server refresh session
- refresh rotation works without loops or duplicated retries
- backend tests and Playwright auth flows pass for both central and tenant apps

---

## Immediate Next Step

No implementation work now.

The next step is to finish cookie consent first. Once that is merged, start this migration on a separate branch and implement Phase 1 and Phase 2 before touching frontend boot logic.
