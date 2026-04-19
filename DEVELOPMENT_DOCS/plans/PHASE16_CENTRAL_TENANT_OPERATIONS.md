# Phase 16: Central Tenant Operations

Last updated: April 19, 2026
Status: Re-scoped plan — inspection shipped, broader expansion deferred
Depends on: Phase 12 tenant runtime hardening, Phase 13 booking system stabilization
Recommended branch later: feature/phase16-central-tenant-operations

---

## Problem Statement

The central app can already manage tenant records and now has the first useful
operator slice in place: tenant inspection plus limited theme activation.

The remaining product question is not whether central should become a second
tenant CMS. It should not. The real need is support access: platform staff
need a controlled way to help tenants without asking for tenant credentials or
building a duplicated central editing surface for every tenant-owned resource.

Useful examples include:

1. Inspecting a tenant's current state from central.
2. Activating a tenant theme during onboarding or recovery.
3. Granting temporary support access to a real support staff member.
4. Making those actions visible inside the tenant's own activity log so tenant staff can see what central changed and who accessed the tenant.

This phase should enrich the central app without weakening the tenant-isolation guarantees introduced in Phase 12.

---

## Core Decision

Central must not impersonate tenant users ad hoc.

Central should also not grow into a full parallel tenant-management surface for
pages, navigation, users, roles, and other everyday tenant operations unless a
repeated operational need clearly justifies that complexity later.

Instead, central should get explicit operator endpoints under the central API,
targeting a tenant by ID. Those endpoints should initialize tenant context
server-side, call the same domain services used by tenant controllers, and
emit tenant-scoped audit entries that clearly identify the central actor.

For hands-on support, the preferred model is temporary tenant access for an
existing central support or admin user through time-bounded tenant membership,
not hidden impersonation and not password-based throwaway tenant accounts.

Good direction:

- `/api/superadmin/tenants/{tenant}/summary`
- `/api/superadmin/tenants/{tenant}/themes/*`
- `/api/superadmin/tenants/{tenant}/activity-logs`
- `/api/superadmin/tenants/{tenant}/support-access/*`

Bad direction:

- central UI directly calling tenant-domain APIs
- bypassing `tenant.membership` by faking tenant user sessions
- hiding central actions behind generic tenant-user audit entries
- turning the central app into a second full tenant CMS by default

---

## Design Principles

1. Tenant isolation remains the default. Every cross-tenant operation must be explicit, permissioned, and auditable.
2. Central operator permissions must be separate from ordinary tenant permissions.
3. Reuse existing tenant services and business rules instead of creating a second copy of tenant logic for central.
4. Tenant-visible auditing is mandatory for write operations.
5. Read-only inspection should ship before write-capable controls.
6. The central app should stay narrow: inspection, lifecycle basics, and controlled support workflows are preferred over broad cross-tenant CRUD.
7. Security-sensitive surfaces such as tenant RBAC, identity, and payments should not be in the first rollout.

---

## Proposed Permission Model

Introduce explicit platform-operator permissions for cross-tenant work:

- `tenants.operate`
- `tenants.themes.view`
- `tenants.themes.manage`
- `tenants.activity.view`
- `tenants.support.view`
- `tenants.support.grant`
- `tenants.support.revoke`

These should be granted only to central roles that are allowed to cross tenant boundaries, such as admin or superadmin. Tenant-scoped staff permissions remain unchanged.

---

## Recommended Rollout Order

### 16.1 Read-Only Tenant Inspection

Add central operator endpoints for:

1. Tenant summary and health.
2. Tenant themes list and active theme state.
3. Tenant pages list.
4. Tenant activity log view.

This gives platform operators visibility first, before they can mutate tenant state.

Status update:

- implemented on `main`

### 16.2 Limited Theme Operations From Central

Add central-managed tenant theme actions for:

1. Activate tenant theme.

Status update:

- basic activation is implemented on `main`
- theme customization from central is explicitly deferred unless a stronger support use case appears later

This is the safest first write-capable slice because it is operationally valuable and less sensitive than identity or billing.

### 16.3 Temporary Support Access

Add central-managed support access for a tenant by granting an existing central
support or admin user a restricted, time-bounded tenant membership.

Detailed implementation plan:

- [PHASE16_TEMPORARY_SUPPORT_ACCESS_IMPLEMENTATION.md](PHASE16_TEMPORARY_SUPPORT_ACCESS_IMPLEMENTATION.md)

Recommended characteristics:

1. Use an existing named central user, not a generated shared credential.
2. Grant a dedicated restricted tenant support role, not full owner/admin access.
3. Require an explicit expiry time and support reason.
4. Make grant, usage, expiry, and revoke events tenant-visible.
5. Prefer revoke and expiry over manual cleanup.

This is the preferred next write-capable slice because it solves the real
support problem without duplicating the tenant app inside central.

### 16.4 Re-evaluate Broader Central Operations Only If Proven Necessary

Only if temporary support access is not operationally sufficient should the
team revisit broader central tenant operations such as page management or
cross-tenant user or role management. Those slices need a much higher bar
because they intersect with `permission.team`, tenant memberships, tenant
trust, and auth guarantees.

---

## Audit Requirements

Every write operation initiated from central against a tenant should create tenant-visible activity entries with actor attribution.

Expected wording pattern:

- `Central admin Jane Doe activated theme "Studio"`
- `Central support Alice Smith was granted temporary support access until 2026-04-21 10:00 UTC`
- `Central admin John Smith revoked temporary support access for Alice Smith`

Recommended complementary central audit entry:

- `Jane Doe activated tenant theme "Studio" for tenant tenant-one`
- `Jane Doe granted temporary support access to Alice Smith for tenant tenant-one until 2026-04-21 10:00 UTC`

The tenant-facing log should make it obvious that the actor came from central, not from the tenant's own team.

---

## Technical Notes

Relevant current constraints and foundations already in the repo:

1. Tenant access is guarded by `tenant.membership` and permission team scoping.
2. Tenant activity logs already carry tenant scoping through `TenantActivity`.
3. Central routes already exist under `/api/superadmin`, which is the correct place for operator endpoints.
4. Tenant membership already points at the shared `users` table, which makes time-bounded support membership a better fit than creating isolated temporary tenant accounts.
5. Tenant services for themes and related resources already exist and should be reused.

Implementation should prefer a dedicated operator layer, for example:

- `CentralTenantThemeController`
- `CentralTenantActivityController`
- `CentralTenantSupportAccessController`

Each controller should:

1. authorize the central actor,
2. resolve the target tenant,
3. initialize tenant context safely,
4. call the existing service layer,
5. write tenant-facing and central-facing audit entries,
6. end tenant context cleanly.

---

## Non-Goals For This Phase

This phase should not include by default:

1. tenant impersonation,
2. payment-provider mutation from central,
3. tenant password resets or direct auth bypass,
4. hidden or silent tenant mutations without activity log visibility,
5. broad page, navigation, user, or role CRUD from central by default.

---

## Suggested Acceptance Criteria

1. A central admin with the right operator permission can inspect tenant themes and pages from central.
2. A central admin with the right operator permission can activate a tenant theme from central.
3. A central operator with the right permission can grant temporary support access to an existing central support or admin user for a bounded duration.
4. Temporary support access expires automatically and can be revoked explicitly.
5. The tenant activity log shows that the action was performed by a named central actor.
6. Unauthorized central roles cannot access cross-tenant operator endpoints.
7. No tenant-domain API needs to trust central-origin browser calls directly.
8. Existing tenant-isolation tests continue to pass.
