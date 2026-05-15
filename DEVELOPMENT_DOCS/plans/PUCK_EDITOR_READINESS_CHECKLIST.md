# Puck Editor Readiness Checklist

Last updated: May 15, 2026
Status: Baseline shipped; remaining items are follow-up backlog
Recommended branch: create a new focused follow-up branch only when editor work is needed again

---

## Goal

Make the shared visual editor stable enough for production page building, then grow the block surface on top of reusable primitives so future blocks are easier to add and maintain.

Current state note:

- The first shared-block expansion baseline is now in place and green.
- Additional Puck block work is explicitly deferred until product needs justify reopening this checklist.

Hard rule for this phase:

- Every new shared block must use unified shared control groups (no one-off control wrappers)
- Every new shared block must expose responsive behavior through shared responsive controls by default

---

## Current Baseline

Already validated in this branch:

- [x] Upgraded `@puckeditor/core` from `0.21.1` to `0.21.2`
- [x] Fixed storefront CSS generation for shared form blocks
- [x] Fixed typography theme-token resolution for `Text`, `Heading`, and `Link`
- [x] Added broad shared-surface smoke coverage in `resources/js/shared/puck/__tests__/PuckSurfaceAudit.test.tsx`
- [x] Verified the shared Puck Vitest slice passes (`61` files, `981` tests)
- [x] Implemented tenant storefront form-email backend route at `POST /api/form-submit/email`
- [x] Added focused tenant feature coverage for public form email submission

Current shared block inventory:

- Layout: `Box`
- Content: `Heading`, `Text`, `Divider`, `Logo`, `Gallery`, `RichText`, `Button`, `Image`, `Card`, `Link`
- Media: `Icon`
- Navigation: `NavigationMenu`
- Forms: `Form`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `SubmitButton`
- Add-on specific: `BookingWidget`, `PaymentWidget`

Known architectural note:

- `BookingWidget` is still a special-case surface for product logic and copy density, but its generic visual-control wrappers now reuse the shared field-helper layer instead of maintaining a private control surface.
- `Card` exists in the current shared inventory, but it is not a priority standalone surface; treat it as a deferred composite pattern built from `Box`, `Icon`, `Heading`, and `Text` unless later evidence justifies a dedicated block.

---

## P0: Stabilize What Exists

- [x] Add a Playwright editor-to-storefront smoke flow for at least one content page
- [x] Add a Playwright smoke flow for a public form submission from storefront to successful backend response
- [x] Remove noisy test warnings in the shared Puck suite
- [x] Fix `SubmitButton` tests that currently mount `FormProvider` without a valid `onSubmit`
- [x] Fix `FormBlockIntegration.test.tsx` `act(...)` warning
- [x] Remove `PagesSelector` network-error stderr from test runs by mocking or isolating it consistently
- [x] Audit all components currently warning that they should use `createConditionalResolver`

Rationale:

The shared surface is green, but the suite still has warning noise. That is a readiness problem because it hides real regressions.

---

## P0: Harden Form Submission

- [x] Backend endpoint exists for `POST /api/form-submit/email`
- [x] Add frontend Vitest coverage for `Form.tsx` email-submit success state
- [x] Add frontend Vitest coverage for `Form.tsx` email-submit error state
- [x] Add visible success/error messaging in the rendered form block if it is not already clear enough in storefront UX
- [x] Add honeypot anti-spam hardening for public form submissions
- [ ] Review whether stronger anti-spam controls are needed beyond honeypot
- [ ] Decide whether anti-spam starts with honeypot only or honeypot plus CAPTCHA for high-risk tenants
- [ ] Decide whether recipient allow-listing is needed beyond per-block configuration
- [ ] Verify queue-worker dependency is documented for staged and production form-email delivery

Recommended first hardening step:

- [x] Honeypot field
- stricter rate-limit review
- focused Playwright smoke path

---

## P1: Introduce Shared Interaction Primitives

- [x] Create a reusable link or interaction field group instead of duplicating link behavior per block
- [x] Support internal page targets and external URLs from one shared pattern
- [x] Support `openInNewTab`, `rel`, and safe external-link defaults in the shared interaction layer
- [x] Reuse the shared interaction layer in `Button` and `Link`
- [x] Add clickability to `Image`
- [x] Add clickability to `Box`
- [x] Defer `Card` interaction work for now and treat it as a composite block built from `Box`, `Image`, `Text`, and related blocks
- [x] Add focused storefront and editor tests for clickable non-text blocks

Recommendation:

Do not implement clickable `Image` and clickable `Box` as one-off props. Build one shared interaction primitive first, then apply it to `Button`, `Link`, `Image`, `Box`, and later composite patterns such as `Logo`, `Gallery`, and CTA-style sections.

---

## P1: Fill Shared Block Gaps

Gate before shipping the next shared blocks:

- [x] Run a repo-wide shared-control adoption audit across the current Puck surface
- [x] Migrate remaining ad hoc styling controls onto canonical shared responsive controls and field groups
- [ ] Re-run focused editor/storefront tests for every block touched by the audit

Initial audit findings from the current shared surface:

- Core shared blocks already on the canonical field-group path: `Box`, `Heading`, `Text`, `RichText`, `Button`, `Link`, `Image`, `Icon`
- `Form` was migrated onto canonical shared layout, flex-gap, spacing, background, border, radius, and shadow controls during this audit pass
- `NavigationMenu` responsive color, width, and position-offset adapters were migrated onto shared field helpers during this audit pass; the remaining navigation-specific code is menu behavior, not duplicated shared control wiring
- `BookingWidget` generic color, radius, spacing, font-size, font-weight, and shadow wrappers were migrated onto shared field helpers during this audit pass; the remaining booking-specific code is domain logic, copy, and workflow options rather than duplicated shared control wiring
- There are no remaining meaningful generic control-wrapper exceptions on the shared block surface
- `Card` is intentionally deferred from the audit follow-up because it is better treated as a composite pattern than as a required standalone shared block
- `BookingWidget` remains intentionally special-case and should be treated as a separate follow-up from the main shared-surface control audit

High-value next blocks:

- [x] `Logo` block
- [x] `Gallery` block
- [x] `Table` block
- [x] `Divider` block
- [ ] `Video` or `Embed` block
- [x] `Accordion` or `FAQ` block

Second-wave blocks:

- [ ] `ImageSlider` or `Carousel` block
- [ ] `Testimonials` block
- [ ] `Stats` or `Counters` block
- [ ] `CTA Banner` block
- [ ] `List` or `FeatureGrid` block
- [ ] `Map` block

Recommendation:

`Logo`, `Gallery`, `Divider`, `Table`, and `Accordion` are now shipped on unified responsive controls; keep `ImageSlider` and `Video` blocks after this baseline because they add motion and interaction complexity.

---

## P1: Control Quality Audit Follow-Up

- [ ] Re-audit older findings in `PUCK_CONTROLS_AUDIT.md` and mark resolved items explicitly
- [ ] Recheck `WidthControl` behavior around `fr` values
- [ ] Recheck `FontWeightControl` input-range validation
- [ ] Recheck `TransformControl` input validation
- [ ] Recheck `ResponsiveVisibilityControl` naming and editor/storefront parity
- [ ] Add or refresh focused tests for each still-open control issue

---

## P2: Make New Blocks Cheap To Add

- [ ] Extract shared field groups for interaction, media source, content spacing, and repeated typography patterns
- [ ] Add a documented block scaffold recipe with required tests
- [ ] Define a minimum test contract for every new shared block
- [ ] Keep editor CSS generation and storefront aggregation paths paired in the same checklist item whenever a block adds style controls
- [ ] Decide whether every new block must be added to the shared surface audit before merge

Minimum recommended contract for new shared blocks:

- config registration test
- editor render smoke test
- storefront CSS coverage if it emits styles
- one behavior test for the block's distinctive feature
- explicit check that shared unified controls are used and responsive CSS is generated

---

## Recommended Execution Order

- [x] 1. Add Playwright smoke for page publish and storefront render
- [ ] 2. Add Playwright and Vitest coverage for form email success and failure
- [x] 3. Clean up shared-suite warning noise
- [x] 4. Introduce shared interaction fields and refactor `Button` and `Link` onto them
- [x] 5. Add clickable `Image`, then clickable `Box`, then optionally clickable `Card`
- [x] 6. Finish the remaining one-off control migrations surfaced by the audit
- [x] 7. Ship `Logo`, `Gallery`, and `Divider`
- [x] 8. Ship `Table` and `Accordion`
- [ ] 9. Reassess whether `ImageSlider` or `Video` belongs in the next batch or needs a dedicated plan

---

## Exit Criteria

The shared editor can be considered ready for the next expansion phase when these are true:

- [x] Shared Vitest suite stays green without persistent warning noise
- [x] One Playwright path proves editor save to storefront render
- [x] One Playwright path proves storefront form submission to backend success
- [x] Shared interaction primitive is in place and reused by multiple blocks
- [x] `Image` and `Box` are clickable through the shared interaction path
- [x] First missing-block batch ships with tests and storefront parity
