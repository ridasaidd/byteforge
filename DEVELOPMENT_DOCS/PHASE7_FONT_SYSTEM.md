# Phase 7: Font System Architecture

Last updated: January 30, 2026

---

## Executive Summary

**Goal:** Build a comprehensive font management system for theme creators to select multiple font families (sans, serif, mono) from Google Fonts and FontBunny, with live preview in Theme Builder Settings tab. Tenants use fonts configured by central - no custom font uploads by tenants.

**Dependencies:** Phase 6 (Theme Customization) complete ✅

**Scope:** Font family management (central-only), loading strategy, component integration, CSS generation, live preview.

**Key Change from Initial Plan:**
- **Central Only:** Font configuration (Google Fonts, FontBunny selection)
- **Tenants:** Use fonts selected by central, no custom uploads
- **Settings Tab Focus:** All font work happens in Settings tab (no new tabs)
- **Customization Scope:** Tenants can override color/spacing but NOT fonts

---

## Current State

**What We Have:**
- `themeData.typography.fontFamily.sans` - Single font family for body text
- Manual input in Theme Settings tab
- No serif or mono font support
- No font preview
- No external font loading (Google Fonts, FontBunny)
- No component-level font selection

**What We Need:**
- Multi-font support (sans, serif, mono)
- Font source integration (Google Fonts, FontBunny, system fonts)
- Font preview system
- Component font controls
- CSS generation for multiple font families

---

## Architecture Decisions (TBD)

### 1. Font Data Structure

**Option A: Simple Names**
```json
{
  "typography": {
    "fontFamily": {
      "sans": "Inter",
      "serif": "Georgia",
      "mono": "Courier New"
    }
  }
}
```

**Option B: Full Metadata**
```json
{
  "typography": {
    "fontFamily": {
      "sans": {
        "name": "Inter",
        "source": "google-fonts",
        "weights": [400, 500, 600, 700],
        "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700"
      },
      "serif": {
        "name": "Playfair Display",
        "source": "google-fonts",
        "weights": [400, 700],
        "url": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700"
      },
      "mono": {
        "name": "Fira Code",
        "source": "google-fonts",
        "weights": [400, 600],
        "url": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600"
      }
    }
  }
}
```

**Recommendation:** Option B allows flexibility and is more future-proof.

---

### 2. Font Sources

**Supported Sources:**
- **System Fonts** - Browser defaults (free, no loading)
  - Examples: Inter, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell
- **Google Fonts** - Large free catalog with preview
  - URL: `https://fonts.google.com`
  - API: `https://www.googleapis.com/webfonts/v1/webfonts?key=API_KEY`
  - CSS: `@import url('https://fonts.googleapis.com/css2?family=...')`
- **FontBunny** - Privacy-focused alternative to Google Fonts
  - URL: `https://www.fontbunny.com`
  - Similar API and CSS loading capability
  - Self-hosted option available

**Hybrid Approach:**
- Allow per-font source selection
- Support all three simultaneously
- Prioritize system fonts (no loading cost)
- Fall back gracefully if external fonts unavailable

---

### 3. Font Preview System

**Where to Preview:**
- **In Theme Builder:** Show sample text in each font when selecting
- **In Component Controls:** Show font preview when applying to text
- **Live Preview:** Components render with selected font immediately

**Preview Text:**
```
"The quick brown fox jumps over the lazy dog"
```

**Implementation:**
```tsx
<FontPreview
  fontName="Inter"
  fontUrl="https://fonts.googleapis.com/css2?family=Inter"
  sizes={['16px', '24px', '32px']}
/>
```

---

### 4. Component Font Controls

**New Field Type:**
```tsx
// In component fields
font_family: {
  type: 'custom',
  label: 'Font',
  render: (props) => <FontFamilyControl {...props} />
}
```

**FontFamilyControl Features:**
- Dropdown of available fonts (sans, serif, mono)
- Show preview for each option
- Display font weight options
- Live preview on component

**Usage in Components:**
```tsx
// Example: Heading component
heading: {
  type: 'custom',
  label: 'Heading Font',
  render: (props) => (
    <FontFamilyControl 
      {...props} 
      types={['sans', 'serif']}  // Allow serif or sans
      defaultType='serif'
    />
  )
}
```

---

### 5. CSS Generation

**CSS Variables Approach:**
```css
:root {
  --fonts-sans-family: "Inter", system-ui, sans-serif;
  --fonts-sans-url: url('https://fonts.googleapis.com/css2?family=Inter');
  --fonts-serif-family: "Playfair Display", Georgia, serif;
  --fonts-serif-url: url('https://fonts.googleapis.com/css2?family=Playfair+Display');
  --fonts-mono-family: "Fira Code", "Courier New", monospace;
  --fonts-mono-url: url('https://fonts.googleapis.com/css2?family=Fira+Code');
}
```

**CSS File Loading:**
```css
@import var(--fonts-sans-url);
@import var(--fonts-serif-url);
@import var(--fonts-mono-url);

body { font-family: var(--fonts-sans-family); }
h1, h2, h3 { font-family: var(--fonts-serif-family); }
code, pre { font-family: var(--fonts-mono-family); }
```

---

### 6. Font Loading Strategy

**Timing:**
- Load fonts in `<head>` via `@import` statements
- Use `font-display: swap` for better performance
- Prevent FOUT (Flash of Unstyled Text)

**CSS Order:**
1. Theme CSS variables (fonts metadata)
2. Font import statements (`@import`)
3. Font family fallbacks
4. Component styles (use font variables)

**Blade Template:**
```blade
<!-- Load fonts for theme -->
<link href="{{ $theme->fonts_css_url }}" rel="stylesheet">

<!-- Or inline critical fonts -->
<style>{!! $theme->fonts_css !!}</style>
```

---

### 7. Storage Locations

**Backend (Database):**
- `themes.theme_data.typography.fontFamily` - Font metadata
- `themes.fonts_css` - Generated `@import` statements

**Disk (Public):**
- `/public/storage/themes/{themeId}/{themeId}_fonts.css` - Compiled font CSS
- Or: `/public/storage/themes/{themeId}/{themeId}_variables.css` (include fonts)

---

## Implementation Plan (TDD)

### Phase 7a: Font Data & Backend API (2-3 hours)

#### Step 1: Update Theme Data Schema (30 min)

**Status: Not started**

Update theme_data to support serif and mono families with metadata:

```json
{
  "typography": {
    "fontFamily": {
      "sans": {
        "name": "Inter",
        "source": "google-fonts",
        "weights": [400, 500, 600, 700],
        "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700"
      },
      "serif": {
        "name": "Playfair Display",
        "source": "google-fonts",
        "weights": [400, 700],
        "url": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700"
      },
      "mono": {
        "name": "Fira Code",
        "source": "google-fonts",
        "weights": [400, 600],
        "url": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600"
      }
    }
  }
}
```

**Tasks:**
- [ ] Create migration to update default theme_data with serif/mono
- [ ] Update Theme factory with sample fonts
- [ ] Update TypeScript types to include font metadata

**Files:**
- `database/migrations/2026_02_XX_000001_update_font_family_structure.php`
- `app/Models/Theme.php` (update $casts if needed)
- `resources/js/shared/services/api/types.ts` (ThemeData interface)

---

#### Step 2: Font Service (Google Fonts + FontBunny API) (1 hr)

**Status: Not started**

Create service to fetch available fonts and resolve URLs:

**Tasks:**
- [ ] Create `FontService` class
  - `getGoogleFonts()` - fetch all Google Fonts (with caching)
  - `getFontBunnyFonts()` - fetch all FontBunny fonts
  - `resolveFontUrl(name, source, weights)` - generate @import URL
  - `validateFont(name, source)` - check font exists before saving

- [ ] Store API keys in `.env`: `GOOGLE_FONTS_API_KEY`, `FONTBUNNY_API_KEY`
- [ ] Cache font list for 24 hours (avoid rate limits)
- [ ] Graceful fallback if API unavailable

**Files:**
- `app/Services/FontService.php`
- `tests/Unit/Services/FontServiceTest.php`
- `.env.example` (add API keys)

---

#### Step 3: Backend API Endpoint for Font Management (1 hr)

**Status: Not started**

API endpoint to list fonts and update theme fonts:

**Endpoints:**
- `GET /api/superadmin/fonts/available` - List available fonts (Google + FontBunny + system)
- `GET /api/superadmin/fonts/search?q=inter` - Search fonts
- `POST /api/superadmin/themes/{id}/fonts` - Update theme fonts
- `GET /api/superadmin/themes/{id}/fonts` - Get theme fonts with metadata

**Tasks:**
- [ ] Create `FontController`
- [ ] Implement font listing with pagination
- [ ] Implement font search
- [ ] Implement theme font updates (only central can update)
- [ ] Add validation: only central can modify fonts
- [ ] Add tests for all endpoints

**Files:**
- `app/Http/Controllers/Api/FontController.php`
- `routes/api.php`
- `tests/Feature/Api/FontApiTest.php`

---

### Phase 7b: UI & Font Preview (2-3 hours)

#### Step 4: Font Picker Component (1 hr)

**Status: Not started**

Create reusable FontFamilyPicker component for Settings tab:

**Features:**
- Dropdown with all available fonts
- Separate dropdowns for sans/serif/mono
- Show font source (Google Fonts, FontBunny, System)
- Display available weights for each font
- Search within font list

**Tasks:**
- [ ] Create `FontFamilyPicker.tsx` component
  - Props: `fontType` ('sans'|'serif'|'mono'), `onSelect`, `defaultValue`
  - Fetch fonts from API on mount
  - Show loading state while fetching
  - Display font source badge

- [ ] Create `FontWeightSelector.tsx` sub-component
  - Show available weights as toggles
  - Allow selecting multiple weights
  - Default to recommended weights (400, 600, 700)

- [ ] Add error handling (API failures, network errors)
- [ ] Cache font list in React Query

**Files:**
- `resources/js/shared/components/atoms/FontFamilyPicker.tsx`
- `resources/js/shared/components/atoms/FontWeightSelector.tsx`
- `resources/js/shared/hooks/useFonts.ts` (hook to fetch/cache fonts)
- `resources/js/shared/services/api/fonts.ts` (API client)

---

#### Step 5: Font Preview Component (1 hr)

**Status: Not started**

Visual preview showing selected fonts in action:

**Features:**
- Display sample text in each font size/weight
- Show text: "The quick brown fox jumps over the lazy dog"
- Interactive preview: change text, size, weight
- Show current vs pending changes
- Copy font family name to clipboard

**Tasks:**
- [ ] Create `FontPreview.tsx` component
  - Props: `fontName`, `fontUrl`, `fontFamily`, `weights`
  - Load font dynamically via @import
  - Display at multiple sizes (16px, 24px, 32px)
  - Allow text input for custom preview text

- [ ] Create `PreviewPanel.tsx` for Settings tab
  - Show sans/serif/mono previews side-by-side
  - Color swatches (existing palette)
  - Typography scale preview
  - Spacing scale preview
  - All in one Settings tab (no new tabs)

**Files:**
- `resources/js/shared/components/atoms/FontPreview.tsx`
- `resources/js/shared/components/organisms/PreviewPanel.tsx`

---

#### Step 6: Integrate into Settings Tab (1 hr)

**Status: Not started**

Update ThemeBuilderPage Settings tab to include font management:

**Current Settings Tab Layout:**
```
- Colors section (palette editor)
- Typography section (font family, sizes, weights, line-height)
- Spacing section (scale)
- Border Radius section
- Preview panel (right side)
```

**New Layout:**
```
[Left Panel]
- Colors Picker
  - Primary/Secondary/Accent colors
  - Neutral scale
  
- Typography Controls
  - Font Family Picker (sans/serif/mono with FontFamilyPicker)
  - Font Size Scale
  - Line Height Scale
  - Letter Spacing Scale
  - Text Transform

- Spacing Scale
  - Visual grid + values
  
- Border Radius Scale
  - Visual preview + values

[Right Panel]
- PreviewPanel showing:
  - All three fonts in action
  - Color palette swatches
  - Typography scale
  - Spacing grid
  - Border radius options
```

**Tasks:**
- [ ] Update Settings tab JSX to use FontFamilyPicker
- [ ] Pass font selections to theme state
- [ ] Update preview panel to render selected fonts
- [ ] Save font selections to theme_data on save
- [ ] Update CSS generation to include @import statements

**Files:**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` (Settings tab)
- Update font-related state management

---

### Phase 7c: CSS Generation & Loading (1.5-2 hours)

#### Step 7: Generate Font CSS & Variables (1 hr)

**Status: Not started**

Generate CSS variables and @import statements for fonts:

**Output CSS Structure:**
```css
/* Generated during theme save */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700');
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700');
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600');

:root {
  --fonts-sans-family: "Inter", system-ui, sans-serif;
  --fonts-sans-weights: 400, 500, 600, 700;
  
  --fonts-serif-family: "Playfair Display", Georgia, serif;
  --fonts-serif-weights: 400, 700;
  
  --fonts-mono-family: "Fira Code", "Courier New", monospace;
  --fonts-mono-weights: 400, 600;
}
```

**Tasks:**
- [ ] Create/update `generateFontsCSS()` function
  - Takes theme_data with font metadata
  - Generates @import statements
  - Creates CSS variables
  - Returns complete fonts.css content

- [ ] Update theme save handler
  - Call generateFontsCSS() on save
  - Save fonts.css to `/public/storage/themes/{id}/{id}_fonts.css`

- [ ] Update CSS aggregation
  - Include _fonts.css in final CSS bundle

**Files:**
- `resources/js/shared/services/theme/generateFontsCSS.ts`
- `app/Services/ThemeCssGeneratorService.php` (if backend involved)

---

#### Step 8: Load Fonts in Public Pages (30 min)

**Status: Not started**

Load font CSS in theme rendering:

**Blade Template Update:**
```blade
{{-- Load fonts CSS --}}
@if($activeTheme && $activeTheme->base_theme)
  <link href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_fonts.css') }}" rel="stylesheet">
@endif

{{-- Load variables CSS (includes color + spacing tokens) --}}
<link href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_variables.css') }}" rel="stylesheet">
```

**Best Practices:**
- Load fonts early in `<head>` for better performance
- Use `font-display: swap` to prevent FOUT
- Preload critical fonts
- Avoid loading all Google Fonts at once (performance hit)

**Tasks:**
- [ ] Update `public-tenant.blade.php`
- [ ] Add `<link rel="preload">` for critical fonts (sans family)
- [ ] Test font loading performance
- [ ] Verify fonts render before page content (no FOUT)

**Files:**
- `resources/views/public-tenant.blade.php`
- `resources/views/layouts/app.blade.php` (if central storefront)

---

### Phase 7d: Component Integration & Testing (2 hours)

#### Step 9: Component Font Controls (1 hr)

**Status: Not started**

Allow components to use different font families:

**Example: Heading Component**
```tsx
heading: {
  font_family: {
    type: 'select',
    label: 'Font Family',
    options: [
      { label: 'Sans (default)', value: 'var(--fonts-sans-family)' },
      { label: 'Serif', value: 'var(--fonts-serif-family)' },
      { label: 'Mono', value: 'var(--fonts-mono-family)' },
    ],
    defaultValue: 'var(--fonts-sans-family)',
  }
}
```

**Tasks:**
- [ ] Update Heading component to include font_family control
- [ ] Update Text component to include font_family control
- [ ] Update Button component to include font_family control
- [ ] Update Code block component to use mono font
- [ ] Ensure font CSS loads before components render

**Files:**
- `resources/js/shared/components/puck/Heading.tsx`
- `resources/js/shared/components/puck/Text.tsx`
- `resources/js/shared/components/puck/Button.tsx`
- `resources/js/shared/components/puck/Code.tsx`

---

#### Step 10: Testing & Validation (1 hr)

**Status: Not started**

Comprehensive testing suite:

**Unit Tests:**
- [ ] FontService: font fetching, URL generation, caching
- [ ] generateFontsCSS: CSS generation correctness
- [ ] FontFamilyPicker: dropdown, search, selection
- [ ] FontPreview: rendering, weight selection

**Integration Tests:**
- [ ] Theme save: fonts saved to database
- [ ] CSS generation: fonts.css created correctly
- [ ] Blade loading: fonts.css linked in HTML
- [ ] Font rendering: fonts load before content renders

**E2E Tests:**
- [ ] Central can select fonts in Settings tab
- [ ] Font preview updates on selection
- [ ] Fonts render in public storefront
- [ ] Tenants inherit fonts from central
- [ ] Font override works (if allowed)
- [ ] No FOUT on page load
- [ ] Graceful fallback if API unavailable

**Performance Tests:**
- [ ] Measure page load time with fonts
- [ ] Verify no render-blocking requests
- [ ] Check Google Fonts API response time

**Files:**
- `tests/Unit/Services/FontServiceTest.php`
- `tests/Feature/Api/FontApiTest.php`
- `resources/js/shared/services/theme/__tests__/generateFontsCSS.test.ts`
- `resources/js/shared/components/atoms/__tests__/FontFamilyPicker.test.tsx`
- `tests/Feature/BladeFontLoadingTest.php`

---

## Settings Tab Enhancements (Parallel Implementation)

While building Phase 7 fonts, also enhance other Settings controls:

### Parallel Enhancement 1: Color Picker Panel (1 hr)
**Status: Not started**
- [ ] Visual palette swatch display
- [ ] Click to copy hex/rgb value
- [ ] Drag to reorder colors (optional)
- [ ] Add/remove custom colors (optional)

### Parallel Enhancement 2: Typography Preview (1 hr)
**Status: Not started**
- [ ] Live text preview with current fonts
- [ ] Show at multiple sizes (12px, 16px, 24px, 32px)
- [ ] Display current line-height/letter-spacing
- [ ] Interactive text input to test readability

### Parallel Enhancement 3: Spacing Visual Grid (30 min)
**Status: Not started**
- [ ] Visual representation of spacing scale
- [ ] Show current spacing values
- [ ] Click to copy token value
- [ ] Visualize how spacing looks

### Parallel Enhancement 4: CSS Variables Export (30 min)
**Status: Not started**
- [ ] Export theme as CSS file with all variables
- [ ] Include fonts, colors, spacing, typography
- [ ] Use in other projects
- [ ] Option to import theme from CSS

### Parallel Enhancement 5: Theme Metadata UI (30 min)
**Status: Not started**
- [ ] Author name/email field
- [ ] Version with changelog
- [ ] License selection dropdown
- [ ] Preview image upload/editor
- [ ] Description editor

---

## Estimated Effort Summary

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 7a | Font Data Schema | 30 min | Not started |
| 7a | Font Service (API Integration) | 1 hr | Not started |
| 7a | Backend Font API | 1 hr | Not started |
| 7b | Font Picker Component | 1 hr | Not started |
| 7b | Font Preview Component | 1 hr | Not started |
| 7b | Settings Tab Integration | 1 hr | Not started |
| 7c | CSS Generation & Loading | 1.5 hrs | Not started |
| 7d | Component Integration | 1 hr | Not started |
| 7d | Testing & Validation | 1 hr | Not started |
| **7 Total** | | **~9 hours** | **Not started** |
| Parallel | Settings Enhancements | **~3 hours** | **Optional** |

---

## Success Criteria

**Phase 7 Complete When:**
- ✅ Can select sans, serif, and mono fonts in Settings tab
- ✅ Font preview displays in real-time
- ✅ Fonts load from Google Fonts / FontBunny
- ✅ CSS variables available for component usage
- ✅ Fonts render correctly in storefront
- ✅ No FOUT (fonts load before content)
- ✅ Tenants inherit fonts, cannot override
- ✅ Graceful fallback if API unavailable
- ✅ All tests passing (unit + integration + e2e)
- ✅ Settings tab enhanced with color/typography/spacing previews
- ✅ All tests passing

---

## Notes

- This phase builds on Phase 6 (Theme Customization)
- Fonts are critical for design system completeness
- Should include proper font performance optimization
- Consider accessibility (font-display strategy, sufficient contrast)
- Future: Custom font upload capability
- Future: Font subsetting for performance
