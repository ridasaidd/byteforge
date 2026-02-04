# Navigation Component in Theme Builder - Analysis & Recommendations

## Overview

This document analyzes the current navigation system's limitations when building theme templates and proposes solutions for enabling realistic navigation previews during theme creation.

**Date:** February 3, 2026  
**Status:** Planning - Not Implemented  
**Priority:** Medium (Quality of Life improvement for theme creators)

---

## Current Architecture

### How Navigation Works Today

**Data Flow:**
```
NavigationsPage → Create navigation → navigations table (tenant-specific)
→ Navigation component uses navigationId → Renders menu
```

**Navigation Component** (`resources/js/shared/puck/components/navigation/Navigation.tsx`):
- Uses `navigationId` field (Puck external field)
- Fetches from `navigations.list({ status: 'published' })`
- Expects real navigation data from database
- **Works perfectly for live sites**

**PuckCompilerService** (`app/Services/PuckCompilerService.php`):
- `embedNavigationData()` - Embeds full navigation into compiled output
- `gatherMetadata()` - Provides navigations in metadata for instant render
- **Works perfectly for published pages**

---

## The Problem

### When Building Theme Templates

**Scenario:** Creating a header template with navigation in Theme Builder

**Issue:** Navigation dropdown shows "No navigations available"

**Why?**
1. Templates are for ALL tenants (central scope)
2. Navigations are tenant-specific data
3. Chicken/egg problem: Can't preview navigation without creating one first
4. Creating dummy navigation pollutes navigation list

### Three Broken Scenarios

#### 1. Creating Theme Templates
```typescript
// Theme Builder → Templates tab → Add Navigation component
// Result: Empty dropdown, no preview of how navigation will look
```

#### 2. Installing Theme on New Tenant
```typescript
// Template has navigationId: 5
// Tenant doesn't have navigation with ID 5
// Result: Navigation component renders empty/broken
```

#### 3. Sharing Themes Across Tenants
```typescript
// Central creates theme with "Main Menu" (ID: 5)
// Tenant installs theme
// Tenant's "Main Menu" has ID: 12
// Result: ID mismatch → broken navigation
```

---

## Proposed Solutions

### ✅ **Option 1: Placeholder/Mock Navigation (Recommended)**

**Concept:** Navigation component supports "placeholder mode" for theme templates

#### Implementation

**New Field in Navigation Component:**
```typescript
export interface NavigationProps {
  // Existing fields...
  navigationId?: number;
  
  // NEW: Placeholder items for theme templates
  placeholderItems?: MenuItem[];
}
```

**Usage in Theme Template:**
```typescript
<Navigation 
  placeholderItems={[
    { label: 'Home', url: '/', type: 'internal' },
    { label: 'About', url: '/about', type: 'internal' },
    { 
      label: 'Services', 
      url: '/services', 
      type: 'internal',
      children: [
        { label: 'Web Design', url: '/services/web-design', type: 'internal' },
        { label: 'Development', url: '/services/development', type: 'internal' }
      ]
    },
    { label: 'Contact', url: '/contact', type: 'internal' }
  ]}
/>
```

**Rendering Logic:**
```typescript
// In NavigationRenderer component
const menuItems = useMemo(() => {
  // 1. If real navigation exists, use it
  if (navigation?.items) {
    return navigation.items;
  }
  
  // 2. Fall back to placeholder (theme templates)
  if (placeholderItems?.length) {
    return placeholderItems;
  }
  
  // 3. Ultimate fallback (show something sensible)
  return [
    { id: '1', label: 'Home', url: '#', type: 'internal' },
    { id: '2', label: 'About', url: '#', type: 'internal' },
    { id: '3', label: 'Services', url: '#', type: 'internal' },
    { id: '4', label: 'Contact', url: '#', type: 'internal' }
  ];
}, [navigation, placeholderItems]);
```

#### Benefits
- ✅ Theme templates show realistic navigation preview
- ✅ Works without database navigations
- ✅ Template creators see exactly how navigation looks
- ✅ Portable across tenants
- ✅ No database changes needed
- ✅ Backwards compatible (existing navigations still work)

#### Puck Field Configuration
```typescript
// Add to Navigation component fields
placeholderItems: {
  type: 'array',
  label: 'Placeholder Menu Items',
  helperText: 'Used in theme templates when no navigation is selected',
  arrayFields: {
    label: { 
      type: 'text',
      label: 'Label',
    },
    url: { 
      type: 'text',
      label: 'URL',
    },
    type: { 
      type: 'radio',
      label: 'Link Type',
      options: [
        { label: 'Internal', value: 'internal' },
        { label: 'External', value: 'external' },
      ],
    },
    children: {
      type: 'array',
      label: 'Submenu Items',
      arrayFields: {
        label: { type: 'text' },
        url: { type: 'text' },
        type: { type: 'radio', options: [...] },
      }
    }
  }
}
```

---

### **Option 2: Navigation Template System**

**Concept:** Navigations can be marked as "template" (not tenant-specific)

#### Database Schema Addition
```php
// Migration: add to navigations table
Schema::table('navigations', function (Blueprint $table) {
    $table->boolean('is_template')->default(false);
    $table->string('template_slug')->nullable()->unique();
});
```

#### Usage in Theme
```typescript
<Navigation 
  templateSlug="main-menu"  // Semantic identifier instead of ID
/>
```

#### Theme Installation Process
```php
// When tenant activates theme
public function installThemeNavigations(Theme $theme, Tenant $tenant)
{
    $templateNavigations = Navigation::where('is_template', true)
        ->whereIn('template_slug', $theme->getRequiredNavigationSlugs())
        ->get();
    
    foreach ($templateNavigations as $template) {
        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => $template->name,
            'slug' => $template->template_slug,
            'items' => $template->items, // Copy structure
            'status' => 'published',
        ]);
    }
}
```

#### Benefits
- ✅ Semantic naming ("main-menu" vs "navigationId: 5")
- ✅ Auto-creates navigations for new tenants
- ✅ Maintains structure across tenants
- ✅ Navigation becomes part of theme definition

#### Drawbacks
- ❌ More complex implementation
- ❌ Requires theme installation logic
- ❌ Database migration needed
- ❌ Backwards compatibility concerns

---

### **Option 3: Hybrid Approach (Best of Both Worlds)**

**Concept:** Combine placeholder data with smart slug-based fallback

#### Component Props
```typescript
<Navigation 
  navigationSlug="main-menu"    // Semantic identifier
  placeholderItems={[...]}       // Shown in theme builder & fallback
/>
```

#### Rendering Logic
```typescript
const resolveNavigation = () => {
  // 1. In Theme Builder → always show placeholder
  if (isThemeBuilder) {
    return placeholderItems ?? defaultPlaceholder;
  }
  
  // 2. On live site → try to fetch by slug
  if (navigationSlug) {
    const nav = await navigations.getBySlug(navigationSlug);
    if (nav) return nav.items;
  }
  
  // 3. Fallback to placeholder
  return placeholderItems ?? defaultPlaceholder;
};
```

#### Theme Installation
```php
// Automated navigation creation
foreach ($theme->getNavigationComponents() as $navComponent) {
    if (!Navigation::where('slug', $navComponent->slug)->exists()) {
        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => ucwords(str_replace('-', ' ', $navComponent->slug)),
            'slug' => $navComponent->slug,
            'items' => $navComponent->placeholderItems,
            'status' => 'published',
        ]);
    }
}
```

---

## Recommendation: Phased Approach

### **Phase 1: Placeholder Items (Immediate - 6 hours)**

**Implement Option 1 first** for quick wins:

**Tasks:**
1. Add `placeholderItems` prop to Navigation component
2. Update render logic to use placeholder as fallback
3. Add Puck array field for editing placeholder items
4. Add visual indicator in editor ("Using placeholder data")
5. Test in Theme Builder templates
6. Document in theme creation guide

**Why This First:**
- ✅ No breaking changes
- ✅ Minimal code changes
- ✅ Immediate value for theme creators
- ✅ Foundation for future enhancements

### **Phase 2: Slug-Based Navigation (Future - 12 hours)**

**Add semantic naming** (Option 3 hybrid):

**Tasks:**
1. Add `slug` column to navigations table
2. Add `navigationSlug` prop to Navigation component
3. Create `getBySlug()` API endpoint
4. Update render logic to try slug first
5. Migration for existing navigations (auto-generate slugs)

**Benefits:**
- ✅ More maintainable than IDs
- ✅ Better DX ("main-menu" vs "navigationId: 5")
- ✅ Easier to document

### **Phase 3: Auto-Installation (Future - 8 hours)**

**Theme installation creates navigations:**

**Tasks:**
1. Add theme installation hooks system
2. Detect navigation components in theme parts
3. Auto-create navigations from placeholders
4. Map slugs to tenant navigations
5. Handle updates/conflicts

---

## Alternative: Accept Current Limitation

**If navigation in templates isn't critical right now:**

**Approach:**
- Keep templates simple (no navigation)
- Users add navigation in Theme Customizer (header/footer editing)
- Document: "Configure navigation after installing theme"

**When This Makes Sense:**
- Most themes use simple navigation structures
- Navigation is highly customized per tenant anyway
- Theme templates are just visual starting points
- Team bandwidth is limited

---

## Implementation Files

### **Option 1 (Placeholder) - Files to Modify:**

**Frontend:**
```
resources/js/shared/puck/components/navigation/Navigation.tsx
  - Add placeholderItems prop
  - Add placeholderItems field config
  - Update render logic with fallback
  - Add visual indicator for placeholder mode
```

**Documentation:**
```
DEVELOPMENT_DOCS/THEME_CREATION_GUIDE.md (create)
  - How to use placeholderItems
  - Best practices for navigation in templates
```

### **Option 3 (Hybrid) - Additional Files:**

**Backend:**
```
database/migrations/XXXX_add_slug_to_navigations.php
  - Add slug column
  - Unique index

app/Http/Controllers/Api/NavigationController.php
  - Add getBySlug() endpoint

routes/api.php
  - GET /api/navigations/by-slug/{slug}
```

**Frontend:**
```
resources/js/shared/services/api/navigations.ts
  - Add getBySlug() method

resources/js/shared/puck/components/navigation/Navigation.tsx
  - Add navigationSlug prop
  - Update fetchList to include slug
  - Update render logic
```

---

## Testing Requirements

### **Option 1 Testing:**
- [ ] Navigation shows placeholder in Theme Builder templates
- [ ] Navigation shows real data on live site when navigationId exists
- [ ] Fallback works when navigationId doesn't exist
- [ ] Placeholder array field UI works correctly
- [ ] Nested menu items (children) render correctly

### **Option 3 Testing:**
- [ ] All Option 1 tests pass
- [ ] Navigation fetches by slug on live site
- [ ] Slug fallback to placeholder works
- [ ] Theme installation creates navigations
- [ ] Slug conflicts handled gracefully

---

## Future Enhancements

### Navigation Template Library
```typescript
// Pre-built navigation structures
const navigationTemplates = {
  'simple': [
    { label: 'Home', url: '/' },
    { label: 'About', url: '/about' },
    { label: 'Contact', url: '/contact' }
  ],
  'ecommerce': [
    { label: 'Shop', url: '/shop', children: [
      { label: 'All Products', url: '/shop/all' },
      { label: 'Categories', url: '/shop/categories' }
    ]},
    { label: 'My Account', url: '/account' },
    { label: 'Cart', url: '/cart' }
  ],
  'blog': [
    { label: 'Home', url: '/' },
    { label: 'Articles', url: '/blog' },
    { label: 'Categories', url: '/blog/categories' },
    { label: 'About', url: '/about' }
  ]
};
```

### Visual Navigation Builder
- Drag-and-drop menu builder in Puck sidebar
- Visual hierarchy editor for submenus
- Icon picker integration
- Live preview as you build

### Multi-Level Navigation Support
- Support for 3+ levels of nesting
- Mega menu capabilities
- Mobile-first responsive behaviors

---

## Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-03 | Recommend Option 1 first | Low risk, high value, no breaking changes |
| TBD | Phase 2 implementation | After Option 1 proves valuable |
| TBD | Phase 3 implementation | If auto-installation is needed |

---

## Questions to Answer Before Implementation

1. **How often will theme templates include navigation?**
   - If rarely, accept limitation
   - If frequently, implement Option 1

2. **Will themes be shared/sold?**
   - Yes → Need robust solution (Option 3)
   - No → Placeholder is sufficient (Option 1)

3. **How important is theme installation automation?**
   - Critical → Plan for Phase 3
   - Nice-to-have → Defer

4. **Do we need navigation versioning?**
   - Theme updates shouldn't break tenant customizations
   - Consider how to handle navigation updates

---

## References

**Related Files:**
- `resources/js/shared/puck/components/navigation/Navigation.tsx`
- `app/Services/PuckCompilerService.php`
- `app/Http/Controllers/Api/NavigationController.php`
- `app/Models/Navigation.php`

**Related Documentation:**
- Phase 8: Page System Refactor
- Theme System Architecture
- Puck Component Development Guide
