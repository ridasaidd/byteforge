# Theme Content Separation Architecture

**Status:** ✅ Critical bugs fixed, Architecture defined  
**Date:** January 29, 2026

## Overview

This document defines the proper separation between **theme structure/styling** and **tenant-specific content** to prevent tenants from accidentally modifying shared blueprint content.

---

## Three-Layer Architecture

### **Layer 1: System Theme Blueprints** (Central - Read-Only)

**Purpose:** Reusable theme templates created in Theme Builder

**Location:**
- Database: `themes` table where `tenant_id = NULL` and `is_system_theme = true`
- Database: `theme_parts` table where `theme_id = X` and `tenant_id = NULL`
- Disk: `/storage/themes/{id}/{id}_*.css` (base CSS files)

**Contains:**
- Theme structure (header/footer layout)
- Placeholder content (sample logo, menu items, text)
- Default styling (colors, typography, spacing)
- Component configuration

**Access:**
- Central admin: Full CRUD in Theme Builder
- Tenants: Read-only (activation only)

**Example:**
```php
// System theme blueprint
Theme {
  id: 1,
  tenant_id: null,
  is_system_theme: true,
  name: "Modern Store",
  theme_data: { colors, typography, spacing }
}

// Blueprint header (placeholder content)
ThemePart {
  id: 10,
  theme_id: 1,
  tenant_id: null,
  type: "header",
  puck_data_raw: {
    content: [
      { type: "Logo", props: { src: "/placeholder-logo.png" } },
      { type: "Navigation", props: { items: ["Home", "Shop", "About"] } }
    ]
  }
}
```

---

### **Layer 2: Tenant Theme Customizations** (Per-Tenant - Styling Only)

**Purpose:** Tenant-specific styling overrides (colors, fonts, spacing)

**Location:**
- Database: `themes` table where `tenant_id = UUID`
- Columns: `settings_css`, `header_css`, `footer_css` (CSS overrides)
- Column: `theme_data` (merged with blueprint)

**Contains:**
- CSS customizations (overrides base theme CSS)
- Theme token customizations (brand colors, fonts)
- NO CONTENT - only styling

**Access:**
- Tenants: Customize mode (Settings tab + CSS generation from Header/Footer)
- Changes affect only that tenant's instance

**Example:**
```php
// Tenant's customized theme
Theme {
  id: 50,
  tenant_id: "abc123",
  is_system_theme: false,
  base_theme: "1", // References system theme
  theme_data: { 
    colors: { primary: { 500: "#FF6B35" } } // Override
  },
  settings_css: ":root { --color-primary-500: #FF6B35; }",
  header_css: ".header { background: var(--color-primary-500); }",
  footer_css: null
}
```

---

### **Layer 3: Tenant Content Instances** (Per-Tenant - Actual Content)

**Purpose:** Tenant's actual header/footer/page content

**Location:**
- Database: `theme_parts` table where `tenant_id = UUID` and `theme_id = NULL`
- Initially copied from blueprint on activation
- Editable separately from themes (future: content management)

**Contains:**
- Actual logos, menu items, text, images
- Tenant-specific navigation structure
- Footer contact info, social links

**Access:**
- Tenants: Content editing interface (future feature)
- NOT editable in customize mode (read-only in current implementation)

**Example:**
```php
// Tenant's header content (copied from blueprint on activation)
ThemePart {
  id: 150,
  theme_id: null, // ✅ NULL for tenant instances
  tenant_id: "abc123",
  type: "header",
  puck_data_raw: {
    content: [
      { type: "Logo", props: { src: "/tenant-logo.png" } }, // Tenant's logo
      { type: "Navigation", props: { items: ["Products", "Services", "Contact"] } } // Tenant's menu
    ]
  }
}
```

---

## Data Flow

### **Theme Activation (Tenant selects theme)**

```
1. Tenant clicks "Activate" on system theme
   ↓
2. Backend clones system theme → tenant theme
   - Copy theme record (tenant_id = UUID)
   - Copy theme_data
   - ❌ OLD: theme_id was set
   - ✅ NEW: theme_id = NULL for tenant parts
   ↓
3. Backend clones theme_parts (blueprint → tenant)
   - Copy header/footer puck_data (placeholder → actual content slots)
   - tenant_id = UUID, theme_id = NULL
   ↓
4. Result: Tenant has independent content copy
```

### **Theme Customization (Tenant changes colors/fonts)**

```
1. Tenant clicks "Customize" button
   ↓
2. Opens ThemeBuilderPage in customize mode
   - Settings tab: Edit colors, typography, spacing
   - Header/Footer tabs: View structure (read-only for content)
   ↓
3. On Save:
   - Settings: Updates theme_data + generates settings_css
   - Header/Footer: Generates CSS from current puck_data (styling only)
   - ❌ OLD: puck_data was saved (content changes)
   - ✅ NEW: puck_data NOT saved (read-only)
   ↓
4. Result: CSS customizations stored in database
   - settings_css, header_css, footer_css columns
   - Cascades over base theme CSS files
```

### **CSS Cascade (Rendering)**

```
Public page load:
1. Load base theme CSS from disk
   - /storage/themes/1/1_variables.css
   - /storage/themes/1/1_header.css
   - /storage/themes/1/1_footer.css

2. Load customization CSS from database
   - <style>{{ $theme->settings_css }}</style>
   - <style>{{ $theme->header_css }}</style>
   - <style>{{ $theme->footer_css }}</style>

3. Render content from tenant's theme_parts
   - puck_data_raw (tenant's actual content)
```

---

## Fixed Bugs

### **Bug 1: theme_id incorrectly set for tenant instances**

**Location:** `app/Services/ThemeService.php:82`

**Problem:**
```php
// ❌ OLD - Breaking separation
ThemePart::create([
  'tenant_id' => $tenantId,
  'theme_id' => $theme->id, // Wrong!
]);
```

**Fix:**
```php
// ✅ NEW - Proper separation
ThemePart::create([
  'tenant_id' => $tenantId,
  'theme_id' => null, // Tenant instances have NULL theme_id
]);
```

**Rationale:** Per migration design, only blueprints have `theme_id` set. Tenant instances should have `theme_id = NULL` to indicate they're independent copies.

---

### **Bug 2: Customize mode allowed content editing**

**Location:** `app/Http/Controllers/Api/ThemeCustomizationController.php:96-105`

**Problem:**
```php
// ❌ OLD - Allowed content editing
if (isset($data['puck_data'])) {
  $themePart = ThemePart::where('theme_id', $theme->id)
    ->where('type', $section)
    ->first();
  $themePart->puck_data_raw = $data['puck_data'];
  $themePart->save();
}
```

**Fix:**
```php
// ✅ NEW - CSS-only customization
// Header/Footer: CSS-only customization (no content editing allowed)
// Content stays in tenant's theme_parts as copied from blueprint
```

**Rationale:** Customize mode should only affect styling (CSS + theme_data), not content. Content should be managed separately (future feature).

---

### **Bug 3: Frontend sent puck_data in customize mode**

**Location:** `resources/js/shared/components/organisms/ThemeBuilderPage.tsx:226,242`

**Problem:**
```tsx
// ❌ OLD - Sent content data
await themeCustomization.saveSection(Number(themeId), 'header', {
  css: headerCss,
  puck_data: headerDataRef.current, // Content editing!
});
```

**Fix:**
```tsx
// ✅ NEW - CSS only
await themeCustomization.saveSection(Number(themeId), 'header', {
  css: headerCss,
  // Note: puck_data NOT sent - content is read-only from blueprint
});
```

**Rationale:** Frontend should not send content data in customize mode, only CSS.

---

## Remaining Work

### **1. Warning Modal on Theme Activation** (High Priority)

**Issue:** Switching themes replaces all content without warning

**Solution:**
```tsx
// Frontend: ThemesPage.tsx
const handleActivate = (theme) => {
  if (hasExistingTheme) {
    showModal({
      title: "Replace Current Theme?",
      message: "Activating a new theme will replace your current header, footer, and page templates. This action cannot be undone.",
      confirmText: "Replace Theme",
      onConfirm: () => activateTheme(theme.id)
    });
  } else {
    activateTheme(theme.id);
  }
};
```

### **2. Content Management Interface** (Future Feature)

**Issue:** Tenants can't edit their actual content (logos, menus, text)

**Solution:** Separate content editing UI outside of themes
- Site Settings: Logo upload, site name, contact info
- Menu Builder: Navigation structure editor
- Footer Builder: Footer content editor

**Alternative:** Allow content editing in theme_parts, but clearly separate from theme customization

### **3. Theme Update/Migration** (Future Feature)

**Issue:** When system theme is updated, how to apply changes to activated instances?

**Solution:**
- Track theme version in blueprints
- Offer "Update Theme" option to tenants
- Merge structural changes while preserving content
- Require manual review for breaking changes

---

## Testing Checklist

### **Verify Content Separation:**
- [ ] Create system theme in central with placeholder content
- [ ] Activate theme in tenant
- [ ] Verify tenant gets independent copy of theme_parts (theme_id = NULL)
- [ ] Customize theme in tenant (change colors)
- [ ] Verify system theme's content is unchanged
- [ ] Verify other tenants' content is unchanged

### **Verify Customization Limits:**
- [ ] Open customize mode in tenant
- [ ] Verify Header/Footer tabs are read-only for content
- [ ] Verify only Settings tab allows changes
- [ ] Save customization
- [ ] Verify only CSS columns are updated (settings_css, header_css, footer_css)
- [ ] Verify puck_data in theme_parts is unchanged

### **Verify CSS Cascade:**
- [ ] Load public page
- [ ] Verify base CSS is loaded from disk
- [ ] Verify customization CSS is loaded from database
- [ ] Verify customization CSS overrides base CSS
- [ ] Verify content is rendered from tenant's theme_parts

---

## Schema Reference

### **themes table**
```sql
id              INT PRIMARY KEY
tenant_id       VARCHAR(255) NULL  -- NULL = system, UUID = tenant
name            VARCHAR(255)
slug            VARCHAR(255)
base_theme      VARCHAR(255) NULL  -- References system theme folder
theme_data      JSON               -- Colors, typography, spacing
is_active       BOOLEAN
is_system_theme BOOLEAN            -- TRUE for blueprints
settings_css    LONGTEXT NULL      -- Customization CSS
header_css      LONGTEXT NULL      -- Customization CSS
footer_css      LONGTEXT NULL      -- Customization CSS
```

### **theme_parts table**
```sql
id                  INT PRIMARY KEY
tenant_id           VARCHAR(255) NULL  -- NULL = blueprint, UUID = tenant
theme_id            BIGINT NULL        -- NOT NULL = blueprint, NULL = tenant instance
type                ENUM('header', 'footer', ...)
puck_data_raw       JSON               -- Structure + content
puck_data_compiled  JSON
```

**Key Distinction:**
- **Blueprints:** `theme_id` set, `tenant_id` NULL
- **Tenant Instances:** `theme_id` NULL, `tenant_id` set

---

## Migration Notes

**Existing tenants may have incorrect data from old bugs:**

1. **Fix theme_id in existing tenant theme_parts:**
```sql
-- Set theme_id to NULL for all tenant instances
UPDATE theme_parts
SET theme_id = NULL
WHERE tenant_id IS NOT NULL;
```

2. **Clear customization puck_data (if any were saved incorrectly):**
   - No action needed - puck_data is in theme_parts, not affected by bug

---

## Conclusion

The three-layer architecture ensures:
✅ System themes remain reusable templates  
✅ Tenant customizations only affect styling  
✅ Tenant content is independent and editable (future)  
✅ No cross-tenant content contamination
