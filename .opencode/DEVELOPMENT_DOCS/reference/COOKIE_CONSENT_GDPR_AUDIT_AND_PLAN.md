# Cookie Consent GDPR Audit And Plan

Last updated: April 4, 2026
Branch: `feature/cookie-consent-gdpr`
Status: Audit complete, implementation not started

---

## Goal

Introduce GDPR and ePrivacy-compliant cookie consent handling for ByteForge public storefronts without creating dashboard controls that have no runtime effect.

This work must cover:

- Central public storefront
- Tenant public storefronts
- Consent-driven gating of third-party scripts
- Clear separation between central scope and tenant scope
- Test coverage proving that consent settings actually change runtime behavior

This document does **not** implement the feature. It defines the current state, the gaps, and the recommended implementation plan.

---

## Executive Summary

ByteForge already has central and tenant dashboard controls for analytics provider IDs, but those controls are currently only configuration storage. They do not enforce end-user consent.

Today, if a provider ID is present, third-party scripts are injected directly into the public storefront layouts. This is the main compliance gap.

The recommended approach is:

1. Add a consent layer to the public storefronts only.
2. Use `whitecube/laravel-cookie-consent` for consent state, UI, and cookie inventory.
3. Keep consent scoped per host by default, not shared across all subdomains.
4. Add central and tenant dashboard controls for policy links and provider enablement.
5. Gate all third-party scripts behind both:
   - provider configuration in settings
   - explicit user consent for the matching category
6. Add automated tests proving that scripts are absent before consent and present after consent.

---

## Current Audit Findings

### 1. Existing Analytics Controls Already Exist

ByteForge already stores analytics provider configuration in both central and tenant settings.

Central scope:

- `App\Settings\GeneralSettings`
- `SuperadminController::getSettings()` / `updateSettings()`
- Central dashboard settings page

Tenant scope:

- `App\Settings\TenantSettings`
- `SettingsController::index()` / `update()`
- Tenant dashboard settings page

Current provider fields in both scopes:

- `ga4_measurement_id`
- `gtm_container_id`
- `clarity_project_id`
- `plausible_domain`
- `meta_pixel_id`

These settings are already persisted and editable. That part does not need to be invented.

### 2. Runtime Consent Enforcement Does Not Exist

Public storefront layouts currently include the analytics partial directly.

Implication:

- if a provider ID exists in settings, the provider script is rendered
- no prior consent check exists
- no category check exists
- no consent reset flow exists
- no cookie policy integration exists

This means the current analytics controls have operational effect, but not lawful consent enforcement.

### 3. Script Injection Is Shared, But Not Consent-Aware

The shared analytics partial currently renders:

- GA4
- GTM
- Microsoft Clarity
- Plausible
- Meta Pixel

That partial is included in both central and tenant public storefront layouts.

This is good news for implementation because one shared script rendering point can be made consent-aware.

### 4. Central And Tenant Scopes Already Differ Operationally

Central public pages read from `GeneralSettings`.

Tenant public pages read from `TenantSettings` under tenant context.

This existing split is exactly what we need for consent configuration as well. There is no need for a separate package instance or a separate consent subsystem per scope.

### 5. Consent Package Is Not Installed Yet

`whitecube/laravel-cookie-consent` is not currently present in Composer dependencies.

So the work still needs:

- package install
- provider registration
- config publish
- view integration
- consent-aware runtime gating

### 6. Browser Storage Exists Outside Cookies

The package only helps with cookie-consent workflows. It does not automatically manage all browser storage.

Current browser-side storage already in use:

- Laravel session cookie on web routes
- Laravel CSRF-related cookie behavior on web routes
- auth token in localStorage/sessionStorage for dashboard auth
- locale persistence in localStorage

This matters because compliance is about storing or accessing data on terminal equipment, not only classic cookies.

### 7. Playwright And CI Are Already In Place

The repo already has working GitHub Actions pipelines for backend and Playwright smoke coverage.

That means consent behavior should be verified in CI, not just manually.

---

## Compliance-Oriented Classification

This section is an engineering classification, not legal advice. Final legal wording should be reviewed separately.

### Strictly Necessary / Essential

These can be treated as essential when limited to the requested service:

- session cookie required for Laravel web flow
- CSRF protection cookie or token handling required for secure form/API interactions
- the consent-preference cookie itself
- dashboard auth token storage used only for authenticated CMS access

Notes:

- dashboard auth storage is not a marketing or analytics mechanism; it is part of the requested authenticated service
- this should be documented in the policy even if it is not shown in the banner as optional

### Analytics

Treat these as consent-required by default:

- GA4
- GTM when used to load analytics or tracking tags
- Microsoft Clarity
- Plausible

Even if a provider can operate in a reduced or cookieless mode, the safe implementation choice is to gate it behind consent until a narrower legal/technical position has been verified.

### Marketing

Treat this as consent-required:

- Meta Pixel

### Functional Preference Storage

Locale persistence in localStorage should not be ignored.

Recommendation:

- do not put language selection behind the cookie banner for the dashboard
- only persist locale after explicit user language choice where possible
- avoid writing locale preference automatically on first public page load unless there is a strong product reason

---

## Recommended Control Model

### Principle

Do not add a generic “cookie controls” section that merely stores values. Each control must affect runtime rendering or validation.

### What Should Be Configurable In The Dashboard

#### Central Settings

Add a `Cookie Consent` section to central settings for the central public storefront.

Recommended fields:

- `privacy_policy_url`
- `cookie_policy_url`
- `ga4_enabled`
- `gtm_enabled`
- `clarity_enabled`
- `plausible_enabled`
- `meta_pixel_enabled`

Existing provider ID fields remain in place.

#### Tenant Settings

Add a matching `Cookie Consent` section to tenant settings for tenant storefronts.

Recommended fields:

- `privacy_policy_url`
- `cookie_policy_url`
- `ga4_enabled`
- `gtm_enabled`
- `clarity_enabled`
- `plausible_enabled`
- `meta_pixel_enabled`

Existing provider ID fields remain in place.

### What Should Not Be User-Configurable In V1

Avoid these in the first version:

- editable consent categories in the dashboard
- arbitrary script category mapping in the dashboard
- cross-scope inheritance logic between central and tenant settings
- a freeform “disable consent banner even though trackers are active” switch

Reason:

- these create invalid or legally risky states
- they complicate validation
- they increase the chance of controls existing without a real effect

### Validation Rules Required

The dashboard must reject invalid states.

Examples:

- if `ga4_enabled` is true, `ga4_measurement_id` must be present
- if `gtm_enabled` is true, `gtm_container_id` must be present
- if `clarity_enabled` is true, `clarity_project_id` must be present
- if `plausible_enabled` is true, `plausible_domain` must be present
- if `meta_pixel_enabled` is true, `meta_pixel_id` must be present
- if any optional provider is enabled, `cookie_policy_url` should be required

This is how we ensure the dashboard controls are not decorative.

---

## Scoping Strategy

### Recommended Default: Per-Host Consent

Consent must be scoped per host by default.

That means:

- central consent on `byteforge.se` applies only to `byteforge.se`
- tenant A consent applies only to tenant A host
- tenant B consent applies only to tenant B host

### Why Per-Host Is The Correct Default

- tenants can have different legal controllers or customer identities
- tenants can enable different providers
- tenants can point to different privacy or cookie policy pages
- consent on one tenant should not silently authorize tracking on another tenant

### Package Configuration Implication

Do **not** set the cookie consent cookie domain to a shared root domain such as `.byteforge.se` in V1.

Keep the consent cookie host-only.

That gives safe isolation automatically.

### Central And Tenant Settings Scope

Central settings drive only the central public storefront.

Tenant settings drive only the current tenant storefront under tenant context.

No inheritance should be added in V1.

---

## Recommended Package Integration

### Package Choice

`whitecube/laravel-cookie-consent` is a good fit for ByteForge because:

- the public storefronts are rendered through Blade layouts
- script injection already happens in Blade
- the package supports categories, consent storage, UI, and reset flow
- the package supports subdomain-aware cookie configuration when needed

### Integration Approach

Install the package, but do not rely on it as a black box for all script rendering.

Recommended architecture:

1. Use the package for:
   - consent preference storage
   - banner/modal UI
   - cookie inventory registration
   - reset/manage consent actions
2. Keep ByteForge in control of actual script rendering.
3. Render third-party scripts only when both conditions are true:
   - provider is enabled and configured in current scope settings
   - consent exists for the relevant category or provider

### Why Explicit Blade Gating Is Preferred Here

ByteForge already has:

- dynamic provider IDs from current settings
- central/tenant scope switching per request
- a GTM body `noscript` case that must be rendered in the layout body

Because of that, explicit consent checks in the Blade partials will be simpler and more testable than trying to hide all runtime behavior inside package callbacks.

### Integration Points

The package should be integrated only into:

- `public-central.blade.php`
- `public-tenant.blade.php`

Do not add the banner to:

- `dash-central.blade.php`
- `dash-tenant.blade.php`

The dashboard is an authenticated product surface, not the public storefront tracking surface.

### Required Template Changes

In both public layouts:

- add `@cookieconsentscripts` in the head
- add `@cookieconsentview` near the end of body
- replace unconditional analytics partial behavior with consent-aware rendering

Also gate the GTM `noscript` block in the tenant public layout using the same consent logic.

For parity, central GTM body behavior should be reviewed and aligned as part of this work.

---

## How To Ensure Controls Have Real Effect

This is the most important implementation rule.

### Runtime Truth Table

For every provider, the script should load only when:

- the provider is enabled in current scope settings
- the provider has a valid configured ID/domain
- the user has consented to the relevant category

If any of those conditions fails, the script must not be present in the HTML.

### Concrete Example

GA4 should render only when:

- `ga4_enabled = true`
- `ga4_measurement_id` is not null
- consent exists for analytics

Meta Pixel should render only when:

- `meta_pixel_enabled = true`
- `meta_pixel_id` is not null
- consent exists for marketing

### Manage/Reset Flow

The banner alone is not enough.

Users must be able to:

- accept essentials only
- accept all
- configure categories
- reset their choice later

This should be accessible from the storefront footer or legal links area.

---

## Data Model Changes Recommended

### GeneralSettings additions

- `privacy_policy_url`
- `cookie_policy_url`
- `ga4_enabled`
- `gtm_enabled`
- `clarity_enabled`
- `plausible_enabled`
- `meta_pixel_enabled`

### TenantSettings additions

- `privacy_policy_url`
- `cookie_policy_url`
- `ga4_enabled`
- `gtm_enabled`
- `clarity_enabled`
- `plausible_enabled`
- `meta_pixel_enabled`

### Why Toggles Are Needed Even Though IDs Already Exist

Provider IDs answer “how to connect”.

Provider toggles answer “should this provider run at all”.

That distinction is useful because:

- a tenant may want to keep IDs configured but temporarily disable a provider
- validation becomes clearer
- scripts become easier to gate predictably

---

## Permissions And UI Placement

No new permission system is required in V1.

Reuse existing settings permissions:

- central: `view settings` / `manage settings`
- tenant: `view settings` / `manage settings`

UI placement recommendation:

- keep existing `Analytics Integrations` section for provider identifiers
- add a separate `Cookie Consent` section directly below it

This keeps the distinction clear:

- analytics settings = provider configuration
- cookie consent settings = legal/runtime behavior

---

## Implementation Plan

### Phase 1. Package And Infrastructure

1. Install `whitecube/laravel-cookie-consent`.
2. Publish config, provider, views, and translations as needed.
3. Register `App\Providers\CookiesServiceProvider` in `bootstrap/providers.php`.
4. Register essential cookies and categories.
5. Keep consent cookie host-only.

### Phase 2. Settings Schema And Backend Validation

1. Add new settings fields for central and tenant scope.
2. Update settings classes.
3. Update settings controllers and validation.
4. Reject invalid provider and consent combinations.
5. Log settings changes through existing activity log patterns.

### Phase 3. Dashboard UI

1. Add central cookie consent controls.
2. Add tenant cookie consent controls.
3. Keep provider configuration and consent configuration visually separate.
4. Show validation hints when enabled providers are missing IDs or policy links.

### Phase 4. Storefront Enforcement

1. Add package directives to public layouts.
2. Refactor analytics partial into consent-aware rendering.
3. Gate GTM body `noscript` as well as head script.
4. Ensure central and tenant storefronts both use current-scope settings only.
5. Add a visible manage/reset cookies control in storefront UI.

### Phase 5. Browser Storage Cleanup

1. Review public locale persistence.
2. Prefer writing locale storage only after explicit language selection.
3. Document dashboard auth token storage as essential authenticated-service storage.

### Phase 6. Testing And CI

1. Add backend feature tests for central public pages.
2. Add backend feature tests for tenant public pages.
3. Add Playwright tests for banner visibility and consent behavior.
4. Add cross-tenant scoping assertions to prove one tenant’s consent does not affect another tenant.
5. Run backend CI and Playwright CI before merge.

---

## Test Plan

### Backend Feature Tests

Central public storefront:

- analytics scripts absent before consent
- analytics scripts present after analytics consent
- marketing scripts remain absent when only analytics consent is granted

Tenant public storefront:

- analytics scripts absent before consent
- analytics scripts present after analytics consent
- marketing scripts require separate consent
- consent cookie on tenant A does not enable scripts on tenant B

### Playwright

Central:

- banner appears on first visit
- accept essentials keeps trackers blocked
- accept analytics enables analytics scripts
- reset/manage cookies reopens configuration

Tenant:

- same checks as central
- tenant consent stays isolated to current tenant host

---

## Risks And Decisions

### Decision 1: Per-Host Consent

Recommended: yes.

This is the safest and simplest model.

### Decision 2: Shared Text Vs Tenant-Specific Copy

Recommended for V1:

- use shared translated copy from the package
- expose legal page URLs in settings
- avoid tenant-specific freeform banner copy in the first release

### Decision 3: Banner Enable Toggle

Recommended for V1:

- do not provide a free toggle that can disable consent while optional trackers are enabled
- compute banner necessity from enabled optional providers, or enforce validation strictly

### Decision 4: Provider Categories

Recommended fixed mapping:

- analytics: GA4, GTM, Clarity, Plausible
- marketing: Meta Pixel

Do not make this editable in the dashboard.

---

## Recommended Starting Scope For Implementation

Start with the smallest compliant version:

1. central + tenant public storefront banner
2. host-scoped consent cookie
3. analytics category
4. marketing category
5. consent-aware gating of existing providers
6. manage/reset control
7. backend + Playwright coverage

Defer until later:

- consent analytics dashboards
- inheritance from central to tenant
- custom per-tenant consent copy editor
- advanced consent mode integrations for external platforms

---

## Definition Of Done

This feature is done only when all of the following are true:

- public storefronts show consent UI when optional trackers are enabled
- no optional third-party scripts are rendered before consent
- scripts render after the correct consent is granted
- central and tenant consent remain isolated per host
- dashboard controls directly affect runtime behavior
- invalid settings combinations are rejected server-side
- tests cover both central and tenant flows
- CI passes for backend and Playwright

---

## Immediate Next Step

Implement Phase 1 and Phase 2 together:

- install the package
- add settings schema for consent controls
- wire backend validation first

That creates a safe foundation before touching storefront rendering.
