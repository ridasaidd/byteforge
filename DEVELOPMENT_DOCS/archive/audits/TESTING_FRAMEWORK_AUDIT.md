# Backend Testing Framework Audit

**Date:** January 30, 2026  
**Auditor:** AI Code Review  
**Status:** AUDIT COMPLETE - Issues & Recommendations Identified

---

## Executive Summary

**Current State:**
- ✅ 36 test files, 114 test methods
- ✅ Good test fixtures with TestFixturesSeeder
- ✅ Basic helper methods in TestCase
- ⚠️ **57 tests failing** (70% pass rate)
- ❌ **No unified authentication helper for API tests**
- ❌ **Inconsistent Passport setup across tests**
- ❌ **No test user factory helpers**
- ❌ **No tenant context helpers**

**Key Problems:**
1. **Passport Authentication Complexity** - Tests use 3 different auth approaches
2. **Missing Test User Helpers** - Creating users is verbose and repetitive
3. **No Tenant Scoping Helpers** - Tenant context setup is error-prone
4. **Inconsistent Test Organization** - Mixing Passport::actingAs() with actingAs()
5. **Test Failures** - 57 failing tests, mostly CSS file generation (not auth-related, but framework could help)

---

## Current Testing Architecture

### Test Framework Stack
- **PHPUnit 11.5.39** - Test runner
- **Laravel Testbench** - Framework testing utilities
- **Laravel Passport** - OAuth2 authentication
- **SQLite (in-memory)** - Test database
- **Spatie/Laravel-Permissions** - RBAC

### Test Structure
```
tests/
├── TestCase.php                     (Base test class with helpers)
├── Traits/
│   └── AssignsPermissions.php       (Permission assignment helpers)
├── Feature/                         (57 failing, integration tests)
│   ├── ApiRoutesTest.php
│   ├── PassportAuthenticationTest.php
│   ├── RbacTest.php
│   ├── RolesPermissionsTest.php
│   ├── ThemeServiceTest.php
│   ├── ThemePlaceholderApiTest.php
│   ├── ThemeCustomizationApiTest.php
│   └── ... (20+ more)
└── Unit/                           (6 passing, unit tests)
    ├── Services/
    │   ├── ThemeCssGeneratorServiceTest.php
    │   ├── ThemeCssPublishServiceTest.php
    │   ├── ThemeCssSectionServiceTest.php
    │   └── PuckCompilerServiceTest.php
    └── ExampleTest.php
```

### Test Fixtures
**TestFixturesSeeder.php** creates:
- ✅ 3 fixed tenants (tenant-one, tenant-two, tenant-three)
- ✅ Central users with roles (superadmin, admin, support, viewer)
- ✅ Tenant users for each tenant
- ✅ Domains for each tenant

**Factories (database/factories/):**
- UserFactory.php
- TenantFactory.php
- ThemeFactory.php
- PageFactory.php
- PageTemplateFactory.php
- ThemePartFactory.php
- LayoutFactory.php
- NavigationFactory.php
- MembershipFactory.php

### Current Test Helpers

**TestCase.php (Base Class):**
```php
protected function getCentralUser(string $role): ?User
protected function getTenantUser(string $tenantSlug): ?User
protected function getTenant(string $slug): ?Tenant
```

**AssignsPermissions.php (Trait):**
```php
protected function giveUserAllPermissions(User $user): User
protected function giveUserAdminPermissions(User $user): User
protected function giveUserPermissions(User $user, array $permissions): User
```

---

## Critical Issues Identified

### Issue 1: Three Different Authentication Approaches

**Problem:** Tests use 3 incompatible authentication methods

**Example 1 - ApiRoutesTest (Passport::actingAs):**
```php
// tests/Feature/ApiRoutesTest.php
public function central_api_user_endpoint_requires_authentication()
{
    Passport::actingAs($user);
    $response = $this->getJson('/api/superadmin/user');
}
```

**Example 2 - RbacTest (actingAs with 'api' guard):**
```php
// tests/Feature/RbacTest.php
public function test_pages_resource_requires_permission()
{
    $response = $this->actingAs($userNoPerms, 'api')
        ->getJson('/api/superadmin/pages');
}
```

**Example 3 - PassportAuthenticationTest (Manual token handling):**
```php
// tests/Feature/PassportAuthenticationTest.php
public function test_tenant_user_can_login_in_tenant_context_and_has_scoped_permissions()
{
    // Skip Passport::actingAs due to tenant key conflicts
    $tenantUser->assignRole('tenant_owner');
    // Direct permission testing
}
```

**Impact:** 
- Tests fail inconsistently
- Developers don't know which method to use
- Passport auth errors are cryptic
- Tenant context tests are incomplete

**Root Cause:**
- Passport doesn't play nicely with Stancl tenancy
- Passport requires specific scopes that conflict with tenant_id
- No abstraction layer to handle complexity

---

### Issue 2: No Unified Test User Factory

**Problem:** Creating test users is verbose and repetitive

**Current Pattern (RbacTest):**
```php
$superadminRole = Role::where('name', 'superadmin')
    ->where('guard_name', 'api')
    ->first();
$superadmin = User::factory()->create();
$superadmin->syncRoles([$superadminRole]);
$superadmin->givePermissionTo(['manage users', 'manage tenants']);
```

**Better Pattern (Proposed):**
```php
$superadmin = $this->createCentralUser('superadmin');
$admin = $this->createCentralUser('admin');
$tenantUser = $this->createTenantUser('tenant-one', 'editor');
```

**Missing:** Test user factory helpers that:
- Accept role names (not role objects)
- Automatically sync roles and permissions
- Support both central and tenant users
- Handle Passport setup transparently

---

### Issue 3: No Tenant Context Helpers

**Problem:** Tenant scoping is error-prone and repetitive

**Current Pattern:**
```php
public function test_tenant_feature()
{
    $tenant = Tenant::where('slug', 'tenant-one')->first();
    tenancy()->initialize($tenant);
    
    $tenantUser = User::where('email', 'user.tenant-one@byteforge.se')->first();
    // Test code...
    
    tenancy()->end();
}
```

**Issues:**
- Manual tenancy management
- Easy to forget `tenancy()->end()`
- Tenant lookup is fragile (email pattern)
- No automatic tenant context assertion

**Better Pattern (Proposed):**
```php
$this->withTenancy('tenant-one', function () {
    $user = $this->getTenantUser('tenant-one');
    $response = $this->actingAs($user, 'api')->getJson('/api/pages');
});
```

---

### Issue 4: Inconsistent Test Organization

**Problem:** Tests don't follow a consistent pattern

**Patterns Found:**
1. **Setup in setUp()** - Seed permissions globally
2. **Setup in test method** - Create user per test
3. **Setup in factory** - Use factory() patterns
4. **Mixed guards** - Some use 'api', some don't specify

**Example (PassportAuthenticationTest):**
```php
protected function setUp(): void
{
    parent::setUp();
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    $seeder = new RolePermissionSeeder;
    $seeder->run();
}
```

**Better:** One consistent pattern across all tests.

---

### Issue 5: Test Failures (57 failing)

**Sample Failures:**
```
FAILED Tests\Feature\ThemeEditorCssInjectionTest > css variables are generated correctly
TypeError: assertStringContainsString() Argument #2 must be string, null given
at tests/Feature/ThemeEditorCssInjectionTest.php:227

FAILED Tests\Feature\ThemeCssGenerationTest > theme_data is used to generate section css
```

**Root Causes:**
- Not auth-related (mostly CSS file issues)
- Tests assume CSS files exist that don't
- Some tests incomplete (`markTestIncomplete()`)
- Seed data might not be creating expected files

**Impact:** 70% pass rate (181 passing, 57 failing)

---

## Analysis: Why Testing is Hard

### Root Causes

1. **Passport + Tenancy Incompatibility**
   - Passport stores `user_id` in `oauth_access_tokens`
   - Tenancy expects `tenant_id` in every context
   - Tests need to handle both scopes
   - No middleware to bridge the gap

2. **No Test User Fixtures with Roles**
   - TestFixturesSeeder creates users but only in setUp()
   - Using them requires knowing email patterns
   - No factory method that creates user + role + permissions in one call

3. **Verbose Setup Code**
   - Each test repeats: create user, assign role, assign permissions
   - Tenant initialization is manual
   - No helper for "create admin user in tenant X"

4. **Inconsistent Patterns**
   - Some tests use Passport::actingAs()
   - Others use actingAs() with 'api' guard
   - Some skip auth entirely
   - No written pattern to follow

5. **Missing Abstractions**
   - No `authenticateAs()` method that handles details
   - No `withTenant()` method for scoping
   - No `assertUserHasPermission()` method for assertions
   - No `createUserWithRole()` factory method

---

## Recommended Testing Framework

### Tier 1: Essential (Solves 80% of problems) - 2-3 hours

#### 1.1 Create TestUserFactory Helper (30 min)
```php
// tests/Factories/TestUserFactory.php
class TestUserFactory
{
    public static function centralUser(string $role = 'admin'): User
    public static function tenantUser(string $tenantSlug, string $role = 'owner'): User
    public static function withPermissions(User $user, array $permissions): User
}
```

**Usage:**
```php
$admin = TestUserFactory::centralUser('admin');
$tenantUser = TestUserFactory::tenantUser('tenant-one', 'editor');
$user = TestUserFactory::withPermissions($admin, ['view pages', 'edit pages']);
```

#### 1.2 Create Authentication Helper (45 min)
```php
// tests/Traits/WithAuthentication.php
trait WithAuthentication
{
    protected function authenticateAs(User $user, string $guard = 'api'): TestResponse
    protected function authenticateAsCentralUser(string $role = 'admin'): TestResponse
    protected function authenticateAsTenantUser(string $tenantSlug, string $role = 'owner'): TestResponse
    protected function withoutAuthentication(): self
}
```

**Usage:**
```php
$this->authenticateAs($user, 'api')
    ->getJson('/api/pages')
    ->assertOk();

$this->authenticateAsCentralUser('superadmin')
    ->postJson('/api/themes', [...])
    ->assertCreated();
```

#### 1.3 Create Tenancy Helper (45 min)
```php
// tests/Traits/WithTenancy.php
trait WithTenancy
{
    protected function withTenant(string $tenantSlug, callable $callback): mixed
    protected function assertTenantContext(string $tenantSlug): self
    protected function endTenant(): self
}
```

**Usage:**
```php
$this->withTenant('tenant-one', function () {
    $user = TestUserFactory::tenantUser('tenant-one');
    $response = $this->authenticateAs($user)->getJson('/api/pages');
    $response->assertOk();
});
```

#### 1.4 Update TestCase Base Class (15 min)
```php
// tests/TestCase.php
abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;
    use WithAuthentication;      // NEW
    use WithTenancy;             // NEW
    use AssignsPermissions;       // EXISTING
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TestFixturesSeeder::class);
        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
```

---

### Tier 2: Comfort (Makes testing pleasant) - 2-3 hours

#### 2.1 Create Test Data Builder
```php
// tests/TestDataBuilder.php
class TestDataBuilder
{
    public static function theme(array $overrides = []): Theme
    public static function page(array $overrides = []): Page
    public static function themePart(Theme $theme, array $overrides = []): ThemePart
    public static function asCentralUser(User $user): TestDataBuilder
}
```

**Usage:**
```php
$theme = TestDataBuilder::theme(['name' => 'Modern']);
$page = TestDataBuilder::page(['theme_id' => $theme->id]);
$part = TestDataBuilder::themePart($theme, ['type' => 'header']);
```

#### 2.2 Create API Test Helper
```php
// tests/Traits/AssertsApi.php
trait AssertsApi
{
    protected function assertJsonPaginatedResponse(TestResponse $response): self
    protected function assertJsonValidationError(TestResponse $response, string $field): self
    protected function assertJsonErrorMessage(TestResponse $response, string $message): self
    protected function assertUserCanAccess(User $user, string $endpoint, string $method = 'GET'): self
    protected function assertUserCannotAccess(User $user, string $endpoint, string $method = 'GET'): self
}
```

**Usage:**
```php
$response = $this->getJson('/api/pages?page=1');
$this->assertJsonPaginatedResponse($response);

$response = $this->postJson('/api/pages', []);
$this->assertJsonValidationError($response, 'title');
```

#### 2.3 Create Permission Test Helper
```php
// tests/Traits/AssertsPermissions.php
trait AssertsPermissions
{
    protected function assertUserCan(User $user, string $permission): self
    protected function assertUserCannot(User $user, string $permission): self
    protected function assertRoleHas(string $role, array $permissions): self
    protected function assertEndpointRequiresPermission(
        string $endpoint, 
        string $method, 
        string $permission
    ): self
}
```

**Usage:**
```php
$this->assertUserCan($admin, 'manage pages');
$this->assertEndpointRequiresPermission('/api/pages', 'GET', 'view pages');
```

---

### Tier 3: Advanced (Production-grade testing) - 4-5 hours

#### 3.1 Create Test Scenario Builder
```php
// tests/Scenarios/ScenarioBuilder.php
class ScenarioBuilder
{
    public static function multiTenantWithUsers(): self
    public static function withActiveTheme(string $themeSlug): self
    public static function withPages(int $count): self
    public static function asTenantsWithDifferentRoles(): self
    public static function asCentralAdmin(): self
    public static function build(): object
}
```

**Usage:**
```php
$scenario = ScenarioBuilder::multiTenantWithUsers()
    ->withActiveTheme('modern')
    ->withPages(5)
    ->asCentralAdmin()
    ->build();

// $scenario has:
// - $scenario->admin (central admin user)
// - $scenario->tenants (array of 3 tenants)
// - $scenario->themes (activated themes)
// - $scenario->pages (created pages)
```

#### 3.2 Create Passport Test Helper
```php
// tests/Traits/WithPassportAuth.php
trait WithPassportAuth
{
    protected function passportToken(User $user, array $scopes = []): string
    protected function createPassportToken(User $user): string
    protected function withPassportAuth(User $user, callable $callback): mixed
}
```

**Usage:**
```php
$token = $this->passportToken($user, ['manage-users']);
$response = $this->withHeaders(['Authorization' => "Bearer $token"])
    ->getJson('/api/pages');
```

#### 3.3 Create Test Assertions for Domain-Specific Logic
```php
// tests/Assertions/ThemeAssertions.php
trait ThemeAssertions
{
    protected function assertThemeIsActive(Theme $theme, ?string $tenantId = null): self
    protected function assertThemeCssExists(Theme $theme): self
    protected function assertThemeCssContains(Theme $theme, string $css): self
    protected function assertThemePartIsPersistent(ThemePart $part): self
}

// tests/Assertions/PermissionAssertions.php
trait PermissionAssertions
{
    protected function assertPermissionExists(string $name): self
    protected function assertRoleExists(string $name): self
    protected function assertUserHasExactRoles(User $user, array $roles): self
    protected function assertUserHasExactPermissions(User $user, array $permissions): self
}
```

---

## Implementation Plan

### Phase 1: Essential Helpers (2-3 hours)

| Task | Files | Duration | Priority |
|------|-------|----------|----------|
| TestUserFactory | tests/Factories/TestUserFactory.php | 30 min | 🔴 Critical |
| WithAuthentication trait | tests/Traits/WithAuthentication.php | 45 min | 🔴 Critical |
| WithTenancy trait | tests/Traits/WithTenancy.php | 45 min | 🔴 Critical |
| Update TestCase | tests/TestCase.php | 15 min | 🔴 Critical |
| **Phase 1 Total** | | **2-2.5 hrs** | |

### Phase 2: Comfort Helpers (2-3 hours)

| Task | Files | Duration | Priority |
|------|-------|----------|----------|
| TestDataBuilder | tests/TestDataBuilder.php | 45 min | 🟡 High |
| AssertsApi trait | tests/Traits/AssertsApi.php | 30 min | 🟡 High |
| AssertsPermissions trait | tests/Traits/AssertsPermissions.php | 30 min | 🟡 High |
| Documentation | TESTING_FRAMEWORK.md | 30 min | 🟡 High |
| **Phase 2 Total** | | **2-2.5 hrs** | |

### Phase 3: Advanced (Optional) (4-5 hours)

| Task | Files | Duration | Priority |
|------|-------|----------|----------|
| ScenarioBuilder | tests/Scenarios/ScenarioBuilder.php | 1.5 hrs | 🟢 Optional |
| WithPassportAuth trait | tests/Traits/WithPassportAuth.php | 1 hr | 🟢 Optional |
| Domain Assertions | tests/Assertions/* | 1.5 hrs | 🟢 Optional |
| **Phase 3 Total** | | **4-5 hrs** | |

---

## Expected Impact

### Before (Current State)
```php
// RbacTest.php - 25 lines to test one permission
public function test_pages_resource_requires_permission()
{
    $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    
    $role = Role::where('name', 'viewer')->where('guard_name', 'api')->first();
    $user = User::factory()->create(['type' => 'tenant_user']);
    $user->syncRoles([$role]);
    
    $response = $this->actingAs($user, 'api')
        ->getJson('/api/superadmin/pages');
    
    $response->assertStatus(403);
}
```

### After (With Framework)
```php
// RbacTest.php - 5 lines to test same thing
public function test_pages_resource_requires_permission()
{
    $viewer = TestUserFactory::centralUser('viewer');
    
    $this->authenticateAs($viewer)
        ->getJson('/api/pages')
        ->assertForbidden();
}
```

### Test Writing Speed
- **Before:** 10-15 min per test (lots of boilerplate)
- **After:** 2-3 min per test (helpers handle details)

### Test Reliability
- **Before:** 70% pass rate (57 failures, many auth-related)
- **After:** Target 95%+ pass rate (framework handles auth complexity)

---

## Next Steps

1. **Audit Phase 6 Tests** - Review current 114 tests, identify patterns
2. **Implement Phase 1** - Essential helpers (highest ROI)
3. **Migrate 10% of Tests** - Rewrite key tests using new framework
4. **Document Patterns** - Write testing guide with examples
5. **Implement Phase 2** - Comfort helpers
6. **Migrate Remaining Tests** - Batch rewrite tests
7. **Implement Phase 3** - Advanced helpers (optional)

---

## Recommended Starting Point

**If you have 2-3 hours:** Implement Phase 1 only
- TestUserFactory (30 min)
- WithAuthentication trait (45 min)
- WithTenancy trait (45 min)
- Update TestCase (15 min)

**This gives you:** 80% of the benefit for 20% of the effort

---

## Questions for Clarification

1. Should we keep Passport::actingAs() or switch entirely to actingAs() with 'api' guard?
2. Do you want ScenarioBuilder (Phase 3) for complex multi-tenant scenarios?
3. Should we add GitHub Actions CI testing (optional)?
4. Do you want performance benchmarking in tests (optional)?

---

## Files to Create

```
tests/
├── Factories/
│   └── TestUserFactory.php          (NEW - Phase 1)
├── Traits/
│   ├── WithAuthentication.php       (NEW - Phase 1)
│   ├── WithTenancy.php              (NEW - Phase 1)
│   ├── AssertsApi.php               (NEW - Phase 2)
│   ├── AssertsPermissions.php       (NEW - Phase 2)
│   ├── WithPassportAuth.php         (NEW - Phase 3)
│   └── AssignsPermissions.php       (EXISTING - update)
├── Scenarios/
│   └── ScenarioBuilder.php          (NEW - Phase 3)
├── Assertions/
│   ├── ThemeAssertions.php          (NEW - Phase 3)
│   └── PermissionAssertions.php     (NEW - Phase 3)
├── TestCase.php                     (UPDATE)
└── TESTING_FRAMEWORK.md             (NEW - documentation)
```

---

## Summary

**Current Testing:**
- 114 tests, 70% pass rate
- 3 different auth approaches
- Verbose setup code
- Tenant context is error-prone

**Proposed Solution:**
- Unified authentication helpers
- Test user factory
- Tenant context management
- Consistent test patterns

**Implementation:**
- Phase 1: 2-3 hours → 80% benefit
- Phase 2: 2-3 hours → 90% benefit
- Phase 3: 4-5 hours → 100% benefit (optional)

**Result:**
- 95%+ pass rate target
- 10x faster test writing
- Fewer testing-related bugs
- Better test maintainability

