# Remove Legacy Text Controls And Add Panel Slot (System Surfaces)

Status: ready-to-run
Audience: human + AI agent
Last updated: 2026-05-28

## Objective

Move guest-facing system surface shell authoring from root text controls to block slots.

Specifically:
- remove legacy root text controls (for guest-facing surfaces) such as show logo, eyebrow, main title, description, and support text
- keep staff login route behavior intact
- add a dedicated panel slot for guest-facing surfaces where panel description-style content can be authored using blocks

## Why This Change

The editor now supports drag-and-drop blocks. Keeping root text controls creates two competing authoring paths and stale UX.

Panel content should be authored in-slot instead of through static panelDescription text.

## Scope

In scope:
- guest-facing system surfaces: register, forgot_password, reset_password, guest_portal
- system-surface config, renderer behavior, and tests

Out of scope:
- tenant_login auth behavior and locked form behavior
- API contracts and backend routes
- redesign of public page builder component library

## Files To Edit

1. resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.tsx
2. resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx
3. resources/js/apps/tenant/components/pages/__tests__/SystemSurfaceEditorPage.test.tsx (only if needed for changed config assumptions)

## Implementation Plan

### Step 0: Confirm target surfaces (all except tenant_login)

In this repo, the target non-staff system surfaces are:
- register
- forgot_password
- reset_password
- guest_portal

Do not apply panel-slot behavior changes to tenant_login.

### Step 1: Introduce explicit slot model in root props

In SystemSurfaceConfig.tsx:
- Add root prop names for slot targeting, for example:
  - shellSlotTarget with values hero or panel
  - panelSlotEnabled boolean (default true for guest-facing)

Purpose:
- route children (Puck content blocks) into hero slot or panel slot intentionally
- avoid guessing from component shape

Recommended defaults:
- guest-facing surfaces: shellSlotTarget = hero, panelSlotEnabled = true
- tenant_login: keep current behavior and keep panel locked

### Step 2: Remove guest-facing text controls from root fields

In createSystemSurfaceConfig root.fields:
- Remove guest-facing legacy text controls from the editing surface for guest-facing usage:
  - showLogo
  - eyebrow
  - title
  - description
  - supportText
  - panelDescription
  - panelTitle if panel content should be fully slot-authored

Important:
- Do not break tenant_login locked flow.
- If tenant_login still needs these controls, gate field visibility by surfaceKey or split staff vs guest root field maps.

Practical approach:
- Keep base root.fields minimal and structural.
- Build guest-facing config variant with structural controls only.
- Keep staff-login config variant with existing staff controls if required.

### Step 3: Add panel slot rendering

In SystemSurfaceRootRenderer:
- Keep current shell layout with two areas:
  - hero area (left/intro)
  - panel area (right/locked panel container)

Add slot routing logic:
- Render children in hero slot when shellSlotTarget = hero
- Render children in panel slot when shellSlotTarget = panel
- For guest-facing surfaces, support both targets
- For tenant_login, continue rendering locked TenantLoginFormCard in panel regardless of slot target

Recommended rendering behavior:
- hero slot container: existing width-constrained area
- panel slot container: inside panel wrapper where panelDescription content used to conceptually live
- if panel slot is empty, render locked panel (existing behavior)

### Step 3.1: Exact placement map by surface (required)

Use the existing structure in SystemSurfaceConfig.tsx and place slots in these exact regions.

1. register
- keep locked placeholder form semantics
- place panel slot inside the panel card body, before the fixed placeholder fields
- implementation point: extend PlaceholderSurfaceCard to accept panel slot content and render it in CardContent before fields

2. forgot_password
- same as register
- panel slot goes inside the panel card body before fixed placeholder input/action rows

3. reset_password
- same as register
- panel slot goes inside the panel card body before fixed placeholder rows

4. guest_portal
- panel slot belongs inside GuestPortalPreviewCard where the current Widget zone preview block is rendered
- implementation point: replace or wrap the dashed Widget zone preview with slot-rendered children, while preserving locked shell framing

5. hero slot for all guest-facing surfaces
- continue using the left shell section in SystemSurfaceRootRenderer for hero slot content
- hero slot remains in the existing width-constrained container in the left section

6. tenant_login
- no panel slot behavior changes
- keep TenantLoginFormCard route-owned behavior intact

### Step 3.2: Concrete component wiring guidance

Implement slot routing by passing explicit slot children into locked panel components, not by inferring from arbitrary child shape.

Recommended approach:
- in SystemSurfaceRootRenderer, compute:
  - heroSlotContent
  - panelSlotContent
- pass panelSlotContent through LockedSurfacePanel
- update LockedSurfacePanel signature to accept panelSlotContent
- update PlaceholderSurfaceCard and GuestPortalPreviewCard signatures to accept panel slot children where required

This keeps each surface explicit and avoids accidental tenant_login regressions.

### Step 4: Remove remaining static panel text defaults for guest-facing surfaces

In surfaceDefaults for guest-facing surfaces:
- Ensure panelTitle and panelDescription are not prefilled static strings
- Keep only structural defaults that still matter, for example:
  - backgroundStyle
  - contentAlignment
  - shellSlotTarget
  - panelSlotEnabled

Keep tenant_login defaults unchanged.

### Step 5: Ensure surface-specific default application remains correct

Preserve and verify:
- per-surface root default application at getSystemSurfaceConfig(surfaceKey)
- forced surfaceKey in buildSystemSurfaceData to prevent stale data leakage

## Test Plan

Update SystemSurfaceConfig.test.tsx with explicit coverage:

1. Guest-facing config does not expose legacy text controls.
2. Tenant login config still has required locked behavior.
3. Guest-facing defaults do not include panelDescription static strings.
4. Slot target default for guest-facing surfaces is deterministic.
5. Stale stored surfaceKey does not override requested surfaceKey.

Add renderer behavior tests as feasible:
- when shellSlotTarget is panel and guest content exists, content renders in panel slot
- when shellSlotTarget is hero, content renders in hero slot
- tenant_login ignores panel slot content for auth panel integrity
- register/forgot/reset show panel slot content in PlaceholderSurfaceCard before locked placeholder fields
- guest_portal shows panel slot content in the card body where Widget zone preview was previously static

If renderer tests are difficult at this layer, add focused component-level tests around SystemSurfaceRootRenderer behavior.

## Verification Commands

```bash
npm run test:run -- resources/js/shared/puck/system-surfaces/SystemSurfaceConfig.test.tsx resources/js/apps/tenant/components/pages/__tests__/SystemSurfaceEditorPage.test.tsx
```

Optional:

```bash
npm run test:run -- resources/js/apps/public/components/__tests__/GuestPortalPage.test.tsx
```

## Manual QA Checklist

1. Open each guest-facing system surface editor.
2. Confirm legacy text controls are not shown for guest-facing surfaces.
3. Add blocks and switch slot target to panel.
4. Confirm blocks render inside panel area for each non-tenant surface:
  - register: in panel card body before placeholder fields
  - forgot_password: in panel card body before placeholder field
  - reset_password: in panel card body before placeholder fields
  - guest_portal: in guest portal panel body where Widget zone preview area is shown
5. Switch slot target back to hero.
6. Confirm blocks move to hero area.
7. Open tenant_login.
8. Confirm locked login panel still behaves correctly and auth form remains fixed.

## Acceptance Criteria

- Guest-facing surfaces are authored through block slots, not root static text controls.
- A dedicated panel slot exists and is usable.
- tenant_login remains route-owned and functionally unchanged.
- Focused tests pass.

## Rollback

If regressions occur:
1. Revert SystemSurfaceConfig.tsx and related tests.
2. Re-apply in order:
   - slot routing logic
   - control removal/gating
   - guest defaults cleanup
3. Re-run focused tests before manual QA.

## Notes

- Treat tenant_login as special and avoid broad refactors that mix staff and guest surface assumptions.
- Prefer explicit slot-target props over heuristics for predictable behavior.
