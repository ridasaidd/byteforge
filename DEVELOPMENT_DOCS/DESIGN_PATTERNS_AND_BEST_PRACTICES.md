# Design Patterns & Best Practices

**Last Updated:** January 22, 2026  
**Status:** Active Reference

This document outlines recommended design patterns, architectural principles, and best practices for ByteForge development based on the current codebase analysis.

---

## Table of Contents

1. [Current Patterns (Already in Use)](#current-patterns-already-in-use)
2. [Recommended Backend Patterns](#recommended-backend-patterns)
3. [Recommended Frontend Patterns](#recommended-frontend-patterns)
4. [Testing Strategy](#testing-strategy)
5. [Code Quality & Automation](#code-quality--automation)
6. [Performance Optimization](#performance-optimization)
7. [Security Best Practices](#security-best-practices)
8. [Developer Experience](#developer-experience)
9. [Monitoring & Observability](#monitoring--observability)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Current Patterns (Already in Use)

### ✅ What We're Doing Well

**Backend (Laravel):**
- **Action Pattern** - `lorisleiva/laravel-actions` for single-purpose, testable actions
- **Service Layer** - `ThemeService`, `PuckCompilerService` for business logic
- **Repository Pattern** - Implicit via Eloquent models with query scopes
- **Factory Pattern** - Database factories for testing
- **Observer Pattern** - Laravel Observers for model lifecycle events
- **Middleware Pattern** - Authentication, tenancy resolution, CORS
- **Provider Pattern** - Service providers for dependency injection

**Frontend (React):**
- **Provider Pattern** - `ThemeContext`, `AuthContext` for global state
- **Composition Pattern** - React components, Puck component system
- **Custom Hooks** - `useTheme`, `useAuth`, `useMediaLibrary` for reusable logic
- **Atomic Design** - Components organized by complexity (atoms → organisms)

**Architecture:**
- **Multi-App Strategy** - Separate apps for superadmin, tenant, public
- **Multi-Tenancy** - Stancl/Tenancy with database separation
- **API-First** - Clear separation between frontend and backend

---

## Recommended Backend Patterns

### 1. Domain-Driven Design (DDD) - Selective Adoption

**Priority:** 🔴 High  
**Effort:** Medium  
**Impact:** High

**Current State:**
```
app/
  Actions/
  Models/
  Services/
  Observers/
  Http/Controllers/
```

**Recommended Structure:**
```
app/
  Domains/
    Tenant/
      Models/
        Tenant.php
        TenantSettings.php
      Actions/
        CreateTenantAction.php
        ProvisionTenantAction.php
        DeleteTenantAction.php
      Services/
        TenantProvisioningService.php
      Events/
        TenantCreated.php
        TenantDeleted.php
      Exceptions/
        TenantNotFoundException.php
      
    Theme/
      Models/
        Theme.php
        ThemeSettings.php
      Actions/
        ActivateThemeAction.php
        SyncThemeFromDiskAction.php
      Services/
        ThemeCompilerService.php
        ThemeValidationService.php
      
    Page/
      Models/
        Page.php
      Actions/
        CreatePageAction.php
        PublishPageAction.php
      Services/
        PuckCompilerService.php
      
    Media/
      Models/
        Media.php
        MediaFolder.php
      Actions/
        UploadMediaAction.php
        CreateFolderAction.php
      Services/
        MediaProcessingService.php
  
  Shared/
    Traits/
    Helpers/
    Contracts/
```

**Benefits:**
- Clear domain boundaries
- Easier onboarding (find everything related to Theme in one place)
- Better for team collaboration
- Reduced cognitive load

**Migration Strategy:**
1. Start with one domain (Theme - smallest, well-defined)
2. Move incrementally, domain by domain
3. Update imports in a single PR per domain
4. Run tests after each domain migration

---

### 2. CQRS (Command Query Responsibility Segregation) - Light Version

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Concept:** Separate read operations (queries) from write operations (commands).

**Current Implementation (Partial):**
```php
// StatsController already separates reads from writes
public function getDashboardStats() { } // Query
public function refresh() { }            // Command
```

**Recommended Structure:**
```
app/
  Queries/
    Dashboard/
      GetDashboardStatsQuery.php
      GetRecentActivityQuery.php
    Tenant/
      GetActiveTenantQuery.php
      GetTenantWithUsersQuery.php
    
  Commands/
    Tenant/
      CreateTenantCommand.php
      UpdateTenantCommand.php
      DeleteTenantCommand.php
    Theme/
      ActivateThemeCommand.php
      UpdateThemeSettingsCommand.php
```

**Example Implementation:**
```php
// app/Queries/Dashboard/GetDashboardStatsQuery.php
namespace App\Queries\Dashboard;

use Illuminate\Support\Facades\Cache;

class GetDashboardStatsQuery
{
    public function execute(string $userId): array
    {
        return Cache::remember(
            "dashboard_stats_{$userId}",
            600,
            fn() => $this->fetchStats()
        );
    }
    
    private function fetchStats(): array
    {
        return [
            'total_tenants' => Tenant::count(),
            'active_users' => User::whereNotNull('last_login_at')->count(),
            'total_pages' => Page::count(),
            'recent_activity' => TenantActivity::where('log_name', 'central')
                ->take(10)
                ->get(),
        ];
    }
}

// app/Commands/Tenant/CreateTenantCommand.php
namespace App\Commands\Tenant;

use App\Events\TenantCreated;

class CreateTenantCommand
{
    public function execute(array $data): Tenant
    {
        $tenant = Tenant::create($data);
        
        event(new TenantCreated($tenant));
        
        return $tenant;
    }
}
```

**Benefits:**
- Clear intent (is this changing data or just reading?)
- Easier caching strategy for queries
- Testable in isolation
- Performance optimization opportunities

---

### 3. Event-Driven Architecture

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** High (for decoupling)

**Current State:** Using Spatie Activity Log, but events not formalized.

**Recommended Events:**
```
app/
  Events/
    Tenant/
      TenantCreated.php
      TenantUpdated.php
      TenantDeleted.php
    Theme/
      ThemeActivated.php
      ThemePublished.php
      ThemeUpdated.php
    Page/
      PageCreated.php
      PagePublished.php
      PageViewed.php
    Media/
      MediaUploaded.php
      MediaDeleted.php
  
  Listeners/
    LogActivity.php              # Logs to activity_log
    ClearCache.php               # Clears relevant caches
    SendNotification.php         # Notifies users
    UpdateSearchIndex.php        # Updates search (future)
```

**Example Implementation:**
```php
// app/Events/Theme/ThemeActivated.php
namespace App\Events\Theme;

class ThemeActivated
{
    public function __construct(
        public Theme $theme,
        public User $user
    ) {}
}

// app/Listeners/LogActivity.php
namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;

class LogActivity implements ShouldQueue
{
    public function handle(object $event): void
    {
        match (true) {
            $event instanceof ThemeActivated => $this->logThemeActivation($event),
            $event instanceof TenantCreated => $this->logTenantCreation($event),
            // ...
        };
    }
    
    private function logThemeActivation(ThemeActivated $event): void
    {
        activity()
            ->causedBy($event->user)
            ->performedOn($event->theme)
            ->log('Theme activated: ' . $event->theme->name);
    }
}

// app/Listeners/ClearThemeCache.php
namespace App\Listeners;

class ClearThemeCache
{
    public function handle(ThemeActivated $event): void
    {
        Cache::forget('active_theme');
        Cache::forget('theme_settings_' . $event->theme->id);
    }
}

// EventServiceProvider.php
protected $listen = [
    ThemeActivated::class => [
        LogActivity::class,
        ClearThemeCache::class,
        NotifyTenantAdmin::class,
    ],
];
```

**Benefits:**
- Decoupled components (listeners don't know about each other)
- Easy to add new behavior (just add listener)
- Queueable for async processing
- Clear audit trail

---

### 4. Pipeline Pattern - For Complex Workflows

**Priority:** 🟢 Low  
**Effort:** Low  
**Impact:** Medium

**Use Cases:**
- Page publishing workflow
- Tenant provisioning
- Media processing
- Theme compilation

**Example: Page Publishing Pipeline**
```php
// app/Pipelines/PublishPagePipeline.php
namespace App\Pipelines;

use Illuminate\Pipeline\Pipeline;

class PublishPagePipeline
{
    public function __construct(private Pipeline $pipeline) {}
    
    public function execute(Page $page): Page
    {
        return $this->pipeline
            ->send($page)
            ->through([
                ValidatePageContent::class,
                CompilePuckData::class,
                GenerateSEOMetadata::class,
                OptimizeImages::class,
                ClearPageCache::class,
                NotifySubscribers::class,
            ])
            ->then(fn($page) => $page->publish());
    }
}

// app/Pipelines/Steps/CompilePuckData.php
namespace App\Pipelines\Steps;

class CompilePuckData
{
    public function handle(Page $page, Closure $next)
    {
        $compiler = app(PuckCompilerService::class);
        $page->compiled_html = $compiler->compile($page->puck_data);
        
        return $next($page);
    }
}

// Usage in controller
public function publish(Page $page, PublishPagePipeline $pipeline)
{
    $page = $pipeline->execute($page);
    return response()->json($page);
}
```

**Benefits:**
- Testable steps in isolation
- Easy to add/remove steps
- Clear workflow visualization
- Reusable steps

---

### 5. Specification Pattern - For Complex Queries

**Priority:** 🟢 Low  
**Effort:** Low  
**Impact:** Low

**Use Case:** Complex, reusable query logic.

**Example:**
```php
// app/Specifications/Tenant/ActiveTenantSpecification.php
namespace App\Specifications\Tenant;

class ActiveTenantSpecification
{
    public function apply($query)
    {
        return $query->whereNotNull('activated_at')
            ->whereNull('suspended_at');
    }
}

class CreatedInLastMonthSpecification
{
    public function apply($query)
    {
        return $query->where('created_at', '>=', now()->subMonth());
    }
}

// Usage
$query = Tenant::query();

if ($onlyActive) {
    (new ActiveTenantSpecification())->apply($query);
}

if ($recentOnly) {
    (new CreatedInLastMonthSpecification())->apply($query);
}

$tenants = $query->get();
```

---

### 6. Repository + Cache Decorator Pattern

**Priority:** 🟡 Medium  
**Effort:** Medium  
**Impact:** High (for performance)

**Use Case:** Centralize data access with built-in caching.

**Example:**
```php
// app/Contracts/ThemeRepositoryInterface.php
namespace App\Contracts;

interface ThemeRepositoryInterface
{
    public function findActive(): ?Theme;
    public function findById(int $id): ?Theme;
    public function all(): Collection;
}

// app/Repositories/EloquentThemeRepository.php
namespace App\Repositories;

class EloquentThemeRepository implements ThemeRepositoryInterface
{
    public function findActive(): ?Theme
    {
        return Theme::where('is_active', true)->first();
    }
    
    public function findById(int $id): ?Theme
    {
        return Theme::find($id);
    }
    
    public function all(): Collection
    {
        return Theme::all();
    }
}

// app/Repositories/CachedThemeRepository.php
namespace App\Repositories;

class CachedThemeRepository implements ThemeRepositoryInterface
{
    public function __construct(
        private ThemeRepositoryInterface $repository
    ) {}
    
    public function findActive(): ?Theme
    {
        return Cache::remember(
            'theme:active',
            600,
            fn() => $this->repository->findActive()
        );
    }
    
    public function findById(int $id): ?Theme
    {
        return Cache::remember(
            "theme:{$id}",
            3600,
            fn() => $this->repository->findById($id)
        );
    }
    
    public function all(): Collection
    {
        return Cache::remember(
            'themes:all',
            600,
            fn() => $this->repository->all()
        );
    }
}

// AppServiceProvider.php
public function register()
{
    $this->app->singleton(ThemeRepositoryInterface::class, function ($app) {
        $repository = new EloquentThemeRepository();
        return new CachedThemeRepository($repository);
    });
}
```

**Benefits:**
- Single source of truth for data access
- Transparent caching
- Easy to swap implementations
- Testable (mock repository interface)

---

## Recommended Frontend Patterns

### 7. Feature-Sliced Design (FSD)

**Priority:** 🔴 High  
**Effort:** High  
**Impact:** High

**Current Structure:**
```
resources/js/
  apps/
    superadmin/
      components/
      hooks/
      services/
  shared/
    components/
    hooks/
    services/
```

**Recommended Structure:**
```
resources/js/
  apps/
    superadmin/
      features/
        dashboard/
          components/
            DashboardPage.tsx
            StatsCards.tsx
            RecentActivity.tsx
          hooks/
            useDashboardStats.ts
          services/
            dashboardApi.ts
          types.ts
        
        themes/
          components/
            ThemesPage.tsx
            ThemeCard.tsx
            ThemeCustomizer.tsx
          hooks/
            useThemes.ts
            useThemeCustomizer.ts
          services/
            themeApi.ts
          types.ts
        
        tenants/
          components/
          hooks/
          services/
          types.ts
      
      layouts/
        DashboardLayout.tsx
      
      routes.tsx
      
    tenant/
      features/
        pages/
        media/
        settings/
    
    public/
      features/
        page-renderer/
  
  shared/
    ui/              # Pure UI components (Button, Card, etc.)
    lib/             # Utilities, helpers
    hooks/           # Generic hooks (useDebounce, useLocalStorage)
    types/           # Shared types
    puck/            # Puck system (its own domain)
      components/
      fields/
      config/
```

**Benefits:**
- **Colocation** - Everything related to a feature is together
- **Easier imports** - `import { useThemes } from '@/features/themes'`
- **Better code splitting** - Features can lazy load
- **Clear ownership** - Each feature is self-contained
- **Easier to delete** - Remove entire feature folder

**Migration Strategy:**
1. Create new `features/` folder structure
2. Move one feature at a time (start with dashboard)
3. Update imports incrementally
4. Run tests after each feature migration

---

### 8. Container/Presenter Pattern

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Concept:** Separate data fetching (container) from UI rendering (presenter).

**Example:**
```tsx
// features/dashboard/components/DashboardContainer.tsx
export function DashboardContainer() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { mutate: refresh, isPending } = useRefreshStats();
  
  if (error) return <ErrorView error={error} />;
  
  return (
    <DashboardView
      stats={stats}
      loading={isLoading}
      refreshing={isPending}
      onRefresh={refresh}
    />
  );
}

// features/dashboard/components/DashboardView.tsx
interface DashboardViewProps {
  stats?: DashboardStats;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DashboardView({
  stats,
  loading,
  refreshing,
  onRefresh,
}: DashboardViewProps) {
  if (loading) return <DashboardSkeleton />;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Dashboard</h1>
        <Button onClick={onRefresh} disabled={refreshing}>
          Refresh
        </Button>
      </div>
      
      <StatsCards stats={stats} />
      <RecentActivity activity={stats?.recent_activity} />
    </div>
  );
}
```

**Benefits:**
- **Easier testing** - Test presenters with mock data
- **Reusable presenters** - Use same UI with different data sources
- **Clear separation** - Logic vs UI
- **Storybook-friendly** - Presenters work great in Storybook

---

### 9. Custom Hooks Composition

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Concept:** Compose multiple hooks into domain-specific hooks.

**Example:**
```tsx
// features/themes/hooks/useThemeCustomizer.ts
export function useThemeCustomizer(themeId: string) {
  const { theme } = useTheme(themeId);
  const { mutate: updateTheme, isPending } = useUpdateTheme();
  const [localSettings, setLocalSettings] = useState(theme?.settings);
  const [isDirty, setIsDirty] = useState(false);
  
  const debouncedUpdate = useDebouncedCallback(
    (settings: ThemeSettings) => {
      updateTheme({ id: themeId, settings });
      setIsDirty(false);
    },
    1000
  );
  
  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    debouncedUpdate({ ...localSettings, [key]: value });
  }, [localSettings, debouncedUpdate]);
  
  return {
    theme,
    settings: localSettings,
    updateSetting,
    isDirty,
    isSaving: isPending,
  };
}

// Usage in component
function ThemeCustomizer({ themeId }: Props) {
  const { settings, updateSetting, isDirty, isSaving } = useThemeCustomizer(themeId);
  
  return (
    <div>
      <ColorPicker
        value={settings.colors.primary}
        onChange={(color) => updateSetting('colors.primary', color)}
      />
      {isDirty && <Badge>Unsaved changes</Badge>}
      {isSaving && <Spinner />}
    </div>
  );
}
```

---

### 10. Factory Pattern for Puck Components

**Priority:** 🟢 Low  
**Effort:** Medium  
**Impact:** Low

**Concept:** Centralize Puck component registration with metadata.

**Example:**
```tsx
// shared/puck/registry/ComponentRegistry.ts
interface ComponentMetadata {
  component: React.ComponentType<any>;
  category: 'marketing' | 'content' | 'structure' | 'media';
  icon: string;
  defaultProps: any;
  fields: any;
}

const componentRegistry: Record<string, ComponentMetadata> = {
  Hero: {
    component: Hero,
    category: 'marketing',
    icon: 'layout',
    defaultProps: {
      title: 'Welcome',
      subtitle: 'Get started',
      alignment: 'center',
    },
    fields: {
      title: { type: 'text' },
      subtitle: { type: 'textarea' },
      alignment: {
        type: 'radio',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    },
  },
  // ... more components
};

export function createPuckConfig(theme: Theme) {
  return {
    components: Object.entries(componentRegistry).reduce(
      (acc, [key, meta]) => ({
        ...acc,
        [key]: {
          render: (props) => (
            <ThemeProvider theme={theme}>
              {React.createElement(meta.component, props)}
            </ThemeProvider>
          ),
          defaultProps: meta.defaultProps,
          fields: meta.fields,
        },
      }),
      {}
    ),
    categories: {
      marketing: {
        title: 'Marketing',
        components: Object.entries(componentRegistry)
          .filter(([, meta]) => meta.category === 'marketing')
          .map(([key]) => key),
      },
      // ... other categories
    },
  };
}
```

---

## Testing Strategy

### Test-Driven Development (TDD) - Selective Adoption

**Priority:** 🟡 Medium  
**When to Use TDD:**
- ✅ Critical business logic (tenant provisioning, payment processing)
- ✅ Actions and Services (complex workflows)
- ✅ Complex custom hooks
- ✅ Utilities and helpers
- ❌ Simple CRUD operations
- ❌ UI components (write tests after)

**TDD Workflow:**
1. Write failing test
2. Write minimum code to pass
3. Refactor
4. Repeat

**Example:**
```php
// tests/Unit/Services/TenantProvisioningServiceTest.php
class TenantProvisioningServiceTest extends TestCase
{
    /** @test */
    public function it_provisions_tenant_with_database_and_initial_data()
    {
        // 1. WRITE TEST FIRST (it will fail)
        $service = app(TenantProvisioningService::class);
        
        $tenant = $service->provision([
            'subdomain' => 'acme',
            'name' => 'Acme Corp',
        ]);
        
        $this->assertDatabaseHas('tenants', ['subdomain' => 'acme']);
        $this->assertTrue($tenant->database_exists);
        $this->assertDatabaseHas('users', ['tenant_id' => $tenant->id]);
    }
    
    // 2. THEN IMPLEMENT TenantProvisioningService
    // 3. REFACTOR
}
```

---

### Behavior-Driven Development (BDD) - For Features

**Priority:** 🟡 Medium  
**Use Case:** Feature tests, acceptance criteria.

**Example:**
```php
// tests/Feature/TenantManagementTest.php
class TenantManagementTest extends TestCase
{
    /** @test */
    public function superadmin_can_create_tenant_with_subdomain()
    {
        // Given I am a superadmin
        $admin = User::factory()->superadmin()->create();
        
        // When I create a tenant with subdomain "acme"
        $response = $this->actingAs($admin, 'api')
            ->postJson('/api/superadmin/tenants', [
                'subdomain' => 'acme',
                'name' => 'Acme Corp',
            ]);
        
        // Then the tenant should exist with correct subdomain
        $response->assertStatus(201);
        $this->assertDatabaseHas('tenants', ['subdomain' => 'acme']);
        
        // And the tenant should have a database
        $tenant = Tenant::where('subdomain', 'acme')->first();
        $this->assertTrue($tenant->database_exists);
    }
}
```

---

### Test Coverage Goals

**Current:** 123 backend tests + 577 frontend tests = 700 total ✅

**Target Coverage:**
- **Backend:** 80% coverage (critical paths)
- **Frontend:** 70% coverage (components, hooks, utils)

**Priority:**
1. **Actions** - 100% coverage (business logic)
2. **Services** - 90% coverage (complex logic)
3. **API Controllers** - 80% coverage (happy path + error handling)
4. **Components** - 70% coverage (user interactions)
5. **Models** - 60% coverage (relationships, scopes)

---

## Code Quality & Automation

### 11. Static Analysis & Type Safety

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**Backend (PHP):**
```bash
# Add to composer.json
composer require --dev phpstan/phpstan
composer require --dev larastan/larastan

# phpstan.neon
includes:
    - vendor/larastan/larastan/extension.neon
parameters:
    level: 8
    paths:
        - app
    excludePaths:
        - app/Providers/TelescopeServiceProvider.php
```

**Frontend (TypeScript):**
```json
// tsconfig.json - Make strict mode stricter
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Add to CI/CD:**
```yaml
# .github/workflows/ci.yml
- name: PHPStan
  run: vendor/bin/phpstan analyse
  
- name: TypeScript Check
  run: npm run type-check
```

---

### 12. Code Formatting & Linting

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**Backend:**
```bash
# Add Pint (Laravel's PHP-CS-Fixer wrapper)
composer require --dev laravel/pint

# pint.json
{
    "preset": "laravel",
    "rules": {
        "array_syntax": {
            "syntax": "short"
        }
    }
}

# Add to package.json scripts
"lint:php": "./vendor/bin/pint",
"lint:php:check": "./vendor/bin/pint --test"
```

**Frontend:**
```bash
# Already have ESLint, add Prettier
npm install --save-dev prettier eslint-config-prettier

# .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}

# Add to package.json scripts
"format": "prettier --write \"resources/js/**/*.{ts,tsx}\"",
"format:check": "prettier --check \"resources/js/**/*.{ts,tsx}\""
```

**Pre-commit Hooks:**
```bash
npm install --save-dev husky lint-staged

# package.json
{
  "lint-staged": {
    "*.php": ["./vendor/bin/pint"],
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"]
  }
}

# .husky/pre-commit
npx lint-staged
```

---

### 13. Architecture Decision Records (ADR)

**Priority:** 🟢 Low  
**Effort:** Low  
**Impact:** Medium

**Structure:**
```
DEVELOPMENT_DOCS/
  ADR/
    001-use-stancl-tenancy.md
    002-puck-for-page-builder.md
    003-react-query-for-data-fetching.md
    004-domain-driven-structure.md
```

**Template:**
```markdown
# ADR-001: Use Stancl/Tenancy for Multi-Tenancy

**Date:** 2025-12-01  
**Status:** Accepted  
**Deciders:** Team  

## Context
We need multi-tenancy with database-per-tenant isolation.

## Decision
Use stancl/tenancy package with automatic tenant resolution.

## Consequences
**Positive:**
- Automatic tenant resolution from subdomain
- Database isolation
- Active community support

**Negative:**
- Learning curve for team
- Migration complexity

## Alternatives Considered
- Manual tenant scoping (rejected - error-prone)
- tenancy/tenancy (rejected - less active)
```

---

## Performance Optimization

### 14. Database Optimization

**Priority:** 🟡 Medium  
**Effort:** Low-Medium  
**Impact:** High

**Indexing Strategy:**
```php
// Migration for indexes
Schema::table('pages', function (Blueprint $table) {
    $table->index(['tenant_id', 'status']);
    $table->index(['tenant_id', 'created_at']);
    $table->index('slug');
});

Schema::table('activity_log', function (Blueprint $table) {
    $table->index(['subject_type', 'subject_id']);
    $table->index(['causer_type', 'causer_id']);
    $table->index('created_at');
});
```

**Query Optimization:**
```php
// ❌ Bad: N+1 query
$pages = Page::all();
foreach ($pages as $page) {
    echo $page->user->name; // N queries
}

// ✅ Good: Eager loading
$pages = Page::with('user')->get();
foreach ($pages as $page) {
    echo $page->user->name; // 1 query
}

// ✅ Better: Select only needed columns
$pages = Page::with('user:id,name')
    ->select(['id', 'title', 'user_id'])
    ->get();
```

**Add Query Monitoring:**
```php
// AppServiceProvider.php (development only)
if (app()->environment('local')) {
    DB::listen(function ($query) {
        if ($query->time > 100) {
            Log::warning('Slow query detected', [
                'sql' => $query->sql,
                'time' => $query->time,
                'bindings' => $query->bindings,
            ]);
        }
    });
}
```

---

### 15. Caching Strategy

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**Multi-Level Caching:**
```php
// Cache layers
1. Application Cache (Redis) - 10 minutes
2. HTTP Cache (Cloudflare) - 1 hour
3. Browser Cache - 24 hours

// Example: Theme caching
class CachedThemeRepository
{
    public function findActive(): ?Theme
    {
        return Cache::tags(['themes'])
            ->remember(
                'theme:active',
                600,
                fn() => $this->repository->findActive()
            );
    }
    
    public function clearCache(): void
    {
        Cache::tags(['themes'])->flush();
    }
}
```

**Cache Invalidation:**
```php
// Listener to clear cache on theme activation
class ClearThemeCache
{
    public function handle(ThemeActivated $event): void
    {
        Cache::tags(['themes'])->flush();
        Cache::forget('puck_config');
        
        // Optionally purge CDN cache
        // CloudFlare::purgeCache(['tags' => ['theme']]);
    }
}
```

**Response Caching:**
```php
// Cache entire API responses
Route::get('/api/public/pages/{slug}', [PublicPageController::class, 'show'])
    ->middleware('cache.response:3600'); // 1 hour
```

---

### 16. Frontend Performance

**Priority:** 🟡 Medium  
**Effort:** Medium  
**Impact:** High

**Code Splitting:**
```tsx
// Lazy load routes
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ThemesPage = lazy(() => import('@/features/themes/ThemesPage'));

// Routes
<Route
  path="/dashboard"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardPage />
    </Suspense>
  }
/>
```

**React Query Optimization:**
```tsx
// Prefetch data on hover
function ThemeCard({ theme }: Props) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['theme', theme.id],
      queryFn: () => getTheme(theme.id),
    });
  };
  
  return <Card onMouseEnter={handleMouseEnter}>...</Card>;
}

// Optimistic updates
const { mutate: updateTheme } = useMutation({
  mutationFn: updateThemeApi,
  onMutate: async (newTheme) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['themes'] });
    
    // Snapshot previous value
    const previousThemes = queryClient.getQueryData(['themes']);
    
    // Optimistically update
    queryClient.setQueryData(['themes'], (old) =>
      old.map((t) => (t.id === newTheme.id ? newTheme : t))
    );
    
    return { previousThemes };
  },
  onError: (err, newTheme, context) => {
    // Rollback on error
    queryClient.setQueryData(['themes'], context.previousThemes);
  },
});
```

**Image Optimization:**
```tsx
// Use Spatie Media Library responsive images
<img
  srcSet={media.srcset}
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  decoding="async"
/>

// Or use native lazy loading
<img src={media.url} loading="lazy" />
```

---

## Security Best Practices

### 17. API Security

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** Critical

**Rate Limiting:**
```php
// config/sanctum.php or routes/api.php
Route::middleware(['throttle:60,1'])->group(function () {
    // 60 requests per minute
});

Route::middleware(['throttle:auth:5,1'])->group(function () {
    // 5 login attempts per minute
});
```

**CORS Configuration:**
```php
// config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => [env('FRONTEND_URL')],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

**Input Validation:**
```php
// Use Form Requests for validation
class CreateTenantRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'subdomain' => [
                'required',
                'string',
                'alpha_dash',
                'max:50',
                'unique:tenants,subdomain',
                Rule::notIn(['www', 'api', 'admin']), // Reserved
            ],
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:tenants,email',
        ];
    }
    
    public function authorize(): bool
    {
        return $this->user()->hasRole('superadmin');
    }
}
```

**SQL Injection Prevention:**
```php
// ❌ Never do this
DB::select("SELECT * FROM users WHERE email = '{$email}'");

// ✅ Always use bindings
DB::select("SELECT * FROM users WHERE email = ?", [$email]);

// ✅ Or use Query Builder
User::where('email', $email)->first();
```

---

### 18. Authorization Patterns

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**Policy-Based Authorization:**
```php
// app/Policies/ThemePolicy.php
class ThemePolicy
{
    public function update(User $user, Theme $theme): bool
    {
        return $user->hasRole('superadmin') || 
               $user->id === $theme->created_by;
    }
    
    public function activate(User $user, Theme $theme): bool
    {
        return $user->hasRole('superadmin');
    }
}

// Controller
public function update(Theme $theme, UpdateThemeRequest $request)
{
    $this->authorize('update', $theme);
    
    $theme->update($request->validated());
    
    return response()->json($theme);
}
```

**Middleware Stacking:**
```php
Route::middleware(['auth:api', 'role:superadmin', 'throttle:60,1'])
    ->prefix('superadmin')
    ->group(function () {
        Route::apiResource('tenants', TenantController::class);
    });
```

---

### 19. Frontend Security

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**XSS Prevention:**
```tsx
// ❌ Dangerous
function Component({ userInput }) {
  return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
}

// ✅ Safe (React escapes by default)
function Component({ userInput }) {
  return <div>{userInput}</div>;
}

// ✅ If you must render HTML, sanitize first
import DOMPurify from 'dompurify';

function Component({ userHtml }) {
  const clean = DOMPurify.sanitize(userHtml);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**Secure Token Storage:**
```tsx
// ✅ Store tokens in httpOnly cookies (backend sets)
// ❌ Never store in localStorage (XSS vulnerable)

// Access token refresh pattern
const api = axios.create({
  withCredentials: true, // Send httpOnly cookies
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      await refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## Developer Experience

### 20. Development Environment

**Priority:** 🟡 Medium  
**Effort:** Medium  
**Impact:** High

**Docker Setup (Optional):**
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    volumes:
      - .:/var/www/html
    ports:
      - "8000:8000"
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: byteforge
      MYSQL_ROOT_PASSWORD: secret
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

**Artisan Commands:**
```php
// app/Console/Commands/SetupDevEnvironment.php
class SetupDevEnvironment extends Command
{
    protected $signature = 'dev:setup';
    protected $description = 'Setup development environment';
    
    public function handle(): void
    {
        $this->info('Setting up development environment...');
        
        $this->call('migrate:fresh');
        $this->call('db:seed');
        $this->call('passport:install');
        
        // Create test tenant
        $tenant = Tenant::create([
            'subdomain' => 'demo',
            'name' => 'Demo Tenant',
        ]);
        
        // Create superadmin
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@byteforge.dev',
            'password' => Hash::make('password'),
        ]);
        $admin->assignRole('superadmin');
        
        $this->info('✅ Development environment ready!');
        $this->info('Login: admin@byteforge.dev / password');
    }
}
```

---

### 21. Documentation Standards

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Code Documentation:**
```php
/**
 * Provision a new tenant with database and initial data.
 *
 * This method creates a tenant record, provisions a separate database,
 * runs migrations, and seeds initial data (admin user, default settings).
 *
 * @param array{subdomain: string, name: string, email: string} $data
 * @return Tenant The newly created tenant
 * @throws TenantProvisioningException If provisioning fails
 *
 * @example
 * $tenant = $service->provision([
 *     'subdomain' => 'acme',
 *     'name' => 'Acme Corp',
 *     'email' => 'admin@acme.com',
 * ]);
 */
public function provision(array $data): Tenant
{
    // Implementation
}
```

**API Documentation (OpenAPI/Swagger):**
```php
// Install Scramble for auto-generated API docs
composer require dedoc/scramble

// Annotations
/**
 * @tags Tenants
 * @authenticated
 *
 * Create a new tenant
 *
 * @bodyParam subdomain string required The tenant subdomain. Example: acme
 * @bodyParam name string required The tenant name. Example: Acme Corp
 * @bodyParam email string required The admin email. Example: admin@acme.com
 *
 * @response 201 {"id": 1, "subdomain": "acme", "name": "Acme Corp"}
 * @response 422 {"message": "Validation failed", "errors": {...}}
 */
public function store(CreateTenantRequest $request)
{
    // Implementation
}
```

---

### 22. Error Handling & Logging

**Priority:** 🔴 High  
**Effort:** Low  
**Impact:** High

**Custom Exceptions:**
```php
// app/Exceptions/TenantNotFoundException.php
namespace App\Exceptions;

class TenantNotFoundException extends Exception
{
    public function render($request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Tenant not found',
                'error' => 'TENANT_NOT_FOUND',
            ], 404);
        }
        
        return response()->view('errors.404', [], 404);
    }
}

// Usage
throw new TenantNotFoundException("Tenant with subdomain '{$subdomain}' not found");
```

**Structured Logging:**
```php
// Use context for structured logs
Log::info('Tenant created', [
    'tenant_id' => $tenant->id,
    'subdomain' => $tenant->subdomain,
    'created_by' => auth()->id(),
]);

Log::error('Theme activation failed', [
    'theme_id' => $theme->id,
    'error' => $e->getMessage(),
    'trace' => $e->getTraceAsString(),
]);

// Create custom log channel for tenant operations
// config/logging.php
'channels' => [
    'tenants' => [
        'driver' => 'daily',
        'path' => storage_path('logs/tenants.log'),
        'level' => 'info',
        'days' => 30,
    ],
],

// Usage
Log::channel('tenants')->info('Tenant provisioned', [...]);
```

**Frontend Error Boundaries:**
```tsx
// shared/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    console.error('React Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## Monitoring & Observability

### 23. Application Performance Monitoring (APM)

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** High

**Options:**
1. **Laravel Telescope** (Development) - Already available
2. **Sentry** (Production) - Error tracking
3. **New Relic / DataDog** (Production) - Full APM

**Sentry Setup:**
```bash
composer require sentry/sentry-laravel
npm install @sentry/react

# .env
SENTRY_LARAVEL_DSN=https://...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

```tsx
// React setup
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

---

### 24. Health Checks

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Implementation:**
```php
// routes/api.php
Route::get('/health', [HealthController::class, 'check']);

// app/Http/Controllers/HealthController.php
class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'storage' => $this->checkStorage(),
        ];
        
        $healthy = collect($checks)->every(fn($check) => $check['status'] === 'ok');
        
        return response()->json([
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }
    
    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'ok'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    private function checkRedis(): array
    {
        try {
            Redis::ping();
            return ['status' => 'ok'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    private function checkStorage(): array
    {
        $writable = is_writable(storage_path());
        return [
            'status' => $writable ? 'ok' : 'error',
            'message' => $writable ? null : 'Storage not writable',
        ];
    }
}
```

---

### 25. Metrics & Analytics

**Priority:** 🟢 Low  
**Effort:** Medium  
**Impact:** Medium

**Application Metrics:**
```php
// Track custom metrics
use Illuminate\Support\Facades\Cache;

// Increment counters
Cache::increment('metrics:pages_created');
Cache::increment('metrics:themes_activated');

// Track timing
$start = microtime(true);
// ... operation
$duration = microtime(true) - $start;
Cache::put('metrics:puck_compile_time', $duration);

// Dashboard to view metrics
Route::get('/api/superadmin/metrics', function () {
    return [
        'pages_created_today' => Cache::get('metrics:pages_created', 0),
        'avg_compile_time' => Cache::get('metrics:puck_compile_time', 0),
    ];
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Focus:** Code quality, testing, security

- ✅ Set up PHPStan + Larastan (level 8)
- ✅ Configure Prettier + ESLint + Husky
- ✅ Add pre-commit hooks (lint-staged)
- ✅ Implement rate limiting
- ✅ Review and strengthen CORS/validation
- ✅ Add health check endpoint
- ✅ Set up Sentry (optional)

**Expected Outcome:** Consistent code quality, better security posture

---

### Phase 2: Architecture (Week 3-4)
**Focus:** Backend patterns

- ⬜ Reorganize to Domain-Driven structure (start with Theme domain)
- ⬜ Implement CQRS pattern for dashboard stats
- ⬜ Create domain events (TenantCreated, ThemeActivated, etc.)
- ⬜ Add event listeners (LogActivity, ClearCache, etc.)
- ⬜ Implement Repository pattern for Theme
- ⬜ Add Cache Decorator

**Expected Outcome:** Better organized backend, clearer boundaries

---

### Phase 3: Frontend (Week 5-6)
**Focus:** Frontend patterns

- ⬜ Reorganize to Feature-Sliced Design (start with dashboard)
- ⬜ Implement Container/Presenter pattern
- ⬜ Create domain-specific hooks (useThemeCustomizer, usePageEditor)
- ⬜ Add Error Boundaries
- ⬜ Implement code splitting for routes
- ⬜ Optimize React Query usage

**Expected Outcome:** Easier to navigate frontend, better performance

---

### Phase 4: Performance (Week 7-8)
**Focus:** Optimization

- ⬜ Add database indexes
- ⬜ Implement multi-level caching strategy
- ⬜ Add slow query logging
- ⬜ Optimize images (lazy loading, responsive)
- ⬜ Implement prefetching
- ⬜ Add response caching for public pages

**Expected Outcome:** Faster load times, better user experience

---

### Phase 5: Documentation (Week 9-10)
**Focus:** Knowledge sharing

- ⬜ Create ADRs for major decisions
- ⬜ Add PHPDoc to all services/actions
- ⬜ Set up Scramble for API docs
- ⬜ Create Storybook for UI components
- ⬜ Write onboarding guide
- ⬜ Document deployment process

**Expected Outcome:** Easier onboarding, less tribal knowledge

---

## Additional Recommendations

### 26. API Versioning

**Priority:** 🟢 Low (implement when you have external clients)  
**Effort:** Low  
**Impact:** Medium (future-proofing)

**Implementation:**
```php
// routes/api.php
Route::prefix('v1')->group(function () {
    Route::apiResource('tenants', TenantController::class);
});

Route::prefix('v2')->group(function () {
    Route::apiResource('tenants', V2\TenantController::class);
});

// Or use Accept header versioning
Route::middleware('api.version:v1')->group(function () {
    // v1 routes
});
```

---

### 27. Feature Flags

**Priority:** 🟢 Low  
**Effort:** Low  
**Impact:** Medium

**Use Case:** Deploy code but enable features gradually.

**Implementation:**
```php
// Using Laravel Pennant (built-in)
use Laravel\Pennant\Feature;

// Define features
// app/Providers/AppServiceProvider.php
Feature::define('theme-customizer', fn() => true);
Feature::define('advanced-puck-controls', fn(User $user) => 
    $user->hasRole('superadmin')
);

// Usage in code
if (Feature::active('theme-customizer')) {
    // Show customizer UI
}

// Usage in frontend (pass via API)
Route::get('/api/features', function () {
    return [
        'theme_customizer' => Feature::for(auth()->user())->active('theme-customizer'),
    ];
});
```

---

### 28. Background Jobs Best Practices

**Priority:** 🟡 Medium  
**Effort:** Low  
**Impact:** Medium

**Pattern:**
```php
// Use jobs for slow operations
class ProvisionTenantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(
        public Tenant $tenant,
        public array $settings
    ) {}
    
    public function handle(TenantProvisioningService $service): void
    {
        $service->provision($this->tenant, $this->settings);
    }
    
    public function failed(\Throwable $exception): void
    {
        // Notify admin
        Log::error('Tenant provisioning failed', [
            'tenant_id' => $this->tenant->id,
            'error' => $exception->getMessage(),
        ]);
    }
}

// Dispatch
ProvisionTenantJob::dispatch($tenant, $settings)
    ->onQueue('provisioning')
    ->delay(now()->addSeconds(5));
```

---

### 29. Database Backup Strategy

**Priority:** 🔴 High (for production)  
**Effort:** Low  
**Impact:** Critical

**Implementation:**
```php
// Use Spatie Laravel Backup
composer require spatie/laravel-backup

// config/backup.php configured
// Schedule daily backups
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('backup:clean')->daily()->at('01:00');
    $schedule->command('backup:run')->daily()->at('02:00');
}

// Backup to S3/DigitalOcean Spaces
// Store tenant databases separately
```

---

### 30. CI/CD Pipeline

**Priority:** 🟡 Medium  
**Effort:** Medium  
**Impact:** High

**GitHub Actions Example:**
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
      
      - name: Install Dependencies
        run: composer install
      
      - name: PHPStan
        run: vendor/bin/phpstan analyse
      
      - name: Laravel Pint
        run: vendor/bin/pint --test
      
      - name: Run Tests
        run: vendor/bin/phpunit
  
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install Dependencies
        run: npm ci
      
      - name: TypeScript Check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm run test
      
      - name: Build
        run: npm run build
```

---

## Summary & Next Steps

### What to Implement First

**Week 1 (Quick Wins):**
1. Set up PHPStan + Prettier + Husky ✅
2. Add rate limiting ✅
3. Create health check endpoint ✅
4. Add database indexes ✅

**Week 2-3 (Architecture):**
5. Reorganize to domain structure (Theme domain first) 🎯
6. Implement CQRS for stats 🎯
7. Add domain events + listeners 🎯

**Week 4-5 (Frontend):**
8. Feature-Sliced Design (dashboard feature first) 🎯
9. Container/Presenter pattern 🎯
10. Code splitting 🎯

**Ongoing:**
- Write tests for new code (TDD where appropriate)
- Document decisions (ADRs)
- Monitor performance (slow query logs)
- Review security (regular audits)

---

### Principles to Keep in Mind

1. **Progressive Enhancement** - Don't refactor everything at once
2. **Measure Impact** - Track metrics before/after changes
3. **Team Alignment** - Ensure team understands new patterns
4. **Documentation** - Update docs as patterns are adopted
5. **Pragmatism** - Use patterns where they add value, not everywhere

---

### Resources

**Books:**
- "Domain-Driven Design" by Eric Evans
- "Clean Architecture" by Robert C. Martin
- "Refactoring" by Martin Fowler

**Laravel:**
- Laracasts.com (design patterns)
- Laravel Daily (best practices)
- Spatie blog (package insights)

**React:**
- patterns.dev (React patterns)
- Kent C. Dodds blog (testing)
- Feature-Sliced Design (feature-sliced.design)

---

**Last Updated:** January 22, 2026  
**Next Review:** February 2026  
**Maintainers:** Development Team
