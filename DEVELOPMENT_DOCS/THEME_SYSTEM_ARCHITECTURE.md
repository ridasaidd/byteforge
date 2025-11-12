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

## Implementation Status

✅ **Completed**:
- Theme database schema and migrations
- Theme model with relationships
- ThemeController and ThemeService
- Full API endpoints (sync, activate, reset, duplicate, export, import, templates)
- ThemeProvider context with recursive token resolver
- useTheme hook
- ThemesPage UI (gallery view with activate/reset/duplicate/delete actions)
- Theme JSON structure with components and templates
- Integration tests for theme API

🚧 **To-Do**:
- Visual theme customizer UI (color picker, typography editor)
- Live preview of theme changes
- Dark mode variants
- Per-page theme overrides

---

_See `CURRENT_STATUS.md` and `ROADMAP.md` for broader project status._
