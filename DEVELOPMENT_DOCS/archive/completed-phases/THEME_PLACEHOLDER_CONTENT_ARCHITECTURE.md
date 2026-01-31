# Theme Placeholder Content Architecture - Audit & Implementation Plan

**Date:** January 30, 2026  
**Issue:** Theme Builder and Customize mode edit the same theme_parts, causing contamination  
**Root Cause:** Blueprint placeholder content stored in theme_parts table alongside tenant instances

---

## Current State (BROKEN)

### Data Flow
```
Theme Builder (Create Blueprint):
  ↓
  Saves to theme_parts (theme_id=X, tenant_id=NULL)
  ↓
Customize Mode (Edit Blueprint):
  ↓
  Edits SAME theme_parts ❌ CONTAMINATION
  ↓
Tenant Activates:
  ↓
  Clones contaminated theme_parts to tenant instance
  ↓
  Tenant gets modified blueprint instead of pristine placeholder
```

### Current Schema

**themes table:**
- `id`, `tenant_id`, `name`, `slug`, `theme_data`, `is_system_theme`, `is_active`
- `settings_css`, `header_css`, `footer_css` (customization CSS)

**theme_parts table:**
- `id`, `tenant_id`, `theme_id`, `type`, `puck_data_raw`, `puck_data_compiled`
- **Problem:** Used for BOTH blueprints AND instances

### Current Code Paths

**Theme Builder Save (Header/Footer):**
- `ThemePartController::store()` / `::update()`
- Saves to `theme_parts` with `theme_id = X`, `tenant_id = NULL`
- CSS saved to disk via `ThemeCssController::saveSection()`

**Customize Mode Save (Header/Footer):**
- `ThemeCustomizationController::saveSection()`
- Finds `theme_parts` where `theme_id = X`, `type = header/footer`
- Updates `puck_data_raw` → **CONTAMINATES BLUEPRINT**
- Generates CSS → saves to `themes.header_css`, `themes.footer_css`

**Activation:**
- `ThemeService::cloneSystemTheme()`
- Clones `theme_parts` where `theme_id = X` 
- Creates new records with `theme_id = NULL`, `tenant_id = UUID`

---

## Target State (FIXED)

### New Data Flow
```
Theme Builder (Create Blueprint):
  ↓
  Saves placeholder content to THEMES table
  (header_placeholder, footer_placeholder columns)
  ↓
  NO theme_parts created for blueprints
  ↓
Activation (Central or Tenant):
  ↓
  Copies placeholder JSON → new theme_parts
  (theme_id = NULL, tenant_id = central/UUID)
  ↓
Customize Mode:
  ↓
  Edits theme_parts instances ONLY
  ↓
  Blueprint placeholders remain pristine ✅
```

### New Schema

**themes table - ADD columns:**
```php
$table->json('header_placeholder')->nullable(); // Placeholder header content
$table->json('footer_placeholder')->nullable(); // Placeholder footer content
```

**theme_parts table - NO CHANGES**
- Exists ONLY for instances (tenant_id is always set after activation)
- `theme_id` column will become deprecated (always NULL for instances)

### Page Templates

**page_templates table - NO CHANGES NEEDED**
- Already has `theme_id` linking templates to themes
- Placeholder content already in `puck_data` column
- When user creates page from template, content is copied (existing behavior)

---

## Implementation Plan

### Phase 1: Schema Migration

**File:** `database/migrations/2026_01_30_add_placeholder_content_to_themes.php`

```php
public function up()
{
    Schema::table('themes', function (Blueprint $table) {
        $table->json('header_placeholder')->nullable()->after('footer_css');
        $table->json('footer_placeholder')->nullable()->after('header_placeholder');
    });
}
```

**Data Migration:**
```php
// Move existing blueprint theme_parts to new placeholder columns
DB::transaction(function () {
    $blueprintThemes = Theme::whereNull('tenant_id')
        ->where('is_system_theme', true)
        ->get();
    
    foreach ($blueprintThemes as $theme) {
        // Move header
        $headerPart = ThemePart::where('theme_id', $theme->id)
            ->where('type', 'header')
            ->whereNull('tenant_id')
            ->first();
        if ($headerPart) {
            $theme->header_placeholder = $headerPart->puck_data_raw;
        }
        
        // Move footer
        $footerPart = ThemePart::where('theme_id', $theme->id)
            ->where('type', 'footer')
            ->whereNull('tenant_id')
            ->first();
        if ($footerPart) {
            $theme->footer_placeholder = $footerPart->puck_data_raw;
        }
        
        $theme->save();
    }
    
    // Delete blueprint theme_parts (now redundant)
    ThemePart::whereNotNull('theme_id')
        ->whereNull('tenant_id')
        ->delete();
});
```

### Phase 2: Update Theme Builder

**File:** `app/Http/Controllers/Api/ThemeCssController.php`

Add new method to save header/footer placeholder content:

```php
/**
 * Save header/footer placeholder content for blueprint theme
 * POST /api/superadmin/themes/{id}/placeholder/{section}
 */
public function savePlaceholder(Request $request, Theme $theme, string $section): JsonResponse
{
    // Validate section
    if (!in_array($section, ['header', 'footer'])) {
        return response()->json(['message' => 'Invalid section'], 422);
    }
    
    // Only allow for system themes
    if (!$theme->is_system_theme || $theme->tenant_id !== null) {
        return response()->json(['message' => 'Can only update placeholders on system themes'], 403);
    }
    
    $validated = $request->validate([
        'puck_data' => 'required|array',
    ]);
    
    $column = "{$section}_placeholder";
    $theme->$column = $validated['puck_data'];
    $theme->save();
    
    return response()->json(['success' => true]);
}
```

**File:** `resources/js/shared/components/organisms/ThemeBuilderPage.tsx`

Update save logic (around line 160-180):

```typescript
// Save header section
if (headerDataRef.current && ...) {
  // Save CSS to disk (existing)
  await themeCss.saveSection(...);
  
  // Save placeholder content to themes table (NEW)
  if (mode === 'edit' && themeData.is_system_theme) {
    await api.post(`/api/superadmin/themes/${themeId}/placeholder/header`, {
      puck_data: headerDataRef.current
    });
  }
}
```

### Phase 3: Update Activation Logic

**File:** `app/Services/ThemeService.php`

Update `cloneSystemTheme()` method:

```php
public function cloneSystemTheme(Theme $systemTheme, ?string $tenantId): Theme
{
    // Clone theme record (existing code)
    $clonedTheme = $systemTheme->replicate();
    $clonedTheme->tenant_id = $tenantId;
    $clonedTheme->is_system_theme = false;
    $clonedTheme->is_active = false;
    $clonedTheme->save();
    
    // NEW: Create theme_parts from placeholder columns
    if ($systemTheme->header_placeholder) {
        ThemePart::create([
            'tenant_id' => $tenantId,
            'theme_id' => null, // Instance, not blueprint
            'type' => 'header',
            'name' => $clonedTheme->name . ' Header',
            'slug' => $clonedTheme->slug . '-header',
            'puck_data_raw' => $systemTheme->header_placeholder,
            'status' => 'published',
            'created_by' => auth()->id(),
        ]);
    }
    
    if ($systemTheme->footer_placeholder) {
        ThemePart::create([
            'tenant_id' => $tenantId,
            'theme_id' => null,
            'type' => 'footer',
            'name' => $clonedTheme->name . ' Footer',
            'slug' => $clonedTheme->slug . '-footer',
            'puck_data_raw' => $systemTheme->footer_placeholder,
            'status' => 'published',
            'created_by' => auth()->id(),
        ]);
    }
    
    // Clone page templates (existing code)
    // ...
    
    return $clonedTheme;
}
```

### Phase 4: Update Customize Mode

**File:** `app/Http/Controllers/Api/ThemeCustomizationController.php`

Update to find theme_parts by tenant_id instead of theme_id:

```php
public function saveSection(Request $request, Theme $theme, string $section)
{
    // ... existing validation ...
    
    // Header/Footer sections: update theme_part content (puck_data)
    if (in_array($section, ['header', 'footer']) && isset($data['puck_data'])) {
        // Find theme_part for this INSTANCE (not blueprint)
        $themePart = ThemePart::where('tenant_id', $theme->tenant_id)
            ->where('type', $section)
            ->first();
        
        if ($themePart) {
            $themePart->puck_data_raw = $data['puck_data'];
            $themePart->save();
        } else {
            // Create if doesn't exist (edge case)
            ThemePart::create([
                'tenant_id' => $theme->tenant_id,
                'theme_id' => null,
                'type' => $section,
                'name' => $theme->name . ' ' . ucfirst($section),
                'slug' => $theme->slug . '-' . $section,
                'puck_data_raw' => $data['puck_data'],
                'status' => 'published',
                'created_by' => auth()->id(),
            ]);
        }
    }
    
    // Save theme
    $theme->save();
    
    return response()->json(['message' => 'Saved successfully']);
}
```

**File:** `app/Http/Controllers/Api/ThemeCustomizationController.php` - getCustomization()

Update to load from theme_parts (instance) instead of blueprint:

```php
public function getCustomization(Theme $theme)
{
    $this->authorizeThemeAccess($theme);
    
    // Load header/footer content from theme_parts (instance)
    $headerPart = ThemePart::where('tenant_id', $theme->tenant_id)
        ->where('type', 'header')
        ->first();
    
    $footerPart = ThemePart::where('tenant_id', $theme->tenant_id)
        ->where('type', 'footer')
        ->first();
    
    return response()->json([
        'data' => [
            'settings_css' => $theme->settings_css,
            'header_css' => $theme->header_css,
            'footer_css' => $theme->footer_css,
            'header_data' => $headerPart?->puck_data_raw,
            'footer_data' => $footerPart?->puck_data_raw,
        ],
    ]);
}
```

### Phase 5: Frontend Updates

**Load placeholder content in Theme Builder (edit mode):**

```typescript
// When loading theme in edit mode
const loadTheme = async () => {
  const response = await api.get(`/themes/${id}`);
  const theme = response.data.data;
  
  if (mode === 'edit' && theme.is_system_theme) {
    // Load placeholder content from theme columns
    setHeaderData(theme.header_placeholder || { content: [], root: {} });
    setFooterData(theme.footer_placeholder || { content: [], root: {} });
  }
}
```

**Load instance content in Customize mode:**

```typescript
// When loading theme in customize mode
const loadCustomization = async () => {
  const response = await themeCustomization.getCustomization(id);
  const data = response.data.data;
  
  // Load from theme_parts (instance)
  setHeaderData(data.header_data || { content: [], root: {} });
  setFooterData(data.footer_data || { content: [], root: {} });
}
```

---

## Testing Plan

### 1. Test Blueprint Creation
- Create new theme in Theme Builder
- Add header/footer content
- Save
- Verify `header_placeholder`, `footer_placeholder` columns populated
- Verify NO theme_parts created with theme_id set

### 2. Test Activation
- Activate blueprint theme as central
- Verify theme_parts created with tenant_id=NULL, theme_id=NULL
- Verify content matches placeholder

### 3. Test Customization Isolation
- Customize activated theme (change header text, colors)
- Verify changes saved to theme_parts instance
- Open Theme Builder → verify blueprint unchanged
- Activate same blueprint as different tenant
- Verify tenant gets pristine placeholder, not customized version

### 4. Test Page Templates
- Verify page templates still work (should be unaffected)
- Create page from template
- Verify content copied correctly

---

## Files to Modify

### Backend
1. ✅ `database/migrations/2026_01_30_add_placeholder_content_to_themes.php` (CREATE)
2. ✅ `app/Models/Theme.php` (add fillable columns)
3. ✅ `app/Http/Controllers/Api/ThemeCssController.php` (add savePlaceholder method)
4. ✅ `app/Services/ThemeService.php` (update cloneSystemTheme)
5. ✅ `app/Http/Controllers/Api/ThemeCustomizationController.php` (update saveSection, getCustomization)

### Frontend
6. ✅ `resources/js/shared/components/organisms/ThemeBuilderPage.tsx` (update save/load logic)
7. ✅ `resources/js/shared/services/api/themeCss.ts` (add savePlaceholder method if needed)
8. ✅ `resources/js/shared/services/api/themeCustomization.ts` (update getCustomization response)

### Documentation
9. ✅ Update `DEVELOPMENT_DOCS/THEME_CONTENT_SEPARATION_ARCHITECTURE.md`

---

## Rollback Plan

If issues arise, can rollback migration:

```php
public function down()
{
    // Recreate theme_parts from placeholder columns
    DB::transaction(function () {
        $themes = Theme::whereNotNull('header_placeholder')
            ->orWhereNotNull('footer_placeholder')
            ->get();
        
        foreach ($themes as $theme) {
            if ($theme->header_placeholder) {
                ThemePart::create([
                    'theme_id' => $theme->id,
                    'tenant_id' => null,
                    'type' => 'header',
                    'puck_data_raw' => $theme->header_placeholder,
                    // ... other fields
                ]);
            }
            // Similar for footer
        }
    });
    
    Schema::table('themes', function (Blueprint $table) {
        $table->dropColumn(['header_placeholder', 'footer_placeholder']);
    });
}
```

---

## Summary

**Problem:** Theme Builder and Customize mode contaminate each other by editing the same theme_parts records.

**Solution:** Store blueprint placeholder content in themes table columns, create theme_parts only on activation.

**Benefits:**
- ✅ Pristine blueprints preserved
- ✅ Clear separation between template and instance
- ✅ Consistent with page template pattern (content copied on use)
- ✅ Easier to understand data model

**Risks:**
- Migration complexity (moving existing data)
- Breaking changes to frontend code
- Need thorough testing of activation flow

**Estimated Effort:** 3-4 hours implementation + 2 hours testing
