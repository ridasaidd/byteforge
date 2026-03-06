# ByteForge Testing Guide

Last updated: March 6, 2026

---

## Overview

ByteForge uses a comprehensive testing strategy with both backend (PHPUnit/Laravel) and frontend (Vitest/React Testing Library) tests.

**Current Status:**
- ✅ **Backend:** 217 tests passing, 14 skipped (PHPUnit 12.x)
- ✅ **Frontend:** 700+ tests passing (Vitest)

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
npm run test:ui        # Interactive UI
npm run test:coverage  # With coverage report
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

**Central Users (platform admins):**

| Email | Role | Helper |
|-------|------|--------|
| `superadmin@byteforge.se` | superadmin | `$this->actingAsSuperadmin()` |
| `admin@byteforge.se` | admin | `$this->actingAsCentralAdmin()` |
| `support@byteforge.se` | support | `$this->actingAsCentralSupport()` |
| `viewer@byteforge.se` | viewer | `$this->actingAsCentralViewer()` |

**Tenant Users (per tenant):**

| Pattern | Permissions | Helper |
|---------|-------------|--------|
| `owner@tenant-X.byteforge.se` | Full | `$this->actingAsTenantOwner('tenant-one')` |
| `editor@tenant-X.byteforge.se` | Edit | `$this->actingAsTenantEditor('tenant-one')` |
| `viewer@tenant-X.byteforge.se` | View only | `$this->actingAsTenantViewer('tenant-one')` |

You can also use the generic role helper: `$this->actingAsCentralRole('admin')`

**Seeded Tenants:**
- `tenant-one` → `tenant-one.byteforge.se`
- `tenant-two` → `tenant-two.byteforge.se`
- `tenant-three` → `tenant-three.byteforge.se`

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
