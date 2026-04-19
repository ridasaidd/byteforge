# Phase 16: Central Tenant Operations

Last updated: April 19, 2026
Status: Planned — not yet started
Depends on: Phase 12 tenant runtime hardening, Phase 13 booking system stabilization
Recommended branch later: feature/phase16-central-tenant-operations

---

## Problem Statement

The central app can already manage tenant records, but it cannot yet operate tenant-owned application controls from the central surface. That creates a gap for platform operators who need to support or recover tenant environments without signing into each tenant domain separately.

Useful examples include:

1. Inspecting a tenant's themes, pages, users, and roles from central.
2. Activating or customizing a tenant theme from central when a tenant requests help.
3. Repairing tenant page content or configuration during support and onboarding.
4. Making those actions visible inside the tenant's own activity log so tenant staff can see what central changed and who did it.

This phase should enrich the central app without weakening the tenant-isolation guarantees introduced in Phase 12.

---

## Core Decision

Central must not impersonate tenant users ad hoc.

Instead, central should get explicit operator endpoints under the central API, targeting a tenant by ID. Those endpoints should initialize tenant context server-side, call the same domain services used by tenant controllers, and emit tenant-scoped audit entries that clearly identify the central actor.

Good direction:

- `/api/superadmin/tenants/{tenant}/themes/*`
- `/api/superadmin/tenants/{tenant}/pages/*`
- `/api/superadmin/tenants/{tenant}/activity-logs`

Bad direction:

- central UI directly calling tenant-domain APIs
- bypassing `tenant.membership` by faking tenant user sessions
- hiding central actions behind generic tenant-user audit entries

---

## Design Principles

1. Tenant isolation remains the default. Every cross-tenant operation must be explicit, permissioned, and auditable.
2. Central operator permissions must be separate from ordinary tenant permissions.
3. Reuse existing tenant services and business rules instead of creating a second copy of tenant logic for central.
4. Tenant-visible auditing is mandatory for write operations.
5. Read-only inspection should ship before write-capable controls.
6. Security-sensitive surfaces such as tenant RBAC, identity, and payments should not be in the first rollout.

---

## Proposed Permission Model

Introduce explicit platform-operator permissions for cross-tenant work:

- `tenants.operate`
- `tenants.themes.view`
- `tenants.themes.manage`
- `tenants.pages.view`
- `tenants.pages.manage`
- `tenants.activity.view`
- `tenants.users.view`
- `tenants.users.manage`
- `tenants.roles.view`
- `tenants.roles.manage`

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

### 16.2 Theme Operations From Central

Add central-managed tenant theme actions for:

1. Activate tenant theme.
2. Open tenant theme customization data.
3. Save tenant theme customization.

This is the safest first write-capable slice because it is operationally valuable and less sensitive than identity or billing.

### 16.3 Tenant Page Operations From Central

Add central-managed page CRUD and publish controls for a tenant.

This is a natural follow-up once theme operations are proven.

### 16.4 Tenant User And Role Operations

Only after the operator model is stable should central gain cross-tenant user and role management. This slice needs stricter policy review because it intersects with `permission.team`, tenant memberships, and auth guarantees.

---

## Audit Requirements

Every write operation initiated from central against a tenant should create tenant-visible activity entries with actor attribution.

Expected wording pattern:

- `Central admin Jane Doe activated theme "Studio"`
- `Central superadmin John Smith updated page "Homepage"`

Recommended complementary central audit entry:

- `Jane Doe activated tenant theme "Studio" for tenant tenant-one`

The tenant-facing log should make it obvious that the actor came from central, not from the tenant's own team.

---

## Technical Notes

Relevant current constraints and foundations already in the repo:

1. Tenant access is guarded by `tenant.membership` and permission team scoping.
2. Tenant activity logs already carry tenant scoping through `TenantActivity`.
3. Central routes already exist under `/api/superadmin`, which is the correct place for operator endpoints.
4. Tenant services for themes, pages, and related resources already exist and should be reused.

Implementation should prefer a dedicated operator layer, for example:

- `CentralTenantThemeController`
- `CentralTenantPageController`
- `CentralTenantActivityController`

Each controller should:

1. authorize the central actor,
2. resolve the target tenant,
3. initialize tenant context safely,
4. call the existing service layer,
5. write tenant-facing and central-facing audit entries,
6. end tenant context cleanly.

---

## Non-Goals For The First Slice

The first implementation of this phase should not include:

1. tenant impersonation,
2. payment-provider mutation from central,
3. tenant password resets or direct auth bypass,
4. hidden or silent tenant mutations without activity log visibility.

---

## Suggested Acceptance Criteria

1. A central admin with the right operator permission can inspect tenant themes and pages from central.
2. A central admin with the right operator permission can activate a tenant theme from central.
3. The tenant activity log shows that the action was performed by a named central actor.
4. Unauthorized central roles cannot access cross-tenant operator endpoints.
5. No tenant-domain API needs to trust central-origin browser calls directly.
6. Existing tenant-isolation tests continue to pass.
