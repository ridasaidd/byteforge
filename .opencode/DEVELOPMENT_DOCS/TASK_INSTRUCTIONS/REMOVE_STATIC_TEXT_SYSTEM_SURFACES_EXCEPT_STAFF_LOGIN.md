# Remove Static Text From System Surfaces (Except Staff Login)

Status: ready-to-run
Audience: human + AI agent
Last updated: 2026-05-28

## Objective

Remove default static marketing and helper text from guest-facing system surfaces so they start from a clean shell, while keeping staff login behavior and copy unchanged.

Do not change the staff login system surface. In this codebase, that surface key is tenant_login.

## Why This Matters

The system surface editor now supports shell slots and editable content. Keeping large hardcoded default copy on guest-facing system surfaces causes confusing prefilled text and can look like stale product messaging.

## In Scope

- Remove static defaults for these system surfaces:
  - register
  - forgot_password
  - reset_password
  - guest_portal
- Keep tenant_login defaults unchanged.
- Ensure per-surface default selection still works.
- Ensure stale surfaceKey data cannot override the active surface.

## Out Of Scope

- Do not redesign layout, spacing, or style controls.
- Do not remove route-owned fixed form behavior.
- Do not change auth logic.
- Do not change tenant_login defaults.

## Files To Edit

1. resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.tsx
2. resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx

## Preconditions

1. Work on a feature branch.
2. Confirm tests are green before changes:

```bash
npm run test:run -- resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx resources/js/apps/tenant/components/pages/__tests__/SystemSurfaceEditorPage.test.tsx
```

## Step-By-Step Changes

### Step 1: Remove static text defaults for non-staff surfaces

Open:
- resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.tsx

Find the surfaceDefaults object.

Keep tenant_login as-is.

For register, forgot_password, reset_password, and guest_portal, remove static text properties such as:
- eyebrow
- title
- description
- panelTitle
- panelDescription
- supportText

You may keep structural defaults that are not user-facing copy, for example:
- showLogo
- backgroundStyle
- contentAlignment

Result expectation:
- These surfaces should no longer prefill static copy on first load.
- Staff login still has its existing default copy.

### Step 2: Ensure surface-specific defaults are applied by surface key

In the same file, ensure getSystemSurfaceConfig(surfaceKey) applies defaultProps per requested surface key, not from a single static base that always contains tenant_login text.

Recommended pattern:
- Keep base root defaultProps surface-agnostic.
- Apply surfaceDefaults[surfaceKey] + surfaceKey during getSystemSurfaceConfig return.

If not already present, add a helper similar to:
- applySurfaceRootDefaults(config, surfaceKey)

Use it in both branches:
- tenant_login branch
- guest-facing branch

### Step 3: Force active surfaceKey during data build

In buildSystemSurfaceData(surfaceKey, puckData), ensure the active surfaceKey wins even if stored data has stale root.props.surfaceKey.

Recommended merge order:
1. surface defaults
2. stored root props
3. surfaceKey from function argument

That prevents cross-surface default leakage and wrong panel selection.

## Test Updates

Open:
- resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx

Add or update tests for these behaviors:

1. Requested surfaceKey wins over stale stored surfaceKey.
2. guest_portal root defaults do not inherit tenant_login copy.
3. tenant_login still has locked root-shell behavior.

Example assertions to include:
- getSystemSurfaceConfig('guest_portal').root.defaultProps.surfaceKey is guest_portal
- guest_portal defaultProps title is undefined (or empty, depending on policy)
- guest_portal defaultProps supportText is undefined (or empty)
- buildSystemSurfaceData('guest_portal', root.props.surfaceKey='tenant_login') returns guest_portal

## Verification Commands

Run focused tests:

```bash
npm run test:run -- resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx resources/js/apps/tenant/components/pages/__tests__/SystemSurfaceEditorPage.test.tsx
```

Optional broader check:

```bash
npm run test:run -- resources/js/apps/public/components/__tests__/GuestPortalPage.test.tsx
```

## Manual UI Verification

1. Open tenant system pages editor.
2. Open register surface.
3. Confirm no hardcoded title/description/support copy appears by default.
4. Repeat for forgot_password and reset_password.
5. Open guest_portal.
6. Confirm no tenant login text appears.
7. Open tenant_login.
8. Confirm tenant login default copy still appears and route-owned login panel still works.

## Expected Outcome

- Guest-facing surfaces start clean without static product copy.
- Staff login remains unchanged.
- No cross-surface text leakage.
- Tests cover the regression.

## Rollback Plan

If behavior regresses:
1. Revert only SystemSurfaceConfig.tsx and SystemSurfaceConfig.test.tsx.
2. Re-run focused tests.
3. Re-apply changes incrementally in this order:
   - surfaceKey enforcement in buildSystemSurfaceData
   - per-surface root default application
   - static text removal from non-staff defaults

## Notes For Less-Experienced Contributors

- Do not remove the LockedSurfacePanel switch cases.
- Do not remove tenant_login text defaults.
- Do not change API or route files for this task.
- Keep this task isolated to the system surface config and tests unless a failing test requires a small related fix.
