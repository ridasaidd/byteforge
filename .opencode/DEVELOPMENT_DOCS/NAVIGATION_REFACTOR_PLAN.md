# Navigation Refactor Plan

## Vision

A navigation is **just a list of links**. How it looks — horizontal bar, off-canvas drawer, bottom tab bar — is a styling concern. The editor's controls should be expressive enough to compose any navigation pattern without hardcoded layout logic in the component.

**Current state:** The `Navigation` component is a 985-line monolith that re-implements its own CSS generation for layout, mobile styles, dropdowns, colors, spacing, and fonts — all things the controls system already handles generically.

**Target state:** Navigation becomes a slim **data + interaction** component (~300 lines). It fetches menu items, renders a semantic `<nav><ul><li>` tree, and manages toggle state (expand/collapse). All visual styling flows through the standard field groups and `buildLayoutCSS` pipeline.

---

## Architecture Context

### How the Controls System Works

```
Component Definition
  fields: { ...spacingFields, ...effectsFields, ... }     ← reusable field groups
  defaultProps: extractDefaults(spacingFields, ...)        ← auto-extracted
  resolveFields: createConditionalResolver(base, cond)     ← show flex fields only when display=flex

        ↓

Component Render (edit mode)
  buildLayoutCSS({ className, padding, margin, ... })      ← runtime <style> injection
  className="box-{id}"                                     ← scoped class applied to DOM

        ↓

PuckCssAggregator (storefront / publish time)
  extractCssFromPuckData(puckData)                         ← walks entire tree
    → collectComponents()                                  ← finds every component
    → buildNavigationCss(props)                            ← switch on component type
    → concatenates all CSS into one string                 ← injected into <style> or .css file
```

### What Field Groups Exist Today

| Group | Export | Fields |
|-------|--------|--------|
| Display | `displayField` | `display` (responsive) |
| Layout | `layoutFields` | `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` |
| Flex | `flexLayoutFields` | `flexDirection`, `justifyContent`, `alignItems`, `flexWrap`, `flexGap` |
| Grid | `gridLayoutFields` | `numColumns`, `gridGap`, `gridAlignItems` |
| Spacing | `spacingFields` | `padding`, `margin` |
| Background | `backgroundFields` | `backgroundColor` |
| Background Image | `backgroundImageFields` | `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat` |
| Layout Advanced | `layoutAdvancedFields` | `position`, `zIndex`, `opacity`, `overflow`, `visibility`, `objectFit`, `objectPosition` |
| Effects | `effectsFields` | `border`, `borderRadius`, `shadow` |
| Advanced | `advancedFields` | `customCss` |
| Interaction | `interactionFields` | `cursor`, `transition` |
| Hover States | `hoverStateFields` | `hoverBgColor`, `hoverTextColor`, `hoverBorderColor`, `hoverTransform` |
| Custom Classes | `customClassesFields` | `customClassName`, `customId` |
| Typography | `typographyFields` | `textColor`, `fontSize`, `fontWeight` |
| Typography Advanced | `typographyAdvancedFields` | `lineHeight`, `letterSpacing`, `textTransform`, `textDecoration`, `textDecorationColor` |
| Text Align | `textAlignField` | `textAlign` |
| Font Family | `fontFamilyField(default)` | `fontFamily` |

### Reference: How Box Uses Field Groups

```tsx
// Box.tsx — fields definition
fields: {
  ...slotField,
  ...customClassesFields,
  ...displayField,
  ...layoutFields,
  ...flexLayoutFields,
  ...gridLayoutFields,
  ...spacingFields,
  ...backgroundFields,
  ...backgroundImageFields,
  ...layoutAdvancedFields,
  ...effectsFields,
  ...advancedFields,
}
```

Box gets full styling power from spreading these groups — no custom CSS generation needed.

---

## Gap Analysis

### Controls That Are Missing

| Control | Why Navigation Needs It | Pattern Example |
|---------|------------------------|-----------------|
| **Position Offsets** (`top`, `right`, `bottom`, `left`) | Off-canvas: `left: 0; top: 0`. Bottom bar: `bottom: 0`. Dropdown: `top: 100%`. | `position: fixed; top: 0; left: 0; width: 256px; height: 100vh;` |
| **Transform** (`translateX`, `translateY`, `scale`, `rotate`) | Off-canvas slide animation: `translateX(-100%)` → `translateX(0)`. | `transform: translateX(-100%); transition: transform 0.3s;` |
| **Responsive `flexDirection`** | Desktop: `row`. Mobile: `column`. Currently `flexDirection` is static (same value across all breakpoints). | `flex-direction: row` at desktop, `column` at mobile |

### Controls That Exist But Need Enhancement

| Control | Current Limitation | Needed Enhancement |
|---------|-------------------|-------------------|
| `flexDirection` | Static — not responsive | Wrap with `ResponsiveControl` |
| `justifyContent` | Static — not responsive | Wrap with `ResponsiveControl` |
| `alignItems` (flex) | Static — not responsive | Wrap with `ResponsiveControl` |
| `overflow` | Only shorthand | Add `overflow-x` / `overflow-y` (low priority) |

---

## Phase 1: Fill the Control Gaps

> **Goal:** Make the controls system expressive enough to style any navigation pattern.

### Step 1.1 — Create `PositionOffsetControl`

**Files to create:**
- `resources/js/shared/puck/fields/controls/PositionOffsetControl.tsx`
- `resources/js/shared/puck/fields/controls/ResponsivePositionOffsetControl.tsx`

**Behavior:**
- Four inputs: `top`, `right`, `bottom`, `left`
- Unit selector: `px`, `rem`, `em`, `%`, `auto`
- Link toggle (like spacing control) for setting all sides at once
- Each value can be empty/unset (don't emit CSS for unset values)
- Should only be visible when `position` is NOT `static` (use conditional resolver)

**Type definition:**
```tsx
export interface PositionOffsetValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  unit: 'px' | 'rem' | 'em' | '%';
}

export type ResponsivePositionOffsetValue = {
  mobile?: PositionOffsetValue;
  tablet?: PositionOffsetValue;
  desktop?: PositionOffsetValue;
};
```

**CSS generation:**
```css
/* Only emit values that are set */
.component-abc {
  top: 0px;
  left: 0px;
  /* right and bottom omitted because they're unset */
}
```

**Reference:** Model after `SpacingControl` which already has the 4-side + unit + link pattern.

### Step 1.2 — Create `TransformControl`

**Files to create:**
- `resources/js/shared/puck/fields/controls/TransformControl.tsx`
- `resources/js/shared/puck/fields/controls/ResponsiveTransformControl.tsx`

**Behavior:**
- Fields: `translateX`, `translateY`, `scale`, `rotate`
- Unit selectors: `px`/`%`/`rem` for translate, unitless for scale, `deg` for rotate
- Each value optional (don't emit if unset)
- Compound `transform` output: `translateX(-100%) rotate(45deg)`

**Type definition:**
```tsx
export interface TransformValue {
  translateX?: { value: string; unit: 'px' | '%' | 'rem' };
  translateY?: { value: string; unit: 'px' | '%' | 'rem' };
  scale?: string;       // e.g., "1.05"
  rotate?: string;      // e.g., "45" (degrees)
}

export type ResponsiveTransformValue = {
  mobile?: TransformValue;
  tablet?: TransformValue;
  desktop?: TransformValue;
};
```

**CSS generation:**
```css
.component-abc {
  transform: translateX(-100%) scale(0.95);
}
@media (min-width: 768px) {
  .component-abc {
    transform: translateX(0) scale(1);
  }
}
```

### Step 1.3 — Make `flexDirection` Responsive

**Files to modify:**
- Create `resources/js/shared/puck/fields/controls/ResponsiveFlexDirectionControl.tsx`
- Update `resources/js/shared/puck/fields/fieldGroups.tsx` — replace static `flexDirection` with responsive version

**Current (static):**
```tsx
flexDirection: {
  type: 'select',
  options: [
    { label: 'Row', value: 'row' },
    { label: 'Column', value: 'column' },
    ...
  ]
}
```

**Target (responsive):**
```tsx
flexDirection: {
  type: 'custom',
  render: (props) => <ResponsiveFlexDirectionControl {...props} />
}
```

**Impact:** This is a breaking change for existing components that use `flexDirection`. The responsive wrapper must handle both the old string format and the new `{ mobile, tablet, desktop }` format for backward compatibility.

**Migration strategy:**
```tsx
// In CSS generation, normalize the value:
const normalizeFlexDirection = (value: string | ResponsiveValue<string>): ResponsiveValue<string> => {
  if (typeof value === 'string') return { mobile: value };
  return value;
};
```

### Step 1.4 — Wire New Controls into CSS Generation

**Files to modify:**
- `resources/js/shared/puck/fields/cssBuilder.ts` — add `generatePositionOffsetCSS()`, `generateTransformCSS()`, update `generateFlexDirectionCSS()` for responsive
- `resources/js/shared/puck/fields/index.ts` — export new controls and types

**Add to `buildLayoutCSS` options interface:**
```tsx
interface BuildLayoutCSSOptions {
  // ... existing props ...
  positionOffset?: ResponsivePositionOffsetValue;
  transform?: ResponsiveTransformValue;
  // flexDirection already exists but needs responsive handling
}
```

**CSS generator functions:**
```tsx
export function generatePositionOffsetCSS(
  className: string,
  offset: ResponsivePositionOffsetValue
): string {
  // For each breakpoint, emit top/right/bottom/left if set
}

export function generateTransformCSS(
  className: string,
  transform: ResponsiveTransformValue
): string {
  // For each breakpoint, compose transform string from parts
}
```

### Step 1.5 — Wire into PuckCssAggregator

**File to modify:**
- `resources/js/shared/puck/services/PuckCssAggregator.ts`

**What to change:**
- In `buildNavigationCss()` (and `buildBoxCss()`, etc.), pass the new `positionOffset` and `transform` props through to `buildLayoutCSS()`
- Ensure the aggregator extracts these new prop names when collecting component data

### Step 1.6 — Update Field Groups

**File to modify:**
- `resources/js/shared/puck/fields/fieldGroups.tsx`

**Add new field group:**
```tsx
export const positionOffsetFields = {
  positionOffset: {
    type: 'custom' as const,
    label: 'Position Offsets',
    render: (props) => <ResponsivePositionOffsetControl {...props} />,
  },
};

export const transformFields = {
  transform: {
    type: 'custom' as const,
    label: 'Transform',
    render: (props) => <ResponsiveTransformControl {...props} />,
  },
};
```

**Update `layoutAdvancedFields`:**
```tsx
export const layoutAdvancedFields = {
  ...positionField,        // position (static/relative/absolute/fixed/sticky)
  ...positionOffsetFields,  // NEW: top/right/bottom/left
  ...transformFields,       // NEW: translateX/Y, scale, rotate
  ...zIndexField,
  ...opacityField,
  ...overflowField,
  ...visibilityField,
};
```

**Conditional visibility:** Position offsets and transform should only show when `position !== 'static'`:
```tsx
// In createConditionalResolver, add:
positionOffset: (props) => props.position !== 'static' && props.position !== undefined,
transform: () => true, // Always visible — useful for hover effects too
```

### Step 1.7 — Tests for New Controls

**Files to create:**
- `resources/js/shared/puck/__tests__/PositionOffsetControl.test.tsx`
- `resources/js/shared/puck/__tests__/TransformControl.test.tsx`
- `resources/js/shared/puck/__tests__/cssBuilder-offsets-transforms.test.tsx`

**Test cases for CSS generation:**
```
✓ generatePositionOffsetCSS — emits only set values
✓ generatePositionOffsetCSS — handles responsive breakpoints
✓ generatePositionOffsetCSS — emits nothing when all values unset
✓ generateTransformCSS — composes multiple transform functions
✓ generateTransformCSS — handles responsive breakpoints
✓ generateTransformCSS — emits nothing when all values unset
✓ buildLayoutCSS — includes position offsets when provided
✓ buildLayoutCSS — includes transform when provided
```

---

## Phase 2: Slim Down Navigation

> **Goal:** Strip the component down to data + interaction. Let the controls handle styling.

### Step 2.1 — Create a New Clean Navigation Component

**Strategy:** Build the new version alongside the existing one. The backup (`Navigation.backup.tsx`) preserves the original. We'll rewrite the main file.

**File to modify:**
- `resources/js/shared/puck/components/navigation/Navigation.tsx`

**New structure (~300 lines):**

```
Navigation.tsx
├── Types (NavigationProps — extends standard field group types)
├── Fields (spread field groups + navigation-specific fields)
├── Default Props (extractDefaults from groups + nav-specific defaults)
├── Resolve Fields (conditional: flex fields when display=flex, etc.)
├── Render → NavigationRenderer
│     ├── Data layer (fetch navigation / use placeholders)
│     ├── CSS (buildLayoutCSS — delegated, not hand-rolled)
│     ├── Toggle state (expandedItems, isMobileMenuOpen)
│     └── Render tree (<nav><ul><li><Link>)
```

### Step 2.2 — Define Navigation-Specific Fields

These are the fields that are **unique to navigation** (not covered by generic field groups):

```tsx
const navigationSpecificFields = {
  navigationId: { /* external field — fetch from API */ },
  placeholderItems: { /* array field — theme builder placeholder items */ },
  showIcons: { /* radio — show/hide link icons */ },
};
```

### Step 2.3 — Spread Standard Field Groups

```tsx
fields: {
  // Navigation-specific
  ...navigationSpecificFields,

  // Standard styling (same as Box)
  ...customClassesFields,
  ...displayField,
  ...layoutFields,
  ...flexLayoutFields,
  ...spacingFields,
  ...backgroundFields,
  ...layoutAdvancedFields,  // includes position, offsets, transform, z-index, etc.
  ...effectsFields,
  ...interactionFields,     // cursor, transition
  ...advancedFields,        // customCss

  // Typography for the links
  ...typographyFields,      // textColor, fontSize, fontWeight
}
```

### Step 2.4 — Strip `generateNavigationCSS()`

**Remove entirely.** Replace with a single call to `buildLayoutCSS()`:

```tsx
// In NavigationRenderer:
const className = `navigation-${id}`;

const css = buildLayoutCSS({
  className,
  display, padding, margin, width, height,
  flexDirection, justifyContent, alignItems, flexWrap, flexGap,
  position, positionOffset, zIndex, opacity, overflow, visibility,
  transform,
  backgroundColor: resolvedBgColor,
  border, borderRadius, shadow,
  customCss,
});

// Font-specific
const fontCss = generateFontSizeCSS(className, fontSize);

return (
  <>
    <style>{css}{fontCss}</style>
    <nav className={`${className} navigation-root ${customClassName || ''}`}>
      {/* ... */}
    </nav>
  </>
);
```

### Step 2.5 — Simplify `renderMenuItem()`

Strip inline styles. Apply semantic classes that users can target via `customCss`:

```tsx
const renderMenuItem = (item: MenuItem, depth = 0) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);

  return (
    <li
      key={item.id}
      className={`nav-item ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'is-expanded' : ''}`}
      onMouseEnter={() => hasChildren && handleExpand(item.id)}
      onMouseLeave={() => hasChildren && handleCollapse(item.id)}
    >
      <Link to={item.url || '#'} className="nav-link" onClick={handleClick}>
        {item.label}
        {hasChildren && <ChevronDown className="nav-chevron" size={16} />}
      </Link>
      {hasChildren && isExpanded && (
        <ul className="nav-dropdown">
          {item.children.map(child => renderMenuItem(child, depth + 1))}
        </ul>
      )}
    </li>
  );
};
```

### Step 2.6 — Keep Toggle Logic Minimal

The component retains two pieces of state:

1. **`isMobileMenuOpen`** — toggled by hamburger button, adds `.is-open` class to `<nav>`
2. **`expandedItems`** — Set of item IDs with expanded dropdowns, adds `.is-expanded` to `<li>`

The **visual result** of these classes is controlled by the user via the editor's style controls and `customCss`. The component only manages the class toggling.

```tsx
<nav className={`${className} ${isMobileMenuOpen ? 'is-open' : ''}`}>
```

### Step 2.7 — Provide Sensible Default Props

```tsx
defaultProps: {
  // Navigation-specific
  showIcons: false,

  // Layout defaults for a typical horizontal nav
  display: { mobile: 'flex' },
  flexDirection: { mobile: 'column', desktop: 'row' },
  justifyContent: 'flex-start',
  alignItems: 'center',
  flexGap: { mobile: { value: '4', unit: 'px' }, desktop: { value: '8', unit: 'px' } },
  padding: { mobile: { top: '8', right: '16', bottom: '8', left: '16', unit: 'px', linked: false } },

  // Colors
  backgroundColor: { type: 'theme', value: '' },
  textColor: { type: 'theme', value: 'colors.gray.700' },

  // Typography
  fontSize: { mobile: { type: 'custom', value: '16px' } },
  fontWeight: { type: 'theme', value: 'typography.fontWeight.medium' },
}
```

### Step 2.8 — Update PuckCssAggregator

**File:** `resources/js/shared/puck/services/PuckCssAggregator.ts`

Update `buildNavigationCss()` to pass all standard props through to `buildLayoutCSS()`, matching how `buildBoxCss()` works. No more special-casing.

---

## Phase 3: Toggle & Interaction Layer

> **Goal:** Provide a clean mechanism for show/hide behavior that works with the editor.

### Step 3.1 — CSS State Classes

The component applies these classes based on state:

| Class | Applied To | When |
|-------|-----------|------|
| `.is-open` | `<nav>` | Mobile menu is open |
| `.is-expanded` | `<li.nav-item>` | Dropdown submenu is visible |
| `.has-children` | `<li.nav-item>` | Item has child items |

### Step 3.2 — Default Dropdown CSS

The component injects **minimal structural CSS** for dropdown behavior (not styling):

```css
/* Structural defaults — users override via editor controls */
.navigation-{id} .nav-dropdown {
  display: none;
}
.navigation-{id} .nav-item.is-expanded > .nav-dropdown {
  display: flex;
  flex-direction: column;
}
```

This is the **only hardcoded CSS** the component emits. Everything else (colors, sizes, shadows, position, animation) comes from the editor controls.

### Step 3.3 — Hamburger Toggle

The hamburger button is part of the component's render. Its visibility is controlled by the standard `visibility` responsive control:

- **Mobile:** Hamburger visible, nav-menu hidden (user sets via visibility control)
- **Desktop:** Hamburger hidden, nav-menu visible

Alternatively, the component can include a simple built-in mechanism:

```tsx
// The hamburger is always rendered, visibility controlled by CSS
<button className="nav-toggle" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
  <Menu size={24} />
</button>
```

The user hides/shows it per breakpoint using the `customCss` field or a future per-element visibility feature.

### Step 3.4 — Advanced: Interaction Presets (Future)

For convenience, offer **presets** that pre-fill style values to match common patterns:

| Preset | What It Sets |
|--------|-------------|
| **Horizontal Bar** | `display: flex`, `flexDirection: row`, `gap: 8px` |
| **Off-Canvas Left** | Hamburger visible on mobile, nav fixed left with `translateX(-100%)`, `.is-open` sets `translateX(0)` |
| **Bottom Tab Bar** | `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `flexDirection: row`, `justifyContent: space-around` |
| **Dropdown Stack** | `flexDirection: column`, hamburger toggle |

These are just **prop presets** — they set the same fields the user can manually configure. This is a convenience, not new functionality.

---

## Migration & Compatibility

### Backward Compatibility

- Existing pages that use `Navigation` with `layout: 'horizontal'`, `mobileStyle: 'hamburger-dropdown'`, etc. will need migration
- The `PuckCssAggregator` already handles Navigation — its `buildNavigationCss()` function needs updating to match the new prop shape
- Old prop names (`layout`, `mobileStyle`, `mobileBreakpoint`, `hoverColor`, `activeColor`, `itemSpacing`, etc.) will be removed
- A migration script or resolver can map old props to new ones:

```tsx
resolveData: ({ props }) => {
  // Migrate old 'layout' prop to new 'flexDirection'
  if (props.layout === 'horizontal' && !props.flexDirection) {
    props.flexDirection = { mobile: 'column', desktop: 'row' };
  }
  // Migrate old 'mobileStyle' to position + transform
  // ...
  return { props };
}
```

### Files Changed Summary

| Action | File |
|--------|------|
| **Create** | `fields/controls/PositionOffsetControl.tsx` |
| **Create** | `fields/controls/ResponsivePositionOffsetControl.tsx` |
| **Create** | `fields/controls/TransformControl.tsx` |
| **Create** | `fields/controls/ResponsiveTransformControl.tsx` |
| **Create** | `fields/controls/ResponsiveFlexDirectionControl.tsx` |
| **Modify** | `fields/cssBuilder.ts` — add offset + transform CSS generators |
| **Modify** | `fields/fieldGroups.tsx` — add new field groups, make flexDirection responsive |
| **Modify** | `fields/index.ts` — export new controls |
| **Modify** | `services/PuckCssAggregator.ts` — wire new props |
| **Rewrite** | `components/navigation/Navigation.tsx` — slim down |
| **Modify** | `__tests__/Navigation.test.tsx` — update tests |
| **Create** | `__tests__/PositionOffsetControl.test.tsx` |
| **Create** | `__tests__/TransformControl.test.tsx` |
| **Create** | `__tests__/cssBuilder-offsets-transforms.test.tsx` |
| **Keep** | `components/navigation/Navigation.backup.tsx` — safety net |

---

## Execution Order

```
Phase 1 (Controls)
  1.1  PositionOffsetControl + ResponsivePositionOffsetControl
  1.2  TransformControl + ResponsiveTransformControl
  1.3  ResponsiveFlexDirectionControl
  1.4  Wire into cssBuilder.ts (CSS generators)
  1.5  Wire into PuckCssAggregator
  1.6  Update fieldGroups.tsx
  1.7  Tests for new controls
  ── Checkpoint: all new controls work, existing components unaffected ──

Phase 2 (Navigation)
  2.1  Rewrite Navigation.tsx (keep backup)
  2.2  Navigation-specific fields only
  2.3  Spread standard field groups
  2.4  Remove generateNavigationCSS, use buildLayoutCSS
  2.5  Simplify renderMenuItem
  2.6  Minimal toggle logic
  2.7  Sensible defaults
  2.8  Update PuckCssAggregator for new prop shape
  ── Checkpoint: Navigation renders with full editor controls ──

Phase 3 (Interaction)
  3.1  CSS state classes (.is-open, .is-expanded)
  3.2  Minimal structural dropdown CSS
  3.3  Hamburger toggle mechanism
  3.4  (Future) Interaction presets
  ── Checkpoint: Navigation is fully editor-driven ──
```

---

## Success Criteria

- [ ] Position offsets (`top`/`right`/`bottom`/`left`) work and are responsive
- [ ] Transform (`translateX`/`translateY`/`scale`/`rotate`) works and is responsive
- [ ] `flexDirection` is responsive (row on desktop, column on mobile)
- [ ] Navigation component is under 350 lines
- [ ] Navigation uses the same field groups as Box (no custom CSS generation)
- [ ] Mobile menu toggle works via `.is-open` class
- [ ] Dropdown expand/collapse works via `.is-expanded` class
- [ ] All existing components still work (no regressions from control changes)
- [ ] PuckCssAggregator generates correct CSS for Navigation on the storefront
- [ ] All tests pass
