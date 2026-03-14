# Phase 11: Dashboard Translation (i18n / Localization)

**Status**: In Progress (11.1 foundation underway)  
**Branch**: `feature/phase11-i18n`  
**Depends on**: Phase 10 Payments Core (complete, merged `8473575`)  
**Unblocks**: Arabic market expansion, tenant self-service in native language  
**Last Updated**: March 9, 2026

---

## Goal

Add full internationalization (i18n) to ByteForge across all surfaces:

1. **Central admin dashboard** — superadmins manage platform in their language
2. **Tenant admin dashboard** — tenant owners/editors work in their language
3. **Public storefront** — visitors see content in their language (future: translatable page content)

**Supported locales (launch):** English (`en`), Swedish (`sv`), Arabic (`ar`)

Arabic is a right-to-left (RTL) language. RTL support is built into the architecture from day one, not retrofitted.

---

## Core Principles

> **Detect automatically, let users override, persist the choice.**

```
Visitor lands on dashboard
        ↓
Is user authenticated?
  ├── YES → Read `preferred_locale` from user profile
  │         ├── Set? → Use it
  │         └── NULL? → Fall back to browser detection
  └── NO  → Browser detection (navigator.language)
        ↓
Browser detection logic:
  ├── starts with "sv" → Swedish
  ├── starts with "ar" → Arabic
  └── else             → English (default)
        ↓
Set i18next locale + document dir + lang attribute
        ↓
Persist choice in:
  ├── Authenticated user → `users.preferred_locale` column (API call)
  └── Anonymous visitor  → localStorage key `byteforge_locale`
```

No IP-based geolocation. Browser language is more reliable, privacy-friendly, and doesn't require external API calls.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| React i18n library | `react-i18next` + `i18next` | De facto standard; 10M+ weekly downloads, namespace support, lazy loading, interpolation, pluralization |
| Language detection | `i18next-browser-languagedetector` | Reads `navigator.language`, `localStorage`, `cookie` — configurable priority order |
| Laravel i18n | Built-in `__()` / `trans()` with JSON lang files | No extra packages; works out of the box for API error messages, emails, validation |
| Locale files format | JSON (one file per namespace per locale) | Flat, easy to diff in git, tooling-friendly. Example: `en/common.json`, `sv/billing.json` |
| RTL support | Tailwind `rtl:` variant + CSS logical properties + `dir` attribute | No extra CSS framework; Tailwind handles `rtl:` natively since v3.3 |
| Default locale | English (`en`) | Widest reach; Swedish and Arabic are opt-in |
| Locale persistence | `users.preferred_locale` (DB) + `localStorage` (anonymous) | DB for authenticated; localStorage for visitors |
| Scope of translation | UI chrome only (labels, buttons, messages, navigation) | Page content translation (CMS blocks) is a separate future feature |

---

## Architecture

### 1. Frontend (React)

```
resources/js/
├── i18n/
│   ├── index.ts                    ← i18next initialization + config
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json         ← Shared: nav, buttons, labels, errors
│   │   │   ├── billing.json        ← Billing page strings
│   │   │   ├── tenants.json        ← Tenant management strings
│   │   │   ├── pages.json          ← Page management strings
│   │   │   ├── themes.json         ← Theme management strings
│   │   │   ├── media.json          ← Media library strings
│   │   │   ├── users.json          ← User management strings
│   │   │   ├── settings.json       ← Settings page strings
│   │   │   ├── analytics.json      ← Analytics strings
│   │   │   ├── payments.json       ← Tenant payment strings
│   │   │   └── auth.json           ← Login, logout, profile strings
│   │   ├── sv/
│   │   │   ├── common.json
│   │   │   ├── billing.json
│   │   │   └── ... (same structure)
│   │   └── ar/
│   │       ├── common.json
│   │       ├── billing.json
│   │       └── ... (same structure)
│   └── useDirection.ts             ← Hook: returns 'ltr' | 'rtl' based on current locale
```

#### i18next Configuration

```typescript
// resources/js/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locale bundles (bundled, not lazy — dashboard is auth-gated anyway)
import enCommon from './locales/en/common.json';
import svCommon from './locales/sv/common.json';
import arCommon from './locales/ar/common.json';
// ... other namespaces

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, /* ...other namespaces */ },
      sv: { common: svCommon, /* ... */ },
      ar: { common: arCommon, /* ... */ },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'byteforge_locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
```

#### Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function BillingPage() {
  const { t } = useTranslation('billing');

  return (
    <PageHeader
      title={t('title')}              // "Billing" / "Fakturering" / "الفواتير"
      description={t('description')}   // "Manage plans..." / "Hantera planer..."
    />
  );
}
```

#### RTL Direction — shadcn/ui Native Support

shadcn/ui provides a built-in `DirectionProvider` (Radix-based) and `useDirection` hook.  
Install via CLI — **do not create custom direction components**:

```bash
npx shadcn@latest add direction
```

This generates `resources/js/components/ui/direction-provider.tsx` containing:
- `DirectionProvider` — wraps app, sets `dir` on Radix context
- `useDirection` — returns current `'ltr' | 'rtl'` from context

#### Wiring Direction to Language

```tsx
// In root App component or layout wrapper
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectionProvider } from '@/components/ui/direction-provider';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

function I18nDirectionProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const dir = useMemo(
    () => (RTL_LOCALES.has(i18n.language) ? 'rtl' : 'ltr'),
    [i18n.language],
  );

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language, dir]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
```

#### Using `useDirection` in Components

```tsx
import { useDirection } from '@/components/ui/direction-provider';

function Sidebar() {
  const dir = useDirection();
  return <Sheet side={dir === 'rtl' ? 'right' : 'left'}>…</Sheet>;
}
```

### 2. Backend (Laravel)

```
lang/
├── en.json          ← Flat key-value for Laravel __() calls
├── sv.json
├── ar.json
├── en/
│   ├── validation.php   ← Laravel validation messages (override defaults)
│   ├── passwords.php
│   └── auth.php
├── sv/
│   ├── validation.php
│   ├── passwords.php
│   └── auth.php
└── ar/
    ├── validation.php
    ├── passwords.php
    └── auth.php
```

#### Locale Middleware

```php
// app/Http/Middleware/SetLocale.php
class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        $locale = 'en'; // default

        // 1. Authenticated user preference
        if (Auth::check() && Auth::user()->preferred_locale) {
            $locale = Auth::user()->preferred_locale;
        }
        // 2. Accept-Language header
        elseif ($preferred = $request->getPreferredLanguage(['en', 'sv', 'ar'])) {
            $locale = $preferred;
        }

        if (in_array($locale, ['en', 'sv', 'ar'], true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
```

#### User Locale Persistence

```php
// Migration: add preferred_locale to users table
Schema::table('users', function (Blueprint $table) {
    $table->string('preferred_locale', 5)->nullable()->after('email');
});
```

```php
// API endpoint: PATCH /auth/locale
public function updateLocale(Request $request): JsonResponse
{
    $validated = $request->validate([
        'locale' => ['required', 'string', Rule::in(['en', 'sv', 'ar'])],
    ]);

    $request->user()->update(['preferred_locale' => $validated['locale']]);

    return response()->json(['locale' => $validated['locale']]);
}
```

### 3. Language Selector Component

```tsx
// resources/js/shared/components/molecules/LanguageSelector.tsx
// Dropdown in dashboard header bar — shows flag emoji + language name
// Options: 🇬🇧 English | 🇸🇪 Svenska | 🇸🇦 العربية
// On change:
//   1. i18n.changeLanguage(locale)
//   2. If authenticated: PATCH /auth/locale
//   3. Document dir + lang updated via DirectionProvider
```

Placement: top-right of dashboard header, next to user avatar/menu.

---

## RTL Strategy

### Tailwind CSS Logical Properties

Tailwind v3.3+ supports the `rtl:` variant. However, the cleaner approach is **CSS logical properties** which adapt automatically without `rtl:` prefixes:

| Physical (avoid) | Logical (prefer) | Tailwind Class |
|-------------------|-------------------|----------------|
| `margin-left` | `margin-inline-start` | `ms-4` |
| `margin-right` | `margin-inline-end` | `me-4` |
| `padding-left` | `padding-inline-start` | `ps-4` |
| `padding-right` | `padding-inline-end` | `pe-4` |
| `text-align: left` | `text-align: start` | `text-start` |
| `text-align: right` | `text-align: end` | `text-end` |
| `float: left` | `float: inline-start` | `float-start` |
| `border-left` | `border-inline-start` | `border-s` |
| `left: 0` | `inset-inline-start: 0` | `start-0` |
| `right: 0` | `inset-inline-end: 0` | `end-0` |

### Migration Path

1. **Phase A (foundation):** Set up i18n infra, install shadcn `DirectionProvider` (`npx shadcn@latest add direction`), logical property lint rule
2. **Phase B (bulk migration):** Run `npx shadcn@latest migrate rtl resources/js` to auto-convert all physical → logical classes
3. **Phase C (manual fixes):** Fix Calendar, Pagination, Sidebar manually; add `rtl:rotate-180` to directional icons; add `dir` prop to portal-based components (Popover, Tooltip, DropdownMenu)
4. **Phase D (new code):** All new components use logical properties only
5. **Phase E (verification):** Manual RTL QA pass on all dashboard pages

### shadcn/ui RTL Tooling

shadcn provides first-class RTL support via its CLI and Radix primitives:

#### CLI Migration (`shadcn@latest migrate rtl`)

Automatically transforms physical Tailwind classes → logical equivalents in existing component files:

```bash
# Migrate all components under a path
npx shadcn@latest migrate rtl resources/js/components

# Migrate specific file
npx shadcn@latest migrate rtl resources/js/components/ui/sheet.tsx
```

**Auto-transformed classes:**
`ml-` → `ms-`, `mr-` → `me-`, `pl-` → `ps-`, `pr-` → `pe-`,  
`left-` → `start-`, `right-` → `end-`, `text-left` → `text-start`, `text-right` → `text-end`,  
`rounded-l-` → `rounded-s-`, `rounded-r-` → `rounded-e-`,  
`border-l-` → `border-s-`, `border-r-` → `border-e-`,  
`scroll-ml-` → `scroll-ms-`, `scroll-mr-` → `scroll-me-`,  
`float-left` → `float-start`, `float-right` → `float-end`,  
`clear-left` → `clear-start`, `clear-right` → `clear-end`

#### Icon Flipping

For directional icons (arrows, chevrons, etc.), use shadcn's `rtl:rotate-180` utility:

```tsx
<ChevronRight className="rtl:rotate-180" />
```

#### Manual Migration Required

These components need manual RTL adjustments (not handled by CLI):

- **Calendar** — day grid and navigation arrows
- **Pagination** — previous/next buttons
- **Sidebar** — panel positioning and collapse direction

#### Portal Elements (Popover, Tooltip, DropdownMenu, etc.)

Radix portals render outside the app's `DirectionProvider` context. For correct animation direction, pass `dir` explicitly:

```tsx
import { useDirection } from '@/components/ui/direction-provider';

function MyPopover() {
  const dir = useDirection();
  return (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent dir={dir}>…</PopoverContent>
    </Popover>
  );
}
```

#### Additional RTL Watch Areas

- **Sheet/Drawer:** `side="left"` → needs conditional `side={dir === 'rtl' ? 'right' : 'left'}`
- **Toasts:** Position may need mirroring
- **Tables:** Alignment adapts automatically with logical properties

---

## Namespace Structure

Each namespace corresponds to a dashboard domain. This keeps locale files small and focused.

| Namespace | Scope | Example keys |
|-----------|-------|--------------|
| `common` | Shared across all pages | `save`, `cancel`, `delete`, `confirm`, `search`, `loading`, `error`, `success` |
| `auth` | Login, logout, profile | `login.title`, `login.email`, `login.password`, `profile.update_success` |
| `billing` | Central billing page | `title`, `plans.choose`, `plans.current`, `addons.activate`, `subscription.status` |
| `tenants` | Tenant management | `title`, `create`, `edit`, `domain`, `status` |
| `pages` | Page management | `title`, `editor`, `publish`, `draft`, `delete_confirm` |
| `themes` | Theme management | `title`, `activate`, `reset`, `customize`, `preview` |
| `media` | Media library | `title`, `upload`, `folders`, `delete_confirm`, `picker.select` |
| `users` | User management | `title`, `create`, `roles`, `permissions` |
| `settings` | Settings pages | `title`, `general`, `email`, `save_success` |
| `analytics` | Analytics dashboards | `title`, `page_views`, `revenue`, `date_range` |
| `payments` | Tenant payments | `title`, `providers`, `transactions`, `refund` |
| `navigation` | Site navigation | `title`, `add_item`, `reorder`, `menu_type` |
| `validation` | Form validation messages | `required`, `email_invalid`, `min_length`, `max_length` |

---

## Sub-Phases

### 11.1 — Foundation + Infrastructure

**Scope:**
- Install `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- Create `resources/js/i18n/index.ts` config
- Install shadcn `DirectionProvider` via `npx shadcn@latest add direction`
- Create `I18nDirectionProvider` wrapper (syncs i18n language → shadcn `DirectionProvider`)
- Create `LanguageSelector` component (UI only, no persistence yet)
- Add `preferred_locale` column to `users` table (migration)
- Add `SetLocale` middleware to Laravel
- Add `PATCH /auth/locale` endpoint
- Wire `LanguageSelector` into both central + tenant dashboard headers
- Create empty locale files for all namespaces × 3 locales

**Gate:** Language selector appears in header, switching locale changes `dir` + `lang` on document, i18next detects browser language correctly.

### 11.2 — Extract Central Dashboard Strings (English baseline)

**Scope:**
- Extract all hardcoded strings from central dashboard components into `en/*.json` locale files
- Replace strings with `t('key')` calls in all central admin pages:
  - Dashboard home, Tenants, Users, Roles, Permissions
  - Pages, Themes, Navigation, Media, Settings
  - Activity logs, Analytics, Billing
- Common strings (buttons, labels, table headers) go in `common` namespace

**Gate:** Central dashboard renders 100% from locale keys (no hardcoded English strings). English display is unchanged.

### 11.3 — Swedish Translation

**Scope:**
- Translate all English locale files to Swedish (`sv/*.json`)
- Swedish validation messages (`lang/sv/validation.php`)
- Verify all pages render correctly in Swedish
- Fix any layout issues from longer Swedish strings

**Gate:** Full central + tenant dashboard functional in Swedish. No untranslated keys visible.

### 11.4 — Arabic Translation + RTL

**Scope:**
- Translate all English locale files to Arabic (`ar/*.json`)
- Arabic validation messages (`lang/ar/validation.php`)
- Run `npx shadcn@latest migrate rtl resources/js` to bulk-convert physical → logical CSS classes
- Manually fix Calendar, Pagination, Sidebar RTL layout
- Add `rtl:rotate-180` to all directional icons (arrows, chevrons)
- Add `dir` prop to portal-based component usage (Popover, Tooltip, DropdownMenu)
- Fix Sheet/Drawer side direction, toast positioning
- RTL QA pass on every dashboard page

**Gate:** Full dashboard functional in Arabic with correct RTL layout. No text overflow, no misaligned icons, no broken navigation.

### 11.5 — Tenant Dashboard + Storefront Strings

**Scope:**
- Extract hardcoded strings from tenant dashboard pages
- Translate tenant strings to Swedish + Arabic
- Add locale detection for public storefront visitors
- Storefront chrome (nav labels, footer text) follows visitor locale

**Gate:** Tenant dashboard + storefront chrome fully translated in all 3 locales.

### 11.6 — Persistence + API Integration

**Scope:**
- Wire `LanguageSelector` to `PATCH /auth/locale` for authenticated users
- On login, read `preferred_locale` from user profile and set i18next locale
- Anonymous visitors persist choice in `localStorage`
- Laravel API responses return localized validation errors based on user locale
- Test locale round-trip: set → persist → reload → correct locale restored

**Gate:** User sets Arabic → refreshes page → dashboard loads in Arabic with RTL. Locale survives logout/login cycle.

---

## Packages to Install

| Package | Purpose | Context |
|---------|---------|---------|
| `i18next` | Core i18n framework | Frontend |
| `react-i18next` | React bindings for i18next | Frontend |
| `i18next-browser-languagedetector` | Auto-detect browser language | Frontend |

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

No new backend packages — Laravel's built-in localization is sufficient.

---

## Estimated String Counts

Based on current codebase scan:

| Area | Estimated strings | Notes |
|------|-------------------|-------|
| Common (shared) | ~60 | Buttons, labels, table headers, status badges |
| Auth | ~25 | Login form, profile page, password update |
| Billing | ~40 | Plans, addons, subscription summary, checkout |
| Tenants | ~30 | CRUD, domain config, user assignment |
| Pages | ~35 | Editor, list, publish flow, templates |
| Themes | ~40 | Builder, customizer, sections, publish |
| Media | ~25 | Upload, folders, picker, delete confirm |
| Users/Roles | ~30 | CRUD, role assignment, permissions |
| Settings | ~15 | General, email config |
| Analytics | ~25 | Dashboard, widgets, date ranges |
| Payments | ~30 | Providers, transactions, refunds |
| Navigation | ~20 | Items, menu types, reorder |
| Validation | ~30 | Form error messages |
| **Total** | **~405** | Per locale; ×3 = ~1,215 translation entries |

---

## Translation Workflow

### Adding a new string

1. Add key + English value to `en/<namespace>.json`
2. Add Swedish translation to `sv/<namespace>.json`
3. Add Arabic translation to `ar/<namespace>.json`
4. Use `t('namespace:key')` in component

### Missing translation fallback

i18next falls back to English automatically. If a Swedish key is missing, the English value shows. This prevents blank UI during development.

### Translation QA

```bash
# Script to find missing keys across locales (future tooling)
node scripts/i18n-check.ts
```

Outputs a report of keys present in `en` but missing in `sv` or `ar`.

---

## File Impact Summary

### New Files

| File | Purpose |
|------|---------|
| `resources/js/i18n/index.ts` | i18next initialization |
| `resources/js/components/ui/direction-provider.tsx` | shadcn `DirectionProvider` + `useDirection` (generated by CLI) |
| `resources/js/i18n/I18nDirectionProvider.tsx` | Wrapper: syncs i18n language → shadcn `DirectionProvider` |
| `resources/js/shared/components/molecules/LanguageSelector.tsx` | Locale picker dropdown |
| `resources/js/i18n/locales/en/*.json` | English locale files (11 namespaces) |
| `resources/js/i18n/locales/sv/*.json` | Swedish locale files |
| `resources/js/i18n/locales/ar/*.json` | Arabic locale files |
| `lang/en.json`, `lang/sv.json`, `lang/ar.json` | Laravel API translation files |
| `lang/sv/validation.php` | Swedish validation messages |
| `lang/ar/validation.php` | Arabic validation messages |
| `app/Http/Middleware/SetLocale.php` | Laravel locale middleware |
| `database/migrations/xxx_add_preferred_locale_to_users.php` | User locale column |
| `scripts/i18n-check.ts` | Missing translation key checker |

### Modified Files

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/AuthController.php` | Add `updateLocale()` method |
| `routes/api.php` | Add `PATCH /auth/locale` route |
| `bootstrap/app.php` | Register `SetLocale` middleware |
| `resources/js/apps/central/App.tsx` | Wrap in `I18nDirectionProvider`, import i18n |
| `resources/js/apps/tenant/App.tsx` | Wrap in `I18nDirectionProvider`, import i18n |
| Every dashboard page component | Replace hardcoded strings with `t()` calls |
| All layout/sidebar/header components | Replace hardcoded strings with `t()` calls |
| Components using `ml-`, `mr-`, `pl-`, `pr-` | Migrate to `ms-`, `me-`, `ps-`, `pe-` logical equivalents |

---

## Out of Scope (Future)

- **Translatable CMS page content** — would require a `page_translations` table and per-block language variants. This is a content management feature, not a UI chrome feature. Separate planning doc needed.
- **Locale-aware URLs** (`/sv/about`, `/ar/about`) — URL routing changes are a storefront concern, not dashboard.
- **Additional locales beyond en/sv/ar** — Architecture supports any locale; adding more is just translation work.
- **Machine translation integration** — Could auto-translate locale files via API, but manual review is required for quality.
