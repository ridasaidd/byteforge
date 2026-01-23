# Theme CSS Implementation Guide

**Date:** January 23, 2026  
**Status:** Planning → Implementation  
**Branch:** `feature/theme-css-v2`

---

## Overview

This guide outlines the step-by-step implementation of a CSS-based theming system that:
- Generates CSS files from theme settings stored in the database
- Delivers CSS via `<link>` tags (not inline styles or style tags)
- Works in both public pages AND the Puck editor
- Uses CSS variables for consistent, cacheable styling
- Creates new files alongside existing code (no breaking changes)

---

## Current vs New Architecture

### Current (Working - Keep)
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
theme.theme_data (JSON in DB)
  ↓
ThemeCssGeneratorService
  ↓
/storage/public/themes/{theme_id}.css (saved to disk)
  ↓
<link rel="stylesheet" href="/storage/themes/{id}.css?v={hash}">
  ↓
Components use: var(--color-primary), var(--font-heading)
  ↓
CSS variables resolve automatically
```

**Benefits:**
- Valid HTML (`<link>` in `<head>`)
- Browser-cacheable CSS file
- Single source of truth
- Works in both public pages AND Puck editor

---

## Implementation Phases

### Phase 1: Backend CSS Generator (2-3 hours)

**Goal:** Generate CSS files from theme settings, store on disk

**Files to CREATE:**

1. **`app/Services/ThemeCssGeneratorService.php`** (NEW)
   - Read theme.theme_data from model
   - Generate CSS with `:root { --var-name: value }` format
   - Save to `storage/app/public/themes/{theme_id}.css`
   - Return public URL with cache-busting hash

2. **`tests/Unit/Services/ThemeCssGeneratorServiceTest.php`** (NEW)
   - Test CSS generation from various theme_data structures
   - Test file writing
   - Test URL generation with hash

3. **`tests/Feature/Api/ThemeCssGenerationTest.php`** (NEW)
   - Test: Activate theme → CSS file created
   - Test: Update theme_data → CSS file regenerated
   - Test: CSS file accessible via URL

**Files to MODIFY:**

4. **`app/Http/Controllers/Api/ThemeController.php`**
   - `update()`: Call generator after saving theme_data
   - `activate()`: Call generator after activation
   - `store()`: Call generator after creating theme

5. **`app/Models/Theme.php`**
   - Add `getCssUrl(): string` method
   - Add `getCssVersion(): string` method (use `updated_at` timestamp)

**Directory to CREATE:**
```
storage/app/public/themes/   (created automatically by generator)
```

**Symlink check:**
```bash
php artisan storage:link   # Ensures storage/app/public is accessible at /storage
```

---

### Phase 2: Blade Integration (30 mins)

**Goal:** Link generated CSS in public pages

**Files to MODIFY:**

1. **`resources/views/public-central.blade.php`**
   ```blade
   <head>
       ...existing...
       
       @if($themeCssUrl ?? null)
           <link rel="stylesheet" href="{{ $themeCssUrl }}">
       @endif
   </head>
   ```

2. **`app/Http/Controllers/PublicController.php`** (or wherever public routes are handled)
   - Pass `$themeCssUrl` to the view via the active theme

**OR Alternative - JavaScript injection (for SPA):**

Since the public site is a React SPA, we can inject the CSS dynamically:

1. **`resources/js/apps/central/App.tsx`** or **`ThemeProvider.tsx`**
   ```tsx
   useEffect(() => {
     if (theme?.id) {
       const link = document.createElement('link');
       link.rel = 'stylesheet';
       link.href = `/storage/themes/${theme.id}.css?v=${theme.updated_at}`;
       link.id = 'theme-css';
       
       // Remove old theme CSS if exists
       document.getElementById('theme-css')?.remove();
       document.head.appendChild(link);
     }
   }, [theme?.id, theme?.updated_at]);
   ```

This approach:
- Works for SPA navigation (no page reloads)
- Auto-updates when theme changes
- Works in both dashboard (editor) and public pages

---

### Phase 3: Editor Integration (1 hour)

**Goal:** Make CSS work in the Puck editor preview

**Key Insight:** Puck does NOT use iframes by default. It renders components directly in the DOM. So:
- CSS linked in `<head>` automatically applies to editor preview
- No special iframe injection needed

**Files to MODIFY:**

1. **`resources/js/shared/contexts/ThemeContext.tsx`**
   - Add CSS injection in `ThemeProvider`
   - Load CSS when theme loads or changes

2. **`resources/js/apps/central/components/pages/PageEditorPage.tsx`**
   - Ensure `ThemeProvider` wraps the Puck editor
   - CSS will apply to preview automatically

**Test Cases:**
- Open editor → Theme CSS loaded → Preview shows themed styles
- Change theme → CSS reloads → Preview updates
- Edit page → Save → Public page has same styles

---

### Phase 4: Convert Puck Components (2-3 hours)

**Goal:** Components use CSS variables instead of inline resolved colors

**Strategy:** Create NEW component versions, keep old ones working

**Files to CREATE (NEW versions):**

1. **`resources/js/shared/puck/components-v2/content/Heading.tsx`**
   - Use `style={{ color: 'var(--color-text-heading)' }}`
   - No more `resolve('colors.primary.500')` for base colors
   - Keep `resolve()` for user-selected custom colors

2. **`resources/js/shared/puck/components-v2/content/Text.tsx`**
3. **`resources/js/shared/puck/components-v2/content/Button.tsx`**
4. **`resources/js/shared/puck/components-v2/content/Card.tsx`**
5. **`resources/js/shared/puck/components-v2/layout/Box.tsx`**
6. **`resources/js/shared/puck/components-v2/navigation/Navigation.tsx`**

**Component Pattern:**
```tsx
// OLD (current)
const backgroundColor = resolve('colors.primary.500', '#3b82f6');
<div style={{ backgroundColor }}>

// NEW (CSS variables)
<div style={{ backgroundColor: 'var(--color-primary)' }}>

// USER CUSTOM COLOR (still uses resolve or direct value)
<div style={{ backgroundColor: props.backgroundColor || 'var(--color-primary)' }}>
```

**Config to CREATE:**

1. **`resources/js/shared/puck/config-v2/index.tsx`**
   - Import components from `components-v2/`
   - Same structure as current config
   - Can be used in parallel with old config

**Migration Path:**
- Keep old config working
- Test new config in a separate route or feature flag
- Once validated, swap configs
- Delete old files after confirmation

---

### Phase 5: Testing & Validation (1 hour)

**Backend Tests to ADD:**

1. `tests/Unit/Services/ThemeCssGeneratorServiceTest.php`
   - `test_generates_css_with_color_variables()`
   - `test_generates_css_with_typography_variables()`
   - `test_generates_css_with_spacing_variables()`
   - `test_saves_css_to_disk()`
   - `test_returns_correct_url_with_cache_hash()`

2. `tests/Feature/Api/ThemeCssGenerationTest.php`
   - `test_activating_theme_generates_css_file()`
   - `test_updating_theme_regenerates_css_file()`
   - `test_css_file_is_publicly_accessible()`

**Frontend Tests to ADD:**

1. `resources/js/shared/puck/__tests__/components-v2/Heading.test.tsx`
2. `resources/js/shared/puck/__tests__/components-v2/Button.test.tsx`
3. Test that components render with CSS variable references

**Manual Testing Checklist:**
- [ ] Activate theme → Check `/storage/themes/{id}.css` exists
- [ ] Open public page → Inspect `<head>` → CSS link present
- [ ] Open page editor → Preview has themed styles
- [ ] Edit theme tokens → CSS regenerates → Public page updates
- [ ] Clear browser cache → Reload → CSS loads fresh

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
    ThemeCssGeneratorService.php     ← NEW

resources/
  views/
    public-central.blade.php          ← MODIFIED (add CSS link)
  js/
    shared/
      contexts/
        ThemeContext.tsx              ← MODIFIED (add CSS injection)
      puck/
        components/                   ← KEEP (existing, working)
        components-v2/                ← NEW (CSS variable versions)
          content/
            Heading.tsx
            Text.tsx
            Button.tsx
            Card.tsx
          layout/
            Box.tsx
          navigation/
            Navigation.tsx
          index.ts
        config/                       ← KEEP (existing)
        config-v2/                    ← NEW (uses components-v2)
          index.tsx

storage/
  app/
    public/
      themes/                         ← NEW (generated CSS files)
        {theme_id}.css

tests/
  Unit/
    Services/
      ThemeCssGeneratorServiceTest.php  ← NEW
  Feature/
    Api/
      ThemeCssGenerationTest.php        ← NEW
```

---

## Rollout Strategy

1. **Phase 1-2**: Build backend + blade integration
   - CSS files generated but not yet used by components
   - Can verify files are created and accessible

2. **Phase 3**: Add CSS injection to ThemeProvider
   - CSS now loads in browser
   - Old components still work (they don't use variables yet)

3. **Phase 4**: Build new component versions
   - Create `components-v2/` with CSS variable support
   - Test in isolation with `config-v2`

4. **Phase 5**: Swap configs
   - Replace old config with v2 config in `PageEditorPage`
   - Test thoroughly

5. **Phase 6**: Cleanup (after validation)
   - Delete old `components/` that have v2 replacements
   - Rename `components-v2` → `components`
   - Delete `config-v2`, rename to `config`

---

## Commands to Get Started

```bash
# Create feature branch
git checkout -b feature/theme-css-v2

# Run tests to ensure baseline is green
php artisan test
npm run test

# Create storage directory (if needed)
mkdir -p storage/app/public/themes
php artisan storage:link

# After implementation, run tests
php artisan test --filter=ThemeCss
npm run test -- --filter=components-v2
```

---

## Success Criteria

- [ ] Activating a theme creates `/storage/themes/{id}.css`
- [ ] CSS file contains all theme variables
- [ ] Public pages load CSS via `<link>` tag
- [ ] Puck editor preview shows themed styles
- [ ] Changing theme tokens regenerates CSS
- [ ] All existing tests still pass (700+)
- [ ] New tests for CSS generation pass
- [ ] Manual QA confirms visual consistency

---

_Related docs: [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md), [CURRENT_STATUS.md](CURRENT_STATUS.md)_
