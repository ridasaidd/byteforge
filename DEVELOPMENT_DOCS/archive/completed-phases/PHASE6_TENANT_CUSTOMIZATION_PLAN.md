# Phase 6: Theme Customization System (Central + Tenants)

Last updated: January 27, 2026

---

## Executive Summary

**Unified Approach:** Both central (storefront) and tenants can activate system themes and customize them. Central dogfoods the customization feature on its own storefront.

**Architecture:**
- System Themes (disk): Created by central via ThemeBuilder, immutable base (tenant_id=null, is_system_theme=true)
- Theme Instances (database): Activated by central/tenants, customization CSS stored in DB columns
- Same "Customize" button for both central and tenants (different routes, same UI/API)

---

## Audit Summary

### Current Architecture

**Database Tables:**
| Table | Purpose | Tenant Support |
|-------|---------|----------------|
| `themes` | Theme records | `tenant_id` (null = central) |
| `theme_parts` | Header/Footer puck_data | `tenant_id`, `theme_id` |
| `page_templates` | Page template puck_data | `tenant_id`, `theme_id` |

**Current Data:**
- Themes: 1 (central, null tenant)
- ThemeParts: 2 (header, footer linked to theme_id=1)
- PageTemplates: 2 (home, about linked to theme_id=1)

**CSS Files on Disk:**
```
public/storage/themes/1/
├── 1.css              # Combined settings
├── 1_variables.css    # Theme tokens
├── 1_header.css       # Header CSS
├── 1_footer.css       # Footer CSS
├── 1_template-1.css   # Template 1 CSS
└── 1_template-2.css   # Template 2 CSS
```

**Theme Builder Structure:**
- Tabs: Info, Settings, Header, Footer, Pages (templates)
- Saves: theme_data to `themes`, puck_data to `theme_parts`/`page_templates`, CSS to disk

**theme_data column contains:**
```json
{
  "colors": {...},
  "typography": {...},
  "spacing": {...},
  "borderRadius": {...}
}
```
*(NOT templates - templates are in `page_templates` table)*

### Current Columns in `themes` Table

```php
// From migration 2025_10_22_181449
$table->id();
$table->string('tenant_id')->nullable();  // null = central
$table->string('name');
$table->string('slug');
$table->string('base_theme')->nullable();
$table->json('theme_data');               // Theme tokens (colors, fonts, etc)
$table->boolean('is_active')->default(false);
$table->text('description')->nullable();
$table->string('preview_image')->nullable();
$table->string('author')->nullable();
$table->string('version')->default('1.0.0');

// From migration 2026_01_24_000001
$table->longText('custom_css')->nullable();  // Manual custom CSS
```

### What's Missing for Tenant Customization

1. **No per-section CSS columns** - Only `custom_css` (manual CSS) exists
2. **No tenant customization flow** - ThemeBuilderPage is central-only
3. **Templates endpoint returns empty** - `theme_data['templates']` doesn't exist (templates are in `page_templates` table)

---

## Proposed Solution

### Architecture Decision

**Two Distinct Workflows:**

**1. Theme Creation (Central Only):**
- Route: `/superadmin/themes/new` or `/superadmin/themes/{id}/edit`
- Full ThemeBuilderPage: Info, Settings, Header, Footer, Pages tabs
- Creates system themes (`tenant_id = null`, `is_system_theme = true`)
- Saves CSS to disk files (immutable base)

**2. Theme Customization (Central + Tenants):**
- Routes: `/superadmin/themes/customize` (central), `/themes/customize` (tenant)
- Same ThemeBuilderPage with `mode="customize"` prop
- Hidden tabs: Info, Pages (templates)
- Visible tabs: Settings, Header, Footer
- Saves CSS to **database columns** (not disk)
- Works for both:
  - Central storefront (tenant_id = null, is_system_theme = false)
  - Tenant storefronts (tenant_id = uuid, is_system_theme = false)

**Benefits:**
- Central dogfoods customization on its own storefront
- Single codebase for customization (central + tenants)
- Natural separation: CREATE vs CUSTOMIZE

### Database Schema Change

**Option A: Add section columns to `themes` table**
```php
// New migration
$table->longText('settings_css')->nullable();
$table->longText('header_css')->nullable();
$table->longText('footer_css')->nullable();
```

**Option B: Store as JSON**
```php
$table->json('customization_css')->nullable();
// Contains: { settings: "...", header: "...", footer: "..." }
```

**Recommendation: Option A** - Separate columns for clarity and easy querying

### CSS Loading Order (Cascade)

**Works for both central storefront and tenant storefronts:**

```html
<!-- 1. Base theme CSS from disk (system theme files) -->
<link href="/storage/themes/{base_theme_id}/{base_theme_id}_variables.css" rel="stylesheet">
<link href="/storage/themes/{base_theme_id}/{base_theme_id}_header.css" rel="stylesheet">
<link href="/storage/themes/{base_theme_id}/{base_theme_id}_footer.css" rel="stylesheet">

<!-- 2. Instance customization CSS from database (overrides) -->
<!-- For central: $theme->tenant_id = null, is_system_theme = false -->
<!-- For tenants: $theme->tenant_id = uuid, is_system_theme = false -->
<style>{{ $theme->settings_css }}</style>
<style>{{ $theme->header_css }}</style>
<style>{{ $theme->footer_css }}</style>
```

---

## Implementation Plan (TDD)

### Step 1: Database Migration (30 min) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- Migration created: `2026_01_30_150515_add_settings_css_to_theme_parts_table`
- `settings_css` column added to `theme_parts` table
- Migration created: `2026_01_30_152641_add_settings_type_to_theme_parts_type_enum`
- `settings` enum type added to `theme_parts.type` column

**Test Results:**
- ✅ Column exists and accepts longText data
- ✅ Theme model fillable updated

**Test First:**
```php
// tests/Feature/TenantThemeCustomizationTest.php
public function test_themes_table_has_customization_columns()
{
    $theme = Theme::factory()->create([
        'settings_css' => ':root { --custom: red; }',
        'header_css' => '.header { color: blue; }',
        'footer_css' => '.footer { color: green; }',
    ]);
    
    $this->assertNotNull($theme->settings_css);
}
```

**Implementation:**
```php
// database/migrations/2026_01_27_000001_add_customization_css_to_themes_table.php
Schema::table('themes', function (Blueprint $table) {
    $table->longText('settings_css')->nullable()->after('custom_css');
    $table->longText('header_css')->nullable()->after('settings_css');
    $table->longText('footer_css')->nullable()->after('header_css');
});
```

**Files:**
- `database/migrations/2026_01_27_000001_add_customization_css_to_themes_table.php`
- `app/Models/Theme.php` (add to $fillable)

---

### Step 2: Backend API for Tenant Customization (1 hr) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- `ThemeCustomizationController` created with full API
- Routes configured for both central (`/superadmin`) and tenant paths
- `getCustomization()` returns merged blueprint + customization data
- `saveSection()` creates/updates settings in `theme_parts` table
- Tests: 8 tests covering permissions, validation, data merging

**Test Results:**
- ✅ Central can customize active theme
- ✅ Tenants can customize active theme
- ✅ Blueprint data never modified
- ✅ Customizations saved to theme_parts (scoped by tenant_id)

---

### Step 3: Frontend - ThemeBuilderPage Mode Prop (1 hr) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- ThemeBuilderPage updated with `mode` prop ('create' | 'customize')
- Settings tab shows for both modes
- Header/Footer tabs show for both modes
- Info/Pages tabs hidden in customize mode
- Default active tab: 'info' for create, 'settings' for customize
- Tests: 4 tests covering tab visibility and default states

**Test Results:**
- ✅ All tabs visible in create mode
- ✅ Settings/Header/Footer visible in customize mode
- ✅ Info/Pages hidden in customize mode
- ✅ Settings tab active by default in customize mode

---

### Step 4: Frontend API Client for Customization (30 min) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- `themeCustomization.ts` API client created
- `getCustomization()` endpoint implemented
- `saveSection()` endpoint implemented
- Types: `CustomizationData` interface with theme_data, header_data, footer_data
- Tests: API calls verified with correct paths and payloads

**Test Results:**
- ✅ GET /api/customization/{id} returns merged data
- ✅ POST /api/customization/{id}/section/{type} saves and returns updated data

---

### Step 5: Blade CSS Loading with Customization (30 min) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- Base theme CSS loaded from disk (blueprint files)
- Customization CSS loaded from database (theme_parts.settings_css)
- CSS cascade working correctly (base + overrides)
- Central storefront loads correct CSS
- Tenants load correct scoped CSS

**Test Results:**
- ✅ Variables CSS loads from disk
- ✅ Customization CSS inlined from database
- ✅ CSS cascade correct (disk first, database overrides)

---

### Step 6: Tenant Routes & Page (30 min) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- ThemeBuilderPage moved to shared components
- `ThemeCustomizePage` wrapper created for both central and tenant
- Routes configured: `/superadmin/themes/customize` (central), `/themes/customize` (tenant)
- Same UI for both, difference is in API scope (tenant_id filtering)

**Test Results:**
- ✅ Central customization route works
- ✅ Tenant customization route works
- ✅ Mode prop correctly set to 'customize'

---

### Step 7: Fix Templates Endpoint (30 min) ✅ DONE

**Status: COMPLETE (Jan 30, 2026)**
- `getTemplatesFromActiveTheme()` fixed to query `page_templates` table
- Returns array of active templates for theme
- Scoped by tenant_id correctly
- No longer depends on non-existent `theme_data['templates']`

**Test Results:**
- ✅ Returns all active page templates for theme
- ✅ Scoped by tenant_id correctly
- ✅ Used in PageCreationWizard for template selection

**Test First:**
```php
// tests/Feature/Api/ThemeCustomizationApiTest.php

public function test_central_can_customize_active_theme()
{
    $theme = Theme::factory()->create([
        'tenant_id' => null,
        'is_system_theme' => false,
        'is_active' => true
    ]);
    
    $response = $this->actingAs($centralUser)
        ->postJson("/api/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #ff0000; }',
            'puck_data' => ['root' => ['props' => []], 'content' => []],
        ]);
    
    $response->assertStatus(200);
    $this->assertEquals(':root { --primary-500: #ff0000; }', $theme->fresh()->settings_css);
}

public function test_tenant_can_customize_active_theme()
{
    $tenant = Tenant::factory()->create();
    $theme = Theme::factory()->create([
        'tenant_id' => $tenant->id,
        'is_system_theme' => false,
        'is_active' => true
    ]);
    
    $response = $this->actingAs($tenantUser)
        ->postJson("/api/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #0000ff; }',
            'puck_data' => ['root' => ['props' => []], 'content' => []],
        ]);
    
    $response->assertStatus(200);
    $this->assertEquals(':root { --primary-500: #0000ff; }', $theme->fresh()->settings_css);
}

public function test_cannot_customize_system_theme()
{
    $systemTheme = Theme::factory()->create(['is_system_theme' => true]);
    
    $response = $this->actingAs($user)
        ->postJson("/api/themes/{$systemTheme->id}/customization/settings", ['css' => '...']);
    
    $response->assertStatus(403);
}

public function test_cannot_modify_info_tab_data_via_customization()
{
    // Name, description, preview_image should be immutable via customization API
}
```

**Implementation:**
```php
// app/Http/Controllers/Api/ThemeCustomizationController.php
class ThemeCustomizationController extends Controller
{
    public function saveSection(Theme $theme, string $section, Request $request)
    {
        // Validate user owns this theme (central: tenant_id=null, tenant: tenant_id matches)
        // Validate theme is NOT system theme (is_system_theme = false)
        // Validate section is allowed (settings, header, footer - NOT info, pages)
        // Save CSS to database column (settings_css, header_css, footer_css)
        // Save puck_data to theme_parts table (header/footer) or update theme_data (settings)
    }
}
```

**Routes:**
```php
// routes/api.php (shared by central and tenant)

// Central routes
Route::middleware(['auth:api'])->group(function () {
    Route::post('/superadmin/themes/{theme}/customization/{section}', [ThemeCustomizationController::class, 'saveSection']);
    Route::get('/superadmin/themes/{theme}/customization', [ThemeCustomizationController::class, 'getCustomization']);
});

// Tenant routes (same controller, different path)
Route::middleware(['auth:api'])->group(function () {
    Route::post('/themes/{theme}/customization/{section}', [ThemeCustomizationController::class, 'saveSection']);
    Route::get('/themes/{theme}/customization', [ThemeCustomizationController::class, 'getCustomization']);
});
```

**Files:**
- `app/Http/Controllers/Api/ThemeCustomizationController.php`
- `app/Services/ThemeCustomizationService.php`
- `routes/api.php`
- `tests/Feature/Api/TenantThemeCustomizationApiTest.php`

---

### Step 3: Frontend - ThemeBuilderPage Mode Prop (1 hr)

**Test First:**
```tsx
// resources/js/apps/central/components/pages/__tests__/ThemeBuilderPage.mode.test.tsx

describe('ThemeBuilderPage modes', () => {
  it('shows all tabs in create mode', () => {
    render(<ThemeBuilderPage mode="create" />);
    expect(screen.getByRole('tab', { name: /info/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pages/i })).toBeInTheDocument();
  });
  
  it('hides info and pages tabs in customize mode', () => {
    render(<ThemeBuilderPage mode="customize" />);
    expect(screen.queryByRole('tab', { name: /info/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /pages/i })).not.toBeInTheDocument();
  });
  
  it('starts on settings tab in customize mode', () => {
    render(<ThemeBuilderPage mode="customize" />);
    expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute('data-state', 'active');
  });
});
```

**Implementation:**
```tsx
// ThemeBuilderPage.tsx changes
interface ThemeBuilderPageProps {
  mode?: 'create' | 'customize';
}

export function ThemeBuilderPage({ mode = 'create' }: ThemeBuilderPageProps) {
  const isCustomizeMode = mode === 'customize';
  const [activeTab, setActiveTab] = useState(isCustomizeMode ? 'settings' : 'info');
  
  // ...
  
  return (
    <Tabs value={activeTab}>
      <TabsList>
        {!isCustomizeMode && <TabsTrigger value="info">Info</TabsTrigger>}
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="header">Header</TabsTrigger>
        <TabsTrigger value="footer">Footer</TabsTrigger>
        {!isCustomizeMode && <TabsTrigger value="pages">Pages</TabsTrigger>}
      </TabsList>
    </Tabs>
  );
}
```

**Files:**
- `resources/js/apps/central/components/pages/ThemeBuilderPage.tsx`
- `resources/js/apps/central/components/pages/__tests__/ThemeBuilderPage.mode.test.tsx`

---

### Step 4: Frontend API Client for Customization (30 min)

**Test First:**
```tsx
// resources/js/shared/services/api/__tests__/themeCustomization.test.ts

describe('themeCustomization API', () => {
  it('saves section customization', async () => {
    const mockResponse = { success: true };
    http.post.mockResolvedValue({ data: mockResponse });
    
    await themeCustomization.saveSection(1, 'header', { css: '...', puck_data: {} });
    
    expect(http.post).toHaveBeenCalledWith('/api/themes/1/customization/header', expect.any(Object));
  });
});
```

**Implementation:**
```tsx
// resources/js/shared/services/api/themeCustomization.ts
export const themeCustomization = {
  saveSection: (themeId: number, section: string, data: { css: string; puck_data: Data }) =>
    http.post(`/api/themes/${themeId}/customization/${section}`, data),
    
  getCustomization: (themeId: number) =>
    http.get(`/api/themes/${themeId}/customization`),
};
```

**Files:**
- `resources/js/shared/services/api/themeCustomization.ts`
- `resources/js/shared/services/api/__tests__/themeCustomization.test.ts`

---

### Step 5: Blade CSS Loading with Customization (30 min)

**Test First:**
```php
// tests/Feature/BladeCssLoadingTest.php

public function test_central_storefront_loads_base_and_customization_css()
{
    $systemTheme = Theme::factory()->create(['id' => 1, 'is_system_theme' => true]);
    $centralTheme = Theme::factory()->create([
        'tenant_id' => null,
        'base_theme' => '1',
        'is_system_theme' => false,
        'is_active' => true,
        'settings_css' => ':root { --primary-500: #central-custom; }',
    ]);
    
    $response = $this->get('/');
    
    $response->assertSee('/storage/themes/1/1_variables.css');
    $response->assertSee('--primary-500: #central-custom');
}

public function test_tenant_storefront_loads_base_and_customization_css()
{
    $tenant = Tenant::factory()->create();
    $systemTheme = Theme::factory()->create(['id' => 1, 'is_system_theme' => true]);
    $tenantTheme = Theme::factory()->create([
        'tenant_id' => $tenant->id,
        'base_theme' => '1',
        'is_system_theme' => false,
        'is_active' => true,
        'settings_css' => ':root { --primary-500: #tenant-custom; }',
    ]);
    
    $response = $this->get('/');
    
    $response->assertSee('/storage/themes/1/1_variables.css');
    $response->assertSee('--primary-500: #tenant-custom');
}
```

**Implementation:**
```blade
{{-- resources/views/public-tenant.blade.php --}}
@if($activeTheme)
  {{-- Base theme CSS from disk --}}
  @if($activeTheme->base_theme)
    <link href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_variables.css') }}" rel="stylesheet">
    <link href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_header.css') }}" rel="stylesheet">
    <link href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_footer.css') }}" rel="stylesheet">
  @endif
  
  {{-- Tenant customization CSS from database (overrides) --}}
  @if($activeTheme->settings_css)
    <style>{!! $activeTheme->settings_css !!}</style>
  @endif
  @if($activeTheme->header_css)
    <style>{!! $activeTheme->header_css !!}</style>
  @endif
  @if($activeTheme->footer_css)
    <style>{!! $activeTheme->footer_css !!}</style>
  @endif
@endif
```

**Files:**
- `resources/views/public-tenant.blade.php`
- `tests/Feature/BladeTenantCssLoadingTest.php`

---

### Step 6: Tenant Routes & Page (30 min)

**Test First:**
```tsx
// resources/js/apps/tenant/components/pages/__tests__/ThemeCustomizePage.test.tsx

describe('ThemeCustomizePage', () => {
  it('renders ThemeBuilderPage in customize mode', () => {
    render(<ThemeCustomizePage />);
    
    // Info tab should not exist
    expect(screen.queryByRole('tab', { name: /info/i })).not.toBeInTheDocument();
    
    // Settings tab should be active
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
  });
});
```

**Implementation:**
```tsx
// Move ThemeBuilderPage to shared
// resources/js/shared/components/ThemeBuilderPage.tsx
// (move from central/components/pages to shared/components)

// resources/js/apps/central/components/pages/ThemeCustomizePage.tsx
import { ThemeBuilderPage } from '@/shared/components/ThemeBuilderPage';

export function ThemeCustomizePage() {
  return <ThemeBuilderPage mode="customize" />;
}

// resources/js/apps/tenant/components/pages/ThemeCustomizePage.tsx
import { ThemeBuilderPage } from '@/shared/components/ThemeBuilderPage';

export function ThemeCustomizePage() {
  return <ThemeBuilderPage mode="customize" />;
}
```

**Routes:**
```tsx
// resources/js/apps/central/routes.tsx
{ path: '/themes/customize', element: <ThemeCustomizePage /> }

// resources/js/apps/tenant/routes.tsx
{ path: '/themes/customize', element: <ThemeCustomizePage /> }
```

**Files:**
- Move: `resources/js/shared/components/ThemeBuilderPage.tsx` (from central/pages)
- `resources/js/apps/central/components/pages/ThemeCustomizePage.tsx`
- `resources/js/apps/tenant/components/pages/ThemeCustomizePage.tsx`
- `resources/js/apps/central/routes.tsx`
- `resources/js/apps/tenant/routes.tsx`

---

### Step 7: Fix Templates Endpoint (30 min)

**Current Issue:**
`getTemplatesFromActiveTheme()` returns `theme_data['templates']` which doesn't exist.
Templates are stored in `page_templates` table.

**Test First:**
```php
// tests/Feature/Api/ThemeTemplatesApiTest.php

public function test_get_active_templates_returns_page_templates()
{
    $theme = Theme::factory()->create(['is_active' => true]);
    PageTemplate::factory()->create(['theme_id' => $theme->id, 'name' => 'Home']);
    PageTemplate::factory()->create(['theme_id' => $theme->id, 'name' => 'About']);
    
    $response = $this->getJson('/superadmin/themes/active/templates');
    
    $response->assertJsonCount(2, 'data');
    $response->assertJsonPath('data.0.name', 'Home');
}
```

**Fix:**
```php
// app/Services/ThemeService.php
public function getTemplatesFromActiveTheme(?string $tenantId = null): array
{
    $theme = $this->getOrCreateDefaultTheme($tenantId);
    
    // FIX: Get from page_templates table, not theme_data
    return PageTemplate::where('theme_id', $theme->id)
        ->forTenant($tenantId)
        ->active()
        ->get()
        ->toArray();
}
```

**Files:**
- `app/Services/ThemeService.php`
- `tests/Feature/Api/ThemeTemplatesApiTest.php`

---

## Summary

### Task Breakdown (TDD Order)

| Step | Task | Est. Time | Tests First |
|------|------|-----------|-------------|
| 1 | Migration: Add CSS columns | 30 min | ✅ |
| 2 | Backend: Customization API | 1 hr | ✅ |
| 3 | Frontend: ThemeBuilderPage mode prop | 1 hr | ✅ |
| 4 | Frontend: API client | 30 min | ✅ |
| 5 | Blade: CSS loading with customization | 30 min | ✅ |
| 6 | Tenant: Routes & page | 30 min | ✅ |
| 7 | Fix: Templates endpoint | 30 min | ✅ |

**Total Estimated: 5-6 hours**

### Files to Create/Modify

**New Files:**
- `database/migrations/2026_01_27_000001_add_customization_css_to_themes_table.php`
- `app/Http/Controllers/Api/ThemeCustomizationController.php`
- `app/Services/ThemeCustomizationService.php`
- `resources/js/shared/services/api/themeCustomization.ts`
- `resources/js/apps/tenant/components/pages/ThemeCustomizePage.tsx`
- `tests/Feature/Api/TenantThemeCustomizationApiTest.php`
- `tests/Feature/BladeTenantCssLoadingTest.php`
- Various test files

**Modified Files:**
- `app/Models/Theme.php` (add fillable columns)
- `resources/js/apps/central/components/pages/ThemeBuilderPage.tsx` (add mode prop)
- `app/Services/ThemeService.php` (fix templates method)
- `routes/api.php` (add customization routes)
- `resources/views/public-tenant.blade.php` (cascade CSS loading)

---

## Confirmed Decisions

1. ✅ **CSS Column Names:** `settings_css`, `header_css`, `footer_css`
2. ✅ **Template CSS Loading:** Load into `<style>` tags (same as partials in theme builder)
3. ✅ **Customize Button:** Only on active theme (both central and tenant)
4. ✅ **Central + Tenant:** Both use same customization flow, central dogfoods on its own storefront
5. ✅ **System Theme Immutability:** System themes (is_system_theme=true) cannot be customized, only theme instances can
