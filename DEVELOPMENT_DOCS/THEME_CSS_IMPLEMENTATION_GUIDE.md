# Theme CSS Implementation Guide

**Date:** January 24, 2026  
**Status:** Architecture Finalized → Ready for Implementation  
**Branch:** `feature/theme-css-v3`

---

## Overview

This guide outlines the step-by-step implementation of a CSS-based theming system that:
- Uses a **two-layer CSS architecture** (shared base + tenant overrides)
- Generates CSS files from theme settings, stored on disk per theme ID
- Supports **atomic section saves** in the Theme Builder (variables, header, footer, templates)
- **Tenant customizations stored in database** (not files) for isolation
- Delivers CSS via `<link>` tags (not inline styles or style tags)
- Works in both public pages AND the Puck editor
- Uses CSS variables for consistent, cacheable styling

---

## Architecture Decision Summary

### Key Decisions (Jan 24, 2026)

1. **Shared base CSS per theme ID**: Published themes have a merged CSS file at `/storage/themes/{themeId}/{themeId}.css`
2. **Tenant overrides in database**: Tenant customizations stored in `themes.custom_css` column, rendered inline after the base link
3. **Atomic section saves**: Theme Builder saves each section (variables, header, footer, templates) to separate files
4. **Publish/merge flow**: "Publish" button merges all section files into the master CSS
5. **No cross-tenant impact**: Base CSS is per theme ID (unique per tenant's theme record)

---

## Two-Layer CSS Architecture

### Layer 1: Base Theme CSS (Shared, Cacheable)
```
/storage/themes/{themeId}/{themeId}.css
```
- Generated from merged section files (variables + header + footer + templates)
- Published via "Save All" / "Publish" action in Theme Builder
- Cached by browser, CDN-friendly
- Never modified by tenant token edits (those go to Layer 2)

### Layer 2: Tenant Overrides (Database, Inline)
```sql
themes.custom_css  -- Stores CSS variable overrides + component customizations
```
- Small payload (just the delta from tenant edits)
- Rendered as inline `<style>` tag after base CSS link
- Cascades over Layer 1 via CSS specificity
- No file I/O; just DB column update

### Rendering Flow
```html
<head>
  <!-- Layer 1: Base theme (shared, cached) -->
  <link rel="stylesheet" href="/storage/themes/7/7.css?v=1706100000">
  
  <!-- Layer 2: Tenant customizations (from DB, inline) -->
  <style>
    :root { --color-primary: #custom123; }
    .box-xyz { background-color: #tenant-override; }
  </style>
</head>
```

---

## File Structure

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

**Benefits:**
- All theme assets in one folder
- Theme ID as folder name = no naming conflicts
- Atomic section saves = overwrite specific file
- Easy merge = concatenate all section files

---

## Current vs New Architecture

### Current (Working - Keep for now)
```
theme.theme_data (JSON in DB)
  ↓
ThemeProvider.resolve('colors.primary.500')
  ↓
Components compute inline styles at render time
  ↓
<style> tags injected per component
```

**Problems:**
- Style tags in `<body>` (invalid HTML)
- No caching (styles generated on every render)
- Each component resolves tokens independently

### New (To Implement)
```
Theme Builder saves sections → /storage/themes/{themeId}/{themeId}_{section}.css
  ↓
Publish merges sections → /storage/themes/{themeId}/{themeId}.css
  ↓
<link rel="stylesheet" href="/storage/themes/{themeId}/{themeId}.css?v={timestamp}">
  ↓
Tenant overrides (if any) → <style>{{ $theme->custom_css }}</style>
  ↓
Components use: var(--color-primary), var(--font-heading)
```

**Benefits:**
- Valid HTML (`<link>` in `<head>`)
- Browser-cacheable CSS file
- Atomic saves = no merge conflicts
- Tenant isolation via DB overrides
- Single source of truth per theme

---

## Implementation Phases

### Phase 1: Database Migration (15 mins)

**Goal:** Add `custom_css` column for tenant overrides

**Files to CREATE:**

1. **Migration: `add_custom_css_to_themes_table`**
   ```php
   Schema::table('themes', function (Blueprint $table) {
       $table->longText('custom_css')->nullable()->after('theme_data');
   });
   ```

**Files to MODIFY:**

2. **`app/Models/Theme.php`**
   - Add `custom_css` to `$fillable` array
   - Add `getCssUrl(): string` method
   - Add `getCssVersion(): string` method

---

### Phase 2: Backend Services (2-3 hours)

**Goal:** Create services for CSS section management and publishing

**Files to CREATE:**

1. **`app/Services/ThemeCssSectionService.php`** (NEW)
   ```php
   class ThemeCssSectionService
   {
       public function initializeThemeFolder(Theme $theme): void
       public function saveSectionCss(int $themeId, string $section, string $css): void
       public function getSectionCss(int $themeId, string $section): ?string
       public function sectionExists(int $themeId, string $section): bool
       public function getRequiredSections(): array // ['variables', 'header', 'footer']
       public function getAllSectionFiles(int $themeId): array
   }
   ```

2. **`app/Services/ThemeCssPublishService.php`** (NEW)
   ```php
   class ThemeCssPublishService
   {
       public function validateRequiredSections(int $themeId): array // Returns missing sections
       public function publishTheme(int $themeId): string // Returns published CSS URL
       public function mergeAllSections(int $themeId): string // Returns merged CSS content
   }
   ```

3. **`tests/Unit/Services/ThemeCssSectionServiceTest.php`** (NEW)
   - Test folder creation
   - Test section save/read
   - Test file existence checks

4. **`tests/Unit/Services/ThemeCssPublishServiceTest.php`** (NEW)
   - Test validation of required sections
   - Test merge logic
   - Test publish writes correct file

5. **`tests/Feature/ThemeCssWorkflowTest.php`** (NEW)
   - Test full workflow: create → save sections → publish

---

### Phase 3: API Endpoints (1 hour)

**Goal:** Expose section save and publish endpoints

**Files to CREATE/MODIFY:**

1. **`app/Http/Controllers/Api/ThemeCssController.php`** (NEW)
   ```php
   class ThemeCssController extends Controller
   {
       // POST /api/superadmin/themes/{id}/sections/{section}
       public function saveSection(Request $request, int $themeId, string $section)
       
       // GET /api/superadmin/themes/{id}/sections/{section}
       public function getSection(int $themeId, string $section)
       
       // POST /api/superadmin/themes/{id}/publish
       public function publish(int $themeId)
       
       // GET /api/superadmin/themes/{id}/publish/validate
       public function validatePublish(int $themeId)
   }
   ```

2. **`routes/api.php`** - Add routes:
   ```php
   Route::prefix('superadmin/themes/{theme}')->group(function () {
       Route::post('sections/{section}', [ThemeCssController::class, 'saveSection']);
       Route::get('sections/{section}', [ThemeCssController::class, 'getSection']);
       Route::post('publish', [ThemeCssController::class, 'publish']);
       Route::get('publish/validate', [ThemeCssController::class, 'validatePublish']);
   });
   ```

3. **`tests/Feature/Api/ThemeCssSectionApiTest.php`** (NEW)
   - Test save section endpoint
   - Test get section endpoint
   - Test publish endpoint
   - Test validation endpoint

---

### Phase 4: Frontend CSS Aggregator (1-2 hours)

**Goal:** Create service to extract CSS from Puck data

**Files to CREATE:**

1. **`resources/js/shared/puck/services/PuckCssAggregator.ts`** (NEW)
   ```typescript
   import { buildLayoutCSS, buildTypographyCSS } from '../fields/cssBuilder';
   import type { Data } from '@measured/puck';
   
   export function extractCssFromPuckData(
     puckData: Data,
     themeResolver?: ThemeResolver
   ): string
   
   export function generateVariablesCss(themeData: ThemeData): string
   
   // Helper to identify component type
   function isLayoutComponent(type: string): boolean
   function isTypographyComponent(type: string): boolean
   ```

2. **`resources/js/shared/services/api/themeCss.ts`** (NEW)
   ```typescript
   export const themeCssApi = {
     saveSection: (themeId: number, section: string, css: string) => Promise<void>,
     getSection: (themeId: number, section: string) => Promise<string>,
     publish: (themeId: number) => Promise<{ cssUrl: string }>,
     validatePublish: (themeId: number) => Promise<{ valid: boolean, missing: string[] }>,
   };
   ```

3. **`resources/js/shared/puck/services/__tests__/PuckCssAggregator.test.ts`** (NEW)
   - Test CSS extraction from sample Puck data
   - Test variable generation from theme data
   - Test nested component handling

---

### Phase 5: Theme Builder Integration (2-3 hours)

**Goal:** Wire up section saves on step transitions and publish on final step

**Files to MODIFY:**

1. **`resources/js/apps/central/components/pages/ThemeBuilderPage.tsx`**
   - Import `PuckCssAggregator` and `themeCssApi`
   - On "Next" from Step 1 (Info): Create theme + initialize folder
   - On "Next" from Step 2 (Settings): Save `{id}_variables.css`
   - On "Next" from Step 3 (Header): Save `{id}_header.css`
   - On "Next" from Step 4 (Footer): Save `{id}_footer.css`
   - On Step 5 (Templates): Save each `{id}_template-{name}.css`
   - On "Publish": Call publish endpoint, show success with CSS URL

2. **Add step transition handlers:**
   ```typescript
   const handleStepChange = async (fromStep: number, toStep: number) => {
     // Save current step's CSS before transitioning
     if (fromStep === 1 && themeId) {
       // Settings step: generate and save variables CSS
       const variablesCss = generateVariablesCss(themeData);
       await themeCssApi.saveSection(themeId, 'variables', variablesCss);
     }
     if (fromStep === 2 && themeId) {
       const headerCss = extractCssFromPuckData(headerData, resolve);
       await themeCssApi.saveSection(themeId, 'header', headerCss);
     }
     // ... etc
     setCurrentStep(toStep);
   };
   ```

3. **Add publish button on final step:**
   ```typescript
   const handlePublish = async () => {
     const validation = await themeCssApi.validatePublish(themeId);
     if (!validation.valid) {
       toast.error(`Missing sections: ${validation.missing.join(', ')}`);
       return;
     }
     const { cssUrl } = await themeCssApi.publish(themeId);
     toast.success('Theme published!');
   };
   ```

---

### Phase 6: Blade & SPA CSS Injection (1 hour)

**Goal:** Link published CSS in public pages + tenant overrides

**Files to MODIFY:**

1. **`resources/views/public-central.blade.php`**
   ```blade
   <head>
       ...existing...
       
       @if($theme ?? null)
           <link rel="stylesheet" href="{{ $theme->getCssUrl() }}" id="theme-base-css">
           
           @if($theme->custom_css)
           <style id="theme-overrides-css">
               {!! $theme->custom_css !!}
           </style>
           @endif
       @endif
   </head>
   ```

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
       
       // Inject overrides style tag
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

### Phase 7: Editor Integration (30 mins)

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

### Phase 8: Tenant Customization Flow (1 hour)

**Goal:** When tenant edits tokens on activated theme, save to `custom_css` column

**Files to MODIFY:**

1. **`app/Http/Controllers/Api/ThemeController.php`**
   - `updateCustomizations()`: Generate CSS from changed tokens, save to `custom_css`

2. **Create endpoint for tenant token updates:**
   ```php
   // PATCH /api/superadmin/themes/{id}/customize
   public function customize(Request $request, Theme $theme)
   {
       $validated = $request->validate([
           'custom_css' => 'required|string',
       ]);
       
       $theme->update(['custom_css' => $validated['custom_css']]);
       
       return response()->json(['success' => true]);
   }
   ```

3. **Frontend ThemeCustomizerPage** (future):
   - Edit tokens → generate CSS string → save to `custom_css`
   - Preview shows inline overrides immediately

---

### Phase 9: Convert Puck Components (2-3 hours)

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
