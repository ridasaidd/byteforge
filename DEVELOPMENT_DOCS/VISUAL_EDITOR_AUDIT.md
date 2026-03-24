# Visual Editor Audit — Controls, CSS & Rendering Parity

**Date**: March 16, 2026
**Scope**: All 17 Puck components, page root config, CSS aggregator, and editor ↔ storefront rendering parity
**Status**: Audit complete — ready for implementation

---

## Table of Contents

1. [Critical Bugs (P0)](#critical-bugs-p0)
2. [Root Page Controls Enhancement](#root-page-controls-enhancement)
3. [Component-by-Component Audit](#component-by-component-audit)
4. [CSS Aggregator Gaps](#css-aggregator-gaps)
5. [Implementation Plan](#implementation-plan)

---

## Critical Bugs (P0)

### P0-1: Button & Card — className Mismatch (Storefront CSS Broken)

**Impact:** Button and Card styles are completely unstyled on storefront.

| Layer | Button className | Card className |
|-------|-----------------|----------------|
| Component render | `button-{id}` | `card-{id}` |
| CSS Aggregator | `button-Button-{id}` | `card-Card-{id}` |

The aggregator prefixes the Puck component type name (capitalized) into the className, but the components themselves use only the lowercase prefix. Result: the pre-generated CSS for storefront never matches the DOM elements.

**Files:**
- [PuckCssAggregator.ts](../resources/js/shared/puck/services/PuckCssAggregator.ts) — lines 369, 403
- [Button.tsx](../resources/js/shared/puck/components/content/Button.tsx) — line 132
- [Card.tsx](../resources/js/shared/puck/components/content/Card.tsx) — line 116

**Fix:** Change aggregator className to match component render:
```ts
// Button: change from
const className = `button-Button-${(props.id as string) || component.props?.id || 'unknown'}`;
// to
const className = `button-${(props.id as string) || component.id || 'unknown'}`;

// Card: change from
const className = `card-Card-${(props.id as string) || component.props?.id || 'unknown'}`;
// to
const className = `card-${(props.id as string) || component.id || 'unknown'}`;
```

---

### P0-2: Button — `size` Control Has No CSS Effect (Editor or Storefront)

**Impact:** The "Size" dropdown (sm/md/lg) in the Button block controls does nothing visible.

**Root cause — dual failure:**

1. **Editor:** The Button component *does* generate size-specific CSS (font-size, paddingX, paddingY) via `resolve()` calls in its render function, and injects them via `<style>`. However, the size values are resolved from the theme at `components.button.sizes.{size}.paddingX` etc. — if that theme path doesn't exist, it falls back to hardcoded values. This part actually **works in the editor** but only if the theme CSS variables load (which they usually do).

2. **Storefront (aggregator):** The `buildButtonCss` function in the aggregator **completely omits** the `size` prop. It doesn't resolve `paddingX`/`paddingY`/`fontSize` from the size prop at all. It only passes `padding` (the custom spacing control) to `buildLayoutCSS`. So on storefront, the button has no font-size, no padding (unless manually set via the spacing controls), and no size differentiation.

**Files:**
- [PuckCssAggregator.ts](../resources/js/shared/puck/services/PuckCssAggregator.ts) — `buildButtonCss` function (~line 401)
- [Button.tsx](../resources/js/shared/puck/components/content/Button.tsx) — lines 142-144 (size resolution)

**Fix:** Add size-based CSS generation to `buildButtonCss` in the aggregator:
```ts
// Resolve size-based properties using theme resolver
const size = (props.size as string) || 'md';
const paddingX = resolver(`components.button.sizes.${size}.paddingX`, size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px');
const paddingY = resolver(`components.button.sizes.${size}.paddingY`, size === 'sm' ? '6px' : size === 'md' ? '10px' : '12px');
const fontSize = resolver(`components.button.sizes.${size}.fontSize`, size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px');
```
Then include `font-size`, `padding`, `cursor`, `transition`, `text-decoration: none` in the generated CSS.

---

### P0-3: NavigationMenu — `display: contents` Blocks Selection in Editor

**Impact:** After the NavigationMenu block is dropped into the editor, clicking it does not select it. The user cannot access its controls without using the component tree sidebar.

**Root cause:** The component wraps the `<nav>` in a `<div style={{ display: 'contents' }}>` with `ref={puck?.dragRef}`. Puck uses pointer events on the drag-ref element to detect selection/drag. With `display: contents`, the div has no box model — it generates no layout box — so it cannot receive pointer events.

**File:** [NavigationMenuRenderer.tsx](../resources/js/shared/puck/components/navigation_v2/NavigationMenuRenderer.tsx) — line 336

**Fix:** Remove `display: contents` and attach `dragRef` directly to the `<nav>` element:
```tsx
// Change from:
<div ref={puck?.dragRef} style={{ display: 'contents' }}>
  <nav className={...}>
    ...
  </nav>
</div>

// To:
<nav ref={puck?.dragRef} className={...}>
  ...
</nav>
```

---

## Root Page Controls Enhancement

**Current state:** The page root config in `puckConfig` uses basic field types:

| Field | Current Type | Issue |
|-------|-------------|-------|
| `backgroundColor` | `text` | Plain text input — should be color picker |
| `backgroundImage` | `text` | Plain text input — should use media picker |
| `maxWidth` | `select` | Limited to 4 options — acceptable but could add custom option |
| `paddingY` | `select` | Only vertical — should add horizontal padding too |

**Proposed enhancements:**

### Replace text fields with proper controls

| Field | New Control | Notes |
|-------|------------|-------|
| `backgroundColor` | `ColorPickerControlColorful` | Theme + custom color selection |
| `backgroundImage` | Media picker (same as Image component) | Or keep as text with URL preview |
| `maxWidth` | Keep `select` + add `custom` option with text input | Allow any value |
| `paddingY` | `SpacingControl` (responsive) | Full responsive padding control |

### Add new page-level controls

| Field | Control | Purpose |
|-------|---------|---------|
| `paddingX` | `SpacingControl` or `select` | Horizontal page padding |
| `fontFamily` | `fontFamilyField` | Page-level default font |
| `color` | `ColorPickerControlColorful` | Default text color |
| `backgroundSize` | `select` (cover/contain/auto) | Background image sizing |
| `backgroundPosition` | `select` (center/top/bottom/left/right) | Background image position |
| `backgroundRepeat` | `select` (no-repeat/repeat/repeat-x/repeat-y) | Background image repeat |
| `minHeight` | `select` or text | Minimum page height (e.g., 100vh) |

**File:** [config/index.tsx](../resources/js/shared/puck/config/index.tsx) — root config (~line 100)

---

## Component-by-Component Audit

### Legend
- ✅ Works in both editor and storefront
- ⚠️ Works in editor only (CSS aggregator gap)
- ❌ Broken in both editor and storefront
- 🔧 Partial — works but with caveats

---

### Heading

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| text (contentEditable) | ✅ | ✅ | |
| level (H1-H6) | ✅ | ✅ | |
| align | ✅ | ✅ | |
| color | ✅ | ✅ | |
| backgroundColor | ✅ | ✅ | |
| fontSize | ✅ | ✅ | Responsive, uses `generateFontSizeCSS` |
| fontWeight | ✅ | ✅ | Level-based defaults + custom override |
| fontFamily | ✅ | ✅ | Falls back to `var(--font-family-sans)` |
| lineHeight | ✅ | ✅ | Responsive |
| letterSpacing | ✅ | ✅ | Responsive |
| textTransform | ✅ | ✅ | |
| textDecoration | ✅ | ✅ | Includes descendant selector for Puck overlay |
| width/maxWidth/maxHeight | ✅ | ✅ | |
| display | ✅ | ✅ | |
| padding/margin | ✅ | ✅ | |
| border/borderRadius/shadow | ✅ | ✅ | |
| visibility | ✅ | ✅ | |
| customCss | ✅ | ✅ | |

**Status:** ✅ Fully working. The aggregator mirrors the component's CSS generation precisely.

---

### Text

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| content (contentEditable) | ✅ | ✅ | |
| All typography controls | ✅ | ✅ | Same pattern as Heading |
| All layout controls | ✅ | ✅ | |

**Status:** ✅ Fully working.

---

### RichText

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| content (Tiptap editor) | ✅ | ✅ | |
| fontFamily | ✅ | ✅ | |
| color/backgroundColor | ✅ | ✅ | |
| Layout/spacing/effects | ✅ | ✅ | |
| H2/H3/H4 typography | ✅ | ✅ | Hardcoded CSS in both component + aggregator |

**Status:** ✅ Fully working. Note: RichText doesn't expose fontSize/fontWeight fields (by design — typography is handled per-element via the rich text editor).

---

### Button

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| text | ✅ | ✅ | |
| backgroundColor | ✅ | ❌ | **P0-1**: className mismatch (`button-{id}` vs `button-Button-{id}`) |
| textColor | ✅ | ❌ | Same className mismatch |
| **size** (sm/md/lg) | ✅ | ❌ | **P0-2**: Aggregator doesn't generate size CSS (font-size, padding) |
| linkType/href/internalPage | ✅ | ✅ | |
| openInNewTab | ✅ | ✅ | |
| display/width/maxWidth | ✅ | ❌ | className mismatch |
| padding/margin | ✅ | ❌ | className mismatch |
| border/borderRadius/shadow | ✅ | ❌ | className mismatch |
| lineHeight/letterSpacing | ⚠️ | ❌ | Editor injects manually; aggregator doesn't generate |
| textTransform/textDecoration | ⚠️ | ❌ | Same — aggregator omits |
| cursor/transition | ⚠️ | ❌ | Same |
| hover states | ⚠️ | ❌ | className mismatch; aggregator hover CSS targets wrong class |
| visibility | ✅ | ❌ | className mismatch |

**Status:** ❌ Severely broken on storefront due to className mismatch + missing size CSS.

---

### Card

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| title/description/icon | ✅ | ✅ | Rendered via inline styles (always work) |
| mode (flat/card) | ✅ | 🔧 | Background color differs based on mode — but inline style drives it |
| iconColor/titleColor/descriptionColor | ✅ | 🔧 | Uses inline styles on inner elements — works, but not via CSS classes |
| backgroundColor | ✅ | ❌ | **P0-1**: className mismatch (`card-{id}` vs `card-Card-{id}`) |
| textAlign | ✅ | ❌ | Same className mismatch |
| Layout/spacing/effects | ✅ | ❌ | className mismatch |

**Status:** ❌ Container CSS broken on storefront. Inner content renders via inline styles so text/icon colors work.

---

### Link

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| All typography controls | ✅ | ✅ | |
| All layout controls | ✅ | ✅ | |
| hover states | ✅ | ✅ | |

**Status:** ✅ Fully working. Uses `link-{id}` consistently.

---

### Image

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| src (media picker) | ✅ | ✅ | |
| alt | ✅ | ✅ | |
| width/maxWidth/maxHeight | ✅ | ✅ | |
| objectFit | ✅ | ✅ | |
| aspectRatio/aspectRatioCustom | ✅ | ✅ | |
| borderRadius presets | ✅ | ✅ | |
| margin/border/shadow | ✅ | ✅ | |
| display/visibility | ✅ | ✅ | |

**Status:** ✅ Fully working.

---

### Icon

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| name (icon selector) | ✅ | ✅ | Editor uses Lucide component; storefront uses stored SVG |
| size/strokeWidth | ✅ | 🔧 | Passed via inline SVG attributes; CSS not involved |
| color | ✅ | 🔧 | Uses inline style `color` — works but not via CSS |
| display/padding/margin | ✅ | ⚠️ | Component generates CSS via `buildLayoutCSS` always (even non-edit) — but aggregator has NO `buildIconCss` function |

**Status:** ⚠️ Icon is not handled by CSS aggregator at all. It's not listed in `isLayoutComponent` or `isTypographyComponent`. The component self-generates CSS for display/padding/margin, but in storefront mode it still injects `<style>` tags inline — this works but bypasses the aggregated CSS file pipeline.

---

### Box

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| All 30+ controls | ✅ | ✅ | Comprehensive coverage via `buildLayoutCSS` |

**Status:** ✅ Fully working. Most thorough CSS coverage of any component.

---

### NavigationMenu

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| All navigation controls | ✅ | ✅ | Extensive CSS via `buildNavCss` / `buildNavigationMenuCss` |
| **Selection in editor** | ❌ | N/A | **P0-3**: `display: contents` wrapper prevents click selection |

**Status:** ⚠️ CSS generation is comprehensive and works. **Editor UX is broken** — the block can only be selected via the component tree panel, not by clicking.

---

### Form

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| display/direction/gap | ✅ | 🔧 | Aggregator only generates basic `buildLayoutCSS` (display/width/padding/margin/border/shadow) — no flex properties (direction/justify/align/gap) |
| width/backgroundColor | ✅ | 🔧 | Background color is generated inline via component, not via aggregator |
| padding/margin | ✅ | ✅ | Via `buildLayoutCSS` |

**Status:** 🔧 Partial. The aggregator `buildFormComponentCss` generates only basic layout CSS. Flex properties (direction, gap, justify, align) and background color are not included.

---

### TextInput / Textarea / Select

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| Label/input styling | ✅ | ⚠️ | Component generates comprehensive CSS for label, input, focus states, error states — but aggregator only generates basic layout (display/margin) |
| Colors (labelColor, inputBgColor, etc.) | ✅ | ⚠️ | Not in aggregator |
| Size (sm/md/lg) | ✅ | ⚠️ | Not in aggregator |
| Focus/error states | ✅ | ⚠️ | Not in aggregator |

**Status:** ⚠️ Heavy reliance on component-injected `<style>` tags. Aggregator only does the bare minimum. Storefront likely works because the components inject their own styles, but this bypasses the CSS file pipeline.

---

### Checkbox / RadioGroup

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| All custom styling | ✅ | ⚠️ | Same pattern as TextInput — comprehensive component CSS, minimal aggregator |

**Status:** ⚠️ Same as other form components.

---

### SubmitButton

| Control | Editor | Storefront | Notes |
|---------|--------|------------|-------|
| All styling controls | ✅ | ⚠️ | Same pattern — component generates full CSS, aggregator generates basic layout |

**Status:** ⚠️ Same pattern.

---

## CSS Aggregator Gaps

### Components not in aggregator at all

| Component | Listed in isLayoutComponent | Listed in isTypographyComponent | CSS Generated |
|-----------|---------------------------|-------------------------------|---------------|
| **Icon** | ❌ No | ❌ No | ❌ None |

### Components with incomplete aggregator coverage

| Component | Missing from Aggregator |
|-----------|------------------------|
| **Button** | `size` prop (fontSize, paddingX, paddingY), `cursor`, `transition`, `lineHeight`, `letterSpacing`, `textTransform`, `textDecoration`, `textDecorationStyle`, `text-decoration: none` base style |
| **Card** | `textAlign`, inner element colors (iconColor, titleColor, descriptionColor — though these use inline styles) |
| **Form** | Flex properties (`direction`, `justify`, `align`, `gap`), `backgroundColor` |
| **TextInput** | All input/label/focus/error styling, colors, size |
| **Textarea** | Same as TextInput |
| **Select** | Same as TextInput |
| **Checkbox** | Custom checkbox styling, colors, size |
| **RadioGroup** | Custom radio styling, colors, direction |
| **SubmitButton** | Colors, size, hover states, loading states |

### className pattern issues

| Component | Component Render | Aggregator CSS Class | Match? |
|-----------|-----------------|---------------------|--------|
| Box | `box-{id}` | `box-{id}` | ✅ |
| Card | `card-{id}` | `card-Card-{id}` | ❌ |
| Button | `button-{id}` | `button-Button-{id}` | ❌ |
| Heading | `heading-{id}` | `heading-{id}` | ✅ |
| Text | `text-{id}` | `text-{id}` | ✅ |
| RichText | `richtext-{id}` | `richtext-{id}` | ✅ |
| Link | `link-{id}` | `link-{id}` | ✅ |
| Image | `image-{id}` | `image-{id}` | ✅ |
| Icon | `icon-{name}-{id}` | N/A (not in aggregator) | ❌ |
| NavigationMenu | `nav-menu-{id}` | `nav-menu-{id}` | ✅ |
| Form | `form-{id}` | `form-{id}` | ✅ |
| TextInput | `textinput-{id}` | `textinput-{id}` | ✅ |
| Textarea | `textarea-{id}` | `textarea-{id}` | ✅ |
| Select | `select-{id}` | `select-{id}` | ✅ |
| Checkbox | `checkbox-{id}` | `checkbox-{id}` | ✅ |
| RadioGroup | `radiogroup-{id}` | `radiogroup-{id}` | ✅ |
| SubmitButton | `submitbutton-{id}` | `submitbutton-{id}` | ✅ |

---

## Implementation Plan

### Phase A — Critical Fixes (P0)

| # | Task | Files | Effort |
|---|------|-------|--------|
| A1 | Fix Button className in aggregator (`button-Button-{id}` → `button-{id}`) | PuckCssAggregator.ts | S |
| A2 | Fix Card className in aggregator (`card-Card-{id}` → `card-{id}`) | PuckCssAggregator.ts | S |
| A3 | Add Button size CSS to aggregator (fontSize, paddingX/Y from theme + fallbacks) | PuckCssAggregator.ts | M |
| A4 | Add Button typography CSS to aggregator (cursor, transition, lineHeight, letterSpacing, textTransform, textDecoration) | PuckCssAggregator.ts | M |
| A5 | Fix NavigationMenu `display: contents` — move dragRef to `<nav>` | NavigationMenuRenderer.tsx | S |

### Phase B — Page Root Enhancement

| # | Task | Files | Effort |
|---|------|-------|--------|
| B1 | Replace `backgroundColor` text field with `ColorPickerControlColorful` | config/index.tsx | S |
| B2 | Replace `backgroundImage` text field with media picker or enhanced URL field + background controls (size/position/repeat) | config/index.tsx | M |
| B3 | Replace `maxWidth` select with more options + custom value support | config/index.tsx | S |
| B4 | Replace `paddingY` select with responsive `SpacingControl` for full padding | config/index.tsx | M |
| B5 | Add `fontFamily`, `color`, `minHeight` page-level controls | config/index.tsx | M |

### Phase C — Aggregator Completeness

| # | Task | Files | Effort |
|---|------|-------|--------|
| C1 | Add Icon to aggregator (include in `isLayoutComponent`, generate CSS for display/padding/margin/color) | PuckCssAggregator.ts | S |
| C2 | Add Card inner element CSS to aggregator (textAlign, title/description/icon font styles) | PuckCssAggregator.ts | M |
| C3 | Enhance Form aggregator with flex properties + backgroundColor | PuckCssAggregator.ts | S |
| C4 | Add TextInput/Textarea/Select full CSS to aggregator (label, input, focus, error, colors, sizes) | PuckCssAggregator.ts | L |
| C5 | Add Checkbox/RadioGroup full CSS to aggregator | PuckCssAggregator.ts | M |
| C6 | Add SubmitButton full CSS to aggregator (colors, sizes, hover, loading) | PuckCssAggregator.ts | M |

### Suggested Order

```
A1 → A2 → A5 → A3 → A4 → B1 → B4 → B2 → B3 → B5 → C1 → C2 → C3 → C4 → C5 → C6
```

Critical fixes (A1-A5) should be done first as they are all breaking bugs.
Page root enhancements (B1-B5) are user-facing UX improvements.
Aggregator completeness (C1-C6) improves storefront CSS file pipeline coverage.

---

## Notes

- Form components (TextInput, Textarea, Select, Checkbox, RadioGroup, SubmitButton) currently work on storefront because each component injects its own `<style>` tags at render time (even outside edit mode). The aggregator gap means their CSS is not included in the pre-generated CSS file, but this is a performance/architecture concern rather than a rendering bug. Priority is lower.
- The Icon component similarly injects its own CSS at all times, so it renders correctly but bypasses the CSS file pipeline.
- Heading and Text components are the gold standard — their CSS generation is identical between component render and aggregator. All other components should follow this pattern.
