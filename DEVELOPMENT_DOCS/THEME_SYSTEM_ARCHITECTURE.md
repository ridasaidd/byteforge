# Theme System Architecture

## Overview

The theme system provides a flexible, customizable design token system where themes are:
- Stored as JSON files in `resources/js/shared/themes/`
- Synced to the database for tenant-specific activation and customization
- Accessed globally via React Context with a token resolver

## Architecture Flow

```
1. DISK (Original Themes - Read Only)
   resources/js/shared/themes/
   ├── minimal/theme.json
   ├── modern/theme.json
   └── ...
           ↓
2. USER ACTIVATES THEME
   - Theme synced from disk → database
   - Set is_active = true for tenant
   - base_theme references original slug
           ↓
3. DATABASE (Active Theme - Customizable)
   themes table:
   - theme_data (JSON copy, can be modified)
   - is_active = true
           ↓
4. THEME PROVIDER (React Context)
   - Loads active theme from API
   - Provides theme values to components
   - Resolves dot notation paths (e.g., "colors.primary.600")
           ↓
5. COMPONENTS (Consume Theme)
   - Use useTheme() hook
   - Access values: theme.resolve('colors.primary.600')
   - Render with theme styles
```

## Database Schema

### themes table
```sql
- id (bigint)
- tenant_id (bigint, nullable) - NULL for central, tenant_id for tenants
- name (string) - Display name: "Minimal Theme"
- slug (string, unique) - URL-safe: "minimal"
- base_theme (string, nullable) - References theme folder slug
- theme_data (json) - Actual theme values (customizable)
- is_active (boolean) - Only one active per tenant
- description (text, nullable)
- author (string, nullable)
- version (string) - "1.0.0"
- created_at, updated_at
```

**Index**: `(tenant_id, is_active)` for fast active theme lookup.

## Theme JSON Structure

Example: `resources/js/shared/themes/minimal/theme.json`

### Key Sections:
1. **colors** - Primary, secondary, accent, neutral, semantic
2. **typography** - Font families, sizes, weights, line heights
3. **spacing** - Consistent spacing scale
4. **borderRadius** - Border radius values
5. **shadows** - Box shadow presets
6. **breakpoints** - Responsive breakpoints
7. **components** - Component-specific theme tokens
8. **templates** - Pre-built page templates with Puck data

### Token References
Theme values can reference other values using dot notation:
```json
{
  "components": {
    "button": {
      "variants": {
        "primary": {
          "backgroundColor": "colors.primary.500",
          "color": "colors.neutral.white"
        }
      }
    }
  }
}
```

The `resolve()` function recursively resolves references to their final values.

## Frontend Implementation

### ThemeProvider Context (`shared/contexts/ThemeContext.tsx`)
Loads active theme from API and provides:
- `theme`: Active theme object
- `isLoading`: Loading state
- `error`: Error state
- `resolve(path, defaultValue)`: Token resolver with recursive reference support
- `refresh()`: Reload active theme

### useTheme Hook (`shared/hooks/useTheme.ts`)
```typescript
const { theme, resolve, isLoading, error, refresh } = useTheme();
const primaryColor = resolve('colors.primary.500');
```

### Theme API (`shared/services/api/themes.ts`)
- `sync()` - Sync themes from disk to database
- `available()` - Get available themes from disk
- `active()` - Get active theme
- `list()` - List installed themes
- `activate(data)` - Activate a theme
- `update(id, data)` - Update theme customizations
- `reset(id)` - Reset theme to base
- `duplicate(id, data)` - Duplicate theme
- `delete(id)` - Delete theme
- `export(id)` - Export theme JSON
- `import(file)` - Import theme file
- `getActiveTemplates()` - Get templates from active theme
- `getTemplates(slug)` - Get templates from specific theme

### Usage in Components
```typescript
import { useTheme } from '@/shared/hooks';

function MyComponent() {
  const { resolve } = useTheme();
  
  return (
    <div style={{
      backgroundColor: resolve('colors.primary.500'),
      padding: resolve('spacing.4')
    }}>
      Content
    </div>
  );
}
```

## User Workflows

### Activating a Theme
1. User visits `/dashboard/themes` in Central app
2. Sees available themes from disk
3. Clicks "Activate" on a theme
4. Backend syncs theme JSON to database, sets `is_active = true`
5. ThemeProvider detects change and reloads active theme
6. All components using `useTheme()` re-render with new theme

### Customizing a Theme
1. User activates a theme
2. Opens theme customizer (future feature)
3. Modifies color, typography, or spacing values
4. Backend updates `theme_data` JSON in database
5. `base_theme` remains set (allows reset to original)
6. Theme values update immediately via context refresh

### Resetting a Theme
1. User clicks "Reset" on an active theme
2. Backend reloads theme from disk (`base_theme` reference)
3. Overwrites `theme_data` with original values
4. Frontend refreshes theme context

### Duplicating a Theme
1. User clicks "Duplicate" on a theme
2. Backend creates new database entry with copied `theme_data`
3. New theme can be customized independently

### Exporting/Importing Themes
1. **Export**: Downloads theme JSON file
2. **Import**: Uploads JSON file, creates new database entry

## Benefits

✅ **Separation**: Original themes untouched, customizations in DB  
✅ **Reset Capability**: Can revert to base theme anytime  
✅ **Tenant Isolation**: Each tenant has independent active theme  
✅ **Performance**: Theme loaded once, cached in context  
✅ **Flexibility**: Deep customization without affecting originals  
✅ **Scalability**: Add new themes by dropping JSON files in `shared/themes/`

## Theme Builder vs Theme Customizer

### ThemeBuilderPage (`/dashboard/themes/:id/builder`)
**Purpose**: Create entirely new themes from scratch

**Features**:
- ✅ Create/edit theme metadata (name, description, preview image)
- ✅ Edit theme tokens in Settings tab (colors, typography, spacing, borderRadius)
- ✅ Design header with Puck editor (full drag-and-drop)
- ✅ Design footer with Puck editor (full drag-and-drop)
- ✅ Create page templates with Puck editor
- ✅ Save all changes to database (`theme_data`, theme parts, templates)

**Location**: `resources/js/apps/central/components/pages/ThemeBuilderPage.tsx`

**Tabs**:
1. **Info** - Theme name, description, preview image
2. **Settings** - Token editor (colors, typography, spacing)
3. **Header** - Puck editor for header design
4. **Footer** - Puck editor for footer design
5. **Pages** - Page template management

**Use Cases**:
- Creating a brand new theme
- Editing all aspects of a theme (tokens + layout parts)
- Building theme parts (header/footer) from scratch

---

### ThemeCustomizerPage (Future - Recommended Architecture)
**Purpose**: Customize an activated theme's tokens with live preview

**Recommended Features**:
- Edit theme tokens (colors, typography, spacing) ← Focus here
- Live preview with actual header/footer injected
- Read-only header/footer (no editing, just preview)
- Auto-save with debounce
- Reset to defaults button
- No template/page creation

**Recommended Location**: `resources/js/apps/central/components/pages/ThemeCustomizerPage.tsx`

**Recommended Layout**:
```
┌─────────────────────────────────────────────────────┐
│ [Back] Theme Name              [Reset] [Save]       │
├─────────────────┬───────────────────────────────────┤
│                 │                                   │
│  TOKEN EDITOR   │      LIVE PREVIEW                 │
│  (Left Panel)   │      (Right Panel)                │
│                 │                                   │
│  Colors         │      [Header from theme part]     │
│  - Primary      │                                   │
│  - Secondary    │      Sample Page Content          │
│  - Semantic     │      Lorem ipsum...               │
│                 │                                   │
│  Typography     │      [Footer from theme part]     │
│  - Font Family  │                                   │
│  - Font Sizes   │                                   │
│                 │                                   │
│  Spacing        │                                   │
│  - Border Radius│                                   │
│  - Gaps         │                                   │
│                 │                                   │
└─────────────────┴───────────────────────────────────┘
```

**Key Differences from Builder**:
- No tab system (single split-view layout)
- No Puck editing for header/footer (read-only preview)
- No template creation/management
- Focus entirely on token customization
- Full-screen split layout (tokens left, preview right)

**Implementation Strategy**:
1. **Reuse from ThemeBuilderPage**:
   - Token state management (`themeData` state)
   - Save function structure (`themes.update(id, { theme_data })`)
   - Reset functionality (`themes.reset(id)`)
   - Token input controls (color pickers, text fields)

2. **New Components Needed**:
   - Split viewport layout (left: tokens, right: preview)
   - Token editor panels (colors, typography, spacing)
   - Live preview with theme parts injection
   - Auto-save with debounce (e.g., 500ms after change)

3. **Data Flow**:
   ```
   Load Theme → Load Theme Parts (header/footer) → Display Split View
   ↓
   User edits token → Update state → Preview updates instantly
   ↓
   Debounced auto-save → API call to update theme_data
   ↓
   ThemeProvider refreshes → All components re-render
   ```

**Recommended Route**: `/dashboard/themes/:id/customize`

**Access Point**: Add "Customize" button to ThemesPage for active theme

---

## Current Implementation Details

### ThemeBuilderPage Architecture

**File**: `resources/js/apps/central/components/pages/ThemeBuilderPage.tsx` (936 lines)

**State Management**:
```typescript
// Theme metadata
const [themeName, setThemeName] = useState('');
const [themeDescription, setThemeDescription] = useState('');
const [themePreviewImage, setThemePreviewImage] = useState('');

// Theme tokens (customizable)
const [themeData, setThemeData] = useState<Partial<ThemeData>>({
  colors: { primary, secondary, accent, neutral, semantic },
  typography: { fontFamily, fontSize, fontWeight, lineHeight },
  spacing: { '0', '4', '8', '16' },
  borderRadius: { base, full }
});

// Puck data for theme parts
const [headerData, setHeaderData] = useState<Data>({ content: [], root: {} });
const [footerData, setFooterData] = useState<Data>({ content: [], root: {} });

// Theme part IDs (for updates)
const [headerPartId, setHeaderPartId] = useState<number | null>(null);
const [footerPartId, setFooterPartId] = useState<number | null>(null);
```

**Save Flow**:
1. Validate theme name
2. Create/update theme via `themes.create()` or `themes.update(id, payload)`
3. Save header part via `themeParts.create()` or `themeParts.update(id, data)`
4. Save footer part via `themeParts.create()` or `themeParts.update(id, data)`
5. Navigate to builder page if newly created
6. Show success toast

**Token Editing** (Settings Tab):
- Color inputs: `<input type="color" />`
- Typography inputs: Text fields for font family, sizes
- Spacing inputs: Text fields for spacing values
- Updates `themeData` state on change
- Saved to database via `handleSave()`

**Puck Integration**:
- Uses `@measured/puck` for header/footer editing
- Config from `./puck-components`
- Live drag-and-drop editing
- Data stored in `headerData` and `footerData` states

---

## Backend Implementation

### ThemeController (`app/Http/Controllers/Api/ThemeController.php`)

**Key Methods**:
- `index()` - List all themes for tenant
- `store()` - Create new theme
- `show()` - Get theme by ID
- `update()` - Update theme (including `theme_data` tokens)
- `destroy()` - Delete theme
- `available()` - Get themes from disk
- `active()` - Get active theme
- `activate()` - Activate a theme (syncs from disk to DB)
- `reset()` - Reset theme to base (reloads from `base_theme`)
- `duplicate()` - Duplicate theme with new name
- `export()` - Export theme as JSON
- `templates()` - Get templates for a theme
- `activeTemplates()` - Get templates from active theme

### ThemeService (`app/Services/ThemeService.php`)

**Key Methods**:
- `syncThemesFromDisk()` - Scan `resources/js/shared/themes/` and import
- `activateTheme()` - Set theme as active, sync to DB if needed
- `resetTheme()` - Calls `$theme->resetToBase()`
- `duplicateTheme()` - Clone theme with new name/slug

### Theme Model (`app/Models/Theme.php`)

**Key Methods**:
- `resetToBase()` - Reloads theme from disk using `base_theme` reference
- `scopeForTenant()` - Filter by tenant_id
- `scopeActive()` - Get active theme

**Relationships**:
- `hasMany('templates')` - Page templates
- `hasMany('themeParts')` - Header/footer parts

---

## Implementation Status

✅ **Completed**:
- Theme database schema and migrations
- Theme model with relationships and `resetToBase()` method
- ThemeController with full CRUD + activate/reset/duplicate/export
- ThemeService with disk sync and theme management
- Full API endpoints (sync, activate, reset, duplicate, export, import, templates)
- ThemeProvider context with recursive token resolver
- useTheme hook for component consumption
- ThemesPage UI (gallery view with activate/reset/duplicate/delete/edit actions)
- **ThemeBuilderPage** - Full theme creation/editing UI with Puck integration
- Token editing in Settings tab (colors, typography, spacing)
- Theme parts (header/footer) creation and editing with Puck
- Page template management
- Theme JSON structure with components and templates
- Integration tests for theme API

🚧 **To-Do (Theme Customization)**:
- **ThemeCustomizerPage** - Dedicated UI for token editing with live preview
- Split-view layout (token editor left, preview right)

---

## CSS Generation & Styling Architecture

**Date Planned:** February 1-3, 2026  
**Status:** Planned (not started)

### Overview

Move from style tags embedded in Puck components to a proper CSS-based architecture:
- Generate base theme CSS from `theme_data` settings
- Store CSS file on disk for public delivery
- Keep customizations in database
- Link CSS in public blade template
- Components use CSS variables instead of inline color props

### Data Flow

```
theme.settings (JSON in DB)
  ↓
ThemeCssGeneratorService
  ↓ generates ↓
/storage/public/themes/{id}.css
  ↓
public-central.blade.php links:
<link rel="stylesheet" href="/storage/themes/{id}.css?v={version}">
  ↓
Components use:
style={{ background: 'var(--color-primary)' }}
```

### Theme Settings JSON Structure

```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#10b981",
    "danger": "#ef4444",
    "warning": "#f59e0b",
    "gray.50": "#f9fafb",
    "gray.900": "#111827"
  },
  "fonts": {
    "body": "Inter, sans-serif",
    "heading": "Playfair Display, serif"
  },
  "typography": {
    "fontSize.base": "1rem",
    "fontSize.lg": "1.125rem",
    "fontSize.xl": "1.25rem",
    "fontSize.2xl": "1.5rem",
    "fontWeight.normal": "400",
    "fontWeight.semibold": "600",
    "fontWeight.bold": "700",
    "lineHeight.tight": "1.2",
    "lineHeight.normal": "1.5",
    "lineHeight.relaxed": "1.75"
  },
  "spacing": {
    "sm": "0.5rem",
    "base": "1rem",
    "lg": "1.5rem",
    "xl": "2rem"
  },
  "radius": {
    "sm": "0.25rem",
    "base": "0.375rem",
    "lg": "0.5rem",
    "full": "9999px"
  }
}
```

### Generated CSS File

**Example output** (`storage/public/themes/modern.css?v=1705972800`):

```css
/* Base Theme: Modern */
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
  
  /* Typography */
  --font-body: Inter, sans-serif;
  --font-heading: Playfair Display, serif;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Spacing */
  --spacing-sm: 0.5rem;
  --spacing-base: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-base: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}

body {
  font-family: var(--font-body);
  color: var(--color-gray-900);
  background: var(--color-gray-50);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-semibold);
}
```

### Three-Phase Implementation

#### Phase 1: CSS Generator Foundation (Feb 1-3, ~4-6 hours)

**Goal**: Build core CSS generation without UI changes

**What to Build**:
1. `ThemeCssGeneratorService` - Reads `theme.settings`, generates CSS
2. Save CSS to disk: `storage/public/themes/{id}.css`
3. Cache-bust with version query param
4. Call on theme create/update/activate
5. Hook into existing Theme actions

**What to Test**:
- Unit tests: CSS generation with various settings
- Feature tests: Theme activation generates CSS file
- Manual: Visit public site, verify CSS loads

**What to Use from Existing Code**:
- Current `theme.settings` structure
- Existing theme update/activate actions
- Storage facade for file operations

**No UI Changes Yet**: Theme builder stays as-is

**Files to Create**:
```php
// app/Services/ThemeCssGeneratorService.php
class ThemeCssGeneratorService {
    public function generateAndSaveCss(Theme $theme): void
    public function getCssUrl(Theme $theme): string
    private function generateCss(array $settings): string
}

// tests/Unit/Services/ThemeCssGeneratorServiceTest.php
// tests/Feature/ThemeActivationTest.php
```

**Files to Modify**:
```php
// app/Http/Controllers/Api/ThemeController.php
// - update() method: call generator after save
// - activate() method: call generator after activation

// app/Models/Theme.php
// - getCssUrl() helper method
// - getCssVersion() for cache busting

// resources/views/public-central.blade.php
// - Add <link rel="stylesheet" href="{{ $activeTheme->getCssUrl() }}">

// resources/js/shared/puck/components/Hero.tsx
// resources/js/shared/puck/components/Card.tsx
// resources/js/shared/puck/components/Button.tsx
// resources/js/shared/puck/components/CTA.tsx
// - Replace inline colors with CSS variables
```

---

#### Phase 2: Theme Builder UI Enhancement (Feb 4-5, ~6-8 hours)

**Goal**: Make token editing easier and more visual

**What to Enhance**:
1. Replace simple text inputs with **color pickers** (react-colorful ✓ already installed)
2. Add **font family picker** (dropdown with system fonts initially)
3. Add **font weight selector** (radio buttons or dropdown)
4. Add **spacing/radius visual inputs** (sliders or preset buttons)
5. Improve Settings tab UX

**UI Examples**:
- Colors: Color picker with hex/rgba input
- Fonts: Dropdown list of web-safe fonts (+ FontBunny future)
- Font weight: 400/500/600/700 buttons
- Spacing: Input field + preset buttons (0.5, 1, 1.5, 2rem)

**No Backend Changes**: Same save flow

**Files to Modify**:
```typescript
// resources/js/apps/central/components/pages/ThemeBuilderPage.tsx
// - Refactor Settings tab to use new token inputs

// resources/js/apps/central/features/themes/components/TokenColorPicker.tsx (new)
// - Color picker wrapper with label, hex input

// resources/js/apps/central/features/themes/components/TokenFontPicker.tsx (new)
// - Font family dropdown with preview

// resources/js/apps/central/features/themes/components/TokenSpacingInput.tsx (new)
// - Input + preset buttons for spacing values

// resources/js/apps/central/features/themes/components/SettingsTab.tsx (refactored)
// - Extract Settings tab logic from ThemeBuilderPage
```

---

#### Phase 3: Advanced Features (Future)

**Goal**: Enhance customization with advanced controls

**What to Add** (not in current sprint):
1. **FontBunny Integration** - Import custom fonts from fontbunny.com
2. **Font Weight Selector** - UI for multiple font weights per font family
3. **Advanced Typography** - Line height, letter spacing controls
4. **Preset Buttons** - Quick color/spacing presets (Material, Tailwind, etc.)
5. **Import/Export** - Save/load token sets as JSON

**Status**: Design & plan, don't implement yet

---

### Implementation Order

**Phase 1 Checklist**:
1. ✅ Create feature branch: `git checkout -b feature/theme-css-architecture`
2. ✅ Write `ThemeCssGeneratorService` (read settings, generate CSS, save to disk)
3. ✅ Create unit tests for generator
4. ✅ Update `ThemeController.update()` to call generator
5. ✅ Update `ThemeController.activate()` to call generator  
6. ✅ Add `getCssUrl()` and `getCssVersion()` to Theme model
7. ✅ Update `public-central.blade.php` to link generated CSS
8. ✅ Convert 3-4 Puck components (Hero, Card, Button, CTA) to use CSS variables
9. ✅ Create feature tests for theme activation → CSS generation
10. ✅ Test: Create theme → CSS generates → Visit public site → Styles apply
11. ✅ Run all tests: `npm run test && php artisan test` (ensure 700+ pass)
12. ✅ Create PR, update CURRENT_STATUS.md, merge to main

**Phase 2 Checklist** (after Phase 1 merged):
1. ✅ Create feature branch: `git checkout -b feature/theme-builder-ui`
2. ✅ Build `TokenColorPicker` component using react-colorful
3. ✅ Build `TokenFontPicker` component
4. ✅ Build `TokenSpacingInput` component
5. ✅ Refactor Settings tab in ThemeBuilderPage
6. ✅ Add component tests for new token inputs
7. ✅ Test: Edit theme tokens → Save → CSS regenerates → Public site updates
8. ✅ Create PR, merge to main

---

### Benefits

**Phase 1 (Foundation)**:
- ✅ Valid semantic HTML (`<link>` in head, not style tags in body)
- ✅ Cacheable CSS file (fast, CDN-friendly)
- ✅ Separation of concerns (theme data in DB, CSS on disk)
- ✅ Clean public site rendering
- ✅ Components use standard CSS variables

**Phase 2 (UI)**:
- ✅ User-friendly token editing
- ✅ Visual feedback (color picker shows color)
- ✅ Less error-prone (dropdowns vs. typing hex codes)
- ✅ Better UX for non-technical users

**Phase 3 (Advanced)**:
- ✅ Professional font management (FontBunny)
- ✅ Advanced styling controls
- ✅ Better UX for users without design background
- ✅ Preset tokens for common design systems
- Auto-save with debounce for token changes
- Theme parts injection in preview (show header/footer while editing tokens)
- "Customize" button in ThemesPage for active theme
- Route: `/dashboard/themes/:id/customize`
- Dark mode theme variants
- Per-page theme overrides

---

## File Locations

**Frontend**:
- Theme context: `resources/js/shared/contexts/ThemeContext.tsx`
- useTheme hook: `resources/js/shared/hooks/useTheme.ts`
- Theme API service: `resources/js/shared/services/api/themes.ts`
- ThemesPage: `resources/js/apps/central/components/pages/ThemesPage.tsx`
- ThemeBuilderPage: `resources/js/apps/central/components/pages/ThemeBuilderPage.tsx`
- Puck components config: `resources/js/apps/central/components/pages/puck-components/index.ts`
- Theme JSON files: `resources/js/shared/themes/*/theme.json`

**Backend**:
- Theme controller: `app/Http/Controllers/Api/ThemeController.php`
- Theme service: `app/Services/ThemeService.php`
- Theme model: `app/Models/Theme.php`
- Theme migration: `database/migrations/*_create_themes_table.php`

---

_See `CURRENT_STATUS.md` and `ROADMAP.md` for broader project status._
