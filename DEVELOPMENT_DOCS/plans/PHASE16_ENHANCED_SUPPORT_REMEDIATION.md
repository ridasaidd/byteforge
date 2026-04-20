# Phase 16 Follow-Up: Enhanced Support Remediation

Last updated: April 20, 2026
Status: Deferred until post-launch or until real support demand justifies it
Depends on: Phase 16 inspection, limited theme activation, and temporary read-only support access

---

## Goal

Define a later follow-up for support workflows that need to do more than inspect.

The current Phase 16 support-access slice is intentionally bounded and read-only.
That is sufficient for diagnosis, verification, and guided tenant assistance, but
it is not the right long-term answer if platform staff repeatedly need to fix
tenant-owned content or configuration directly.

This follow-up exists so the current branch can land without over-expanding
pre-launch support scope.

---

## Current Decision

Do not expand support access further before launch.

Keep the shipped support model as:

1. named central user,
2. explicit temporary tenant membership,
3. audited access lifecycle,
4. automatic expiry and revocation,
5. restricted read-only tenant role.

The launch-critical value is already present: platform staff can inspect tenant
state without asking for tenant credentials or relying on hidden impersonation.

---

## Why This Is Deferred

Enhanced support is important, but not yet proven urgent enough to justify the
additional product and security surface before launch.

Reasons to defer now:

1. the current app has not launched yet, so real support frequency and shape are still unknown,
2. widening support permissions too early risks creating a de facto cross-tenant admin path,
3. identity, roles, settings, and payment flows remain the highest-risk surfaces,
4. pre-launch time is better spent on launch-critical reliability, auth hardening, and core product polish.

---

## Triggers To Revisit

This phase should be reopened only if one or more of these become common in real operation:

1. support repeatedly needs to edit pages or navigation to resolve incidents,
2. support repeatedly needs to fix theme configuration directly on tenant hosts,
3. tenants routinely depend on platform staff to complete onboarding or recovery tasks,
4. incident response is slowed down because read-only access is insufficient,
5. engineering starts using ad hoc CLI or database interventions as a regular support pattern.

---

## Recommended Direction

If this phase is reopened later, prefer a second elevated temporary support mode,
not tenant-local throwaway support accounts and not a broad hidden impersonation model.

Recommended shape:

1. keep `platform_support` as diagnostic read-only support,
2. add a second fixed role such as `platform_support_manager` for tightly scoped remediation,
3. revisit whether central `admin` users should become valid support grantees, or keep support grants limited to dedicated support operators,
4. let central grant creation choose a support profile explicitly,
5. keep a shorter TTL for elevated remediation than for read-only support,
6. keep all grant, use, revoke, and expiry events tenant-visible and centrally auditable.

---

## Suggested Permission Boundary

If elevated support is added later, start with tenant content remediation only.

Likely permissions to allow:

1. `pages.create`
2. `pages.edit`
3. `navigation.create`
4. `navigation.edit`
5. `themes.manage`
6. `themes.activate`
7. `media.manage`
8. `layouts.manage`
9. `templates.manage`
10. `bookings.manage` only if the support workload proves it is necessary

Likely permissions to continue excluding:

1. `users.manage`
2. `roles.manage`
3. `settings.manage`
4. `payments.manage`
5. `payments.refund`
6. password reset or auth-bypass flows
7. hidden impersonation or tenant-local shared support credentials

---

## Operational Alternative

If CLI support becomes necessary later, prefer custom audited commands for
support grants rather than commands that create tenant-local support users.

Safer future examples:

1. `php artisan support-access:grant {tenant} {central-user}`
2. `php artisan support-access:revoke {tenant} {central-user}`
3. `php artisan support-access:report --active`

Avoid as the default model:

1. tenant-local shared support passwords,
2. throwaway tenant-only support users,
3. manual database edits for normal support work.

---

## Acceptance Criteria For Reopening

If this phase is implemented later, it should include at minimum:

1. explicit elevated support profile selection in central,
2. stricter duration limits for elevated support than read-only support,
3. clearer tenant-owner notifications for elevated grants,
4. tenant-visible audit entries for both grant and first use,
5. focused tests proving elevated support can remediate content but cannot manage identity or payments.
