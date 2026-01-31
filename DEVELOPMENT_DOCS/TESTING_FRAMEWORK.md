# ByteForge Testing Framework

Last updated: January 31, 2026

---

## Overview

ByteForge uses **Laravel's RefreshDatabase** trait with automatic seeding. Each test runs in a database transaction that rolls back after the test completes, ensuring test isolation while the `TestFixturesSeeder` provides consistent test users and tenants.

### Key Points

- **Database**: Tests run against the `byteforge` MariaDB database (not in-memory SQLite)
- **Seeding**: `TestFixturesSeeder` runs automatically before each test (`$seed = true`)
- **Isolation**: Each test runs in a transaction that rolls back (data from tests doesn't persist)
- **Activity Logging**: Disabled during tests to avoid UUID/bigint column mismatch
- **Authentication**: Use `$this->actingAsSuperadmin()` and similar helpers (NOT `Passport::actingAs()`)

---

## Quick Reference

### Seeded Test Users

**Central Users** (platform admins):
| Email | Role | Usage |
|-------|------|-------|
| `superadmin@byteforge.se` | superadmin | `$this->actingAsSuperadmin()` |
| `admin@byteforge.se` | admin | `$this->actingAsCentralAdmin()` |
| `support@byteforge.se` | support | `$this->actingAsCentralSupport()` |
| `viewer@byteforge.se` | viewer | `$this->actingAsCentralViewer()` |

**Tenant Users** (per tenant: tenant-one, tenant-two, tenant-three):
| Email Pattern | Permissions | Usage |
|---------------|-------------|-------|
| `owner@tenant-X.byteforge.se` | Full permissions | `$this->actingAsTenantOwner('tenant-one')` |
| `editor@tenant-X.byteforge.se` | Edit permissions | `$this->actingAsTenantEditor('tenant-one')` |
| `viewer@tenant-X.byteforge.se` | View only | `$this->actingAsTenantViewer('tenant-one')` |

**Seeded Tenants**:
- `tenant-one` → `tenant-one.byteforge.se`
- `tenant-two` → `tenant-two.byteforge.se`
- `tenant-three` → `tenant-three.byteforge.se`

**All passwords**: `password`

---

## Test Organization

```
tests/
├── Central/                    # Central admin tests (superadmin, admin, etc.)
│   ├── Feature/               # API, controller tests
│   └── Unit/                  # Service, model tests
├── Tenant/                     # Tenant-scoped tests
│   ├── Feature/               # Tenant API tests
│   └── Unit/                  # Tenant service tests
├── Shared/                     # Tests for shared functionality
│   ├── Feature/               # Shared API tests
│   └── Unit/                  # Shared service tests
├── Support/                    # Test helpers & traits
│   ├── TestUsers.php          # User/tenant lookup helpers
│   ├── WithAuthentication.php # Authentication helpers
│   ├── WithTenancy.php        # Tenant context helpers
│   └── AssertsApi.php         # API assertion helpers
├── Feature/                    # Legacy feature tests
├── Unit/                       # Legacy unit tests
└── TestCase.php               # Base test case
```

### Running Tests

```bash
# Run all tests
php artisan test

# Run by suite
php artisan test --testsuite=Central
php artisan test --testsuite=Tenant
php artisan test --testsuite=Shared
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run specific test file
php artisan test tests/Central/Feature/PagesApiTest.php

# Run with coverage
php artisan test --coverage
```

---

## Writing Tests

### Central API Test Example

```php
<?php

namespace Tests\Central\Feature;

use Tests\TestCase;

class PagesApiTest extends TestCase
{
    public function test_superadmin_can_list_pages(): void
    {
        $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/pages')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'total'],
            ]);
    }

    public function test_viewer_cannot_create_pages(): void
    {
        $this->actingAsCentralViewer()
            ->postJson('/api/superadmin/pages', [
                'title' => 'Test Page',
                'slug' => 'test-page',
            ])
            ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_pages(): void
    {
        $this->getJson('/api/superadmin/pages')
            ->assertUnauthorized();
    }
}
```

### Tenant API Test Example

```php
<?php

namespace Tests\Tenant\Feature;

use Tests\TestCase;

class TenantPagesApiTest extends TestCase
{
    public function test_tenant_owner_can_list_pages(): void
    {
        $this->withinTenant('tenant-one', function () {
            $this->actingAsTenantOwner('tenant-one')
                ->getJson('/api/pages')
                ->assertOk();
        });
    }

    public function test_tenant_user_cannot_access_other_tenant_data(): void
    {
        // User from tenant-one should not access tenant-two's data
        $this->withinTenant('tenant-two', function () {
            $this->actingAsTenantOwner('tenant-one')
                ->getJson('/api/pages')
                ->assertForbidden();
        });
    }
}
```

### Permission-Based Test Example

```php
<?php

namespace Tests\Central\Feature;

use Tests\TestCase;
use Tests\Support\TestUsers;

class ThemesPermissionTest extends TestCase
{
    public function test_user_with_themes_view_can_list_themes(): void
    {
        $this->actingAsUserWithPermissions(['themes.view'])
            ->getJson('/api/superadmin/themes')
            ->assertOk();
    }

    public function test_user_without_themes_manage_cannot_create_theme(): void
    {
        $this->actingAsUserWithPermissions(['themes.view'])
            ->postJson('/api/superadmin/themes', [
                'name' => 'Test Theme',
            ])
            ->assertForbidden();
    }

    public function test_user_with_no_permissions_is_forbidden(): void
    {
        $this->actingAsUserWithNoPermissions()
            ->getJson('/api/superadmin/themes')
            ->assertForbidden();
    }
}
```

---

## Authentication Helpers

All helpers are available via the `WithAuthentication` trait (included in `TestCase`).

### Seeded User Authentication

```php
// Central users
$this->actingAsSuperadmin();           // superadmin@byteforge.se
$this->actingAsCentralAdmin();         // editor@byteforge.se (admin role)
$this->actingAsCentralSupport();       // manager@byteforge.se (support role)
$this->actingAsCentralViewer();        // viewer@byteforge.se

// By role name
$this->actingAsCentralRole('superadmin');
$this->actingAsCentralRole('admin');

// Tenant users
$this->actingAsTenantOwner('tenant-one');    // Full permissions
$this->actingAsTenantOwner('tenant-three');  // Full permissions
$this->actingAsTenantEditor();               // View-only (tenant-two)
$this->actingAsTenantUser('tenant-one');     // By tenant slug
```

### Custom User Authentication

```php
// User with specific permissions
$this->actingAsUserWithPermissions(['pages.view', 'pages.edit']);

// User with no permissions (for testing 403)
$this->actingAsUserWithNoPermissions();

// Custom user
$user = TestUsers::createCentralUser('admin', ['extra.permission']);
$this->actingAsUser($user);
```

---

## Tenancy Helpers

All helpers are available via the `WithTenancy` trait (included in `TestCase`).

### Within Tenant Context

```php
// Execute code within tenant context (auto cleanup)
$this->withinTenant('tenant-one', function () {
    $this->actingAsTenantOwner('tenant-one')
        ->getJson('/api/pages')
        ->assertOk();
});

// Manual tenant context (remember to call endTenant!)
$this->initializeTenant('tenant-one');
// ... test code ...
$this->endTenant();
```

### Tenant Assertions

```php
$this->assertInTenantContext('tenant-one');
$this->assertInCentralContext();
```

### Tenant Domain Requests

```php
// Request with tenant domain
$this->forTenant('tenant-one')
    ->getJson('/api/pages');

// Request with central domain
$this->forCentral()
    ->getJson('/api/superadmin/pages');
```

---

## API Assertion Helpers

All helpers are available via the `AssertsApi` trait.

### Response Structure

```php
$response = $this->actingAsSuperadmin()->getJson('/api/superadmin/pages');

$this->assertPaginatedResponse($response);     // Has data + meta.current_page, etc.
$this->assertResourceResponse($response);       // Has data.id
$this->assertCreatedResponse($response);        // 201 + data.id
$this->assertDeletedResponse($response);        // 200 + message
```

### Error Assertions

```php
$this->assertValidationError($response, 'title');
$this->assertUnauthorizedResponse($response);   // 401
$this->assertForbiddenResponse($response);      // 403
$this->assertNotFoundResponse($response);       // 404
```

### Permission Assertions

```php
$this->actingAsSuperadmin()
    ->assertUserCanAccess('GET', '/api/superadmin/pages');

$this->actingAsCentralViewer()
    ->assertUserCannotAccess('POST', '/api/superadmin/pages', ['title' => 'Test']);

$this->assertRequiresAuthentication('GET', '/api/superadmin/pages');
```

---

## TestUsers Helper

Direct access to users and tenants without authentication:

```php
use Tests\Support\TestUsers;

// Get seeded users
$superadmin = TestUsers::centralSuperadmin();
$admin = TestUsers::centralAdmin();
$tenantOwner = TestUsers::tenantOwner('tenant-one');

// Get seeded tenants
$tenant = TestUsers::tenant('tenant-one');
$allTenants = TestUsers::allTenants();

// Create new users for custom tests
$user = TestUsers::createCentralUser('admin', ['custom.permission']);
$tenantUser = TestUsers::createTenantUser('tenant-one', 'staff', ['pages.view']);
$noPermsUser = TestUsers::createUserWithNoPermissions();
$customUser = TestUsers::createUserWithPermissions(['pages.view', 'pages.edit']);
```

---

## Best Practices

### 1. Use Seeded Users When Possible

```php
// ✅ Good - uses seeded user
$this->actingAsSuperadmin()->getJson('/api/pages');

// ❌ Avoid - creates unnecessary user
$user = User::factory()->create();
$user->assignRole('superadmin');
$this->actingAs($user)->getJson('/api/pages');
```

### 2. Use Fluent Assertions

```php
// ✅ Good - fluent chain
$this->actingAsSuperadmin()
    ->getJson('/api/pages')
    ->assertOk()
    ->assertJsonStructure(['data', 'meta']);

// ❌ Avoid - split assertions
$response = $this->actingAsSuperadmin()->getJson('/api/pages');
$this->assertEquals(200, $response->status());
```

### 3. Test Permissions Explicitly

```php
// ✅ Good - tests both access and denial
public function test_pages_requires_view_permission(): void
{
    $this->actingAsUserWithPermissions(['pages.view'])
        ->getJson('/api/superadmin/pages')
        ->assertOk();

    $this->actingAsUserWithNoPermissions()
        ->getJson('/api/superadmin/pages')
        ->assertForbidden();
}
```

### 4. Clean Up Tenant Context

```php
// ✅ Good - withinTenant handles cleanup
$this->withinTenant('tenant-one', function () {
    // test code
});

// ⚠️ Manual approach - don't forget endTenant!
$this->initializeTenant('tenant-one');
try {
    // test code
} finally {
    $this->endTenant();
}
```

### 5. Organize by Domain

```
tests/Central/Feature/
├── PagesApiTest.php
├── ThemesApiTest.php
├── UsersApiTest.php
└── TenantsApiTest.php

tests/Tenant/Feature/
├── TenantPagesApiTest.php
├── TenantThemesApiTest.php
└── TenantSettingsApiTest.php
```

---

## Migration Guide

### From Old Approach

**Before:**
```php
$user = User::factory()->create();
$superadminRole = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
$user->syncRoles([$superadminRole]);
$response = $this->actingAs($user, 'api')->getJson('/api/pages');
```

**After:**
```php
$this->actingAsSuperadmin()->getJson('/api/pages');
```

### From Passport::actingAs

**Before:**
```php
Passport::actingAs($user, ['manage-users'], 'api');
$response = $this->getJson('/api/pages');
```

**After:**
```php
$this->actingAsSuperadmin()->getJson('/api/pages');
```

---

## Troubleshooting

### "No seeded user found"

Run TestFixturesSeeder:
```bash
php artisan db:seed --class=TestFixturesSeeder
```

### "Tenant not found"

Ensure tenants are seeded:
```bash
php artisan db:seed --class=TestFixturesSeeder
```

### Permission cache issues

Clear permission cache in test:
```php
$this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
```

(This is already done in `TestCase::setUp()`)

### Tenant context not ending

Use `withinTenant()` instead of manual `initializeTenant()`:
```php
$this->withinTenant('tenant-one', function () {
    // context is auto-cleaned
});
```

---

## Creating New Backend Tests

### Step-by-Step Guide

#### 1. Create the Test File

Choose the appropriate location based on what you're testing:

```bash
# Central admin API tests
tests/Feature/Api/YourNewTest.php

# Or in the organized structure (preferred for new tests)
tests/Central/Feature/Api/YourNewTest.php   # Central admin features
tests/Tenant/Feature/Api/YourNewTest.php    # Tenant-scoped features
tests/Shared/Feature/YourNewTest.php        # Shared functionality
```

#### 2. Basic Test Template

```php
<?php

namespace Tests\Feature\Api;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class YourNewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Optional: Any test-specific setup
        // Storage::fake('public');
    }

    #[Test]
    public function it_does_something(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/your-endpoint');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name'],
                ],
            ]);
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        // No actingAs - tests unauthenticated access
        $response = $this->getJson('/api/superadmin/your-endpoint');
        
        $response->assertStatus(401);
    }

    #[Test]
    public function it_requires_proper_permissions(): void
    {
        // Regular user without permissions
        $regularUser = \App\Models\User::factory()->create();
        
        $response = $this->actingAs($regularUser, 'api')
            ->getJson('/api/superadmin/your-endpoint');
        
        $response->assertStatus(403);
    }
}
```

#### 3. Key Rules

**DO:**
```php
// ✅ Use authentication helpers
$this->actingAsSuperadmin()->getJson('/api/...');
$this->actingAsTenantOwner('tenant-one')->postJson('/api/...');

// ✅ Use seeded users from TestUsers helper
use Tests\Support\TestUsers;
$user = TestUsers::centralSuperadmin();
$owner = TestUsers::tenantOwner('tenant-one');

// ✅ Use withinTenant for tenant context
$this->withinTenant('tenant-one', function () {
    $this->actingAsTenantOwner('tenant-one')
        ->getJson('/api/pages')
        ->assertOk();
});

// ✅ Chain assertions
$response->assertStatus(200)
    ->assertJsonPath('data.name', 'Expected Name')
    ->assertJsonCount(3, 'data');
```

**DON'T:**
```php
// ❌ Don't use Passport::actingAs directly
Passport::actingAs($user);

// ❌ Don't use RefreshDatabase or DatabaseTransactions traits (already in TestCase)
use RefreshDatabase;  // Not needed!

// ❌ Don't manually seed users for authentication
$user = User::factory()->create();
$role = Role::where('name', 'superadmin')->first();
$user->syncRoles([$role]);
// Just use: $this->actingAsSuperadmin()

// ❌ Don't forget to authenticate API calls
$this->getJson('/api/superadmin/pages');  // Will get 401!
```

#### 4. Testing with Models

When creating models in tests, use the seeded superadmin for `created_by` fields:

```php
use Tests\Support\TestUsers;

#[Test]
public function it_can_update_a_resource(): void
{
    $user = TestUsers::centralSuperadmin();
    
    $resource = YourModel::create([
        'name' => 'Test Resource',
        'created_by' => $user->id,
    ]);

    $response = $this->actingAsSuperadmin()
        ->putJson("/api/superadmin/resources/{$resource->id}", [
            'name' => 'Updated Name',
        ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('your_table', ['name' => 'Updated Name']);
}
```

#### 5. Testing Tenant-Scoped Features

```php
#[Test]
public function tenant_owner_can_manage_pages(): void
{
    $this->withinTenant('tenant-one', function () {
        // Create a page in this tenant context
        $page = \App\Models\Page::factory()->create([
            'tenant_id' => 'tenant-one',
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->putJson("/api/pages/{$page->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertStatus(200);
    });
}

#[Test]
public function tenant_user_cannot_access_other_tenant_data(): void
{
    $this->withinTenant('tenant-two', function () {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson('/api/pages')
            ->assertForbidden();
    });
}
```

#### 6. Run Your Tests

```bash
# Run specific test file
php artisan test tests/Feature/Api/YourNewTest.php

# Run specific test method
php artisan test --filter="it_does_something"

# Run with output
php artisan test tests/Feature/Api/YourNewTest.php --stop-on-failure
```

---

## Architecture Notes

### How the Test Framework Works

1. **phpunit.xml** sets `bootstrap="tests/bootstrap.php"`
2. **tests/bootstrap.php** loads Laravel and disables activity logging
3. **tests/TestCase.php** uses `RefreshDatabase` with `$seed = true` and `$seeder = TestFixturesSeeder::class`
4. Before each test, Laravel:
   - Runs migrations (if schema changed)
   - Starts a database transaction
   - Runs `TestFixturesSeeder` (creates users, tenants, roles)
5. After each test, Laravel rolls back the transaction (test data is cleaned up)

### Key Files

| File | Purpose |
|------|---------|
| `tests/TestCase.php` | Base test class with RefreshDatabase, auth helpers |
| `tests/bootstrap.php` | PHPUnit bootstrap, disables activity logging |
| `tests/Support/TestUsers.php` | Helper to get seeded test users |
| `tests/Support/WithAuthentication.php` | `actingAsSuperadmin()` and similar helpers |
| `tests/Support/WithTenancy.php` | `withinTenant()` helper |
| `database/seeders/TestFixturesSeeder.php` | Creates test users, tenants, roles |
| `phpunit.xml` | PHPUnit configuration |

### Known Limitations

1. **Activity Logging**: Disabled in tests due to UUID/bigint column mismatch in `activity_log.subject_id`
2. **Tenant Roles**: Spatie Permission's team feature uses bigint `team_id`, but tenant IDs are strings
3. **Risky Tests**: Some tests show as "risky" due to error handler changes - this is expected and doesn't indicate failure
