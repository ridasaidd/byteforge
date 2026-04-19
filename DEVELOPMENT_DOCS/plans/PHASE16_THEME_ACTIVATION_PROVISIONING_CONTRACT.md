# Phase 16 Follow-Up: Theme Activation Provisioning Contract

Last updated: April 19, 2026
Status: Draft for future implementation
Depends on: Phase 16.2 central theme activation

---

## Purpose

Define a future-safe, idempotent contract for activating a theme and provisioning starter tenant content from that theme's templates.

This document does not propose immediate implementation. It exists so that when this feature is built later, the behavior is explicit and repeatable instead of being hidden inside ad hoc activation logic.

---

## Why This Needs A Separate Contract

Plain theme activation and starter content provisioning are different operations.

- Activation changes the tenant's active theme.
- Provisioning creates or aligns tenant-owned resources such as pages and navigation.

Bundling those two behaviors without a contract makes retries dangerous. A failed or repeated request could otherwise create duplicate pages, duplicate navigation links, or unexpected overwrites.

The correct model is:

1. Theme activation stays available as a standalone operation.
2. Provisioning is explicit.
3. The combined operation is idempotent.

---

## Scope

This future operation should support:

1. Activating a selected theme for a tenant.
2. Provisioning starter pages from known page templates.
3. Provisioning a starter navigation structure from those pages.
4. Reporting exactly what changed, what already existed, and what was skipped.

This operation should not initially support:

1. Destructive replacement of tenant-authored pages.
2. Silent deletion of existing pages or menu items.
3. Bulk content merging beyond the starter templates.
4. Custom theme editing as part of the same request.

---

## Recommended Endpoint Shape

Use a dedicated central operator endpoint instead of overloading the plain activation route.

Recommended request:

`POST /api/superadmin/tenants/{tenant}/themes/activate-with-provisioning`

Recommended payload:

```json
{
  "slug": "studio",
  "provision": {
    "pages": true,
    "navigation": true,
    "only_templates": ["home", "about", "contact"],
    "mode": "preserve-existing"
  }
}
```

Recommended defaults:

- `pages`: `true`
- `navigation`: `true`
- `only_templates`: omitted means all starter templates marked as provisionable
- `mode`: `preserve-existing`

---

## Idempotency Rules

This operation must be safe to retry.

The same request run twice should produce the same tenant state after the first successful run.

Required rules:

1. If the requested theme is already active, do not fail for that reason.
2. If a starter page already exists for a template, do not create a second copy.
3. If a navigation item already targets the provisioned page in the intended slot, do not create a duplicate.
4. If some starter resources exist and some do not, create only the missing ones.
5. If provisioning partially succeeded earlier, a retry should converge the tenant to the intended final state.

---

## Resource Matching Strategy

Idempotency depends on stable matching keys.

Recommended matching strategy for pages:

1. Each provisionable page template should expose a stable template key such as `home`, `about`, or `contact`.
2. Provisioned tenant pages should store the originating template key in metadata.
3. On retry, page existence should be checked by that template key first, not only by title or slug.
4. Slug may be used as a fallback signal, but not as the only authoritative match.

Recommended matching strategy for navigation:

1. Navigation items should be matched by a stable navigation key plus page target.
2. If the intended menu item already exists and points to the expected page, treat it as already provisioned.
3. Do not create duplicate menu items solely because the label text changed.

---

## Provisioning Modes

The first implementation should support one conservative mode.

Recommended initial mode:

- `preserve-existing`: create missing starter resources, but never overwrite or delete existing tenant-owned content.

Possible future modes, not for first implementation:

- `sync-safe`: update system-managed starter resources only when they are still unmodified by the tenant.
- `replace-system-managed`: replace previously provisioned starter resources that are still flagged as system-managed.

---

## Expected Response Shape

The response should make it easy for the UI to show what happened.

Recommended response:

```json
{
  "data": {
    "theme": {
      "slug": "studio",
      "name": "Studio",
      "is_active": true
    },
    "provisioning": {
      "pages": {
        "created": ["home", "about", "contact"],
        "existing": [],
        "skipped": []
      },
      "navigation": {
        "created": ["main.home", "main.about", "main.contact"],
        "existing": [],
        "skipped": []
      }
    }
  },
  "message": "Tenant theme activated and starter content provisioned successfully"
}
```

If the operation succeeds with a mixed result, the endpoint should still return success and describe which items already existed.

---

## Failure Behavior

The first implementation should prefer transactional safety where practical.

Recommended behavior:

1. Validation failures return `422`.
2. Unknown theme slug returns `404`.
3. Unauthorized operator returns `403`.
4. If page provisioning fails before any write is committed, roll back.
5. If implementation constraints require partial completion, the response must report partial status clearly and write an audit entry describing the incomplete step.

Preferred direction: keep theme activation and starter provisioning in one transaction whenever the underlying services allow it.

---

## Audit Requirements

This operation is write-capable and must be visible to both central and tenant observers.

Tenant-facing audit example:

- `Central admin Jane Doe activated theme "Studio" and provisioned starter pages for tenant-one`

Central-facing audit example:

- `Jane Doe activated theme "Studio" and provisioned starter content for tenant tenant-one`

The audit payload should include:

1. tenant ID,
2. actor ID and role context,
3. theme slug,
4. created page template keys,
5. created navigation keys,
6. existing or skipped resource keys.

---

## UI Expectations

When this is eventually exposed in the central UI, the interaction should be explicit.

Recommended UX:

1. Keep plain "Activate" available for theme-only changes.
2. Add a separate action such as "Activate and provision starter content".
3. Show a confirmation dialog that explains existing tenant pages will be preserved.
4. Show a result summary listing created and already-existing starter resources.

This keeps operators from triggering provisioning by accident.

---

## Suggested Acceptance Criteria

1. Re-running the same request does not create duplicate starter pages.
2. Re-running the same request does not create duplicate navigation items.
3. Existing tenant-authored pages are preserved in `preserve-existing` mode.
4. The response identifies which starter resources were created versus already present.
5. Tenant and central activity logs both record the action clearly.
6. Plain theme activation remains available as a separate operation.

---

## Open Questions For Later

1. Should starter page template eligibility be inferred from template metadata or configured per theme?
2. Should navigation provisioning target a single canonical menu or allow named menu targets?
3. Should provisioned pages be marked as `system-managed` for future safe sync modes?
4. Do we want tenant-side self-service access to the same operation later, or central only?
5. Should provisioning support locale-aware starter page sets in multilingual tenants?
