# ByteForge Testing Guide

Last updated: May 25, 2026

---

## Overview

ByteForge uses a comprehensive testing strategy with both backend (PHPUnit/Laravel) and frontend (Vitest/React Testing Library) tests.

**Current Status:**
- ✅ **Backend CI suites:** passing on `main` via `php artisan test` split suites
- ✅ **Frontend Vitest:** 90 files / 882 tests passing (latest CI-aligned run)
- ✅ **Playwright auth smoke:** central + tenant auth/permissions smoke passing in CI/deploy
- ✅ **Deploy smoke checks:** post-deploy API smoke, staging mail smoke (guest magic-link trigger), and browser smoke (including guest portal shell) passing

---

## Quick Commands

```bash
# Run all tests
npm run test && php artisan test

# Backend only
php artisan test
php artisan test --filter=ThemeTest        # Specific test class
php artisan test tests/Feature/Api/        # Specific directory

# Frontend only
npm run test           # Watch mode
npm run test:run       # Single run (CI mode)
npm run test:http-integration  # Live HTTP integration specs against a booted Laravel server
npm run test:ui        # Interactive UI
npm run test:coverage  # With coverage report

# E2E (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:report
```

### E2E Environment Notes

- Default central base URL: loaded from `.env` `APP_URL` when present (fallback: `http://localhost`); override with `PLAYWRIGHT_BASE_URL`
- Default tenant smoke base URL: derived from `.env` `TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE` using seeded tenant `tenant-one`; override with `PLAYWRIGHT_TENANT_BASE_URL`
- Optional tenant selector for local defaults: set `PLAYWRIGHT_TENANT_KEY` or `PLAYWRIGHT_TENANT_SLUG` to switch the derived tenant host without exporting a full URL
- Optional web server command: set `PLAYWRIGHT_WEB_SERVER_COMMAND` if you want Playwright to start the app automatically
- Console-error allowlist override: set `PLAYWRIGHT_CONSOLE_ALLOWLIST` with comma-separated regex fragments
- Optional credential overrides for authenticated flows:
  - `PLAYWRIGHT_CENTRAL_EMAIL`, `PLAYWRIGHT_CENTRAL_PASSWORD`
  - `PLAYWRIGHT_TENANT_OWNER_EMAIL`, `PLAYWRIGHT_TENANT_OWNER_PASSWORD`
  - `PLAYWRIGHT_TENANT_VIEWER_EMAIL`, `PLAYWRIGHT_TENANT_VIEWER_PASSWORD`

Example:

```bash
PLAYWRIGHT_BASE_URL=http://byteforge.se \
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.byteforge.se \
npm run test:e2e
```

Focused auth examples:

```bash
# Central auth smoke against shared development
PLAYWRIGHT_BASE_URL=http://dev.byteforge.se \
PLAYWRIGHT_CENTRAL_EMAIL=admin@dev.byteforge.se \
PLAYWRIGHT_CENTRAL_PASSWORD="<password>" \
npx playwright test tests/e2e/central-auth-flow.spec.ts

# Central auth smoke against staging
PLAYWRIGHT_BASE_URL=https://stage.byteforge.se \
PLAYWRIGHT_CENTRAL_EMAIL=admin@stage.byteforge.se \
PLAYWRIGHT_CENTRAL_PASSWORD="<password>" \
npx playwright test tests/e2e/central-auth-flow.spec.ts

# Tenant auth smoke against shared development
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.dev.byteforge.se \
PLAYWRIGHT_TENANT_OWNER_EMAIL=owner@tenant-one.dev.byteforge.se \
PLAYWRIGHT_TENANT_OWNER_PASSWORD="<password>" \
npx playwright test tests/e2e/tenant-auth-flow.spec.ts

# Tenant auth smoke against staging
PLAYWRIGHT_TENANT_BASE_URL=https://tenant-one.stage.byteforge.se \
PLAYWRIGHT_TENANT_OWNER_EMAIL=owner@tenant-one.stage.byteforge.se \
PLAYWRIGHT_TENANT_OWNER_PASSWORD="<password>" \
npx playwright test tests/e2e/tenant-auth-flow.spec.ts
```

Focused booking examples:

```bash
# Tenant booking create dialog coverage (slot + range availability-guided flows)
npm run test:run -- resources/js/apps/tenant/components/pages/Booking/__tests__/BookingsCalendarPage.test.tsx

# Guest portal booking management coverage
npm run test:run -- resources/js/apps/public/components/__tests__/GuestPortalPage.test.tsx resources/js/apps/public/components/__tests__/guestPortal.service.test.ts

# Booking backend slices used during recent booking UX work
php artisan test tests/Feature/Api/Booking/PublicBookingApiTest.php tests/Feature/Api/Booking/BookingHoldTest.php tests/Feature/Api/Booking/BookingCmsApiTest.php
php artisan test tests/Tenant/Feature/Api/TenantGuestBookingsTest.php

# Guest booking reschedule browser regression
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.dev.byteforge.se \
npx playwright test tests/e2e/guest-portal-shell.spec.ts -g "authenticated guest can reschedule a linked booking from the guest portal"

# Tenant manual booking browser regression
PLAYWRIGHT_TENANT_BASE_URL=http://tenant-one.dev.byteforge.se \
npx playwright test tests/e2e/booking-cms-regression.spec.ts -g "tenant owner can create a range-mode manual booking from the dashboard dialog"
```

Notes:

- the central auth spec now covers login/logout, reload-based session restore, and multi-tab logout invalidation through the HttpOnly refresh cookie
- the tenant auth spec now covers login/logout, reload-based session restore, and multi-tab logout invalidation through the HttpOnly refresh cookie
- the central and tenant auth specs now also cover expired refresh-session restore: a stale host-scoped refresh cookie must fail closed, clear browser auth state, and return the user to the login shell
- the tenant auth spec now also covers browser-level host scoping by asserting that a valid central refresh cookie cannot restore a tenant-host dashboard session
- `npm run test:http-integration` is the CI-aligned Node HTTP lane; it now exercises the live central auth, authorization/permissions, superadmin user-management, and tenant admin API specs under `tests/integration/` against a booted Laravel server
- the central auth spec skips cleanly when the configured base URL does not actually serve the login page, which avoids false-negative localhost/Apache 404 failures
- when running the tenant spec locally, only the owner credentials are required for this suite
- if local tenant or central login returns a Passport key readability error even though the key files exist, check the file mode on `storage/oauth-private.key`; Apache/FPM setups may need it group-readable (for example `0640`) after `php artisan passport:keys --force`
- the focused booking Playwright commands above assume the tenant dev host is
  resolvable and seeded with the usual tenant fixtures

> Linux host note: if Playwright reports missing browser dependencies, install them once with:
> `sudo npx playwright install-deps`

### Staging Deploy Smoke Notes

- `.github/workflows/deploy-staging.yml` now runs a post-deploy guest magic-link mail smoke request against the tenant host.
- Required secret: `STAGING_TENANT_BASE_URL`.
- Optional secret: `STAGING_MAIL_SMOKE_RECIPIENT` (defaults to `qa-mail-smoke@byteforge.se`).
- The smoke step validates that `POST /api/guest-auth/request-link` returns HTTP 200 and `{ "sent": true }`.
- The staging Playwright auth smoke can now also exercise reload-based tenant session restore when `STAGING_TENANT_BASE_URL` and the tenant owner credentials are present.
- Manual staging booking-operations verification (2026-05-26) succeeded once
  `laravel-queue.service` was configured with
  `queue:work --queue=notifications,default ...` under the writable
  `www-data` runtime user.
- A later 2026-05-26 staging pass also confirmed that the deploy workflow's
  post-`queue:restart` worker detection stayed green and that a real
  `booking.reminder_2h` message rendered the expected `in about 2 hours` copy.
- For future staging booking checks, verify the worker configuration first:

```bash
sudo systemctl show laravel-queue.service -p User -p Group -p ExecStart
ps -ww -o cmd= -p "$(systemctl show -p MainPID --value laravel-queue.service)"
sudo -u www-data bash -lc 'cd /var/www/byteforge && test -w storage && test -w storage/logs && test -w bootstrap/cache && echo "www-data runtime paths writable"'
```

---

## Backend Testing (Laravel/PHPUnit)

### Database Strategy

Tests use **`DatabaseTransactions`** with **pre-seeded data** (not `RefreshDatabase`):

- **Database:** Tests run against `byteforge` MariaDB (not in-memory SQLite)
- **Seeding:** `TestFixturesSeeder` must be run **once** before the test suite via `php artisan migrate:fresh --seed`. Tests do **not** re-seed on every run.
- **Isolation:** Each test runs inside a DB transaction that rolls back on tearDown. Seeded data (users, roles, tenants) persists across tests; data created during a test disappears automatically.
- **Activity Logging:** Disabled in `TestCase::setUp()` to avoid UUID/bigint column mismatch on the `activity_log` table.
- **Error Handler Safety:** `TestCase` snapshots and restores PHP error/exception handler stacks to prevent PHPUnit "risky test" warnings caused by Symfony ErrorHandler.

> **Important:** If you see "table not found" or missing seeded data errors, run `php artisan migrate:fresh --seed` once. You do **not** need to re-run this between test executions — `DatabaseTransactions` handles isolation.

### Test Users

All seeded users have the password `password`.

Primary fixture source: `TestFixturesSeeder`.

Email/domain shape is environment-driven:
- central users use `<role>@<central-domain>` where central domain is derived from `TENANCY_CENTRAL_DOMAINS` (fallback: `byteforge.se`)
- tenant users use `<role>@<tenant-domain>` where tenant domain is derived from `TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE` (fallback: `:tenant.byteforge.se`)

**Central Users (platform admins):**

| Email Pattern | Role | Helper |
|-------|------|--------|
| `superadmin@<central-domain>` | superadmin | `$this->actingAsSuperadmin()` |
| `admin@<central-domain>` | admin | `$this->actingAsCentralAdmin()` |
| `support@<central-domain>` | support | `$this->actingAsCentralSupport()` |
| `viewer@<central-domain>` | viewer | `$this->actingAsCentralViewer()` |

**Tenant Users (per tenant):**

| Pattern | Permissions | Helper |
|---------|-------------|--------|
| `owner@<tenant-domain>` | Full | `$this->actingAsTenantOwner('tenant-one')` |
| `editor@<tenant-domain>` | Edit | `$this->actingAsTenantEditor('tenant-one')` |
| `viewer@<tenant-domain>` | View only | `$this->actingAsTenantViewer('tenant-one')` |

**Fixed tenant-linked users (always seeded):**

| Email | Linked tenants |
|-------|----------------|
| `user.multiple@byteforge.test` | `tenant_one`, `tenant_two` |
| `user.single@byteforge.test` | `tenant_three` |

You can also use the generic role helper: `$this->actingAsCentralRole('admin')`

**Seeded Tenants:**
- `tenant-one`
- `tenant-two`
- `tenant-three`

**Direct user lookup (for assertions):**
```php
use Tests\Support\TestUsers;

$user    = TestUsers::centralSuperadmin();
$owner   = TestUsers::tenantOwner('tenant-one');
$tenant  = TestUsers::tenant('tenant-one');
```

### Test Organization

```
tests/
├── Central/
│   └── Feature/Api/      # Central-specific API tests (e.g., AuthApiTest)
├── Feature/
│   ├── Api/              # API endpoint tests (media, pages, themes, analytics, etc.)
│   ├── Services/         # Service integration tests
│   ├── ApiRoutesTest.php # Route permission matrix tests
│   ├── RbacTest.php      # RBAC verification
│   └── RolesPermissionsTest.php
├── Unit/
│   ├── Services/         # Unit tests for service classes
│   └── ExampleTest.php
├── Support/
│   ├── TestUsers.php         # Static helpers for seeded user lookup
│   ├── WithAuthentication.php # Auth helper trait (actingAs* methods)
│   ├── WithTenancy.php        # Tenant context helper trait
│   └── AssertsApi.php         # API assertion helpers
└── TestCase.php              # Base test class (all tests extend this)
```

### Writing Backend Tests

**Use seeded users — do NOT create users in tests** unless testing user creation itself. The helpers return real seeded users with proper roles and permissions already assigned.

```php
<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class ThemeApiTest extends TestCase
{
    public function test_superadmin_can_list_themes(): void
    {
        $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/themes')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'slug']]]);
    }

    public function test_viewer_cannot_manage_themes(): void
    {
        $this->actingAsCentralViewer()
            ->postJson('/api/superadmin/themes', ['name' => 'Test'])
            ->assertForbidden();
    }
}
```

**Testing within tenant context:**

```php
public function test_tenant_owner_can_list_pages(): void
{
    $this->actingAsTenantOwner('tenant-one')
        ->getJson('/api/pages')
        ->assertOk();
}

// Or use withinTenant() for manual context management:
public function test_tenant_isolation(): void
{
    $this->withinTenant('tenant-one', function () {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson('/api/pages')
            ->assertOk();
    });
}
```

**Key rules for new tests:**
1. Extend `Tests\TestCase` — it provides `DatabaseTransactions`, auth helpers, and tenancy helpers automatically.
2. Use `$this->actingAs*()` helpers — they return `$this` for fluent chaining.
3. Do not use `RefreshDatabase` — the base class already uses `DatabaseTransactions`.
4. Do not call seeders inside tests — data is pre-seeded.
5. Data created during a test (e.g., a new Page) is rolled back automatically after the test.

---

## Frontend Testing (Vitest/React Testing Library)

### What We Test

**HIGH VALUE:**
- ✅ Pure utility functions (`cn()`, formatters, validators)
- ✅ Service methods (token management, API helpers)
- ✅ Custom hooks (error boundaries, context checks)
- ✅ Puck component configurations
- ✅ Field controls (spacing, color, border, shadow)

**MEDIUM VALUE:**
- ✅ Form components with state
- ✅ Component interactions
- ✅ Theme resolution

**NOT TESTED (by design):**
- ❌ shadcn/ui components (library-tested)
- ❌ Simple presentational components
- ❌ Axios interceptors (E2E instead)
- ❌ Router navigation (E2E instead)

### Test Organization

```
resources/js/
├── shared/
│   ├── __tests__/                    # Shared utilities
│   │   ├── cn.test.ts
│   │   └── auth.service.test.ts
│   ├── hooks/__tests__/              # Hook tests
│   │   └── useTheme.test.tsx
│   └── puck/
│       ├── __tests__/                # Puck test utilities
│       │   └── testUtils.tsx
│       ├── components/__tests__/     # Component tests
│       └── fields/__tests__/         # Field control tests
└── apps/
    └── central/components/__tests__/ # Page-level tests
```

### Writing Frontend Tests

**Utility Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { cn } from '../utils/cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditionals', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });
});
```

**Component Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpacingControl } from '../SpacingControl';

describe('SpacingControl', () => {
  it('renders with default values', () => {
    render(<SpacingControl value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('calls onChange when value changes', async () => {
    const onChange = vi.fn();
    render(<SpacingControl value="8px" onChange={onChange} />);
    
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), '16');
    
    expect(onChange).toHaveBeenCalled();
  });
});
```

**Puck Component Tests:**
```typescript
import { renderPuckComponent, extractStyleTags } from '../testUtils';
import { Button } from '../../components/content/Button';

describe('Button Component', () => {
  it('should have inline: true in config', () => {
    expect(Button.inline).toBe(true);
  });

  it('renders with theme-resolved colors', () => {
    const { container } = renderPuckComponent(
      <ButtonRender id="test" label="Click me" />
    );
    const css = extractStyleTags(container).join('\n');
    
    // Should use theme tokens, not hardcoded colors
    expect(css).not.toContain('#3b82f6');
  });
});
```

---

## End-to-End Testing (Playwright)

Playwright smoke coverage lives in `tests/e2e/` and is focused on browser-runtime health:

- Central login shell bootstrap (`/login`)
- Tenant login shell bootstrap (`/login` on tenant domain) when `PLAYWRIGHT_TENANT_BASE_URL` is provided
- Central auth flow (`/login` -> `/dashboard` -> logout -> `/login`)
- Tenant owner auth flow (`/login` -> `/cms` -> logout -> `/login`)
- Tenant viewer permission gate (`/cms/settings` -> Access Denied)
- Focused booking regressions for guest portal booking management and tenant
  manual booking creation on the tenant host
- Runtime guardrails for:
  - Browser console errors
  - Uncaught page errors
  - Failed critical requests (document/script/stylesheet/xhr/fetch)

### Runtime Console Guard

`tests/e2e/support/consoleGuards.ts` fails tests when critical runtime issues are detected. A small default allowlist suppresses known noisy but non-blocking messages (for example favicon requests and ResizeObserver loop warnings).

When debugging noisy environments, you can append allowlist patterns without code changes:

```bash
PLAYWRIGHT_CONSOLE_ALLOWLIST="Hydration failed,Some third-party warning" npm run test:e2e
```

Keep this allowlist minimal. If a new error appears consistently, treat it as a bug first.

---

## Testing Requirements by PR Type

| Change Type | Required Tests |
|-------------|----------------|
| New Service | Unit + Feature tests (80%+ coverage) |
| New API Endpoint | Feature tests for happy/error paths |
| New Component | Component tests for props and interactions |
| New Puck Component | Config test + theme resolution + dragRef test |
| Refactoring | All existing tests must pass (no regressions) |
| Bug Fix | Add test that reproduces the bug |

---

## CI/CD Checklist

Before every PR:

```bash
# 1. Run all tests
npm run test:run && php artisan test

# 2. Check for lint errors
npm run lint

# 3. TypeScript check
npm run typecheck
```

For CI parity checks used on `main`:

```bash
composer audit --locked --no-interaction
npm audit --audit-level=high --no-fund
php artisan test --testsuite=Feature
php artisan test --testsuite=Central,Tenant,Unit
npm run test:run
npm run test:e2e:auth:central
```

---

## Common Issues

### Backend

**"Table not found" errors:**
```bash
php artisan migrate:fresh --seed
```

**Activity log UUID errors:**
Activity logging is disabled in tests via `TestCase::setUp()`.

### Frontend

**"usePuck must be inside <Puck>" errors:**
Wrap component in test provider or mock the hook:
```typescript
vi.mock('@puckeditor/core', () => ({
  usePuck: () => ({ appState: { ui: {} } })
}));
```

**Async test failures:**
Use `waitFor` or `findBy` queries:
```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

---

## Resources

- [Laravel Testing Docs](https://laravel.com/docs/testing)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
