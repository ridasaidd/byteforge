# Booking Widget Plan File

## Status: In Progress
## Branch: `feature/booking-widget-customization`

## Purpose

This file is the working plan for the booking widget refactor.

- It is maintained primarily as an implementation aid during development.
- It externalizes architectural and sequencing decisions so progress does not depend on chat history.
- It should be updated when the implementation meaningfully diverges from the current plan.
- It is allowed to contain completed steps, current state, next actions, validation results, and deferred decisions in one place.

## How To Use This File

1. Read the decision summary before starting a new implementation session.
2. Check the execution ledger to see the current step and status.
3. Implement the next incomplete step only after validating the current state.
4. Update this file whenever architecture, sequencing, or validation changes.

---

## Current State Snapshot

- Payment support is implemented in the storefront widget for Stripe, Swish, and Klarna.
- The booking feature has been split into feature-local modules, and reducer ownership now lives behind `BookingContext`.
- The Puck-facing widget is still a single block, but the render layer is now separated from the Puck config and the step UI is extracted into context-consuming modules.
- A first slot-backed booking section pass now exists: the widget can switch to a sections layout mode, booking section blocks are registered in Puck, and legacy rendering remains as the storefront fallback.
- The section model is now tighter in the editor: booking section blocks render a guard card when placed outside the widget slot, and the widget hides the `sections` slot field unless `layoutMode="sections"` is active.
- The legacy/widget path now has editor controls wired to the `--bw-*` variable contract, and the editor renders a live preview instead of a dead placeholder.
- The parent widget now owns a lightweight step shell above the active content so guests can review and safely backtrack across pre-payment steps without making the child booking sections behave like standalone blocks.
- The slot-backed editor path now forwards `puck.dragRef` through the booking widget root and booking section blocks, and the section inventory is narrowed to authorable pre-payment structure while runtime-only states stay parent-managed.
- Persisted section order is now surfaced more honestly in the editor: if authors save an unsupported step sequence, the widget shows a runtime-flow notice instead of implying that storefront progression will follow the custom order.
- The current storefront flow resolver now treats the widget as slot-only: saved `range_checkout` sections and preselected `range` services are rejected with a clear editor/runtime error, while storefront runtime falls back to the safe slot flow.
- Reducer transitions and pre-payment back-navigation now also consume the same resolved flow contract, so the wizard no longer maintains a separate hardcoded step order for normal advancement/backtracking.
- The slot-booking runtime no longer models `range_checkout` as an executable storefront step. Legacy range section blocks remain registered only so older saved content can be detected and rejected safely.
- Focused runtime journey coverage now exists for the slot flow in Vitest, and recovery jumps that return guests to an earlier pre-payment step preserve their error message instead of clearing it during `GO_STEP`.
- The remaining runtime gap is now mainly storefront/browser coverage for real appointment journeys and any later extraction of a separate stay-oriented engine rather than extending this widget back toward mixed runtime behavior.
- The next product-facing decision is no longer just visual customization; it is whether storefront booking flow should become section-driven through a validated set of supported permutations.
- The current architectural leaning is that the platform should likely expose separate storefront booking experiences for appointment-like slot bookings versus stay-like range bookings, even when both live on the same tenant site.
- That storefront split does not automatically imply two unrelated booking systems underneath; the stronger default is one shared booking domain with mode-specific availability/detail models and UI families layered on top.
- The latest architecture conclusion is that the current widget should be treated primarily as the slot-booking foundation for appointment-style businesses, not as a one-size-fits-all booking product.
- The extensibility point should live in backend booking-type drivers or engines rather than in a universal storefront widget that tries to represent every booking shape equally.
- Payment should be treated as a shared backend-owned subsystem that operates on validated holds or bookings; it should not care whether the purchase originated from a slot booking, a stay booking, or a future sellable item type.
- Remaining control work is refinement: deciding how much of the control surface should stay on the container vs. future child blocks. Focused Vitest coverage is in place, and the tenant editor now also has Playwright coverage for multi-section booking composition, in-editor section insertion, and persisted section reordering.

## Immediate Next Step

Capture the next product architecture pass for divergent booking experiences so a future implementation session can decide where the frontend and backend should split for `slot` versus `range_checkout` without re-litigating the late-session discussion.

Definition of done:

- The document clearly distinguishes storefront experience shape from backend persistence shape.
- The document records the current recommendation: two storefront widget/page families may be appropriate, while payment, customer, hold, and booking lifecycle should remain part of one shared booking domain unless proven otherwise.
- The document identifies the likely backend boundary: shared `bookings` backbone plus mode-specific detail/availability tables rather than two unrelated booking systems.
- The document identifies the next implementation spike needed before more widget work: decide shared versus mode-specific fields, sections, and query flows.
- The document records the stronger narrowing decision for the near term: the current implementation should be treated as the appointment or slot-booking track unless and until a separate stay engine is intentionally designed.
- The document records the payment boundary clearly: frontend initiates payment from a backend-validated hold or booking, but the backend owns amount, availability, confirmation, and final booking state.

Draft status (2026-04-15): the section-driven runtime resolver is now in place. The next design question is whether the current mixed-mode widget should remain one authoring surface or split into explicit appointment/stay storefront families above the shared booking core.

## Next Recommended Steps

1. Narrow the current booking product deliberately: treat the existing widget and flow work as the appointment or slot-booking foundation rather than continuing to generalize it toward every booking type.
2. Define the backend abstraction for future extensibility as shared booking lifecycle plus booking-type drivers or engines, for example `slot`, `range`, and any later capacity-based mode.
3. Extract the payment decision fully into a shared backend-owned payment flow that starts from a validated hold or booking and does not depend on whether the source item is a service, stay, or future product type.
4. Add browser/storefront regression coverage for the appointment flow first, and only design a separate stay flow once the slot-booking system boundary is intentionally stable.

## Draft Product Direction: Two Storefront Families, One Booking Core (2026-04-15)

This section records the late-session architecture discussion so the next implementation pass can start from a documented default instead of reconstructing the reasoning from chat history.

### Core Conclusion

- The current recommendation is not "one universal widget must elegantly handle every booking shape."
- The current recommendation is also not "build two completely unrelated booking products."
- The stronger middle ground is: one booking domain, two storefront experience families.

In practice, that means a tenant site may reasonably have:

- one appointment booking page/widget for slot-based services performed by a person or constrained schedule
- one stay booking page/widget for room, lodging, or other range/check-in/check-out inventory

Those can coexist on the same site without forcing guests through the same mental model.

### Frontend Product Shape

- Appointment flows and stay flows likely deserve different widget/page experiences because the guest decision model is different.
- Appointment flows are time-first or schedule-first and usually revolve around a concrete slot.
- Stay flows are range-first and usually revolve around check-in/check-out availability, nights, occupancy, and later lodging-specific rules.
- The platform should not force a property stay flow to feel like a service scheduler, and should not force a massage/class booking to feel like hotel inventory.

Current implication for future implementation:

- keep the shared booking infrastructure underneath
- allow separate storefront widgets or at least separate top-level templates for `slot` and `range_checkout`
- treat "mixed-mode on one site" as "multiple booking experiences on one tenant" rather than "one guest widget must represent every booking mode at once"

### Backend Domain Shape

- Separate frontend experiences do not require two unrelated booking systems.
- The preferred default is a shared booking backbone for lifecycle data, with mode-specific detail and availability models.

Recommended direction:

- shared `bookings` aggregate/table for tenant, customer, service, resource, status, payment state, totals, notes, hold token, and shared lifecycle timestamps
- mode-specific detail tables such as `booking_slot_details` and `booking_range_details`
- mode-specific availability/query engines for slot lookup versus range availability

Why this is the current preference:

- payment, customer capture, hold confirmation, booking statuses, notifications, and reporting are still one domain
- slot and range differ mostly in availability logic and selection data, not in the full lifecycle around the booking itself
- this avoids one huge nullable table while also avoiding premature duplication of the whole booking stack

### Abstract Extensibility Model

- The right abstraction point is not a universal guest widget.
- The right abstraction point is a shared booking lifecycle with specialized booking-type engines behind it.

Current preferred shape:

- shared booking core for customer, hold, status, payment state, confirmation, cancellation, and notifications
- `SlotBookingDriver` or equivalent backend engine for appointment-style slot availability
- `RangeBookingDriver` or equivalent backend engine for stay-style interval availability when or if that product is intentionally added later
- separate storefront widgets or page families that match each engine instead of hiding the differences behind one oversized configuration surface

This keeps the system extensible without forcing fundamentally different booking models through the same reducer, step contract, and guest UI.

### Payment Boundary

- Payment should be treated as its own subsystem.
- Payment flow should not need to know whether the thing being purchased is a slot booking, a stay booking, or a future product-like purchase.
- The frontend is only a client for collecting input and continuing a server-owned flow; it is not the source of truth.

Current preferred payment rule set:

- backend validates availability and pricing first
- backend creates the hold or provisional booking first
- payment starts from that server-owned record
- backend owns the payable amount, transaction linkage, confirmation, and final booking state transition
- frontend cannot be trusted to decide booking validity, final price, or completion state

### What This Means For Later Implementation

- If the product keeps growing in both directions, the likely next boundary is not "split the company feature into two unrelated systems" but "split the storefront/editor experience into two specialized families over one shared booking core."
- A future spike should define which config fields, sections, and progress contracts are shared versus mode-specific.
- If that spike confirms strong divergence, the Puck layer may eventually expose separate `AppointmentBookingWidget` and `StayBookingWidget` families that still write into the same booking domain.
- If divergence stays moderate, the same result may be achieved with one underlying component system and two top-level presets/templates.
- Near-term implication: keep the current work focused on the appointment or slot-booking case, and only introduce a stay-oriented sibling flow if that business case is intentionally funded as a separate engine and storefront experience.

## Draft Section-Driven Storefront Flow Contract (2026-04-15)

This draft defines the supported runtime templates for slot-backed booking sections. The important distinction is that the storefront will support a validated set of template permutations, not arbitrary raw child-block ordering.

### Core Runtime Model

- The authorable pre-payment flow is normalized into six phases: `service? -> date -> resource -> selection -> customer -> confirm`.
- `selection` is a runtime branch, not a literal persisted step. It resolves to `slot` or `range_checkout` based on the chosen service's `booking_mode`.
- Parent-managed runtime states remain outside the authorable flow: recoverable error banner, `payment`, `payment_processing`, `success`, and terminal `error`.
- The storefront must never execute the raw saved child order directly. It always resolves and normalizes the saved section inventory into a supported runtime flow first.

### Supported Templates

| Template | Saved authorable sections | Supported service modes | Resolved runtime flow |
|------|----------------------------|-------------------------|------------------------|
| Selectable service, slot-only | `service`, `date`, `resource`, `slot`, `customer`, `confirm` | `slot` only | `service -> date -> resource -> slot -> customer -> confirm` |
| Selectable service, range-only | `service`, `date`, `resource`, `range_checkout`, `customer`, `confirm` | `range` only | `service -> date -> resource -> range_checkout -> customer -> confirm` |
| Selectable service, mixed-mode | `service`, `date`, `resource`, `slot`, `range_checkout`, `customer`, `confirm` | `slot` and `range` | `service -> date -> resource -> (slot \| range_checkout) -> customer -> confirm` |
| Preselected service, slot-only | `date`, `resource`, `slot`, `customer`, `confirm` | preselected service must be `slot` | `date -> resource -> slot -> customer -> confirm` |
| Preselected service, range-only | `date`, `resource`, `range_checkout`, `customer`, `confirm` | preselected service must be `range` | `date -> resource -> range_checkout -> customer -> confirm` |
| Preselected service, mixed-safe | `date`, `resource`, `slot`, `range_checkout`, `customer`, `confirm` | preselected service may be `slot` or `range` | `date -> resource -> (slot \| range_checkout) -> customer -> confirm` |

### Normalization Rules

1. Normalize by phase, not by raw block order.
2. Deduplicate persisted sections by keeping the first occurrence of `service`, `date`, `resource`, `customer`, and `confirm`.
3. Deduplicate `slot` and `range_checkout` independently, then collapse them into the single `selection` phase in the normalized model.
4. Canonical runtime phase order is always `service? -> date -> resource -> selection -> customer -> confirm`, regardless of how the blocks were arranged in the editor.
5. If `serviceId > 0`, any persisted `service` section is ignored during normalization and does not participate in the runtime flow.
6. If `serviceId === 0`, a `service` section is required. Missing it is a structural configuration error.
7. `date`, `resource`, `customer`, and `confirm` are always required. Missing any of them is a structural configuration error.
8. At least one of `slot` or `range_checkout` must exist. Missing both is a structural configuration error.
9. The normalized flow keeps at most one active selection step at runtime. If both `slot` and `range_checkout` are configured, the chosen service decides which branch materializes.
10. When both selection branches are configured but no service has been selected yet, the storefront progress UI should present that phase generically until the booking mode is known, then relabel it to `Time` or `Check-out`.

### Booking-Mode Compatibility Rules

1. The presence of `slot` and `range_checkout` defines the template's supported booking modes.
2. A slot-only template may only progress through `slot` services.
3. A range-only template may only progress through `range` services.
4. A mixed template may progress through either mode and resolves the selection phase after the service is known.
5. If `serviceId > 0`, the configured selection sections must support that preselected service's `booking_mode`; otherwise the configuration is invalid.
6. If `serviceId === 0`, the service list shown in the widget should be filtered to the modes supported by the normalized template. This prevents authors from exposing a service that cannot complete the configured flow.
7. If that compatibility filter produces zero eligible services, the sections configuration is invalid for storefront runtime.

### Supported Normalization vs Rejection

- Benign authoring issues should normalize, not fail. Examples: duplicate sections, `service` present even though `serviceId > 0`, or `slot` and `range_checkout` swapped relative to each other.
- Raw ordering differences should normalize to the canonical dependency order and surface an editor notice explaining the resolved storefront sequence.
- Structural breakage should be rejected, not silently patched. Examples: missing required phases, no compatible selection step for the active service mode, or no compatible services remaining after template-mode filtering.
- Rejected section configurations should not pretend that storefront runtime follows the saved child order. The editor should show a clear error state, and storefront runtime should fall back to the known-safe default section rendering until the section configuration is repaired.

### Implementation Notes For The Next Pass

- The flow resolver should return both a normalized template summary and the concrete runtime flow for the current service mode.
- The reducer, back-navigation buttons, and progress UI must all consume the same resolved flow definition rather than duplicating step assumptions.
- The resolver should also return enough metadata for editor messaging: normalized order, filtered service modes, and rejection reasons.

## Current Refactor Checklist

- [x] Wire `puck.dragRef` through the booking widget root and every booking section block so Puck selection, toolbar placement, and drag/drop anchoring work reliably in the editor
- [x] Restrict slot-backed booking sections to authorable pre-payment structure (`service`, `date`, `resource`, `slot` / `range_checkout`, `customer`, `confirm`) instead of exposing transient runtime states as draggable blocks
- [x] Move runtime-only surfaces (`error banner`, `payment`, `payment_processing`, `success`, `error`) back under parent-managed rendering when `layoutMode="sections"` is active
- [x] Add focused regression coverage for editor anchoring and multi-child slot composition so this class of Puck integration bug is caught earlier
- [x] Warn in the editor when saved section order diverges from the reducer-backed storefront flow
- [x] Define the supported section-driven storefront permutations and normalization rules
- [x] Drive storefront transitions and progress UI from the resolved section flow instead of the current hardcoded order
- [ ] Add storefront/runtime regression coverage for section-driven appointment and lodging flows
  Runtime component coverage is now in place for the slot flow, and a gated Playwright storefront appointment spec has been added; environment-backed browser execution is still pending.

## Audit Update

The current blocker is not the booking reducer or the extracted React modules. The main issue is the Puck integration layer around the new slot-backed sections.

- The booking widget root and booking section blocks currently do not forward `puck.dragRef` to a concrete DOM anchor, unlike the established Puck component pattern elsewhere in the repo.
- The current child-block inventory is too runtime-oriented. Several exposed booking blocks represent reducer-controlled states rather than meaningful editor composition units.
- The next implementation pass should fix the editor contract first, then narrow the section model so it maps to stable authorable structure rather than transient runtime branches.

---

## Problem Statement

The `BookingWidget` is the **only Puck component** that does not participate in the shared visual-control infrastructure. Every other component (Box, Card, Button, Heading, Text, RichText, Image, Link, Form, NavigationMenu) wires through the same pipeline:

```
fieldGroups.tsx → buildLayoutCSS() → <style> injection (editor) / PuckCssAggregator (storefront)
```

The widget instead uses 100% hardcoded inline React styles and exposes only five Puck fields (`title`, `serviceId`, `primaryColor`, `showPrices`, `successMessage`). The single `primaryColor` string does triple duty — header background, button fill, card hover accent, slot border, calendar highlight — leaving tenants no way to individually control their widget's visual identity.

### Consequences

| Gap | Impact |
|-----|--------|
| No field groups | Widget is invisible to the standard Spacing / Background / Effects / Typography controls |
| No `buildLayoutCSS()` | Responsive breakpoints do not apply; every dimension is a magic number |
| No CSS aggregator case | Storefront pre-generated CSS completely skips the widget — inline styles are the only rendering path |
| No `useTheme()` | Widget cannot resolve theme tokens; design-system colors are unreachable |
| Single `primaryColor` | All accent zones are locked to one value; no per-zone color control |

---

## Architecture Decision

### Two Candidate Architectures

**Architecture A — Composite Blocks + Shared React Context**
Decompose the wizard into separate Puck blocks (`BookingServiceList`, `BookingCalendar`, `BookingSlotGrid`, `BookingCustomerForm`, `BookingConfirm`) placed inside a `BookingContainer` slot/DropZone. Blocks communicate via instance-scoped React context owned by the container.

**Architecture B — Single Block + CSS Variables + Field Groups**
Keep the widget as one Puck block but replace all inline styles with CSS custom properties, wire in field groups, and expose per-zone color/typography/shape controls through the existing control infrastructure.

### Decision: Staged Hybrid

Use Architecture B as the styling and control contract, but implement it on top of composite-ready module boundaries now so the widget can graduate to true Puck composite blocks without another rewrite.

**Rationale:**

1. **Wizard ordering is data-dependent, not layout-dependent.** The step sequence (service → date → resource → slot → customer → confirm → success) is driven by API data flow. Each step's `useEffect` depends on the previous step's state. Decomposing into separate blocks still needs a shared orchestration layer, but React context can hold that orchestration per widget instance without introducing application-wide global state.

2. **Customization need is visual, not structural.** Tenants want to change colors, fonts, corner radii, and spacing — not rearrange which step comes first or nest arbitrary blocks inside a step. CSS custom properties handle this perfectly: one declaration per visual property, resolved at render time from Puck field values.

3. **Complexity budget at the editor layer.** Jumping straight to full Puck composite blocks still carries meaningful editor complexity: nested block registration, slot restrictions, data migration, and per-block CSS aggregation. That complexity is justified only after the visual contract and payment flow are stable.

4. **The current codebase already crossed the single-file threshold.** After payment support landed, the widget reached ~1500 lines. The immediate correction is to stop treating a single Puck block as a single implementation file. The code is now being split into feature-local modules so state, payment providers, shared UI, and API helpers can evolve independently.

5. **Migration path is cleaner after module extraction.** The CSS variable layer created in B becomes the styling contract for A. With state, payment, and UI concerns extracted into separate modules, each step can later be promoted into its own Puck block or slot-backed child component without re-deriving the business flow from a monolith.

6. **React context is the best fit for this repo.** The existing form system already uses a provider + reducer + consumer-hook pattern. Booking has the same shape: instance-scoped state, container-owned orchestration, and child blocks that should render against shared state. Context matches both Puck's render tree and this codebase's precedent better than introducing Zustand for a single feature.

### Implementation Update

The implementation has already moved away from a single-file widget. The booking feature is now split into:

- `BookingWidget.tsx` — Puck entrypoint and flow composition (~888 lines)
- `payment.tsx` — Stripe / Swish / Klarna UI and polling (~327 lines)
- `state.ts` — reducer, state, actions (~155 lines)
- `types.ts` — booking and payment types (~57 lines)
- `shared.tsx` — shared step UI primitives (~47 lines)
- `api.ts` — guest booking API helpers (~20 lines)

This is not full Puck composition yet, but it is the correct foundation for it. The next architectural step is a `BookingContext` provider with consumer hooks so render sections can be promoted from internal modules into real composite booking blocks when the editor model is ready.

### Why This Document Matters

This file is the implementation source of truth for the booking widget refactor.

- It externalizes architectural context so implementation does not depend on short-lived conversational memory.
- It gives both the developer and the AI a stable checklist to work through incrementally.
- It reduces drift by capturing not just *what* to build, but *why* specific tradeoffs were chosen.
- It should be updated whenever a meaningful architectural decision changes.

Important nuance: this document is not "memory" in the model-internal sense. It is better than that for engineering work because it is explicit, reviewable, versioned, and re-readable across sessions.

---

## Visual Zones

The widget has nine distinct visual zones, each needing independent customization:

```
┌─────────────────────────────────────┐
│           HEADER ZONE               │  ← backgroundColor, textColor, fontSize, padding
│           "Book Now"                │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  CARD ZONE                  │    │  ← borderColor, hoverBg, hoverBorder, borderRadius
│  │  Service / Resource card    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌───┬───┬───┐                      │
│  │ S │ S │ S │  SLOT ZONE           │  ← borderColor, textColor, borderRadius
│  └───┴───┴───┘                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  CALENDAR ZONE              │    │  ← selectedBg, selectedColor, todayBorder
│  │  MiniCalendar               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  FORM ZONE                  │    │  ← inputBorder, inputRadius, labelColor
│  │  Customer form inputs       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  BUTTON ZONE                │    │  ← bg, textColor, borderRadius, disabledBg
│  │  "Continue" / "Confirm"     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  PAYMENT ZONE               │    │  ← provider container, amount text, provider-specific surface
│  │  Stripe / Swish / Klarna    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  PROCESSING ZONE            │    │  ← spinner color, status copy, waiting state
│  │  Payment confirmation       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  CONTAINER ZONE             │    │  ← bg, borderRadius, shadow, maxWidth, padding
│  │  (outer wrapper)            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## CSS Variable Contract

All inline styles will be replaced by CSS custom properties scoped under the `--bw-` prefix (booking widget). This is the styling contract: every visual dimension maps to exactly one variable.

### Variable Naming Convention

```
--bw-{zone}-{property}
```

Zones: `container`, `header`, `card`, `slot`, `calendar`, `form`, `btn`, `payment`, `processing`, `success`, `error`  
Properties follow CSS naming: `bg`, `color`, `border-color`, `border-radius`, `shadow`, `font-size`, `font-weight`, `padding`, `max-width`

### Full Variable Table

```css
/* Container */
--bw-container-bg: #ffffff;
--bw-container-border-radius: 12px;
--bw-container-shadow: 0 1px 8px rgba(0,0,0,0.08);
--bw-container-max-width: 420px;
--bw-container-padding: 20px;

/* Header */
--bw-header-bg: #3b82f6;           /* was: primaryColor */
--bw-header-color: #ffffff;
--bw-header-font-size: 18px;
--bw-header-font-weight: 700;
--bw-header-padding: 16px 20px;

/* Cards (service, resource) */
--bw-card-border-color: #e5e7eb;
--bw-card-hover-border-color: #3b82f6;  /* was: primaryColor */
--bw-card-hover-bg: rgba(59,130,246,0.07);  /* was: primaryColor + 11 */
--bw-card-border-radius: 8px;
--bw-card-padding: 12px 16px;
--bw-card-title-font-size: 14px;
--bw-card-title-font-weight: 600;
--bw-card-subtitle-color: #6b7280;

/* Slot buttons */
--bw-slot-border-color: #3b82f6;    /* was: primaryColor */
--bw-slot-color: #3b82f6;           /* was: primaryColor */
--bw-slot-border-radius: 6px;
--bw-slot-font-size: 13px;
--bw-slot-font-weight: 600;

/* Calendar */
--bw-calendar-selected-bg: #3b82f6;  /* was: primaryColor */
--bw-calendar-selected-color: #ffffff;
--bw-calendar-today-border-color: #3b82f6;  /* was: primaryColor */

/* Form inputs */
--bw-form-input-border-color: #e5e7eb;
--bw-form-input-border-radius: 6px;
--bw-form-input-font-size: 14px;
--bw-form-label-color: #374151;
--bw-form-label-font-size: 13px;
--bw-form-label-font-weight: 600;

/* Primary button */
--bw-btn-bg: #3b82f6;               /* was: primaryColor */
--bw-btn-color: #ffffff;
--bw-btn-border-radius: 8px;
--bw-btn-font-size: 14px;
--bw-btn-font-weight: 600;
--bw-btn-disabled-bg: #9ca3af;

/* Payment */
--bw-payment-text-color: #374151;
--bw-payment-muted-color: #6b7280;
--bw-payment-surface-bg: #ffffff;
--bw-payment-surface-border-color: #e5e7eb;
--bw-payment-surface-border-radius: 8px;

/* Processing */
--bw-processing-spinner-color: #3b82f6;
--bw-processing-title-color: #111827;
--bw-processing-text-color: #6b7280;

/* Success / Error states */
--bw-success-icon-color: #3b82f6;    /* was: primaryColor */
--bw-error-bg: #fef2f2;
--bw-error-border-color: #fca5a5;
--bw-error-color: #dc2626;

/* Shared */
--bw-step-heading-font-size: 15px;
--bw-step-heading-font-weight: 600;
--bw-muted-color: #6b7280;
```

### How Variables Are Set

Variables are declared on the widget's outer wrapper via a `<style>` block built from Puck field values:

```tsx
// Inside BookingWidgetRender:
const cssVars = `
  .bw-${id} {
    --bw-header-bg: ${resolve(headerBg)};
    --bw-btn-bg: ${resolve(buttonBg)};
    --bw-container-border-radius: ${containerBorderRadius?.topLeft ?? '12'}px;
    /* ... all variables ... */
  }
`;

return (
  <>
    {isEditing && <style>{cssVars}</style>}
    <div className={`bw-${id}`}>
      {/* wizard content uses var(--bw-*) exclusively */}
    </div>
  </>
);
```

In storefront mode, the CSS aggregator generates these declarations into the pre-built CSS file. The `<style>` injection is skipped.

---

## Puck Field Structure

Fields are organized into semantic groups using `resolveFields` to show/hide contextually. This matches the pattern established by Box, Card, and other components.

### Field Groups

| Group | Fields | Control Type |
|-------|--------|--------------|
| **Content** | `title`, `serviceId`, `showPrices`, `successMessage` | text, number, radio, text |
| **Container** | `containerBg`, `containerBorderRadius`, `containerShadow`, `containerMaxWidth`, `containerPadding` | ColorPicker, BorderRadius, Shadow, text, Spacing |
| **Header** | `headerBg`, `headerColor`, `headerFontSize`, `headerFontWeight`, `headerPadding` | ColorPicker ×2, ResponsiveFontSize, FontWeight, Spacing |
| **Cards** | `cardBorderColor`, `cardHoverBorderColor`, `cardHoverBg`, `cardBorderRadius` | ColorPicker ×3, BorderRadius |
| **Buttons** | `btnBg`, `btnColor`, `btnBorderRadius`, `btnDisabledBg` | ColorPicker ×3, BorderRadius |
| **Payment** | `paymentTextColor`, `paymentMutedColor`, `paymentSurfaceBg`, `paymentSurfaceBorderColor`, `paymentSurfaceBorderRadius` | ColorPicker ×4, BorderRadius |
| **Processing** | `processingSpinnerColor`, `processingTitleColor`, `processingTextColor` | ColorPicker ×3 |
| **Calendar** | `calendarSelectedBg`, `calendarSelectedColor`, `calendarTodayBorderColor` | ColorPicker ×3 |
| **Form** | `formInputBorderColor`, `formInputBorderRadius`, `formLabelColor` | ColorPicker ×2, BorderRadius |
| **Slots** | `slotBorderColor`, `slotColor`, `slotBorderRadius` | ColorPicker ×2, BorderRadius |
| **Typography** | `stepHeadingFontSize`, `stepHeadingFontWeight`, `mutedColor` | ResponsiveFontSize, FontWeight, ColorPicker |

### ColorPicker Integration

The current `primaryColor` field uses a raw string with a manual `ColorPickerControlColorful` wrapper. All new color fields will use the standard `ColorValue` type (`{ type: 'custom' | 'theme', value: string }`) so that:

1. Theme tokens are resolvable via `useTheme().resolve()`
2. The aggregator's `ThemeResolver` can resolve them at build time
3. Tenants can pick from their theme palette directly

```tsx
// Current (broken pattern):
primaryColor: {
  type: 'custom',
  label: 'Primary Color',
  render: (props) => (
    <ColorPickerControl
      value={typeof props.value === 'string' ? { type: 'custom', value: props.value } : ...}
      onChange={(cv) => props.onChange(cv?.type === 'custom' ? cv.value : '#3b82f6')}
    />
  ),
}

// New (standard pattern, matches Box/Card/Heading):
headerBg: {
  type: 'custom' as const,
  label: 'Header Background',
  render: ({ field, value, onChange }) => (
    <ColorPickerControl field={field} value={value} onChange={onChange} />
  ),
  defaultValue: { type: 'custom' as const, value: '#3b82f6' },
}
```

### Conditional Field Visibility via resolveFields

Not all field groups make sense at all times. Use `resolveFields` to show zone-specific fields contextually:

```tsx
resolveFields: (data, { fields }) => {
  // Always show: Content, Container, Header, Buttons, Typography
  const visible = { ...fields };

  // Show Card fields only when serviceId === 0 (user picks service)
  if (data.props.serviceId > 0) {
    delete visible.cardBorderColor;
    delete visible.cardHoverBorderColor;
    delete visible.cardHoverBg;
    delete visible.cardBorderRadius;
  }

  return visible;
}
```

---

## CSS Aggregator Integration

### The Gap

`PuckCssAggregator.ts` has a switch statement in `extractLayoutComponentsCss()` (line ~887) that dispatches to per-component CSS builders. **There is no `bookingwidget` case.** This means the storefront renders the widget with no pre-generated CSS — it works today only because all styles are inline.

Once we move to CSS variables, the aggregator must generate them. Without this, the storefront widget will render with browser defaults (no colors, no spacing, no radii).

### Implementation

Add a `buildBookingWidgetCss()` function following the same pattern as `buildBoxCss()`, `buildCardCss()`, etc.:

```typescript
// In PuckCssAggregator.ts

function buildBookingWidgetCss(component: ComponentData, resolver: ThemeResolver): string {
  const p = component.props;
  const id = component.props.id ?? component.props._nodeId;
  const sel = `.bw-${id}`;

  const lines: string[] = [`${sel} {`];

  // Resolve ColorValue objects through theme resolver
  const resolveColor = (cv: ColorValue | string | undefined, fallback: string): string => {
    if (!cv) return fallback;
    if (typeof cv === 'string') return cv;
    if (cv.type === 'theme' && cv.value) return resolver.resolve(cv.value, fallback);
    return cv.value || fallback;
  };

  // Container
  lines.push(`  --bw-container-bg: ${resolveColor(p.containerBg, '#ffffff')};`);
  // ... all variables from the contract ...

  lines.push('}');
  return lines.join('\n');
}
```

Then register it in the switch:

```typescript
case 'bookingwidget':
  cssRules.push(buildBookingWidgetCss(component, resolver));
  break;
```

### Component Type Registration

The aggregator uses `isLayoutComponent()` / `isTypographyComponent()` to decide which switch runs. The BookingWidget needs to be registered in whichever category guard applies (likely layout, or a new `isInteractiveComponent()` guard if one is warranted).

---

## Editor Preview

### Current State

The editor currently renders a static dashed-border placeholder:

```tsx
if (isEditing) {
  return (
    <div style={{ border: '2px dashed #3b82f6', borderRadius: 12, padding: 24, background: '#eff6ff', textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>📅</div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title || 'Booking Widget'}</div>
      ...
    </div>
  );
}
```

This placeholder does **not** reflect any of the customization controls. If a tenant changes the header color, border radius, or shadow, the editor shows no visual feedback.

### Target State

Replace the static placeholder with a themed preview that consumes the CSS variables:

```tsx
if (isEditing) {
  return (
    <>
      <style>{cssVars}</style>
      <div className={`bw-${id}`} style={{ pointerEvents: 'none' }}>
        {/* Header zone */}
        <div className="bw-header">
          {title || 'Booking Widget'}
        </div>
        {/* Mock content zones showing the applied theme */}
        <div className="bw-body">
          <div className="bw-step-heading">Select a service</div>
          <div className="bw-card">Sample Service — $50</div>
          <div className="bw-card">Another Service — $75</div>
          <div className="bw-btn">Continue</div>
        </div>
      </div>
    </>
  );
}
```

All `.bw-*` classes consume CSS variables, so every control value is immediately visible in the editor canvas. The `pointerEvents: 'none'` prevents interaction with mock content while allowing Puck's overlay to handle click selection.

---

## Implementation Phases

## Execution Ledger

Use this section as the step-by-step implementation checklist. Update statuses as work completes.

| Step | Status | Outcome |
|------|--------|---------|
| 0. Extract booking modules | Complete | Payment, state, API, shared UI, and types split from the monolith |
| 1. Introduce `BookingContext` | Complete | Shared instance-scoped provider and consumer hooks added |
| 2. Convert main widget to provider-backed composition | Complete | `BookingWidget` now renders through `BookingProvider` rather than owning the reducer directly |
| 3. Extract internal step components to context consumers | Complete | Calendar, service, resource, slot, range, customer, confirm, and status UI extracted into a dedicated context-backed step module; Puck config moved to a thin entrypoint |
| 4. Promote internal sections to slot-backed Puck child blocks | In progress | Booking widget now supports section-slot mode, booking section blocks are editor-registered, misuse guard cards render outside the widget slot, parent-owned flow navigation/backtracking is in place, editor warnings cover unsupported orderings, and legacy fallback still exists while composition is tightened |
| 5. Implement CSS variable contract across all zones | Complete | Legacy/widget runtime now renders through `--bw-*` variables and shared booking classes, including payment and processing zones |
| 6. Add Puck controls to container and child blocks | In progress | Legacy/widget path now exposes per-zone container/widget controls; child-block inheritance split still needs follow-up |
| 7. Add CSS aggregator support | Complete | Storefront now receives shared booking widget class rules plus per-instance variable declarations |
| 8. Replace editor placeholder with live preview | Complete | Editor now renders a styled booking preview that reflects the current widget control values |
| 9. Add focused tests for context/composition | In progress | Focused render/config/runtime coverage now exists for slot composition, runtime-order warnings, resolved slot/range journeys, and recovery behavior; browser/storefront coverage is still pending |
| 10. Resolve storefront flow from saved sections | Complete | Runtime flow resolution, reducer transitions, progress UI, service-mode filtering, and back-navigation now share the same validated section-flow contract |

## Validation Log

| Date | Change | Validation |
|------|--------|------------|
| 2026-04-12 | Payment flow added to BookingWidget | TypeScript clean, Vite build passed, booking PHP tests passed |
| 2026-04-12 | Booking feature split into modules (`payment.tsx`, `state.ts`, `types.ts`, `shared.tsx`, `api.ts`) | TypeScript clean, booking PHP tests passed |
| 2026-04-12 | `BookingContext` introduced and widget moved to provider-backed state | TypeScript clean, booking PHP tests passed |
| 2026-04-12 | Step UI extracted to `BookingWidgetSteps.tsx` and Puck config moved to `BookingWidgetConfig.tsx` | IDE diagnostics clean on touched files, TypeScript clean, booking PHP tests passed |
| 2026-04-12 | Booking section blocks registered in Puck with slot-backed `layoutMode="sections"` support and legacy fallback retained | IDE diagnostics clean on touched files, TypeScript clean, booking PHP tests passed |
| 2026-04-13 | Payment polling restricted to `payment_processing`, booking section misuse guard cards added, and `sections` slot field hidden outside sections mode | IDE diagnostics clean, TypeScript clean, targeted booking PHP tests passed |
| 2026-04-13 | Parent-owned flow navigator added above active booking content so sections stay context-scoped while guests can revisit completed pre-payment steps | Booking-focused Vitest suite passed, TypeScript clean |
| 2026-04-13 | Booking widget migrated to shared `--bw-*` CSS variables and `PuckCssAggregator` now emits storefront booking widget CSS | Focused Vitest helper coverage green (4 tests), TypeScript clean, targeted booking PHP tests passed |
| 2026-04-13 | Per-zone booking widget controls wired into `BookingWidgetConfig` and the editor placeholder replaced with a live preview | Focused Vitest helper coverage green (5 tests), TypeScript clean, targeted booking PHP tests passed |
| 2026-04-15 | Slot-backed booking sections now forward `puck.dragRef`, only authorable pre-payment steps remain draggable, and runtime-only states are parent-managed in sections mode | Booking-focused Vitest suite passed (25 tests across focused files), IDE diagnostics clean |
| 2026-04-15 | Browser-level editor regression added for section-slot booking composition, using seeded Puck IDs and iframe-targeted assertions in the tenant editor | Playwright `tests/e2e/booking-widget-editor.spec.ts` passed in Chromium with strict runtime guards after activating the tenant theme |
| 2026-04-15 | Booking editor interaction coverage expanded to drag a section into the slot, publish/reload it, then reorder existing sections and verify the saved order persists | Playwright `tests/e2e/booking-widget-editor.spec.ts` passed in Chromium with 3 editor regressions green (render, insert, reorder) |
| 2026-04-15 | Booking sections mode now warns in-editor when saved section order diverges from the reducer-backed storefront flow | Focused Vitest booking suite passed (10 tests across render/config files), IDE diagnostics clean |
| 2026-04-15 | Product direction clarified: section order is now persisted and inspectable, but storefront flow is still reducer-driven pending a validated section-driven runtime model | Plan updated with continuation steps for normalized storefront flow resolution |
| 2026-04-15 | First section-driven storefront flow pass implemented: supported templates are normalized, progress UI follows the resolved template, services are filtered by compatible booking modes, and invalid section configs fall back to the safe default flow | Focused Vitest booking suite passed (19 tests across 5 files), IDE diagnostics clean on touched files |
| 2026-04-15 | Reducer transitions and pre-payment back-navigation moved onto the same resolved flow contract used by section normalization and progress UI | Focused Vitest booking suite passed (22 tests across 6 files), IDE diagnostics clean on touched files |
| 2026-04-15 | Runtime section-flow coverage added for slot and range journeys, and pre-payment recovery jumps now preserve their error message when moving guests back to the selection step | Focused Vitest booking suite passed (25 tests across 7 files), IDE diagnostics clean on touched files |
| 2026-04-15 | Late-session product direction recorded: same tenant may expose separate appointment and stay booking experiences while keeping one shared booking domain underneath | Plan updated with deferred frontend/backend split guidance for later implementation |
| 2026-04-18 | Slot-foundation hardening pass completed: the widget now rejects legacy `range_checkout` composition and preselected `range` services at the boundary, and the storefront runtime no longer models `range_checkout`, `checkIn`, or `checkOut` as executable state | Booking component Vitest suite passed (31 tests across 8 files), IDE diagnostics clean on touched files |
| 2026-04-18 | Storefront appointment Playwright coverage added for guest success and hold-conflict recovery on a published booking page | `tests/e2e/booking-storefront-appointment.spec.ts` added; local Playwright run is environment-gated and skipped when tenant/addon preconditions are unavailable |
| 2026-04-18 | Demo-tenant validation exposed a backend cleanup bug: deleting a terminal-state booking only soft-deleted it, which left `booking_services`/`booking_resources` blocked for teardown after a confirmed storefront booking | Fixed `BookingManagementController::destroy()` to `forceDelete()` deletable bookings and added focused API regression coverage; demo tenant still needs that backend deployed before the new Playwright spec can finish cleanly there |

## Open Questions And Deferred Decisions

| Topic | Current Decision | Revisit When |
|------|------------------|--------------|
| Shared state mechanism | React context | Only revisit if instance-scoped provider model causes measurable complexity or render performance problems |
| Puck composition model | Keep one shared booking domain, but likely introduce two storefront/editor families above it for appointment (`slot`) versus stay (`range_checkout`) experiences before allowing arbitrary free composition | Revisit when the authoring UX for separate families or templates is designed |
| Storefront flow source | Storefront flow is now resolver-driven for supported templates; the next decision is whether appointment and stay families should keep one shared section contract or diverge into mode-specific templates | Revisit when the frontend family split is designed |
| Storefront product shape | Same tenant may legitimately expose separate appointment and stay pages/widgets; do not force one guest widget to model every booking mode equally | Revisit when defining the next Puck-facing booking widget family/preset API |
| Booking persistence model | Prefer one shared `bookings` backbone with mode-specific detail/availability tables over two unrelated booking systems | Revisit only if slot and range lifecycles diverge enough to justify separate aggregates |
| Slot vs DropZone API | Use current repo convention and Puck capabilities available in this codebase | Revisit during first real composite child-block extraction |
| CSS aggregator registration | Implemented for the current booking widget runtime | Revisit only if future booking widget families need distinct aggregation rules |

### Phase 0: Composite-Ready Module Split (Completed)

**Files:** `BookingWidget.tsx`, `payment.tsx`, `state.ts`, `types.ts`, `shared.tsx`, `api.ts`

1. Split payment providers, polling, reducer state, API helpers, and shared UI out of the monolithic booking entrypoint
2. Keep one Puck block for now, but stop coupling all behavior to a single source file
3. Preserve the existing reducer flow so payment behavior and booking sequencing remain stable during the structural change

**Verification:** TypeScript clean, booking test suite passes, payment-enabled widget behavior unchanged.

### Phase 0.5: Introduce Booking Context (Next)

**Files:** `BookingContext.tsx`, `BookingWidget.tsx`, extracted step modules

1. Create `BookingContext` with provider, reducer wiring, typed actions, and consumer hooks
2. Move `useReducer(reducer, makeInitialState(...))` out of the main render body and into the provider
3. Keep async effects in the container/provider layer for now
4. Expose narrow hooks such as `useBookingState()`, `useBookingActions()`, and `useBookingStep()` instead of one wide context consumer when practical

**Verification:** Existing widget renders unchanged while reducer ownership lives inside `BookingProvider`.

### Phase 0.75: Extract Context-Backed Sections (Complete)

**Files:** `BookingWidget.tsx`, new step modules as needed

1. Extract the first internal sections from `BookingWidget.tsx` into focused components that consume booking hooks
2. Start with high-value boundaries such as calendar, service/resource selection, and confirm/payment status views
3. Keep orchestration effects in the container for now
4. Avoid introducing Puck child blocks until these sections are stable as internal consumers

**Verification:** `BookingWidget.tsx` now acts as the render orchestrator, step UI lives in a dedicated context-backed module, and the Puck config is isolated in its own file.

### Phase 1: Introduce Slot-Backed Booking Sections (Next)

**Files:** booking Puck config files, booking section components, page-builder registration as needed

1. Tighten the current sections mode so section blocks are harder to misuse outside the booking widget container
2. Decide whether the final editor UX should expose all steps directly or group them into fewer higher-level booking zones
3. Keep runtime behavior identical by continuing to use `BookingContext` beneath the composed tree
4. Begin CSS-variable-based visual customization once the section boundaries are stable

**Verification:** booking sections remain editor-visible and runtime-safe, while the next pass narrows the composition model and starts visual customization.

### Phase 1.5: Resolve Storefront Flow From Sections (Recommended Next)

**Files:** `state.ts`, `flow.ts`, `sectionOrder.ts`, `BookingWidget.tsx`, booking tests

1. Define the supported storefront permutations from saved sections instead of assuming that every editor order is valid.
2. Normalize the configured child-section order into a runtime flow that respects current data dependencies and booking-mode constraints.
3. Replace hardcoded reducer step progression with `nextStep` / `previousStep` resolution from the normalized flow.
4. Keep `payment`, `payment_processing`, `success`, and `error` as parent-managed runtime states outside the authorable section list.
5. Add tests for at least these cases:
  - appointment flow: `service -> date -> resource -> slot -> customer -> confirm`
  - preselected service flow: `date -> resource -> slot -> customer -> confirm`
  - lodging flow: `service -> date -> resource -> range_checkout -> customer -> confirm`
  - unsupported flow: reordered sections that violate the normalization rules

**Verification:** storefront progression, step navigator, and editor messaging all agree on the same resolved flow, and unsupported configurations fail clearly instead of drifting.

### Phase 1: CSS Variable Extraction (~400 lines changed)

**Files:** `BookingWidget.tsx`

1. Define the full CSS variable set as a `buildCssVars()` helper inside the component file
2. Replace every inline `style={{ ... }}` with `className` + CSS that references `var(--bw-*)`:
   - Container wrapper: `className="bw-${id}"`
   - Header: `className="bw-header"`
   - SelectCard: `className="bw-card"`
   - PrimaryButton: `className="bw-btn"`
   - Slot buttons: `className="bw-slot"`
   - MiniCalendar: `className="bw-calendar"`
   - CustomerForm inputs: `className="bw-input"`, labels: `className="bw-label"`
   - ErrorBanner: `className="bw-error"`
   - Success step: `className="bw-success"`
3. Add `<style>` block in editor mode with CSS rules consuming the variables
4. Inject `<style>` with variable declarations from current hardcoded defaults (no new fields yet)

**Verification:** Widget looks identical before/after. No visual regression. All inline styles removed.

### Phase 2: Puck Control Wiring (~200 lines added)

**Files:** `BookingWidget.tsx`

1. Expand `BookingWidgetProps` interface with all new typed fields (ColorValue, BorderRadiusValue, ShadowValue, ResponsiveFontSizeValue, etc.)
2. Update `fields` object in the ComponentConfig to use imported field definitions from `fieldGroups.tsx` and direct `ColorPickerControl` / `BorderRadiusControl` / `ShadowControl` renders
3. Add `defaultProps` for every new field matching the current hardcoded values
4. Wire `buildCssVars()` to read from props instead of hardcoded values
5. Use `useTheme().resolve()` for ColorValue resolution
6. Add `resolveFields` for conditional visibility (hide card fields when serviceId > 0)
7. Migrate legacy `primaryColor` data with a `resolveData` normalizer so existing saved widgets fan out their accent value into the richer per-zone fields on save

**`resolveData` migration for `primaryColor`:**

```tsx
resolveData: async (data) => {
  const props = { ...data.props };
  // Migrate legacy string primaryColor → headerBg ColorValue
  if (typeof props.primaryColor === 'string' && props.primaryColor) {
    if (!props.headerBg) {
      props.headerBg = { type: 'custom', value: props.primaryColor };
    }
    if (!props.btnBg) {
      props.btnBg = { type: 'custom', value: props.primaryColor };
    }
    // Spread to all accent zones that were tied to primaryColor
    if (!props.cardHoverBorderColor) props.cardHoverBorderColor = { type: 'custom', value: props.primaryColor };
    if (!props.slotBorderColor)      props.slotBorderColor = { type: 'custom', value: props.primaryColor };
    if (!props.slotColor)            props.slotColor = { type: 'custom', value: props.primaryColor };
    if (!props.calendarSelectedBg)   props.calendarSelectedBg = { type: 'custom', value: props.primaryColor };
    if (!props.successIconColor)     props.successIconColor = { type: 'custom', value: props.primaryColor };
    delete props.primaryColor;
  }
  return { props, readOnly: {} };
}
```

**Verification:** Controls appear in sidebar. Changing a color updates the CSS variable and the editor preview reflects it. Legacy saved widgets keep their accent styling after `resolveData` migration and storefront CSS extraction.

### Phase 3: CSS Aggregator + Storefront (~100 lines added)

**Files:** `PuckCssAggregator.ts`

1. Add `buildBookingWidgetCss()` function
2. Register `bookingwidget` in the component type switch
3. Register `BookingWidget` in the component type guard (`isLayoutComponent` or new guard)
4. Add the CSS class rules (`.bw-header`, `.bw-card`, `.bw-btn`, etc.) as static CSS that references the variables — these go into the generated stylesheet alongside the variable declarations

**Verification:** Storefront renders widget with pre-generated CSS. No inline styles. Inspect element confirms CSS variables are declared and consumed.

### Phase 4: Editor Preview Upgrade

**Files:** `BookingWidget.tsx`

1. Replace the static placeholder with the themed preview described in [Editor Preview](#editor-preview)
2. Include mock data for each zone (sample service cards, slot buttons, form fields, confirm row, success icon)
3. Ensure `pointerEvents: 'none'` prevents interference with Puck selection overlay
4. CSS variable declarations apply to preview, giving instant visual feedback

**Verification:** Changing any control immediately updates the editor preview.

---

## Migration Path to Architecture A

Architecture B produces two artifacts that transfer directly to Architecture A:

### 1. CSS Variable Contract

The `--bw-*` variables become the styling interface. Each composite block consumes the same variables:

```tsx
// Future: BookingServiceList block
function BookingServiceListRender({ ... }) {
  return (
    <div className="bw-card" style={{ /* none — all via CSS vars */ }}>
      ...
    </div>
  );
}
```

The container block declares the variables; child blocks consume them via CSS inheritance.

### 2. Field Group Schemas

The Puck field definitions (ColorPicker for `headerBg`, BorderRadius for `containerBorderRadius`, etc.) move from the monolithic BookingWidget config to the BookingContainer config. Child blocks don't need their own styling fields — they inherit from the container's CSS variables.

### 3. State Migration

The `useReducer` state machine moves into a `BookingProvider` so the container owns state and child blocks consume it through hooks:

```tsx
// Future: BookingContext.tsx
const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children, initialServiceId }: BookingProviderProps) {
  const [state, dispatch] = useReducer(reducer, makeInitialState(initialServiceId));

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}
```

Each child block calls a booking hook such as `useBookingContext()` or narrower derived hooks to read/write state. The reducer logic remains the same; only ownership moves from the entry component into a provider boundary.

### When to Trigger Migration

Architecture A becomes warranted when any of these conditions emerge:
- Tenants need to rearrange wizard step order
- A new feature requires embedding arbitrary Puck blocks between wizard steps
- The booking flow grows beyond ~1500 lines and decomposition aids maintainability

That first trigger has now effectively been reached at the product-discovery level: tenants already have valid reasons to want different booking sequences for appointment versus lodging flows. The recommended next pass is still not fully arbitrary ordering, but a controlled storefront flow resolver that can honor supported section-driven permutations.

Until then, the staged hybrid provides full visual customization while moving safely toward true composite booking blocks.

---

## File Change Summary

| File | Change Type | Estimated Delta |
|------|-------------|-----------------|
| `resources/js/shared/puck/components/booking/BookingWidget.tsx` | Major edit | Extracted to focused entrypoint and flow composition (~888 lines) |
| `resources/js/shared/puck/components/booking/payment.tsx` | New | Provider-specific payment UI and webhook polling (~327 lines) |
| `resources/js/shared/puck/components/booking/state.ts` | New | Reducer, actions, state model (~155 lines) |
| `resources/js/shared/puck/components/booking/types.ts` | New | Booking and payment types (~57 lines) |
| `resources/js/shared/puck/components/booking/shared.tsx` | New | Shared booking UI primitives (~47 lines) |
| `resources/js/shared/puck/components/booking/api.ts` | New | Guest booking API helpers (~20 lines) |
| `resources/js/shared/puck/services/PuckCssAggregator.ts` | Addition | +80 lines (buildBookingWidgetCss + switch case + type guard) |

No backend API contracts changed. The public booking endpoints remain unchanged; current work is frontend architecture and editor/storefront rendering structure.

---

## Payment Integration (Implemented)

The BookingWidget now handles the full payment flow when a service requires payment. The backend was already wired (`BookingPaymentService`, three gateways, webhook handlers) — the gap was entirely in the frontend widget which ignored `status: "awaiting_payment"` responses.

### Payment Flow

```
Customer fills form → POST /hold → POST /hold/{token} (confirmHold)
                                          │
                      ┌───────────────────┴────────────────────┐
                      │ status: "confirmed"                     │ status: "awaiting_payment"
                      │ (no payment required)                   │ (payment required)
                      ▼                                         ▼
                  ✅ Success step                         💳 Payment step
                                                               │
                                    ┌──────────────────────────┼──────────────────────┐
                                    │ Stripe                    │ Swish                 │ Klarna
                                    │ PaymentElement            │ Open Swish app        │ Klarna.js widget
                                    │ inline confirmation       │ redirect flow         │ authorize flow
                                    ▼                           ▼                       ▼
                              ⏳ Payment Processing step (polling GET /api/public/booking/{token})
                                    │
                              ┌─────┴─────┐
                              │ confirmed  │ failed/timeout
                              ▼            ▼
                          ✅ Success   ❌ Error
```

### New Wizard Steps

| Step | Trigger | UI |
|------|---------|-----|
| `payment` | `confirmHold` returns `status: "awaiting_payment"` | Provider-specific payment UI (Stripe Elements / Swish redirect / Klarna widget) |
| `payment_processing` | Payment submitted or Swish redirect initiated | Spinner + "Processing payment…" with status polling every 3s (5-minute timeout) |

### Provider-Specific Implementations

**Stripe:** Uses `@stripe/stripe-js` + `@stripe/react-stripe-js`. Renders `<PaymentElement>` in an `<Elements>` provider with the `client_secret` from the backend. Calls `stripe.confirmPayment()` with `redirect: 'if_required'` to handle most cards inline without a full-page redirect.

**Swish:** Opens the `redirect_url` (Swish deep link) in a new tab. On mobile, this opens the Swish app directly. Desktop users see instructions. Polling starts immediately to detect webhook confirmation.

**Klarna:** Dynamically loads Klarna.js from CDN, initializes with `client_token`, loads the `pay_now` payment method widget, and calls `Klarna.Payments.authorize()` on submit. Authorization triggers the backend webhook flow.

### Status Polling

All providers rely on webhook-driven confirmation. The widget polls `GET /api/public/booking/{holdToken}` every 3 seconds after payment submission, checking for `status === "confirmed"`. Polling times out after 5 minutes with a graceful message directing the user to check their email.

### Dependencies Added

- `@stripe/stripe-js` — Stripe.js loader (lazy-loads the script from stripe.com)
- `@stripe/react-stripe-js` — React bindings for Stripe Elements

---

## Testing Strategy

### Unit Tests (Vitest)

1. **CSS variable generation:** Given a set of BookingWidget props, `buildCssVars()` produces the expected CSS string with correctly resolved theme tokens
2. **resolveData migration:** Given legacy `{ primaryColor: '#ff0000' }` props, `resolveData` spreads the value to all accent zone fields and removes the legacy prop
3. **resolveFields conditional visibility:** Given `serviceId > 0`, card-related fields are excluded from the returned field set

### Integration Tests (Vitest + React Testing Library)

4. **Render with defaults:** Widget renders with default CSS variables matching the current hardcoded values
5. **Render with custom props:** Custom color/radius/shadow props produce corresponding CSS variable declarations
6. **Editor preview reflects controls:** In edit mode, changing a prop updates the style block

### E2E Tests (Playwright)

7. **Storefront rendering:** Widget on a published page renders correctly with pre-generated CSS (no inline styles in DOM)
8. **Editor control round-trip:** Open editor → change header color → save → reload → color persists

### Visual Regression Baseline

Before any code changes, capture screenshots of the current widget rendering. After Phase 1 (CSS variable extraction), compare to ensure zero visual regression. This confirms the variable layer is a transparent replacement for the inline styles.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing saved pages have `primaryColor` as string | High | Widget renders with missing colors | `resolveData` normalizer migrates on first editor open; aggregator handles both old and new format |
| CSS specificity conflicts with theme CSS | Medium | Theme overrides widget variables | `.bw-{id}` selector is component-scoped; variables are declared on the component root, not `:root` |
| Editor preview layout differs from storefront | Low | Confusing WYSIWYG experience | Preview uses identical CSS classes; only data is mocked |
| Performance: many CSS variables per widget | Low | Slight style recalc overhead | ~35 variables is negligible; browsers handle thousands |

---

## References

- [BookingWidget.tsx](../resources/js/shared/puck/components/booking/BookingWidget.tsx) — Current implementation (1060 lines)
- [Box.tsx](../resources/js/shared/puck/components/layout/Box.tsx) — Canonical container pattern to follow
- [fieldGroups.tsx](../resources/js/shared/puck/fields/fieldGroups.tsx) — Reusable field definitions with co-located defaults
- [controlPresets.tsx](../resources/js/shared/puck/controlPresets.tsx) — Semantic control collections
- [cssBuilder.ts](../resources/js/shared/puck/fields/cssBuilder.ts) — `buildLayoutCSS()` responsive CSS generator
- [PuckCssAggregator.ts](../resources/js/shared/puck/services/PuckCssAggregator.ts) — Storefront CSS generation pipeline
- [reference/THEME_SYSTEM_ARCHITECTURE.md](./reference/THEME_SYSTEM_ARCHITECTURE.md) — Three-layer theme architecture and token system
- [PUCK_CONTROLS_AUDIT.md](./PUCK_CONTROLS_AUDIT.md) — Known control issues to avoid
- [VISUAL_EDITOR_AUDIT.md](./VISUAL_EDITOR_AUDIT.md) — Aggregator bugs (className mismatch pattern to avoid)
