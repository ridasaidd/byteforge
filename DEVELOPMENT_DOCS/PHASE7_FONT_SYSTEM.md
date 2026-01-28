# Phase 7: Font System Architecture

Last updated: January 28, 2026

---

## Executive Summary

**Goal:** Build a comprehensive font management system that allows theme creators to select from multiple font families (sans, serif, mono), load them from third-party services or self-host, and use them in components with live preview.

**Dependencies:** Phase 6 (Theme Customization) must be complete first.

**Scope:** Font family management, loading strategy, component integration, CSS generation, and preview system.

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

## Implementation Plan (TBD)

### Step 1: Update Theme Data Schema
- Add serif and mono font families
- Store font source metadata
- Update migrations if needed

### Step 2: Backend Font API
- Endpoint to list available fonts (system + Google + FontBunny)
- Endpoint to resolve font URLs
- Font validation service

### Step 3: Theme Builder UI
- Update Settings tab typography section
- Add font picker for sans/serif/mono
- Add font preview component
- Generate font CSS

### Step 4: Font Preview Component
- Display sample text in selected font
- Show available weights
- Interactive preview

### Step 5: Component Font Controls
- Create FontFamilyControl field
- Add to Text, Heading, and other text components
- Update CSS generation to use font variables

### Step 6: CSS Generation
- Generate `@import` statements
- Create font CSS variables
- Update buildLayoutCss to include fonts

### Step 7: Testing
- Test Google Fonts integration
- Test FontBunny integration
- Test system font fallbacks
- Test component rendering with fonts
- Test web font loading and FOUT prevention

---

## Open Questions

1. **API Keys:** Should we store Google Fonts API key in `.env`?
2. **Caching:** Should we cache font lists from third-party services?
3. **Fallbacks:** What happens if external font service is unavailable?
4. **Font Weights:** How granular should weight selection be per component?
5. **Google Fonts Limit:** API has rate limits - how many fonts can we request at once?
6. **Self-Hosting:** Should we auto-download and self-host fonts from Google/FontBunny?

---

## Estimated Effort

- **Phase 7a: Font Data & API** - 2-3 hours
- **Phase 7b: UI & Preview** - 2-3 hours
- **Phase 7c: Component Integration** - 2-3 hours
- **Phase 7d: Testing & Polish** - 1-2 hours
- **Total:** 7-11 hours (1-2 week sprint after Phase 6)

---

## Success Criteria

- ✅ Can select sans, serif, and mono fonts in theme settings
- ✅ Font preview shows in theme builder
- ✅ Components can apply specific font families
- ✅ Fonts load correctly in editor and storefront
- ✅ No FOUT (fonts load before content renders)
- ✅ Graceful fallbacks if external fonts unavailable
- ✅ CSS variables available for component styling
- ✅ All tests passing

---

## Notes

- This phase builds on Phase 6 (Theme Customization)
- Fonts are critical for design system completeness
- Should include proper font performance optimization
- Consider accessibility (font-display strategy, sufficient contrast)
- Future: Custom font upload capability
- Future: Font subsetting for performance
