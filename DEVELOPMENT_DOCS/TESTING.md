# ByteForge Testing Guide

Last updated: January 31, 2026

---

## Overview

ByteForge uses a comprehensive testing strategy with both backend (PHPUnit/Laravel) and frontend (Vitest/React Testing Library) tests.

**Current Status:**
- ✅ **Backend:** 150+ tests passing (PHPUnit)
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

Tests use **Laravel's RefreshDatabase** trait with automatic seeding:
- **Database:** Tests run against `byteforge` MariaDB (not in-memory SQLite)
- **Seeding:** `TestFixturesSeeder` runs automatically (`$seed = true`)
- **Isolation:** Each test runs in a transaction that rolls back
- **Activity Logging:** Disabled during tests to avoid UUID/bigint mismatch

### Test Users

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

**Seeded Tenants:**
- `tenant-one` → `tenant-one.byteforge.se`
- `tenant-two` → `tenant-two.byteforge.se`
- `tenant-three` → `tenant-three.byteforge.se`

**All passwords:** `password`

### Test Organization

```
tests/
├── Feature/
│   ├── Api/           # API endpoint tests
│   │   ├── PageApiTest.php
│   │   ├── ThemeApiTest.php
│   │   └── MediaApiTest.php
│   └── Auth/          # Authentication tests
├── Unit/              # Unit tests for services/utilities
└── TestCase.php       # Base test class with helpers
```

### Writing Backend Tests

```php
<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Theme;

class ThemeApiTest extends TestCase
{
    public function test_superadmin_can_list_themes(): void
    {
        $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/themes')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'slug']]]);
    }

    public function test_tenant_cannot_delete_active_theme(): void
    {
        $theme = Theme::factory()->active()->create();

        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson("/api/themes/{$theme->id}")
            ->assertForbidden();
    }
}
```

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
