# Theme Placeholders Architecture - Implementation Complete

**Date:** January 30, 2026  
**Status:** ✅ Core Implementation Done, Ready for Migration & Testing

---

## What Was Built

### The Hard Wall: Complete Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                    THEME BUILDER (Editing)                      │
│          Central Admin creates theme blueprints here            │
│                                                                  │
│  Saves to: theme_placeholders table                             │
│  Columns: id, theme_id, type, content, timestamps              │
│  Structure: (type, content) pairs for header, footer, sidebars │
│                                                                  │
│  Example:                                                        │
│    type: 'header'    → content: { ... puck data ... }          │
│    type: 'footer'    → content: { ... puck data ... }          │
│    type: 'sidebar_left' → content: { ... puck data ... }       │
│                                                                  │
└──────────────────────────────────────┬──────────────────────────┘
                                       │
                                       │ Theme Activation
                                       │ (Copies placeholders)
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LIVE INSTANCES (Editing)                      │
│         Central/Tenants customize their own theme here         │
│                                                                  │
│  Saves to: theme_parts table                                    │
│  Columns: id, tenant_id, theme_id (NULL), type, puck_data_raw │
│  Created on activation: copies placeholder content              │
│                                                                  │
│  Example after activation:                                      │
│    tenant_id: 'abc123' → puck_data_raw: { ... customized ... } │
│    tenant_id: 'def456' → puck_data_raw: { ... customized ... } │
│                                                                  │
│  ✅ Blueprint UNTOUCHED                                          │
│  ✅ Each tenant has independent copy                             │
│  ✅ Edits in Customize mode don't affect other tenants         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Created/Modified

### 1. Migrations
- ✅ `2026_01_30_create_theme_placeholders_table.php`
  - Creates `theme_placeholders` table with (theme_id, type, content) structure
  - Unique constraint on (theme_id, type)
  - Supports unlimited placeholder types (header, footer, sidebar_left, sidebar_right, etc.)

- ✅ `2026_01_30_migrate_theme_parts_to_theme_placeholders.php`
  - Migrates existing blueprint theme_parts to new table
  - Deletes blueprint records from theme_parts (keeping only instances)
  - Reversible migration for rollback

### 2. Models
- ✅ `app/Models/ThemePlaceholder.php` (NEW)
  - Represents placeholder content for theme blueprints
  - `belongsTo` Theme relationship
  - Scopes: `ofType($type)`, `getAllTypes()`

- ✅ `app/Models/Theme.php` (UPDATED)
  - Added `placeholders()` relationship
  - Updated `parts()` relationship comments to clarify usage

### 3. Controllers
- ✅ `app/Http/Controllers/Api/ThemePlaceholderController.php` (NEW)
  - `index()`: Get all placeholders for a theme
  - `show()`: Get specific placeholder
  - `store()`: Save/update placeholder content
  - `destroy()`: Delete placeholder
  - Authorization: Only for system themes (blueprints)

- ✅ `app/Http/Controllers/Api/ThemeCustomizationController.php` (UPDATED)
  - `getCustomization()`: Loads from theme_parts instances (not blueprints)
  - `saveSection()`: Finds instances by (tenant_id, type), NOT (theme_id, type)
  - Prevents editing blueprints (is_system_theme check)
  - Clear separation: Blueprints (editor) vs Instances (customizer)

### 4. Services
- ✅ `app/Services/ThemeService.php` (UPDATED)
  - `cloneSystemTheme()`: Creates theme_parts instances from theme_placeholders
  - No longer copies from old theme_parts (blueprint) table
  - Uses placeholder content as source
  - Creates instances with `theme_id=NULL, tenant_id=set`

### 5. Routes
- ✅ `routes/api.php` (UPDATED)
  - Added placeholder routes under superadmin theme management
  - `/api/superadmin/themes/{theme}/placeholders` - Manage blueprint content
  - `/api/themes/{theme}/customization` - Customize instances (outside superadmin)

---

## Data Model Changes

### Before (BROKEN)
```
theme_parts table used for EVERYTHING:
├─ Blueprints: theme_id=1, tenant_id=NULL
└─ Instances: theme_id=1, tenant_id='abc123' ← SAME RECORDS EDITED BY BOTH MODES!
   Problem: Theme Builder and Customize both edit same records → contamination
```

### After (FIXED)
```
theme_placeholders table (NEW):
└─ Blueprints: theme_id=1, type='header', content={...placeholder...}
                theme_id=1, type='footer', content={...placeholder...}
                theme_id=1, type='sidebar_left', content={...placeholder...}

theme_parts table (INSTANCES ONLY):
└─ Central: tenant_id=NULL, type='header', puck_data_raw={...customized...}
            tenant_id=NULL, type='footer', puck_data_raw={...customized...}
└─ Tenant1: tenant_id='abc123', type='header', puck_data_raw={...customized...}
            tenant_id='abc123', type='footer', puck_data_raw={...customized...}
└─ Tenant2: tenant_id='def456', type='header', puck_data_raw={...customized...}
            tenant_id='def456', type='footer', puck_data_raw={...customized...}

Result: ✅ Blueprint pristine, each instance independent, no contamination
```

---

## Workflow Updates

### Theme Builder (Edit Mode)

**Before:**
```
1. Open theme in edit mode
2. Edit header/footer content
3. Save → theme_parts (theme_id=X, tenant_id=NULL)
```

**After:**
```
1. Open system theme in edit mode
2. Edit header/footer/sidebar content
3. Save → theme_placeholders (theme_id=X, type='header'/'footer'/'sidebar_left')
4. Note: Placeholders are flexible - ANY type can be added
```

**Frontend Changes Needed:**
- Update save endpoint: `/api/superadmin/themes/{id}/sections/{section}` → `/api/superadmin/themes/{id}/placeholders/{section}`
- Same request format: `{ content: puck_data }`

### Theme Activation

**Before:**
```
1. Tenant clicks "Activate"
2. Clone theme record
3. Clone theme_parts (theme_id=1, tenant_id=NULL) → (theme_id=1, tenant_id='abc123')
Problem: Both blueprint and instance point to same theme_id!
```

**After:**
```
1. Central/Tenant clicks "Activate"
2. Clone theme record (is_system_theme=false, tenant_id=set)
3. Copy theme_placeholders → new theme_parts instances
   - For each placeholder:
     type='header' → new ThemePart(tenant_id=set, type='header', puck_data_raw=placeholder.content)
   - Creates fresh instance with placeholder content
4. Now blueprint (theme_placeholders) and instance (theme_parts) are decoupled
Result: ✅ Pristine blueprint preserved, tenant gets clean copy to customize
```

### Theme Customization (Customize Mode)

**Before:**
```
1. Tenant/Central clicks "Customize"
2. Edit CSS (colors, fonts, spacing)
3. Edit content (header/footer text)
4. Save:
   - CSS → themes.header_css, footer_css
   - Content → theme_parts (SAME RECORDS AS BLUEPRINT!) ❌ CONTAMINATION
```

**After:**
```
1. Tenant/Central clicks "Customize"
2. Edit CSS (colors, fonts, spacing)
3. Edit content (header/footer text)
4. Save:
   - CSS → themes.header_css, footer_css (same as before)
   - Content → theme_parts WHERE tenant_id=current_tenant (instance only)
5. Load:
   - Get CSS from themes table
   - Get content from theme_parts WHERE tenant_id=current_tenant (NOT theme_id!)
Result: ✅ Only edits own instance, blueprint untouched
```

---

## Key Benefits

1. **Hard Wall Separation**
   - Blueprint content lives in theme_placeholders
   - Instance content lives in theme_parts
   - No cross-contamination possible

2. **Extensible Type System**
   - Add new types without schema changes
   - Current: header, footer, sidebar_left, sidebar_right
   - Future: mega_menu, product_section, testimonials, etc.

3. **Clean Data Flow**
   - Theme Builder → theme_placeholders (create placeholders)
   - Activation → theme_parts (copy placeholders)
   - Customize → theme_parts (edit instances)
   - Each mode touches different tables

4. **Authorization Built In**
   - Placeholders endpoints check `is_system_theme`
   - Customization endpoints check `tenant_id` ownership
   - Blueprint and instance data protected

5. **Future-Ready**
   - Easy to add content management interface
   - Easy to add more placeholder types
   - Easy to add version/rollback functionality

---

## Testing Checklist

### Database Migration
- [ ] Run `php artisan migrate`
- [ ] Verify theme_placeholders table created
- [ ] Verify existing blueprint theme_parts migrated to theme_placeholders
- [ ] Verify theme_parts only contains instances (tenant_id is set)

### Theme Builder
- [ ] Create new system theme
- [ ] Edit header/footer content
- [ ] Save
- [ ] Verify saved to theme_placeholders (not theme_parts)
- [ ] Edit again, verify loads correctly

### Theme Activation
- [ ] Activate theme as central (tenant_id=NULL)
- [ ] Verify theme_parts created with central's content
- [ ] Activate same theme as tenant
- [ ] Verify different theme_parts created with same blueprint content

### Theme Customization
- [ ] Customize theme as central
- [ ] Change content (text, images)
- [ ] Change CSS (colors, spacing)
- [ ] Save
- [ ] Verify:
  - Content saved to theme_parts (tenant_id=NULL)
  - CSS saved to themes table
  - Blueprint theme_placeholders UNTOUCHED

### Isolation Test
- [ ] Central customizes theme #3
  - Changes header to "CENTRAL HEADER"
  - Changes color to #FF0000
- [ ] Tenant A activates theme #3
  - Should see original placeholder: "Default Header"
  - Should see original color (not #FF0000)
- [ ] Tenant A customizes
  - Changes to "TENANT A HEADER"
- [ ] Tenant B activates theme #3
  - Should see original placeholder: "Default Header"
  - Should NOT see "TENANT A HEADER"
- [ ] Verify Theme Builder still shows original placeholder

### Edge Cases
- [ ] Create theme with no placeholders
- [ ] Activate and customize
- [ ] Delete placeholder while instances exist
- [ ] Add new placeholder type to blueprint

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Migrations | ✅ Complete | 2 migration files created |
| ThemePlaceholder Model | ✅ Complete | With relationships & scopes |
| ThemePlaceholderController | ✅ Complete | Full CRUD for placeholders |
| Routes | ✅ Complete | Placeholder & customization routes |
| ThemeService | ✅ Complete | Uses placeholders on activation |
| ThemeCustomizationController | ✅ Complete | Updated to use instances |
| Theme Model | ✅ Complete | Added placeholders relationship |
| Database Migration | ⏳ Pending | Run `php artisan migrate` |
| Frontend: Theme Builder | ⏳ Pending | Update save endpoint |
| Frontend: Customize | ⏳ Pending | Update load/save logic |
| Testing | ⏳ Pending | Manual testing checklist |

---

## Next Steps

1. **Run Migration**
   ```bash
   php artisan migrate
   ```

2. **Test Database Changes**
   - Verify theme_placeholders table
   - Verify theme_parts migration

3. **Update Frontend**
   - Theme Builder: Save to placeholders endpoint
   - Customize: Load from customization endpoint (already implemented)

4. **Manual Testing**
   - Follow testing checklist above
   - Test all scenarios (central, single tenant, multi-tenant)

5. **Documentation**
   - Update THEME_SYSTEM_ARCHITECTURE.md with new structure
   - Add examples of creating new placeholder types

---

## Rollback Plan

If critical issues found:

```bash
# Rollback migrations
php artisan migrate:rollback --step=2

# This will:
# 1. Recreate theme_parts from theme_placeholders
# 2. Drop theme_placeholders table
# 3. Restore to previous state
```

Code can be kept - if issues are data-related, rollback cleans it up. Otherwise, just revert the migration and re-run once fixed.

---

## Summary

**The Problem:** Theme Builder and Customize mode both edited the same theme_parts records, causing blueprint contamination when tenants activated themes.

**The Solution:** Introduced `theme_placeholders` table as the definitive source for blueprint content. When themes are activated, the placeholder content is COPIED to new theme_parts instances. Customize mode now edits instances only, leaving blueprints pristine.

**The Result:** 
- ✅ Blueprints protected
- ✅ Each instance independent
- ✅ No contamination possible
- ✅ Extensible type system (supports any placeholder type)
- ✅ Clean separation of concerns
