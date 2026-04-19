# Phase 16.3: Temporary Support Access Implementation Plan

Last updated: April 19, 2026
Status: Planned — implementation-ready
Depends on: Phase 16 inspection and limited theme activation already on `main`
Primary parent doc: [PHASE16_CENTRAL_TENANT_OPERATIONS.md](PHASE16_CENTRAL_TENANT_OPERATIONS.md)

---

## Goal

Allow a central admin or support operator to grant temporary, bounded tenant
access to an existing named central support or admin user without asking the
tenant for credentials and without turning the central app into a second full
tenant CMS.

The granted user should then be able to log in directly on the tenant host
using their own identity, with a restricted tenant-scoped role and automatic
expiry.

---

## Audit Baseline

The current codebase already provides the right foundation for this feature.

### Existing facts confirmed in code

1. Tenant login already authenticates against the shared `users` table, then checks for an active tenant membership.
2. Tenant request access is enforced by `EnsureTenantMembership`, not by tenant-local credentials.
3. Memberships are unique per `user_id` and `tenant_id`.
4. Tenant-scoped roles are derived from memberships through `TenantRbacService`.
5. Tenant activity logging already exists through `TenantActivity`.
6. Browser refresh sessions are already host-scoped and tenant-aware through `web_refresh_sessions`.

Relevant current files:

- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Middleware/EnsureTenantMembership.php`
- `app/Models/Membership.php`
- `app/Services/TenantRbacService.php`
- `app/Models/TenantActivity.php`
- `database/migrations/2025_09_18_180003_create_memberships_table.php`
- `database/migrations/2026_04_19_130000_create_web_refresh_sessions_table.php`

### Key design conclusion from the audit

This feature should not create throwaway tenant-only credentials.

The correct fit for the current architecture is:

1. grant support access to an existing central user,
2. materialize effective tenant access through the existing membership model,
3. keep grant lifecycle and audit history in a dedicated support-access table,
4. enforce expiry both at login time and at request time.

---

## Product Boundary

This feature is meant to solve operational support, not to expand central into
general cross-tenant content management.

The supported workflow is:

1. central operator opens a tenant in the central app,
2. central operator grants temporary access to a named support staff member,
3. support staff signs into the tenant host as themselves,
4. support staff performs limited tenant-side actions,
5. access expires automatically or is revoked explicitly,
6. tenant owners can see that the access existed and who used it.

This first implementation should not include:

1. hidden impersonation,
2. tenant password reset workflows,
3. shared support passwords,
4. broad central page or user CRUD,
5. silent support access with no tenant-facing audit visibility.

---

## Backend Design

### 1. Source-of-Truth Table

Add a dedicated central table:

`tenant_support_access_grants`

Recommended columns:

- `id`
- `tenant_id` string, indexed
- `support_user_id` foreign key to `users`
- `granted_by_user_id` foreign key to `users`
- `membership_id` nullable foreign key to `memberships`
- `reason` text
- `status` string
- `starts_at` timestamp
- `expires_at` timestamp
- `revoked_at` nullable timestamp
- `revoked_by_user_id` nullable foreign key to `users`
- `revoke_reason` nullable text
- `last_used_at` nullable timestamp
- timestamps

Recommended statuses:

- `active`
- `expired`
- `revoked`

Why a dedicated table is needed:

1. `memberships` alone does not capture who granted access, why, or when it should end.
2. A support-access table preserves grant history instead of hiding it in membership churn.
3. It lets the system distinguish tenant-owned memberships from central-granted temporary access.

### 2. Effective Access Layer

Continue to use `memberships` as the effective access layer checked by login and request middleware.

On grant creation:

1. create the support-access grant row,
2. create or update a corresponding membership row for that user and tenant,
3. mark the membership as system-granted support access,
4. sync the tenant-scoped role from that membership.

Recommended membership additions:

- `source` string nullable
- `expires_at` nullable timestamp

Recommended values:

- `source = support_access`
- `role = support_access`

This keeps login and middleware integration simple while preserving an audit-ready source of truth in the grant table.

### 3. Dedicated Tenant Role

Do not reuse the current tenant `support` role unchanged.

Current audit finding:

- the existing `support` role in `TenantRbacService` allows page creation and edit, navigation creation and edit, and media management,
- that is too broad for a first central support-access rollout.

Recommended new fixed tenant role:

- `platform_support`

Recommended initial permissions:

- `pages.view`
- `navigation.view`
- `themes.view`
- `layouts.view`
- `templates.view`
- `media.view`
- `analytics.view`
- `bookings.view` when booking add-on is active
- `payments.view` only if there is a clear support requirement and policy approval

Explicitly exclude initially:

- `pages.create`
- `pages.edit`
- `pages.delete`
- `navigation.create`
- `navigation.edit`
- `navigation.delete`
- `themes.manage`
- `themes.activate`
- `users.manage`
- `roles.manage`
- `settings.manage`
- `payments.manage`
- `payments.refund`

This role can be widened later only if repeated support cases justify it.

### 4. Services

Add a dedicated service, for example:

- `TenantSupportAccessService`

Responsibilities:

1. validate the central actor and target support user,
2. create grants,
3. upsert support memberships,
4. enforce expiry,
5. revoke access,
6. revoke tenant refresh sessions when access ends,
7. write central and tenant audit events.

### 5. Expiry Enforcement

Expiry must be enforced at multiple layers.

Required checks:

1. On tenant login: deny access if the support grant is expired or revoked.
2. On tenant request middleware: re-check access validity so already-issued access tokens do not outlive the grant window.
3. On support revoke or expiry: revoke active `web_refresh_sessions` for that user and tenant host where practical.

Recommended implementation rules:

1. `expires_at` is mandatory for every temporary support grant.
2. Maximum duration should be capped server-side.
3. Expired grants should be converted from `active` to `expired` lazily on access checks and proactively by scheduled cleanup.
4. Revoked or expired support memberships should no longer satisfy tenant login checks.

Recommended initial caps:

- default duration: 24 hours
- allowed options in UI: 1 hour, 4 hours, 24 hours, 72 hours, 7 days
- hard maximum: 7 days

### 6. Session Interaction

`web_refresh_sessions` already stores both `user_id` and `tenant_id`.

That means support access can remain compatible with the existing auth model.

Recommended additional service behavior:

1. revoke all active refresh sessions for the granted user and tenant when support access is revoked,
2. revoke all active refresh sessions for the granted user and tenant when a grant is detected as expired,
3. allow new sessions only while the support grant remains active.

This prevents support refresh cookies from silently extending beyond the intended window.

---

## API Contract

Add central operator endpoints under:

- `GET /api/superadmin/tenants/{tenant}/support-access`
- `POST /api/superadmin/tenants/{tenant}/support-access`
- `POST /api/superadmin/tenants/{tenant}/support-access/{grant}/revoke`

Optional later endpoint:

- `GET /api/superadmin/tenants/{tenant}/support-access/candidates`

### List Response

Should include:

- active grants
- recent expired or revoked grants
- user identity
- granted by
- starts_at
- expires_at
- status
- reason
- revoke metadata when present

### Create Payload

Recommended request:

```json
{
  "support_user_id": 7,
  "reason": "Investigate booking confirmation mismatch",
  "duration_hours": 24
}
```

Validation rules:

1. user must be an allowed central support or admin user,
2. duration must be within the allowed server-side cap,
3. reason is required and length-limited,
4. do not create overlapping active grants for the same user and tenant.

Recommended create behavior:

1. if an active grant already exists for the same user and tenant, either reject with `422` or allow explicit extension via a separate endpoint,
2. first implementation should reject implicit extension to keep semantics clear.

### Revoke Payload

Recommended request:

```json
{
  "reason": "Issue resolved"
}
```

Revoke behavior:

1. mark the grant revoked,
2. expire or deactivate the effective support membership,
3. revoke active refresh sessions for that tenant and user,
4. write audit events.

---

## Audit Events

Audit is mandatory and must be visible to both central and tenant observers.

### Central audit events

Recommended events:

1. support access granted
2. support access revoked
3. support access expired
4. support access first used

Recommended central descriptions:

- `Jane Doe granted temporary support access to Alice Smith for tenant tenant-one until 2026-04-21 10:00 UTC`
- `Jane Doe revoked temporary support access for Alice Smith on tenant tenant-one`
- `Temporary support access for Alice Smith on tenant tenant-one expired`
- `Alice Smith used temporary support access for tenant tenant-one`

### Tenant-visible audit events

Recommended tenant descriptions:

- `Central admin Jane Doe granted temporary support access to Alice Smith until 2026-04-21 10:00 UTC`
- `Central support Alice Smith accessed the tenant under a temporary support grant`
- `Central admin Jane Doe revoked temporary support access for Alice Smith`
- `Temporary support access for Alice Smith expired`

Recommended payload fields:

- `tenant_id`
- `support_user_id`
- `support_user_email`
- `granted_by_user_id`
- `reason`
- `starts_at`
- `expires_at`
- `revoked_at`
- `revoked_by_user_id`

### Audit noise rule

Do not write a tenant audit event for every request.

Recommended first implementation:

1. write on grant,
2. write on first successful tenant session issuance or first tenant request after login,
3. write on revoke,
4. write on expiry.

---

## UI Flow

### Central UI

Use the existing tenant inspection page as the entry point.

Recommended UI additions:

1. add a `Support Access` tab or card to the tenant inspection page,
2. show current active grants,
3. show recent revoked or expired grants,
4. add a `Grant access` dialog,
5. allow revoke from the same surface.

Grant dialog fields:

- support user
- duration
- reason

Recommended UX behavior:

1. show the exact expiry timestamp before confirm,
2. explain that the support user will log in as themselves on the tenant host,
3. explain that access is audited and auto-expires,
4. prevent duplicate active grants in the UI before submission when possible.

### Tenant UI

No dedicated tenant management UI is required for the first slice.

Tenant-side visibility should come from:

1. tenant activity log entries,
2. optional notification email to the tenant owner when access is granted,
3. optional banner or support note later if needed.

### Notifications

Recommended first implementation:

1. email tenant owner on grant,
2. optionally email tenant owner on revoke,
3. do not block grants on tenant approval in the first slice.

---

## Expiry Rules

Required rules:

1. every grant must have `starts_at` and `expires_at`,
2. `expires_at` must be greater than `starts_at`,
3. grants cannot be open-ended,
4. revoked grants cannot be reused,
5. expired grants cannot be silently reactivated,
6. a new grant should be created for each new support window.

Recommended cleanup behavior:

1. scheduled command marks stale active grants as expired,
2. scheduled command deactivates corresponding support memberships,
3. scheduled command revokes tenant refresh sessions tied to expired support access.

---

## Suggested Backend Rollout Order

### Slice A: Model and Enforcement Groundwork

1. add grant table,
2. add membership metadata needed for temporary support access,
3. add restricted tenant support role,
4. add service layer,
5. add login and middleware expiry enforcement.

### Slice B: Central Operator API

1. list grants,
2. create grant,
3. revoke grant,
4. add permission checks,
5. add audit events.

### Slice C: Central UI

1. support-access tab or card,
2. grant dialog,
3. revoke flow,
4. activity summaries.

### Slice D: Operational Hardening

1. owner notification,
2. scheduled expiry cleanup,
3. session cleanup,
4. additional reporting if needed.

---

## Testing Plan

### Backend feature tests

1. central admin can grant support access to an allowed central support user,
2. unauthorized central roles cannot grant or revoke support access,
3. support user can log in to the tenant during the active window,
4. support user cannot log in before the grant starts,
5. support user cannot log in after the grant expires,
6. revoke immediately blocks subsequent tenant access,
7. duplicate overlapping grants are rejected,
8. tenant activity log shows grant and revoke events,
9. central activity log shows grant and revoke events,
10. refresh sessions are revoked on revoke and expiry.

### Tenant authorization tests

1. support-access role gets only the intended restricted permissions,
2. support-access role cannot perform tenant-owner actions,
3. support-access role cannot manage users, roles, settings, or payments unless explicitly allowed later.

### UI tests

1. central inspection page shows current active support grants,
2. grant dialog validates required fields,
3. revoke flow updates the list,
4. duplicate active grant attempts show a useful error.

---

## Open Decisions

1. Should support-access users include only central `support`, or also `admin` and `superadmin`?
2. Should first-use tenant access generate an owner email, or is the grant email enough?
3. Should `platform_support` be a fixed hidden role or visible but non-editable in the tenant role UI?
4. Should grants start immediately only, or should scheduled future starts be allowed later?
5. Should payments visibility be excluded entirely from the first slice?

Recommended answers for first implementation:

1. allow `support` and `admin`, exclude `superadmin` unless explicitly needed,
2. grant email is enough for first slice,
3. fixed hidden role,
4. immediate start only,
5. exclude payments initially.