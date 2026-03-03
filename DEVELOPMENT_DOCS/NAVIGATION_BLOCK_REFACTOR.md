# Navigation Block Refactor

**Created:** March 1, 2026  
**Status:** Ready for implementation  
**Replaces:** `NavigationMenu.tsx` (937-line monolith), `NavigationV2.tsx` (legacy)

---

## Goal

Refactor the navigation block into a clean, split architecture where:
- The block is a **pure style receiver** — no predefined visual CSS, everything comes from editor props
- Desktop and mobile are **separate render trees** (not one component with conditionals)
- Main items and sub items are **independently styleable regions**
- Mobile navigation uses a **variant system** (drawer / fullscreen / dropdown) — structural skeletons, not design decisions
- CSS generation lives in a **pure function** shared by the runtime component and `PuckCssAggregator`

---

## Target Folder Structure

```
navigation_v2/
  index.ts                          ← Barrel export
  NavigationMenuBlock.tsx            ← Puck config: fields, defaultProps, resolveFields, render
  NavigationMenuRenderer.tsx         ← Orchestrator: data, CSS, viewport switch
  desktop/
    DesktopNav.tsx                   ← Horizontal bar with hover dropdowns
    DesktopNavItem.tsx               ← Recursive item (dropdown on hover)
  mobile/
    MobileNav.tsx                    ← Variant switch
    DrawerNav.tsx                    ← Slide-in drawer
    FullscreenNav.tsx                ← Fullscreen overlay
    DropdownNav.tsx                  ← Collapse below toggle
    MobileNavItem.tsx                ← Recursive item (accordion on tap)
  shared/
    navTypes.ts                      ← All types, constants, breakpoint map, NavCssOptions
    useNavData.ts                    ← Data fetching + hierarchy builder
    navCssBuilder.ts                 ← Pure CSS generation (no React imports)
```

---

## Implementation Order

Steps are listed sequentially, but the dependency graph matters:

```
navTypes.ts                          ← Foundation: types + constants
    ↓
useNavData.ts    navCssBuilder.ts    useWindowWidth.ts    ← Independent, can parallelize
    ↓                   ↓
DesktopNavItem      MobileNavItem    ← Item renderers
    ↓                   ↓
DesktopNav      MobileNav (variants) ← Containers
         ↓         ↓
    NavigationMenuRenderer           ← Orchestrator
              ↓
    NavigationMenuBlock              ← Puck config
              ↓
    PuckCssAggregator update         ← Last step
```

**Rule:** Don't touch `PuckCssAggregator` until `navCssBuilder` is complete and tested in isolation. The aggregator update is the final step.

---

## Implementation Steps

### Step 1: Create `useWindowWidth` hook

**File:** `resources/js/shared/hooks/useWindowWidth.ts`

Creates a shared hook that tracks `window.innerWidth` with a resize listener. This is used by the nav block to decide desktop vs mobile rendering based on the user-configured `mobileBreakpoint` prop — NOT the Puck editor viewport.

**Implementation:**
- `useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024)` — SSR/test safe, defaults to desktop
- `useEffect` with `resize` event listener
- Debounce the handler (~100ms) to avoid excessive re-renders during drag-resize
- Return the width number

**Export** from `resources/js/shared/hooks/index.ts`.

**Why 1024 default:** Matches the existing pattern in `ResponsiveWrapper.tsx` where Puck-unavailable contexts fall back to 1024 (desktop). Desktop renders first, mobile kicks in when width drops below the breakpoint.

---

### Step 2: Create `shared/navTypes.ts`

**File:** `resources/js/shared/puck/components/navigation_v2/shared/navTypes.ts`

Defines all types and constants for the navigation block. Extract from the current monolith and expand.

**Types to define:**

```ts
export type MobileVariant = 'drawer' | 'fullscreen' | 'dropdown';
export type MobileBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

export const MOBILE_BREAKPOINTS: Record<MobileBreakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
```

**Props interface — four styleable regions:**

| Region | Props | CSS target |
|--------|-------|------------|
| **Container** | display, width, maxWidth, padding, margin, backgroundColor, border, borderRadius, shadow, visibility | `.nav-menu-{id}` |
| **Main items** | itemColor, itemHoverColor, itemActiveColor, itemBackgroundColor, itemHoverBackgroundColor, itemActiveBackgroundColor, itemPadding, fontSize, fontWeight, lineHeight, letterSpacing, textTransform, textDecoration, itemBorderRadius, cursor, transition | `.nav-menu-{id} .nav-link` |
| **Sub items / dropdown** | subItemColor, subItemHoverColor, subItemBackgroundColor, subItemHoverBackgroundColor, subItemPadding, subFontSize, subFontWeight, dropdownBackgroundColor, dropdownBorderRadius, dropdownShadow, dropdownMinWidth | `.nav-menu-{id} .nav-submenu`, `.nav-menu-{id} .nav-submenu .nav-link` |
| **Mobile** | mobileBreakpoint, mobileVariant, drawerWidth, drawerBackgroundColor, drawerOverlayColor, drawerOverlayOpacity, toggleColor, toggleIconSize | variant-specific selectors |

**Additional props:**
- `navigationId` — selects which nav menu to fetch
- `placeholderItems` — fallback items for theme builder
- `customClassName`, `customId`, `customCss` — advanced

**Active state props:**
- `itemActiveColor` — text color for current-page link
- `itemActiveBackgroundColor` — background for current-page link
- Default to `undefined` — emit no CSS unless set by editor

**`NavCssOptions` interface:** Also defined and exported from this file. This is the contract consumed by both `navCssBuilder.ts` and `NavigationMenuRenderer.tsx`. Defining it here (not in `navCssBuilder.ts`) avoids circular imports — the builder imports the type from `navTypes.ts`, the renderer imports it from the same place.

**Key principle:** If a prop is `undefined`, no CSS rule is emitted. The nav renders structurally correct but visually bare. The editor is the designer.

---

### Step 3: Create `shared/useNavData.ts`

**File:** `resources/js/shared/puck/components/navigation_v2/shared/useNavData.ts`

Extracts the data fetching and hierarchy building logic from the current component.

**Signature:**
```ts
export function useNavData(
  navigationId: number | undefined,
  placeholderItems: MenuItem[] | undefined,
  metadata?: { navigations?: unknown[] }
): { items: MenuItem[]; loading: boolean }
```

**Two data paths:**

| Context | Data source | Loading state? |
|---------|-------------|----------------|
| **Storefront** | `metadata.navigations` (already in page JSON, no API call) | No |
| **Editor (dashboard)** | API fetch via `navigations.get(navigationId)` | Yes |
| **Theme builder** | `placeholderItems` prop | No |

**Logic:**
1. **Check metadata first** — if `metadata?.navigations` contains a navigation matching `navigationId`, use it directly. No fetch, no loading state. This is the storefront path — `PuckCompilerService` injects navigation data into the page JSON at save time.
2. **Fall back to API fetch** — if metadata is unavailable (editor context), `useEffect` fetches via `navigations.get(navigationId)`. This is the only path that sets `loading: true`.
3. **Fall back to placeholderItems** — when no API data and no metadata (theme builder mode).
4. `useMemo` — build hierarchy from flat `structure` array (parent_id → children tree).
5. Return `{ items, loading }`.

The metadata is available via Puck's `metadata` prop which `PublicPage.tsx` passes to `<Render>`. In the editor, metadata is not populated, so the API fetch path activates.

---

### Step 4: Create `shared/navCssBuilder.ts`

**File:** `resources/js/shared/puck/components/navigation_v2/shared/navCssBuilder.ts`

**Critical constraint:** This file must have **zero React imports**. It's a pure function module that will be called by both:
- The runtime component (in a `useMemo`)
- `PuckCssAggregator.ts` (at save/publish time)

**Start by defining `NavCssOptions`** — this is the contract both exports share. Every prop that generates CSS must have a corresponding key. Run it against the full field list in Step 11 before writing any CSS logic. The "undefined = no CSS" rule means every field is optional.

**Two exports:**

```ts
// Internal — used by runtime component (already has resolved values)
export function buildNavCss(options: NavCssOptions): string { ... }

// External — used by PuckCssAggregator (raw Puck component data)
export function buildNavigationMenuCss(
  component: PuckComponent,
  resolver: ThemeResolver
): string {
  const options = extractNavCssOptions(component.props, resolver);
  return buildNavCss(options);
}
```

`extractNavCssOptions` is the only place that knows about `PuckComponent` shape — just prop extraction and token resolution, no CSS logic. Keep it small and mechanical.

`NavCssOptions` contains all resolved prop values (strings, not `ColorValue` objects).

**CSS generation — two categories:**

**A) Structural CSS (always emitted, not editable):**
```css
.nav-menu-{id} { position: relative; }
.nav-menu-{id} .nav-items { list-style: none; margin: 0; padding: 0; display: contents; }
.nav-menu-{id} .nav-item { position: relative; }
.nav-menu-{id} .nav-item-row { display: flex; align-items: center; gap: 0.25rem; }
.nav-menu-{id} .nav-submenu { display: none; position: absolute; top: 100%; left: 0; z-index: 100; }
.nav-menu-{id} .nav-submenu.is-open { display: flex; flex-direction: column; }
.nav-menu-{id} .nav-chevron { /* flex-shrink, border:none, cursor:pointer, rotate on expand */ }
.nav-menu-{id} .nav-toggle { display: none; /* shown via mobile media query */ }
.nav-menu-{id} .nav-backdrop { display: none; }
```

**B) Visual CSS (only emitted when prop is defined):**

For each prop, check `!== undefined` before emitting. Example pattern:
```ts
// Only emit if editor set a color
if (options.itemColor) {
  parts.push(`.${cls} .nav-link { color: ${options.itemColor}; }`);
}
```

**Hover / active pseudo-classes:**
```css
/* Only if itemHoverColor or itemHoverBackgroundColor is set */
.nav-menu-{id} .nav-link:hover { color: ...; background-color: ...; }

/* Only if itemActiveColor or itemActiveBackgroundColor is set */
.nav-menu-{id} .nav-link.is-active { color: ...; background-color: ...; }
```

**Sub items — scoped to `.nav-submenu`:**
```css
.nav-menu-{id} .nav-submenu { background-color: ...; border-radius: ...; box-shadow: ...; min-width: ...; }
.nav-menu-{id} .nav-submenu .nav-link { color: ...; padding: ...; font-size: ...; font-weight: ...; }
.nav-menu-{id} .nav-submenu .nav-link:hover { color: ...; background-color: ...; }
```

**Mobile variant CSS:**
Each variant generates its own `@media (max-width: ...)` block with structural rules (slide animation, fixed positioning, etc.) plus visual props (drawerBackgroundColor, overlayOpacity, etc.).

**Responsive props** (fontSize, itemPadding, etc.) use the existing `generateFontSizeCSS`, `generatePaddingCSS` etc. from the fields module. Import them as pure functions.

**Container layout** uses `buildLayoutCSS` from cssBuilder.ts (existing, already works).

---

### Step 5: Create `desktop/DesktopNavItem.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/desktop/DesktopNavItem.tsx`

Recursive component for a single nav item in desktop mode.

**Behavior:**
- Hover to expand/collapse submenu (`onMouseEnter` / `onMouseLeave`)
- Chevron icon for items with children
- Link (`<a>`) and chevron are siblings inside `.nav-item-row` (not nested — avoids invalid `<button>` inside `<a>`)
- `isActive` detection:

```ts
const isActive = useMemo(() => {
  if (!item.url || typeof window === 'undefined') return false;
  try {
    return window.location.pathname === new URL(item.url, window.location.origin).pathname;
  } catch {
    return false;
  }
}, [item.url]);
```

- Adds `.is-active` class to `.nav-link` when matched
- In edit mode (`isEditing`), links are disabled (no navigation on click)
- Recurses: if `item.children` exists, renders `<ul className="nav-submenu">` with child `DesktopNavItem`s

---

### Step 6: Create `desktop/DesktopNav.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/desktop/DesktopNav.tsx`

Simple wrapper — no logic beyond rendering the item list.

**Props:** `className`, `items: MenuItem[]`, `isEditing: boolean`

**Renders:**
```tsx
<ul className="nav-items">
  {items.sort(byOrder).map(item => (
    <DesktopNavItem key={item.id} item={item} depth={0} isEditing={isEditing} />
  ))}
</ul>
```

No `<nav>` tag here — the parent `NavigationMenuRenderer` owns the `<nav>` wrapper.

---

### Step 7: Create `mobile/MobileNavItem.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/mobile/MobileNavItem.tsx`

Same recursive structure as `DesktopNavItem` but with different interaction:
- **Tap to expand/collapse** (not hover) — uses `onClick` + internal `isExpanded` state
- **Accordion pattern** — submenu slides open vertically below the parent item
- Submenu uses `position: static` (not absolute) — flows in the document
- Same `isActive` detection as desktop

---

### Step 8: Create mobile variants

**`mobile/DrawerNav.tsx`**
- Fixed panel, slides in from left
- Receives `isOpen` and `onClose` as props (state owned by `NavigationMenuRenderer`)
- Close button inside drawer
- Backdrop overlay behind drawer (clicks close → `onClose()`)
- Renders `MobileNavItem` list inside the drawer panel

**`mobile/FullscreenNav.tsx`**
- Fixed overlay covering entire viewport
- Centered content
- Close button → `onClose()`
- Same item rendering via `MobileNavItem`

**`mobile/DropdownNav.tsx`**
- Simplest variant — items collapse below the toggle
- Receives `isOpen` / `onClose` same as other variants
- No fixed positioning, flows in document

Each variant receives: `className`, `items`, `isEditing`, `isOpen`, `onClose`

**State ownership:** All open/close state lives in `NavigationMenuRenderer` via `useState`, not in a Zustand store. The `navigationStore` was needed when `NavToggle` was a separate Puck block coordinating across the component tree. Now that the toggle is absorbed into the renderer, local state is sufficient — no cross-component coordination needed.

---

### Step 9: Create `mobile/MobileNav.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/mobile/MobileNav.tsx`

Variant switch — reads `mobileVariant` prop and renders the correct component:

```tsx
export const MobileNav = ({ mobileVariant, ...props }) => {
  switch (mobileVariant) {
    case 'drawer':     return <DrawerNav {...props} />;
    case 'fullscreen': return <FullscreenNav {...props} />;
    case 'dropdown':
    default:           return <DropdownNav {...props} />;
  }
};
```

---

### Step 10: Create `NavigationMenuRenderer.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/NavigationMenuRenderer.tsx`

The orchestrator. This is the component that Puck's `render` function calls.

**Responsibilities:**
1. **Data** — calls `useNavData(navigationId, placeholderItems, metadata)`
2. **Viewport decision** — `useWindowWidth()` vs `MOBILE_BREAKPOINTS[mobileBreakpoint]`
3. **Open/close state** — `const [isOpen, setIsOpen] = useState(false)` — passed to mobile variants as `isOpen` / `onClose`
4. **Color/token resolution** — resolve all ColorValue props via `useTheme().resolve()`
5. **CSS generation** — `useMemo(() => buildNavCss({...}), [deps])` (calls the internal export, not the aggregator wrapper)
6. **CSS injection** — `{isEditing && css && <style>{css}</style>}` (same pattern as Box/Heading)
7. **Render switch** — desktop or mobile tree
8. **Empty state** — "Select a navigation menu" when no data and no placeholders
9. **Loading state** — "Loading menu…" while fetching (editor only — storefront reads from page JSON metadata, no loading)

**Renders:**
```tsx
<nav className={className} id={customId}>
  {isEditing && css && <style>{css}</style>}

  {/* Toggle button — visible via CSS only at mobile breakpoint */}
  {mobileVariant && <ToggleButton ... />}

  {/* Backdrop — for drawer/fullscreen */}
  {(mobileVariant === 'drawer' || mobileVariant === 'fullscreen') && <Backdrop />}

  {isMobile
    ? <MobileNav variant={mobileVariant} items={items} isOpen={isOpen} onClose={() => setIsOpen(false)} ... />
    : <DesktopNav items={items} ... />
  }
</nav>
```

**Toggle button** is rendered inside the renderer (not as a separate Puck block) — hidden by default, shown via `@media (max-width: ...)` in the generated CSS.

---

### Step 11: Create `NavigationMenuBlock.tsx`

**File:** `resources/js/shared/puck/components/navigation_v2/NavigationMenuBlock.tsx`

The Puck `ComponentConfig` — fields, defaultProps, resolveFields, render.

**Field groups (organized by region):**

```ts
fields: {
  // ── Data ──
  navigationId: { type: 'external', ... },           // Live mode
  placeholderItems: { type: 'array', ... },           // Theme builder mode

  // ── Container ──
  ...displayField,
  ...flexLayoutFields,                                // Conditional on flex
  width, maxWidth,
  ...spacingFields,
  ...backgroundFields,
  ...effectsFields,
  visibility,

  // ── Main Item Styling ──
  itemColor,                    // ColorPickerControl
  itemHoverColor,               // ColorPickerControl
  itemActiveColor,              // ColorPickerControl
  itemBackgroundColor,          // ColorPickerControl
  itemHoverBackgroundColor,     // ColorPickerControl
  itemActiveBackgroundColor,    // ColorPickerControl
  itemPadding,                  // ResponsiveSpacingControl
  fontSize,                     // ResponsiveFontSizeControl
  fontWeight,                   // FontWeightControl
  lineHeight,                   // ResponsiveLineHeightControl
  letterSpacing,                // ResponsiveLetterSpacingControl
  textTransform,                // Select
  textDecoration,               // Select
  itemBorderRadius,             // BorderRadiusControl
  cursor,                       // Select
  transition,                   // Custom (duration, easing, properties)

  // ── Sub Item / Dropdown Styling ──
  subItemColor,                 // ColorPickerControl
  subItemHoverColor,            // ColorPickerControl
  subItemBackgroundColor,       // ColorPickerControl
  subItemHoverBackgroundColor,  // ColorPickerControl
  subItemPadding,               // ResponsiveSpacingControl
  subFontSize,                  // ResponsiveFontSizeControl
  subFontWeight,                // FontWeightControl
  dropdownBackgroundColor,      // ColorPickerControl
  dropdownBorderRadius,         // BorderRadiusControl
  dropdownShadow,               // ShadowControl
  dropdownMinWidth,             // Text (e.g. "180px")

  // ── Mobile ──
  mobileBreakpoint,             // Select (sm/md/lg/xl)
  mobileVariant,                // Select (drawer/fullscreen/dropdown)
  drawerWidth,                  // Text (conditional: variant === drawer)
  drawerBackgroundColor,        // ColorPickerControl (conditional)
  drawerOverlayColor,           // ColorPickerControl (conditional: drawer/fullscreen)
  drawerOverlayOpacity,         // Number (conditional: drawer/fullscreen)
  toggleColor,                  // ColorPickerControl (conditional: variant set)
  toggleIconSize,               // Number (conditional: variant set)

  // ── Advanced ──
  customCss,
  customClassName,
  customId,
}
```

**`resolveFields`** uses `createConditionalResolver`:
- Flex fields → only when display includes flex
- `drawerWidth` → only when `mobileVariant === 'drawer'`
- `drawerBackgroundColor`, `drawerOverlayColor`, `drawerOverlayOpacity` → only when variant is `'drawer'` or `'fullscreen'`
- `toggleColor`, `toggleIconSize` → only when `mobileVariant` is set
- Theme builder mode: hide `navigationId`, show `placeholderItems`
- Live mode: hide `placeholderItems`, show `navigationId`

**`defaultProps`:**
- `display: { mobile: 'flex' }`
- `direction: { mobile: 'row' }`
- `flexGap: { mobile: { value: '16', unit: 'px' } }`
- `align: 'center'`
- All visual props: `undefined` (bare by default)
- `mobileBreakpoint: 'md'`
- `toggleIconSize: 24`

**`render`:**
```ts
render: (props) => <NavigationMenuRenderer {...props} />
```

---

### Step 12: Update `PuckCssAggregator.ts`

**File:** `resources/js/shared/puck/services/PuckCssAggregator.ts`

Replace the inline `buildNavigationMenuCss` function (~200 lines) with an import from the new shared builder:

```ts
import { buildNavigationMenuCss as buildNavMenuCss } from '../components/navigation_v2/shared/navCssBuilder';
```

The aggregator's switch case stays the same:
```ts
case 'navigationmenu':
  cssRules.push(buildNavMenuCss(component, resolver));
  break;
```

The function signature must match what the aggregator expects: `(component: PuckComponent, resolver: ThemeResolver) => string`. The `navCssBuilder.ts` should export a wrapper that extracts props from the component object and calls the internal builder — same as the current pattern.

Also:
- Remove the old `NavigationV2` from the switch case and `isLayoutComponent` check
- Remove `buildNavigationV2Css` function
- Remove `NavToggle` from the switch case (it will be absorbed into the nav block)

---

### Step 13: Update barrel exports and Puck config

**`navigation_v2/index.ts`:**
```ts
export { NavigationMenuBlock as NavigationMenu } from './NavigationMenuBlock';
export type { NavigationMenuProps } from './shared/navTypes';
```

**`resources/js/shared/puck/config/index.tsx`:**
- Remove `NavigationV2` registration
- Remove `NavToggle` registration  
- Keep `NavigationMenu` pointing to the new block
- Update the `navigation` category to only contain `['NavigationMenu']`

---

### Step 14: Delete legacy files

- `navigation_v2/NavigationV2.tsx` — replaced entirely
- `navigation_v2/NavToggle.tsx` — absorbed into the nav block (toggle is rendered inside `NavigationMenuRenderer`)
- Old `NavigationMenu.tsx` — replaced by the new split

---

### Step 15: Test

**Manual verification:**
1. Drop a NavigationMenu block onto a page in the editor
2. Verify empty state shows "Select a navigation menu"
3. Select a navigation via the external field
4. Verify items render with no visual styling (bare structure)
5. Set `itemColor`, `fontSize`, `itemPadding` — verify CSS appears in `<style>` tag
6. Set `itemHoverColor` — verify hover works
7. Set `itemActiveColor` — verify current page link highlights
8. Set sub-item colors — verify dropdown items style independently
9. Switch `mobileVariant` to `drawer` — resize viewport below breakpoint, verify drawer
10. Switch to `fullscreen` — verify overlay
11. Switch to `dropdown` — verify collapse
12. Save the page — verify storefront renders identically (CSS from file, no `<style>` tag)
13. Test in theme builder mode — verify `placeholderItems` renders, `navigationId` is hidden

**Unit tests to add:**
- `navCssBuilder.test.ts` — verify CSS output for each prop, verify no CSS when prop is undefined
- `useNavData.test.ts` — verify API fetch, hierarchy building, placeholder fallback
- `useWindowWidth.test.ts` — verify resize tracking, SSR fallback

---

## Key Decisions Summary

| Decision | Rationale |
|----------|-----------|
| CSS generation stays in parent, not in DesktopNav/MobileNav | PuckCssAggregator expects one CSS block per component. Keeps aggregator contract simple. |
| `useWindowWidth()` for mobile detection, not Puck viewport | Nav has its own `mobileBreakpoint` prop. Storefront has no Puck. Must work identically in both contexts. |
| No visual CSS defaults | The editor is the designer. Undefined prop → no CSS rule emitted. Structurally correct, visually bare. |
| Active state via `window.location.pathname` comparison | Uses `new URL(item.url, window.location.origin).pathname` for safe comparison across relative paths, absolute URLs, and anchor fragments. |
| `navCssBuilder.ts` has zero React imports | Must be importable by PuckCssAggregator (runs outside React). Pure functions only. |
| Four styleable regions | Container, main items, sub items/dropdown, mobile drawer — maps to real editorial needs. Sub items almost always look different from main items. |
| Mobile variants are structural skeletons | Drawer/fullscreen/dropdown determine DOM structure and animation. Everything visual comes from props. |
| Local state for open/close, not Zustand store | NavToggle is absorbed into the renderer — no cross-component coordination needed. `useState` in `NavigationMenuRenderer` is simpler and avoids a store dependency in the variants. |
| Two exports from navCssBuilder | `buildNavCss(options)` for runtime (pre-resolved values), `buildNavigationMenuCss(component, resolver)` for aggregator (raw Puck data). `extractNavCssOptions` bridges the gap. |
