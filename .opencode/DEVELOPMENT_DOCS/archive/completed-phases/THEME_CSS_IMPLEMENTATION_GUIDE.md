# Theme CSS Implementation Guide

**Date:** January 25, 2026  
**Status:** Phase 5b Complete → Phase 6 Validation Next  
**Branch:** `feature/theme-css-v2`

---

## Overview

This guide outlines the CSS-based theming system that:
- Generates CSS files from theme settings, stored on disk per theme ID
- Uses a **two-layer CSS architecture** (shared base + tenant overrides)
- **Tenant customizations stored in database** (pivot table, not files)
- Delivers CSS via `<link>` tags (cacheable, valid HTML)
- Works in both public pages AND the Puck editor

---

## Architecture Summary

### Current Status (Phase 5b Complete)

✅ CSS generation working - files stored at `/storage/themes/{id}/{id}.css`
✅ Frontend PuckCssAggregator extracts CSS from Puck data
✅ ThemeBuilderPage integration complete
✅ 770+ tests passing

### Immediate Next Step: Phase 6 - Validate CSS Loading

Load CSS from disk to `<link>` tag in Blade head. Test on actual storefront to confirm the concept works before continuing.

---

## Two-Layer CSS Architecture

### Layer 1: Base Theme CSS (Shared, Cacheable)
```
/storage/themes/{themeId}/{themeId}.css
```
- Generated from theme settings + component styles
- Published when theme is saved in Theme Builder
- Cached by browser, CDN-friendly

### Layer 2: Tenant Overrides (Database, Inline)
```sql
tenant_themes.custom_css  -- Stores CSS variable overrides
```
- Small payload (just the delta from tenant edits)
- Rendered as inline `<style>` tag after base CSS link
- Cascades over Layer 1 via CSS specificity

### Rendering Flow
```html
<head>
  <!-- Layer 1: Base theme (shared, cached) -->
  <link rel="stylesheet" href="/storage/themes/7/7.css?v=1706100000">
  
  <!-- Layer 2: Tenant customizations (from DB, inline) -->
  <style>
    :root { --color-primary: #custom123; }
  </style>
</head>
```

---

## Simplified Architecture: Pivot Table Approach

### Problem with Current Cloning Approach

Currently, when a tenant activates a system theme, we clone the entire theme record:
- Duplicates `theme_data` (large JSON blob)
- Creates orphaned theme records
- Complex to update templates (need to update each clone)

### New Approach: Pivot Table

System themes remain as templates. Tenant activations + customizations stored in a pivot table.

```sql
-- themes table (templates only, no tenant_id needed)
themes:
  - id
  - name
  - slug
  - theme_data (JSON - the template)
  - is_system_theme (true for templates)

-- NEW: tenant_themes pivot table
tenant_themes:
  - tenant_id (FK to tenants)
  - theme_id (FK to themes)
  - is_active (boolean)
  - custom_css (text - tenant overrides)
  - activated_at (timestamp)
  - PRIMARY KEY (tenant_id, theme_id)
```

### Query: Get Active Theme + Customizations (Single Hit)

```php
// Eloquent relationship on Theme model
public function tenants()
{
    return $this->belongsToMany(Tenant::class, 'tenant_themes')
        ->withPivot('is_active', 'custom_css', 'activated_at')
        ->withTimestamps();
}

// Usage - single query with JOIN
$theme = Theme::whereHas('tenants', function($query) use ($tenantId) {
    $query->where('tenant_id', $tenantId)
          ->where('tenant_themes.is_active', true);
})->with(['tenants' => function($query) use ($tenantId) {
    $query->where('tenant_id', $tenantId);
}])->first();

// Access customizations from pivot
$customCss = $theme?->tenants->first()?->pivot->custom_css;
```

### Benefits

- ✅ **No data duplication** - theme_data stored once in system theme
- ✅ **Single DB query** - JOIN gets theme + tenant customizations
- ✅ **Easy template updates** - update once, all tenants see changes
- ✅ **Clean separation** - templates vs tenant activations
- ✅ **Performance** - Eloquent compiles to same efficient SQL

---

## Implementation Phases

### Phase 6: Validate CSS Loading (IMMEDIATE - 1-2 hrs)

**Goal:** Confirm CSS generation architecture works end-to-end

**Tasks:**
1. Update `public-central.blade.php` to add theme CSS link in `<head>`
2. Test on actual storefront page
3. Verify styles apply correctly
4. Confirm cache-busting works

**Files to Modify:**

```blade
{{-- resources/views/public-central.blade.php --}}
<head>
    ...existing...
    
    @if($theme ?? null)
        <link rel="stylesheet" href="{{ $theme->getCssUrl() }}" id="theme-base-css">
    @endif
</head>
```

---

### Phase 7: Architecture Refactor - Pivot Table (3-4 hrs)

**Goal:** Replace cloning with pivot table approach

**Migration: `create_tenant_themes_table`**
```php
Schema::create('tenant_themes', function (Blueprint $table) {
    $table->string('tenant_id');
    $table->foreignId('theme_id')->constrained()->onDelete('cascade');
    $table->boolean('is_active')->default(false);
    $table->longText('custom_css')->nullable();
    $table->timestamp('activated_at')->nullable();
    $table->timestamps();
    
    $table->primary(['tenant_id', 'theme_id']);
    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
    $table->index(['tenant_id', 'is_active']);
});
```

**Actions to Create (using laravel-actions):**

1. **`app/Actions/ActivateTheme.php`**
```php
class ActivateTheme
{
    public function handle(string $tenantId, int $themeId): Theme
    {
        // Deactivate all themes for this tenant
        DB::table('tenant_themes')
            ->where('tenant_id', $tenantId)
            ->update(['is_active' => false]);
        
        // Activate or create pivot row
        DB::table('tenant_themes')->updateOrInsert(
            ['tenant_id' => $tenantId, 'theme_id' => $themeId],
            ['is_active' => true, 'activated_at' => now(), 'updated_at' => now()]
        );
        
        return Theme::find($themeId);
    }
}
```

2. **`app/Actions/SaveThemeCustomCss.php`**
```php
class SaveThemeCustomCss
{
    public function handle(string $tenantId, int $themeId, string $customCss): void
    {
        DB::table('tenant_themes')
            ->where('tenant_id', $tenantId)
            ->where('theme_id', $themeId)
            ->update(['custom_css' => $customCss, 'updated_at' => now()]);
    }
}
```

**Update Theme Model:**
```php
// Add relationship
public function tenants()
{
    return $this->belongsToMany(Tenant::class, 'tenant_themes')
        ->withPivot('is_active', 'custom_css', 'activated_at')
        ->withTimestamps();
}

// Add scope for active theme
public function scopeActiveForTenant($query, string $tenantId)
{
    return $query->whereHas('tenants', function($q) use ($tenantId) {
        $q->where('tenant_id', $tenantId)
          ->where('tenant_themes.is_active', true);
    });
}
```

**Remove from ThemeService:**
- Delete `cloneSystemTheme()` method
- Update `activateTheme()` to use `ActivateTheme` action

---

### Phase 8: Tenant Customization UI (4-6 hrs)

**Goal:** Allow tenants to customize colors, typography, spacing

**Features:**
- Live token editing (color pickers, font selectors)
- Preview before applying
- Save to `tenant_themes.custom_css`
- Reset to theme defaults

---

### Phase 9: Puck Editor CSS (1-2 hrs)

**Goal:** Ensure editor preview loads theme CSS

**Note:** Puck does NOT use iframes. CSS in `<head>` applies to preview automatically.

---

### Phase 10: Extended Component Builders (2-3 hrs)

**Goal:** Add CSS builders for remaining components

**Current:** Box, Card, Button, Heading, Text
**To Add:** Link, Image, Form

---

## File Structure (Reference)

```
storage/themes/
└── {themeId}/                    # Folder per theme (ID ensures uniqueness)
    ├── {themeId}.css             # ← Published master CSS (merged)
    ├── {themeId}_variables.css   # ← Working file: CSS variables
    ├── {themeId}_header.css      # ← Working file: Header component CSS
    ├── {themeId}_footer.css      # ← Working file: Footer component CSS
    ├── {themeId}_template-*.css  # ← Working files: Per-template CSS
    └── preview.jpg               # ← Theme preview image
```

---

### Phase 6 Implementation Detail: Blade & SPA CSS Injection

**Goal:** Link published CSS in public pages

**Files to MODIFY:**

1. **`resources/views/public-central.blade.php`**
   ```blade
   <head>
       ...existing...
       
       @if($theme ?? null)
           <link rel="stylesheet" href="{{ $theme->getCssUrl() }}" id="theme-base-css">
           
           @if($customCss ?? null)
           <style id="theme-overrides-css">
               {!! $customCss !!}
           </style>
           @endif
       @endif
   </head>
   ```

   Note: With pivot table approach, `$customCss` comes from `tenant_themes.custom_css` via the relationship.

2. **`resources/js/shared/contexts/ThemeContext.tsx`** - For SPA navigation:
   ```tsx
   useEffect(() => {
     if (theme?.id) {
       // Inject base CSS link
       let link = document.getElementById('theme-base-css') as HTMLLinkElement;
       if (!link) {
         link = document.createElement('link');
         link.rel = 'stylesheet';
         link.id = 'theme-base-css';
         document.head.appendChild(link);
       }
       link.href = `/storage/themes/${theme.id}/${theme.id}.css?v=${theme.updated_at}`;
       
       // Inject overrides style tag (if tenant has customizations)
       let style = document.getElementById('theme-overrides-css') as HTMLStyleElement;
       if (theme.custom_css) {
         if (!style) {
           style = document.createElement('style');
           style.id = 'theme-overrides-css';
           document.head.appendChild(style);
         }
         style.textContent = theme.custom_css;
       } else if (style) {
         style.remove();
       }
     }
   }, [theme?.id, theme?.updated_at, theme?.custom_css]);
   ```

---

### Phase 7 Implementation Detail: Editor Integration

**Goal:** Make CSS work in Puck editor preview

**Key Insight:** Puck does NOT use iframes. CSS linked in `<head>` applies to editor preview automatically.

**Files to MODIFY:**

1. **`resources/js/apps/central/components/pages/PageEditorPage.tsx`**
   - Ensure `ThemeProvider` wraps the Puck editor
   - CSS injection from Phase 6 will apply to preview automatically

**Test Cases:**
- Open editor → Theme CSS loaded → Preview shows themed styles
- Change theme → CSS reloads → Preview updates
- Edit page → Save → Public page has same styles

---

### Phase 8 Implementation Detail: Tenant Customization Flow

**Goal:** When tenant edits tokens on activated theme, save to `tenant_themes.custom_css`

**Using Actions (laravel-actions):**

```php
// app/Actions/SaveThemeCustomCss.php
use Lorisleiva\Actions\Concerns\AsAction;

class SaveThemeCustomCss
{
    use AsAction;

    public function handle(string $tenantId, int $themeId, string $customCss): void
    {
        DB::table('tenant_themes')
            ->where('tenant_id', $tenantId)
            ->where('theme_id', $themeId)
            ->update([
                'custom_css' => $customCss,
                'updated_at' => now(),
            ]);
    }
}
```

**API Endpoint:**
```php
// PATCH /api/superadmin/themes/{id}/customize
public function customize(Request $request, Theme $theme)
{
    $validated = $request->validate([
        'custom_css' => 'required|string',
    ]);
    
    SaveThemeCustomCss::run(
        tenant('id'),
        $theme->id,
        $validated['custom_css']
    );
    
    return response()->json(['success' => true]);
}
```

**Frontend ThemeCustomizerPage** (future):
- Edit tokens → generate CSS string → save to pivot table
- Preview shows inline overrides immediately

---

### Phase 9 Implementation Detail: Convert Puck Components

**Goal:** Components use CSS variables instead of inline resolved colors

**Strategy:** Gradual migration - components check for CSS variable support

**Files to MODIFY:**

1. **`resources/js/shared/puck/components/content/Heading.tsx`**
   ```tsx
   // Use CSS variable for default, fall back to resolved value for custom
   const color = props.color?.type === 'custom' 
     ? resolveColorValue(props.color, resolve)
     : 'var(--color-text)';
   ```

2. Similar updates for: `Text.tsx`, `Button.tsx`, `Card.tsx`, `Box.tsx`

**Component Pattern:**
```tsx
// Theme default → Use CSS variable
<div style={{ backgroundColor: 'var(--color-primary)' }}>

// User custom color → Use resolved value
<div style={{ backgroundColor: props.backgroundColor || 'var(--color-primary)' }}>
```

---

### Phase 10: Testing & Validation (1 hour)

**Backend Tests:**
- `tests/Unit/Services/ThemeCssSectionServiceTest.php`
- `tests/Unit/Services/ThemeCssPublishServiceTest.php`
- `tests/Feature/Api/ThemeCssSectionApiTest.php`
- `tests/Feature/ThemeCssWorkflowTest.php`

**Frontend Tests:**
- `resources/js/shared/puck/services/__tests__/PuckCssAggregator.test.ts`
- Component tests for CSS variable usage

**Manual Testing Checklist:**
- [ ] Create theme → folder created at `/storage/themes/{id}/`
- [ ] Save each section → individual CSS files created
- [ ] Publish → merged `{id}.css` created
- [ ] Missing section → publish fails with clear error
- [ ] Public page → base CSS link present
- [ ] Tenant customize → `custom_css` saved, inline style appears
- [ ] Puck editor → preview shows themed styles
- [ ] Edit theme tokens → CSS regenerates → public page updates
- [ ] All existing tests still pass (700+)

---

## CSS Variable Naming Convention

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-primary-light: #60a5fa;
  --color-secondary: #10b981;
  --color-accent: #8b5cf6;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #22c55e;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;

  /* Typography */
  --font-family-body: 'Inter', sans-serif;
  --font-family-heading: 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --spacing-0: 0;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.125rem;
  --radius-base: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
```

---

## Theme Builder Step-by-Step Flow

### Step 1: Theme Info
**User actions:** Enter name, description, upload preview image  
**On "Next":**
1. Validate required fields (name)
2. `POST /api/superadmin/themes` → Creates theme record
3. Backend creates `/storage/themes/{id}/` folder
4. Navigate to Step 2

### Step 2: Settings (Tokens)
**User actions:** Edit colors, typography, spacing, border-radius  
**On "Next":**
1. Generate CSS variables from `themeData` state
2. `POST /api/superadmin/themes/{id}/sections/variables` with CSS string
3. Backend writes `{id}_variables.css`
4. Navigate to Step 3

### Step 3: Header
**User actions:** Design header using Puck editor  
**On "Next":**
1. Extract CSS from `headerData` using `PuckCssAggregator`
2. `POST /api/superadmin/themes/{id}/sections/header` with CSS string
3. Backend writes `{id}_header.css`
4. Save Puck data to `theme_parts` table (existing flow)
5. Navigate to Step 4

### Step 4: Footer
**User actions:** Design footer using Puck editor  
**On "Next":**
1. Extract CSS from `footerData` using `PuckCssAggregator`
2. `POST /api/superadmin/themes/{id}/sections/footer` with CSS string
3. Backend writes `{id}_footer.css`
4. Save Puck data to `theme_parts` table (existing flow)
5. Navigate to Step 5

### Step 5: Templates (Optional) & Publish
**User actions:** Create page templates, review, publish  
**On "Save Template":**
1. Extract CSS from template Puck data
2. `POST /api/superadmin/themes/{id}/sections/template-{name}` with CSS string
3. Backend writes `{id}_template-{name}.css`

**On "Publish":**
1. `GET /api/superadmin/themes/{id}/publish/validate`
2. If missing sections → show error toast with list
3. If valid → `POST /api/superadmin/themes/{id}/publish`
4. Backend merges all section files → writes `{id}.css`
5. Show success toast with CSS URL

### Backtracking Behavior
**When user navigates back to a previous step:**
- Previous section data is still in component state
- On "Next" again, that section's CSS file is **overwritten** entirely
- No merge conflicts, no regex parsing—just atomic file replacement

---

## Tenant Customization Flow (Separate from Theme Builder)

### ThemeCustomizerPage (Future)
**Purpose:** Edit tokens on an activated theme without touching base CSS

**Flow:**
1. Tenant opens theme customizer for their active theme
2. Edit token values (colors, typography, etc.)
3. Frontend generates CSS override string (just the changed vars)
4. `PATCH /api/superadmin/themes/{id}/customize` with `{ custom_css: "..." }`
5. Backend saves to `themes.custom_css` column (no file writes)
6. Public page renders base CSS + inline `<style>` with overrides

**Key Point:** Base CSS file is never modified by tenant customizations. Only the DB column is updated.

---

## Theme Data to CSS Mapping

**Input (theme.theme_data JSON):**
```json
{
  "colors": {
    "primary": {
      "50": "#eff6ff",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8"
    },
    "neutral": {
      "white": "#ffffff",
      "gray": {
        "50": "#f9fafb",
        "900": "#111827"
      }
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, sans-serif",
      "heading": "Playfair Display, serif"
    },
    "fontSize": {
      "base": "1rem",
      "lg": "1.125rem"
    }
  }
}
```

**Output (generated CSS):**
```css
:root {
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary: #3b82f6;  /* Alias for 500 */
  --color-neutral-white: #ffffff;
  --color-neutral-gray-50: #f9fafb;
  --color-neutral-gray-900: #111827;
  --font-family-sans: Inter, sans-serif;
  --font-family-heading: Playfair Display, serif;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
}
```

---

## File Structure After Implementation

```
app/
  Services/
    ThemeCssSectionService.php      ← NEW (section file management)
    ThemeCssPublishService.php      ← NEW (merge & publish)
  Http/
    Controllers/
      Api/
        ThemeCssController.php      ← NEW (section & publish endpoints)

resources/
  views/
    public-central.blade.php         ← MODIFIED (add CSS link + overrides style)
  js/
    shared/
      contexts/
        ThemeContext.tsx             ← MODIFIED (add CSS injection for SPA)
      puck/
        components/                  ← MODIFIED (use CSS vars for defaults)
        services/
          PuckCssAggregator.ts       ← NEW (extract CSS from Puck data)
      services/
        api/
          themeCss.ts                ← NEW (section/publish API calls)
    apps/
      central/
        components/
          pages/
            ThemeBuilderPage.tsx     ← MODIFIED (section saves on step transitions)

storage/
  app/
    public/
      themes/
        {themeId}/                   ← NEW (folder per theme)
          {themeId}.css              ← Published master CSS
          {themeId}_variables.css    ← Working file
          {themeId}_header.css       ← Working file
          {themeId}_footer.css       ← Working file
          {themeId}_template-*.css   ← Working files
          preview.jpg                ← Theme preview image

database/
  migrations/
    add_custom_css_to_themes_table.php ← NEW

tests/
  Unit/
    Services/
      ThemeCssSectionServiceTest.php   ← NEW
      ThemeCssPublishServiceTest.php   ← NEW
  Feature/
    Api/
      ThemeCssSectionApiTest.php       ← NEW
    ThemeCssWorkflowTest.php           ← NEW
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/superadmin/themes` | Create theme (existing, adds folder init) |
| `POST` | `/api/superadmin/themes/{id}/sections/{section}` | Save section CSS |
| `GET` | `/api/superadmin/themes/{id}/sections/{section}` | Get section CSS |
| `GET` | `/api/superadmin/themes/{id}/publish/validate` | Check required sections |
| `POST` | `/api/superadmin/themes/{id}/publish` | Merge & publish master CSS |
| `PATCH` | `/api/superadmin/themes/{id}/customize` | Save tenant overrides to DB |

**Section names:** `variables`, `header`, `footer`, `template-{name}`

---

## Rollout Strategy

1. **Phase 1-3**: Backend services + API + migration
   - Can test via API without UI changes

2. **Phase 4**: Frontend aggregator
   - Test CSS extraction in isolation

3. **Phase 5**: Theme Builder integration
   - Wire up section saves on step transitions
   - Add publish button

4. **Phase 6-7**: Blade + SPA injection
   - CSS now loads in browser
   - Old components still work

5. **Phase 8**: Tenant customization flow
   - Build ThemeCustomizerPage or update existing UI

6. **Phase 9**: Component migration
   - Gradually update components to use CSS vars

7. **Phase 10**: Testing & cleanup
   - All tests pass
   - Remove any dead code

---

## Commands to Get Started

```bash
# Create feature branch
git checkout -b feature/theme-css-v3

# Run tests to ensure baseline is green
php artisan test
npm run test

# Create migration
php artisan make:migration add_custom_css_to_themes_table

# Ensure storage symlink exists
php artisan storage:link

# After implementation, run tests
php artisan test --filter=ThemeCss
npm run test -- --filter=PuckCssAggregator
```

---

## Success Criteria

- [ ] Creating a theme creates `/storage/themes/{id}/` folder
- [ ] Each step save creates corresponding `{id}_{section}.css` file
- [ ] Backtracking and re-saving overwrites section file correctly
- [ ] Publish validates required sections (variables, header, footer)
- [ ] Publish merges all sections into `{id}.css`
- [ ] Public pages load CSS via `<link>` tag
- [ ] Tenant customizations saved to `custom_css` column
- [ ] Tenant overrides rendered as inline `<style>` after base link
- [ ] Puck editor preview shows themed styles
- [ ] All existing tests still pass (700+)
- [ ] New tests for CSS workflow pass

---

_Related docs: [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md), [CURRENT_STATUS.md](CURRENT_STATUS.md), [AUDIT_THEME_BUILDER_CSS_ISSUES.md](AUDIT_THEME_BUILDER_CSS_ISSUES.md)_
