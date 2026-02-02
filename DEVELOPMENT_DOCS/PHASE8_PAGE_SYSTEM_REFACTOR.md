# Phase 8: Page System Refactor

## Overview

Refactor the page creation/editing system to integrate seamlessly with the new Theme System (Phase 6/7). This phase simplifies page management by leveraging theme placeholders for header/footer and page templates created in the Theme Builder.

**Last Updated:** February 2, 2026  
**Status:** PLANNING

---

## Current State Analysis

### Page Creation (PagesPage.tsx - Central)
**Current Flow:**
1. **Create from Scratch** - Empty page, works fine
2. **Use Theme Template** - Fetches from `themes.getActiveTemplates()` → queries `page_templates` table
3. **Import from Saved** - Shows "Coming soon" (disabled)

**Issues:**
- ❌ "Import from Saved" is not needed
- ❌ `themes.getActiveTemplates()` endpoint exists but templates may not be properly created in Theme Builder
- ❌ Page type field (`home`, `about`, `contact`, etc.) may be redundant with `is_homepage` checkbox

### Page Creation (PagesPage.tsx - Tenant)
**Current Flow:**
- Simple FormModal with basic fields
- No template selection at all
- No PageCreationWizard integration

**Issues:**
- ❌ Tenant app doesn't use PageCreationWizard, should be unified

### Page Editing (TabbedFormModal in PagesPage.tsx)
**Current Tabs:**
1. **General** - title, slug, page_type, status
2. **Layout & Parts** - layout_id, header_id, footer_id
3. **SEO** - meta_title, meta_description, meta_keywords

**Issues:**
- ❌ `page_type` dropdown but no `is_homepage` checkbox in edit modal
- ❌ **Layout & Parts tab may be obsolete** - New theme system uses theme_placeholders/theme_parts for header/footer
- ❌ SEO is basic, but acceptable for now

### PageEditorPage (Puck Editor)
**Current State:**
- Loads page's `puck_data` and renders in Puck editor
- Uses basic `config` from `puck-components`
- **No header/footer preview** - Editor shows only page content

**Issues:**
- ❌ No visual context of header/footer when editing
- ❌ Doesn't inject theme CSS (uses preview-reset.css instead)

---

## Proposed Changes

### Phase 8.1: Clean Up Page Creation Wizard

**Goal:** Simplify wizard, remove unused features, fix template integration

#### Changes:
1. **Remove "Import from Saved" option** entirely
2. **Fix "Use Theme Template"** to properly list templates from active theme
3. **Consolidate page_type and is_homepage logic**:
   - Keep `is_homepage` checkbox (functional)
   - Keep `page_type` field but make it informational/optional (for filtering/organization)
   - When `is_homepage` is checked, auto-set page_type to 'home'

#### Files to Modify:
- `resources/js/shared/components/organisms/PageCreationWizard.tsx`
- `resources/js/apps/central/components/pages/PagesPage.tsx`

---

### Phase 8.2: Update Edit Page Modal

**Goal:** Fix UX inconsistencies, remove obsolete fields

#### Changes:
1. **Add `is_homepage` checkbox** to General tab (currently missing in edit modal)
2. **Remove Layout & Parts tab** - With new theme system:
   - Header/footer come from active theme's theme_parts (per scope)
   - Pages don't need layout_id, header_id, footer_id
   - Simplifies UX significantly
3. **Keep SEO tab** as-is (defer advanced features to later)

#### Files to Modify:
- `resources/js/apps/central/components/pages/PagesPage.tsx`
- `resources/js/shared/services/api/types.ts` (Page interface)
- `app/Http/Controllers/Api/PageController.php` (optional cleanup)

---

### Phase 8.3: Inject Header/Footer in Page Editor

**Goal:** Show header/footer from theme_parts as read-only context when editing pages

#### Implementation Strategy:
1. **Create a wrapper component** that renders:
   - Header (from theme_parts, read-only, greyed out/locked)
   - Page content (editable Puck area)
   - Footer (from theme_parts, read-only, greyed out/locked)

2. **Fetch active theme's header/footer** on page load:
   - Use `themeCustomization.getCustomization(themeId)` API
   - Or create new endpoint: `GET /api/themes/active/parts`

3. **Render header/footer as static HTML** above/below Puck editor:
   - Style with reduced opacity or border
   - Add "Click to edit header" link to Theme Customizer
   - Not editable within PageEditor

#### Alternative: Use Puck Zones
- Puck supports "zones" for different regions
- Could use locked zones for header/footer
- More complex but more integrated

#### Files to Create/Modify:
- `resources/js/apps/central/components/pages/PageEditorPage.tsx`
- New: `resources/js/shared/hooks/useActiveThemeParts.ts` (optional)
- Backend: New endpoint or reuse `themeCustomization.getCustomization()`

---

### Phase 8.4: Inject Theme CSS in Page Editor

**Goal:** Page editor preview should match storefront rendering

#### Changes:
1. **Load theme CSS** in PageEditorPage similar to ThemeBuilderPage
2. **Use `useEditorCssLoader` hook** with active theme ID
3. **Remove or adjust preview-reset.css** if it conflicts

#### Files to Modify:
- `resources/js/apps/central/components/pages/PageEditorPage.tsx`
- May need to add ThemeProvider context

---

### Phase 8.5: Unify Central and Tenant Page Creation

**Goal:** Both apps use the same PageCreationWizard

#### Changes:
1. **Update tenant PagesPage** to use PageCreationWizard
2. **Ensure templates work for tenant context**:
   - Templates from active theme should be available
   - page_templates table has tenant_id support

#### Files to Modify:
- `resources/js/apps/tenant/components/pages/PagesPage.tsx`

---

### Phase 8.6: Clean Up Backend (Optional)

**Goal:** Remove unused layout/parts fields if deemed obsolete

#### Considerations:
- `layout_id`, `header_id`, `footer_id` on pages table
- May want to keep for backward compatibility
- Or migrate existing pages to use theme-based header/footer

#### Decision Needed:
- [ ] Keep fields but ignore in UI (safe)
- [ ] Remove fields and migrate data (breaking change)

---

## Implementation Order

```
Phase 8.1: Clean Up Page Creation Wizard
├── Remove "Import from Saved" option
├── Fix template listing from active theme
└── Consolidate page_type/is_homepage logic

Phase 8.2: Update Edit Page Modal
├── Add is_homepage checkbox to General tab
├── Remove Layout & Parts tab
└── Keep SEO tab

Phase 8.3: Inject Header/Footer in Page Editor
├── Fetch active theme parts on page load
├── Render header/footer as static context
└── Add link to Theme Customizer

Phase 8.4: Inject Theme CSS in Page Editor
├── Add useEditorCssLoader hook
└── Wrap with ThemeProvider context

Phase 8.5: Unify Central and Tenant Page Creation
├── Update tenant PagesPage
└── Use shared PageCreationWizard

Phase 8.6: Clean Up Backend (Optional)
└── Decide on layout/parts fields
```

---

## Detailed Task Breakdown

### Phase 8.1 Tasks

| Task | File | Description |
|------|------|-------------|
| 8.1.1 | PageCreationWizard.tsx | Remove "Import from Saved" card and state |
| 8.1.2 | PageCreationWizard.tsx | Add is_homepage auto-set when page_type='home' |
| 8.1.3 | PagesPage.tsx (central) | Verify templates query works |
| 8.1.4 | - | Test template selection creates page with content |

### Phase 8.2 Tasks

| Task | File | Description |
|------|------|-------------|
| 8.2.1 | PagesPage.tsx (central) | Add is_homepage checkbox to edit modal |
| 8.2.2 | PagesPage.tsx (central) | Remove Layout & Parts tab from getFormTabs() |
| 8.2.3 | pageSchema | Remove layout_id, header_id, footer_id validation |
| 8.2.4 | - | Test editing page without layout/parts |

### Phase 8.3 Tasks

| Task | File | Description |
|------|------|-------------|
| 8.3.1 | PageEditorPage.tsx | Fetch active theme and its parts |
| 8.3.2 | PageEditorPage.tsx | Render header above Puck (static) |
| 8.3.3 | PageEditorPage.tsx | Render footer below Puck (static) |
| 8.3.4 | PageEditorPage.tsx | Style as read-only context |
| 8.3.5 | - | Add "Edit in Theme Customizer" link |

### Phase 8.4 Tasks

| Task | File | Description |
|------|------|-------------|
| 8.4.1 | PageEditorPage.tsx | Import and use useEditorCssLoader |
| 8.4.2 | PageEditorPage.tsx | Wrap with ThemeProvider |
| 8.4.3 | - | Test CSS rendering matches storefront |

### Phase 8.5 Tasks

| Task | File | Description |
|------|------|-------------|
| 8.5.1 | PagesPage.tsx (tenant) | Import PageCreationWizard |
| 8.5.2 | PagesPage.tsx (tenant) | Fetch templates for tenant |
| 8.5.3 | PagesPage.tsx (tenant) | Replace FormModal with wizard |
| 8.5.4 | - | Test tenant page creation with templates |

---

## Architecture Decisions

### Why Remove Layout & Parts Tab?

**Old System (Before Phase 6):**
- Pages could select individual layouts with header/footer
- Each page could override header/footer
- Complex, confusing UX

**New System (Phase 6+):**
- Active theme defines header/footer in theme_placeholders (blueprints)
- Customizations stored in theme_parts per scope (central/tenant)
- All pages in a scope share the same header/footer
- Much simpler: "Edit your header/footer in Theme Customizer"

**Benefits:**
- ✅ Simpler page creation/editing UX
- ✅ Consistent header/footer across all pages
- ✅ One place to edit header/footer
- ✅ Fewer database fields/queries

### Why Keep page_type Field?

While `is_homepage` handles the homepage case, `page_type` is still useful for:
1. **Filtering** - "Show all service pages"
2. **Analytics** - "How many contact pages do we have?"
3. **SEO defaults** - Different defaults per type
4. **Future features** - Type-specific components or behaviors

**Decision:** Keep as optional/informational field, not required.

---

## Open Questions

1. **Should we add templates to Theme Builder UI?**
   - Currently templates are in page_templates table
   - Theme Builder has Templates tab but may not be fully connected
   - Need to verify template creation workflow

2. **Mobile header/footer in Page Editor?**
   - Desktop view is priority
   - Mobile preview through viewport switcher shows header/footer differently?

3. **Performance of header/footer in editor?**
   - Loading header/footer adds API call
   - Could cache in context
   - Consider lazy loading after page content

---

## Testing Requirements

### Unit Tests
- [ ] PageCreationWizard without "Import from Saved"
- [ ] Page creation with template content
- [ ] Page editing without layout/parts

### Integration Tests
- [ ] Theme template selection populates page content
- [ ] Header/footer display in Page Editor
- [ ] Theme CSS applies in Page Editor

### E2E Tests (Manual)
- [ ] Create page from scratch - verify in storefront
- [ ] Create page from template - verify content matches
- [ ] Edit page - verify changes persist
- [ ] Header/footer visible in editor context

---

## Files Summary

**Modify:**
- `resources/js/shared/components/organisms/PageCreationWizard.tsx`
- `resources/js/apps/central/components/pages/PagesPage.tsx`
- `resources/js/apps/central/components/pages/PageEditorPage.tsx`
- `resources/js/apps/tenant/components/pages/PagesPage.tsx`

**May Modify:**
- `resources/js/shared/services/api/types.ts`
- `app/Http/Controllers/Api/PageController.php`

**Reference (No Changes):**
- `resources/js/shared/components/organisms/ThemeBuilderPage.tsx`
- `resources/js/shared/services/api/themes.ts`
- `resources/js/shared/services/api/pageTemplates.ts`

---

## Migration Notes

### Existing Pages
- Pages with layout_id/header_id/footer_id set will continue to work
- Storefront rendering should fall back to theme parts if page parts are null
- No data migration required initially

### Future Cleanup
- Could add migration to set layout_id/header_id/footer_id to NULL
- Or keep as-is for backward compatibility
