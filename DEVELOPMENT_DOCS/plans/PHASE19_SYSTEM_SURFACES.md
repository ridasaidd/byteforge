# Phase 19: System Surfaces

Last updated: April 26, 2026
Status: Partially implemented on `feature/phase15-guest-auth`
Recommended branch: may begin as follow-on work on `feature/phase15-guest-auth`, but should be treated as its own implementation track
Depends on:

- Phase 8 page-system refactor
- Theme system and Puck CSS pipeline
- Phase 15 guest authentication baseline
- Existing booking/payment widget architecture

---

## Current Branch Status

The current branch implements the guest-portal slice of this phase and part of
the broader system-surface foundation.

Implemented on `feature/phase15-guest-auth`:

- `system_surfaces` migration, model, provisioning, and API
- tenant CMS list, reset, and editor flow for system pages
- tenant login runtime rendered through system-surface data
- guest portal runtime rendered through `guest_portal` system-surface data
- route-picker and shell-aware navigation support for public system routes
- focused guest-portal browser validation for public navigation utility links

Still deferred:

- live `register`, `forgot_password`, and `reset_password` runtime routes and forms
- guest portal widget zones beyond the current fixed bookings experience
- customer-account or password-based customer flows
- cross-tenant customer identity / SSO architecture

Important scope boundary:

The existence of `register`, `forgot_password`, and `reset_password` as
system-surface keys does not mean guest users now have customer accounts.
Those entries are architectural placeholders for later route-owned auth
surfaces, not delivered customer-account functionality in this branch.

---

## Problem Statement

ByteForge currently has two strong UI models:

1. **Normal pages** managed through the Pages UI and rendered through the public page system.
2. **Functional widgets** such as booking and payment, implemented as React components and exposed through Puck.

There is now a third category that does not fit cleanly into either existing bucket:

- tenant login
- register
- forgot password
- reset password
- guest magic-link handoff
- authenticated guest portal shell

These are not ordinary CMS pages. They are **route-owned system surfaces** tied to fixed application behavior, required inputs, redirects, sessions, and security rules.

At the same time, they should not stay permanently hardcoded if ByteForge already has:

- a mature Puck component model,
- extensive CSS controls,
- a storefront-safe generated CSS pipeline,
- existing proof that React runtime components can also be exposed as Puck components.

The goal of this phase is to introduce a **hybrid system-surface model**:

- route and logic stay fixed,
- required functional controls stay non-removable,
- presentation, layout, copy, and safe content zones become Puck-editable,
- authenticated guest content areas can host true widgets.

This removes the need to pull Tailwind or shadcn into the storefront runtime for system pages, while still allowing tenant-level customization.

---

## Core Decision

ByteForge should not model auth and portal pages as normal Pages entries.

ByteForge should also not model them as arbitrary freeform widgets that authors can drop anywhere.

ByteForge should introduce a dedicated concept: **System Surfaces**.

System Surfaces are:

- singleton, route-bound runtime surfaces,
- backed by fixed React components,
- editable through a dedicated Puck editor,
- non-deletable,
- non-duplicable,
- not shown in the normal Pages list,
- allowed to expose widget zones only where appropriate.

---

## Design Principles

1. **Security-sensitive logic stays in code.** Puck may not own login submission, password reset tokens, guest session bootstrap, or redirect rules.
2. **Required controls are not removable.** Example: login must always contain the username/email field, password field, forgot-password link, and submit action.
3. **Presentation is editable.** Layout, spacing, typography, brand areas, optional side content, and safe supporting copy are editable through Puck.
4. **Storefront styling stays storefront-native.** No new requirement for Tailwind or shadcn on public runtime surfaces. Styling should continue to rely on Puck controls, generated CSS, theme tokens, and minimal component-owned CSS where required.
5. **Authenticated content can become widget-driven.** The guest portal shell is fixed, but widgets like bookings, quotes, and estimates should be addable to the authenticated area.
6. **System Surfaces are not Pages.** They deserve their own CMS navigation item, their own API/resource model, and their own editor constraints.
7. **Tenant customization must not break route contracts.** The system must remain valid even if a tenant customizes every visual option available.

---

## Scope

### In Scope

- A new system-surface domain model and editor flow
- Dedicated CMS navigation for system surfaces
- Fixed-route rendering for auth and guest surfaces
- Puck-backed editing for system-surface presentation
- Locked required UI regions for auth flows
- Widget zones for authenticated guest areas
- Storefront-safe CSS generation for system surfaces

### Out of Scope

- Replacing the normal Pages system
- Making auth inputs individually draggable/removable blocks
- Letting tenants arbitrarily move critical auth controls out of the required flow
- Adding Tailwind/shadcn as a storefront dependency
- Designing the quotes/estimates product itself beyond its future portal-zone fit

---

## Surface Categories

### 1. Fixed Auth Surfaces

Examples:

- tenant login
- register
- forgot password
- reset password
- guest magic-link callback

Characteristics:

- route-owned
- fixed required core controls
- optional editable presentation shell
- no arbitrary widget slotting

### 2. Fixed Shell + Widget Zone Surfaces

Example:

- guest portal

Characteristics:

- route-owned and auth-aware
- fixed session/bootstrap and access-control logic
- fixed shell and guard rails
- one or more Puck-editable widget zones for authenticated modules

### 3. Authenticated Portal Widgets

Examples:

- Bookings widget
- Quotes and estimates widget
- Profile summary widget
- Help/support widget
- Announcement widget

Characteristics:

- true Puck components
- pluggable into a surface-defined portal zone
- independently add-on gated where appropriate

---

## Proposed CMS Structure

These should not live under the normal Pages menu.

Recommended tenant CMS nav addition:

- `System Pages`
  - `Login`
  - `Register`
  - `Forgot Password`
  - `Reset Password`
  - `Guest Portal`

Alternative label for internal architecture: `System Surfaces`

Recommended product-facing CMS label: `System Pages`

Why:

- more understandable for users than "surfaces"
- still clearly distinct from content pages
- maps well to route-owned singleton pages

These entries should be:

- always present,
- non-deletable,
- resettable to defaults,
- editable through a dedicated surface editor,
- not listed in the generic Pages CRUD interface.

---

## Proposed Data Model

Introduce a dedicated `system_surfaces` table rather than reusing `pages`.

Suggested columns:

```text
id
tenant_id nullable      // null for central/global surfaces if needed later
surface_key             // tenant_login, register, forgot_password, reset_password, guest_portal
title                   // editor-facing label
route_path              // informational/runtime mapping, not user-editable
surface_type            // auth, guest_portal, system_callback
puck_data json nullable // editor content tree
settings json nullable  // surface-level flags/config metadata
is_enabled boolean
published_at nullable
created_at
updated_at
```

Constraints:

- unique `(tenant_id, surface_key)`
- seeded default rows per tenant for required system surfaces
- route ownership belongs to code, not the database

This model is preferable to reusing `pages` because these entries have different lifecycle rules:

- singleton identity,
- fixed route binding,
- non-deletable behavior,
- dedicated editor restrictions,
- special rendering rules.

---

## Rendering Model

Each system surface should follow a two-layer model.

### Layer 1: Fixed Runtime Surface Component

Examples:

- `TenantLoginSurfaceRender`
- `ForgotPasswordSurfaceRender`
- `GuestPortalSurfaceRender`

This component owns:

- form submission
- validation display
- route bindings
- redirect behavior
- token/session logic
- required controls
- add-on guards
- authenticated data loading

### Layer 2: Puck Surface Config Wrapper

Examples:

- `TenantLoginSurface`
- `ForgotPasswordSurface`
- `GuestPortalSurface`

This wrapper defines:

- editable props
- slot zones
- visual controls
- generated CSS contract
- editor preview behavior

This mirrors the current booking/payment pattern where a React render component is wrapped by a Puck config instead of inventing a second rendering system.

---

## Locked vs Editable Regions

### Login Surface Example

#### Locked Required Core

- email/username field
- password field
- forgot password link
- sign-in button
- error state rendering

#### Editable Around the Core

- heading text
- supporting copy
- brand/logo area
- illustration/media area
- card layout
- spacing, width, alignment
- typography and colors
- optional trust/help text zone

### Forgot Password Surface Example

#### Locked Required Core

- email field
- submit button
- success/error messaging area

#### Editable Around the Core

- title and instructions
- supporting content
- side panel/branding
- spacing, colors, typography

### Guest Portal Surface Example

#### Locked Required Core

- guest session bootstrap
- logout action
- authorization/empty-state logic
- widget-zone contract

#### Editable Around the Core

- shell layout
- intro copy
- support/help content
- widget zone arrangement
- typography/colors/spacing

#### Widget Zone Contents

- bookings widget
- quotes widget
- estimates widget
- future portal modules

---

## Styling Strategy

This phase should not introduce Tailwind or shadcn into storefront runtime surfaces.

Instead, styling should come from:

1. theme tokens,
2. existing Puck controls,
3. CSS generated by the Puck pipeline,
4. minimal component-owned CSS for fixed runtime internals where a control surface is not appropriate.

This is aligned with current storefront reality:

- public runtime already relies on theme CSS and Puck-generated CSS,
- public JS bundle does not import dashboard `app.css`,
- booking/payment widgets already prove that runtime React components can ship storefront-safe CSS without requiring Tailwind.

### Styling Rule Set

1. Use existing field-group controls wherever possible.
2. Keep instance-scoped class naming so generated CSS remains deterministic.
3. Allow component-owned base CSS for required internals, then layer generated CSS variables/overrides on top.
4. Keep auth-surface CSS namespaced and isolated from general page CSS.

---

## Editor Model

System Surfaces should have a dedicated editor, not the normal page editor.

Recommended behavior:

- dedicated surface list view
- dedicated surface editor route
- surface-specific Puck config
- restricted allowed blocks per surface
- preview that reflects the real route-owned shell

Example:

- `Login` surface editor allows safe layout/content blocks around a locked auth form
- `Guest Portal` surface editor allows shell blocks and a portal widget zone
- `Forgot Password` allows informational/support content blocks around a locked recovery form

This should be implemented as **surface-specific Puck configs or config extensions**, not as one universal freeform config.

---

## Portal Widget Strategy

The authenticated guest portal is where true widgets should be emphasized.

Recommended first widget list:

1. `GuestBookingsWidget`
2. `GuestQuotesWidget` (future)
3. `GuestEstimatesWidget` (future)
4. `GuestHelpWidget`

The portal shell remains fixed and route-owned. Widget placement happens inside explicit portal zones.

This gives ByteForge the right long-term model:

- safe auth surfaces,
- customizable authenticated experience,
- add-on expansion path without inventing a second guest UI system.

---

## API and CMS Requirements

### New CMS Endpoints

Suggested surface API set:

```text
GET    /api/system-surfaces
GET    /api/system-surfaces/{surface}
PUT    /api/system-surfaces/{surface}
POST   /api/system-surfaces/{surface}/reset
```

### New Editor Routes

Suggested tenant CMS routes:

```text
/cms/system-pages
/cms/system-pages/:surfaceKey/edit
```

### Runtime Resolution

Runtime routes stay defined in code, for example:

```text
/login
/register
/forgot-password
/reset-password/:token
/my-bookings
/guest/magic/:token
```

Each route resolves its corresponding surface config by `surface_key` and renders the fixed surface component with the saved Puck data/settings.

---

## Implementation Phases

### 19.1 Surface Domain Foundation

Goal:

- create the new `system_surfaces` model and persistence layer

Deliverables:

- migration
- model
- tenant-scoped CRUD API
- seeding/default provisioning
- unique singleton enforcement

### 19.2 CMS Navigation and List UI

Goal:

- expose a dedicated `System Pages` area in tenant CMS

Deliverables:

- nav item
- list page
- non-deletable entries
- reset-to-default action

### 19.3 Dedicated Surface Editor

Goal:

- build a separate editor path for system surfaces

Deliverables:

- editor routes
- editor page
- surface-specific Puck config loading
- preview with locked regions

### 19.4 Fixed Auth Surfaces

Goal:

- convert auth-related runtime pages into Puck-backed fixed surfaces

Candidates:

- tenant login
- register
- forgot password
- reset password
- guest magic-link callback

### 19.5 Guest Portal Shell + Widget Zone

Goal:

- convert the guest portal shell into a system surface with portal zones

Deliverables:

- fixed shell runtime component
- widget-zone contract
- first-party bookings widget integration

### 19.6 Portal Widget Expansion

Goal:

- define future add-on widgets for authenticated guest area

Future widgets:

- quotes
- estimates
- support/help
- announcements

---

## Required Technical Guard Rails

1. Surface keys are code-owned and immutable.
2. Required auth controls are rendered by code, not removable blocks.
3. Widget zones are allowed only on surfaces that explicitly support them.
4. Surfaces must support reset to platform defaults.
5. Editors must prevent accidental deletion of required runtime regions.
6. Add-on widgets must still obey feature flags and backend authorization.
7. Surface rendering must degrade safely to defaults when saved Puck data is invalid or missing.

---

## Testing Requirements

### Backend

- singleton creation and uniqueness
- tenant isolation
- reset behavior
- surface resolution by key

### Frontend Editor

- system-pages list rendering
- restricted editor config per surface
- locked region visibility
- widget-zone restrictions

### Frontend Runtime

- login surface renders with saved config
- forgot-password surface renders with saved config
- guest portal shell renders with saved config
- missing or broken surface config falls back to safe default render

### Browser / E2E

- tenant login still authenticates correctly after customization
- forgot password still submits correctly after customization
- guest portal still boots guest session and renders bookings widget zone
- reset-to-default restores working runtime surface

---

## Rollout Recommendation

This should be implemented after the essential guest-auth deployment path is stable enough that the team is not using customization work to mask unfinished auth behavior.

Recommended order:

1. Finish core guest-auth runtime behavior first.
2. Stabilize portal shell and route model.
3. Implement the system-surface foundation.
4. Migrate one auth surface first, likely tenant login or forgot password.
5. Migrate guest portal shell after the foundation proves itself.

---

## Open Questions

1. Should tenant login and guest login/magic-link surfaces share the same base surface primitives, or remain completely separate surface types?
2. Should system-surface content be stored as raw `puck_data`, normalized props, or both?
3. Should central admin also gain system surfaces later, or should Phase 19 remain tenant-focused?
4. How much of the auth-surface shell should be slot-driven versus prop-driven?
5. Should the guest portal support multiple widget zones from day one, or start with one primary content zone?

---

## Recommended Outcome

At the end of this phase, ByteForge should have:

- a dedicated `System Pages` CMS area,
- route-bound, non-deletable system surfaces,
- Puck-backed customizable auth presentation without giving up fixed application logic,
- a guest portal shell that can host true authenticated widgets,
- no requirement to add Tailwind or shadcn to storefront runtime just to style these surfaces.

This is the correct hybrid model for ByteForge.
