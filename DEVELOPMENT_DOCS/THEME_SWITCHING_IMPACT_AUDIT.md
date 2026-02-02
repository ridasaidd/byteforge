# Theme Switching Impact on Pages - Audit

**Date:** February 2, 2026  
**Status:** AUDIT COMPLETE

---

## Executive Summary

Theme switching affects pages at multiple levels:

1. **CSS & Styling** ✅ Automatically updates (CSS files on disk)
2. **Page Content (Puck Data)** ✅ Unaffected (stored independently)
3. **Header/Footer** ⚠️ Depends on how pages reference them
4. **Compilation Cache** ❌ **ISSUE** - Not invalidated on theme switch

**Recommendation:** Add theme switch observer to invalidate page cache and trigger recompilation.

---

## Detailed Analysis

### 1. CSS Rendering (Storefront)

**How it works:**
```blade
<!-- public-central.blade.php -->
<link rel="stylesheet" href="{{ asset('storage/themes/' . $activeTheme->id . '/' . $activeTheme->id . '.css') }}" id="theme-css">
<style id="customization-css">{!! $activeTheme->getScopedCustomizationCss(null) !!}</style>
```

**Effect of theme switching:**
- ✅ **Automatic** - CSS URL changes because `$activeTheme->id` changes
- ✅ **Browser reloads** new CSS file
- ✅ **Zero page recompilation needed**
- ✅ **Instant visual update** for end users

**Impact:** None - CSS switching is seamless.

---

### 2. Page Content (Puck Data)

**How it's stored:**
- `pages.puck_data` - Raw editor JSON (independent of theme)
- `pages.puck_data_compiled` - Compiled with metadata injection

**Effect of theme switching:**
- ✅ **No change** - Page content remains the same
- ✅ **Components still render** with same content
- ⚠️ **Theme tokens in content may resolve differently** (if color names change)

**Example:**
```json
{
  "props": {
    "color": "colors.primary.500"
  }
}
```
- Old theme: `colors.primary.500 = #222222`
- New theme: `colors.primary.500 = #FF5733`
- Result: **Color automatically updates** via token resolution

**Impact:** Mostly positive - pages adapt to new theme colors automatically.

---

### 3. Header/Footer Handling

**Current Architecture:**

#### Pages using NEW theme system (no header_id/footer_id set):
- Header/footer come from `theme_parts` table
- When theme switches:
  1. `activateTheme()` copies placeholders to new `theme_parts`
  2. Page content renders
  3. Storefront shows **new theme's header/footer**

✅ **Works correctly** - all pages automatically get new header/footer

#### Pages using OLD system (layout_id/header_id/footer_id set):
- Header/footer explicitly set on page
- When theme switches:
  1. Page's header_id/footer_id **don't change**
  2. Old header/footer still referenced
  3. Storefront shows **mix of old and new theme**

❌ **Potential visual inconsistency** - mismatch between page and header/footer styling

**Code Reference (PuckCompilerService.php):**
```php
// Add header content first
if ($page->header) {
    // Uses old header_id
    $headerData = $page->header->puck_data_compiled ?? $page->header->puck_data_raw;
    $mergedContent = array_merge($mergedContent, $headerData['content']);
} elseif ($page->layout && $page->layout->header) {
    // Falls back to layout header
    $headerData = $page->layout->header->puck_data_compiled ?? $page->layout->header->puck_data_raw;
    $mergedContent = array_merge($mergedContent, $headerData['content']);
}
```

**Recommendation:** When switching themes, either:
1. Keep old header/footer (user explicitly set them) - acceptable
2. Auto-reset to NULL so pages use new theme's header/footer - cleaner

---

### 4. Theme Token Resolution ❌ **CRITICAL ISSUE**

**The Problem:**

When page is compiled, theme data is injected into `puck_data_compiled`:

```php
// In gatherMetadata()
$themeData = $theme ? [
    'id' => $theme->id,
    'name' => $theme->name,
    'slug' => $theme->slug,
    'data' => $theme->theme_data,  // ← SNAPSHOT of current theme
] : null;

return array_merge($compiledContent, ['metadata' => $metadata]);
```

**What happens on theme switch:**
1. New theme becomes active
2. Old pages still have **old theme data frozen** in `puck_data_compiled`
3. Storefront CSS updates (new theme CSS file loads)
4. But page metadata has **old theme colors/typography**
5. If page uses theme tokens in colors or other props, they resolve to **OLD values**

**Example Timeline:**
```
Time 1: Theme A active
- colors.primary.500 = #222222 (dark)
- Page compiled with this in metadata
- Page stored with old theme ID in compiled data

Time 2: Switch to Theme B
- colors.primary.500 = #FF5733 (red)
- CSS files updated ✅
- But page compiled data still says colors.primary.500 = #222222 ❌
- Mismatch!

Time 3: User views page
- CSS is Theme B's CSS (red colors)
- Component tokens resolve to old Theme A values (dark colors)
- Visual conflict!
```

---

### 5. Metadata Cache ❌ **CACHE INVALIDATION ISSUE**

**How metadata caching works:**

```php
// In gatherMetadata()
$cacheKey = "page_metadata_{$tenantId}";

return Cache::remember($cacheKey, now()->addHour(), function () use ($tenantId) {
    // Get theme data
    $theme = $this->getActiveTheme($tenantId);
    return [
        'theme' => $theme ? [...] : null,
    ];
});
```

**Effect of theme switching:**
- ❌ **Cache is not invalidated** when theme switches
- Cache key is based on `tenant_id` only, not theme_id
- Old theme data remains in cache for up to 1 hour
- `puck_data_compiled` is NOT regenerated

**Example:**
1. Page compiled at 10:00 with Theme A data cached
2. User switches theme to Theme B at 10:15
3. Cache expires at 11:00
4. Until 11:00, pages still have **stale theme data**
5. CSS updated but component metadata outdated

---

## Impact Assessment by User Type

### For Content Editors
- ✅ Visual changes immediate (CSS updates)
- ⚠️ May not see token value changes if using old page
- ⚠️ Header/footer may not match new theme (if using old system)

### For End Users (Storefront)
- ✅ CSS switches immediately
- ❌ Component theme tokens may be stale (until cache expires)
- ❌ Page header/footer may not match new theme (if using old system)

### For Analytics/Performance
- ⚠️ ETag headers become invalid (pages return different compiled data)
- ⚠️ Browser cache cleared even though visual content unchanged

---

## Problems to Fix

### Problem 1: Stale Theme Data in Compiled Pages

**Current State:**
- `puck_data_compiled` includes frozen theme snapshot
- Theme switches don't recompile pages
- Cache key doesn't include theme_id

**Solution Options:**

**Option A: Include theme_id in cache key (Minimal)**
```php
$cacheKey = "page_metadata_{$tenantId}_theme_{$activeThemeId}";
```
- Pros: Simple, automatic theme switch triggers new cache entry
- Cons: More cache entries, doesn't recompile existing pages

**Option B: Observer pattern - Invalidate cache on theme switch (Recommended)**
```php
// ThemeObserver.php
public function updated(Theme $theme)
{
    // Clear metadata cache for affected scope
    Cache::forget("page_metadata_{$theme->tenant_id}_*");
    
    // Recompile all published pages for this tenant
    $pages = Page::where('tenant_id', $theme->tenant_id)
        ->where('status', 'published')
        ->get();
    
    foreach ($pages as $page) {
        $compiler = app(PuckCompilerService::class);
        $page->puck_data_compiled = $compiler->compilePage($page);
        $page->save();
    }
}
```
- Pros: Ensures pages always have current theme data
- Cons: Performance impact on large page counts (background job needed)

**Option C: Lazy recompilation on first render (Pragmatic)**
```php
// In getBySlug() / getHomepage()
$page = Page::where('slug', $slug)->first();

// Check if compiled theme_id matches active theme
$activeTheme = $this->getActiveTheme($page->tenant_id);
if ($page->compiled_with_theme_id !== $activeTheme->id) {
    // Recompile if theme changed
    $compiler = app(PuckCompilerService::class);
    $page->puck_data_compiled = $compiler->compilePage($page);
    $page->compiled_with_theme_id = $activeTheme->id;
    $page->save();
}
```
- Pros: No background jobs, only recompiles when needed
- Cons: Adds latency to first page load after theme switch

---

### Problem 2: Old System Pages with Header/Footer Mismatch

**Current State:**
- Pages can have `layout_id`, `header_id`, `footer_id`
- Switching theme doesn't update these
- Result: Page content + old header/footer with new theme CSS

**Solution:**

**Option A: Deprecate layout_id/header_id/footer_id (Phase 8.2 planned)**
- Remove from UI in Phase 8.2
- Let existing pages use new theme's header/footer
- Cleaner long-term solution

**Option B: Auto-reset on theme switch**
```php
public function activate(Request $request)
{
    $tenantId = $this->getTenantId();
    $theme = $this->themeService->activateTheme($request->slug, $tenantId);

    // Clear old layout/header/footer from pages
    Page::where('tenant_id', $tenantId)
        ->update([
            'layout_id' => null,
            'header_id' => null,
            'footer_id' => null,
        ]);
    
    return response()->json([...]);
}
```
- Pros: All pages automatically use new theme
- Cons: Loses user's explicit choices (can't mix themes)

---

## Recommendations

### Immediate (Phase 8)

1. **Document the behavior** - Users should understand what happens
2. **Add warning in theme switch dialog** - "Switching themes will update CSS, but compiled pages may have stale theme data until cache expires (max 1 hour)"
3. **Optional: Add "Recompile all pages" button** in Themes section
   - Admin can click to force recompile all pages
   - Ensures consistency immediately

### Short-term (Phase 8)

**Add lazy recompilation check:**
```php
// In PageController::getBySlug() and getHomepage()
public function getBySlug(Request $request, string $slug): JsonResponse
{
    $page = Page::where('slug', $slug)
        ->where('status', 'published')
        ->firstOrFail();

    // Check if page was compiled with old theme
    $activeTheme = $this->themeService->getActiveTheme($page->tenant_id);
    
    if ($page->compiled_with_theme_id !== $activeTheme?->id) {
        // Recompile with current theme data
        $compiler = app(PuckCompilerService::class);
        $page->puck_data_compiled = $compiler->compilePage($page);
        $page->compiled_with_theme_id = $activeTheme->id;
        $page->save();
    }

    $pageData = $page->puck_data_compiled ?? $page->puck_data;
    // ... rest of response
}
```

**Add migration to track compiled_with_theme_id:**
```php
// Add column to pages table
$table->unsignedBigInteger('compiled_with_theme_id')->nullable();
$table->foreign('compiled_with_theme_id')->references('id')->on('themes');
```

### Long-term (Phase 8+)

1. **Remove layout_id/header_id/footer_id from pages** (Phase 8.2 completed)
2. **Add theme switch observer** to invalidate page caches
3. **Implement background job** for bulk page recompilation
4. **Consider CDN cache invalidation** if using CDN

---

## Testing Plan

### Manual Tests

1. **Create page with Theme A**
   - Verify CSS renders correctly
   - Verify theme colors in components

2. **Switch to Theme B**
   - Verify CSS updates immediately ✅
   - Verify page content unchanged ✅
   - Check if colors match new theme (may be stale)

3. **Wait 1 hour or clear cache**
   - Verify metadata updates
   - Verify colors now match new theme

4. **With Phase 8.2 (no layout/parts)**
   - Verify header/footer updates to new theme

### Unit Tests

- [ ] Theme switch invalidates metadata cache
- [ ] Lazy recompilation detects theme mismatch
- [ ] Compiled pages include correct theme_id
- [ ] Header/footer reset on theme activation

---

## Files Affected

**Already written:**
- `app/Http/Controllers/Api/ThemeController.php` - activate() method
- `app/Services/ThemeService.php` - activateTheme() method
- `app/Services/PuckCompilerService.php` - gatherMetadata() caching
- `resources/js/apps/central/components/pages/ThemesPage.tsx` - theme switch dialog

**Need modification:**
- `app/Http/Controllers/Api/PageController.php` - add lazy recompilation
- `app/Services/PuckCompilerService.php` - track compiled_with_theme_id
- `database/migrations/` - add compiled_with_theme_id column

---

## Decision Matrix

| Issue | Severity | Phase | Approach |
|-------|----------|-------|----------|
| Stale theme data in compiled pages | Medium | 8 | Lazy recompilation |
| Old system header/footer mismatch | Low | 8.2 | Remove layout fields |
| Metadata cache invalidation | Medium | 8+ | Observer + background job |
| Theme switch visual feedback | Low | 8 | Add warning dialog (already exists) |

---

## Conclusion

Theme switching is mostly safe due to:
- ✅ CSS updates automatically
- ✅ Page content independent
- ✅ Token resolution works

But has one gap:
- ❌ Compiled page metadata may be stale (up to 1 hour)

**Simple fix:** Add lazy recompilation check in page fetch to ensure theme_id matches.

This ensures pages always render with the correct active theme without requiring manual admin action or background jobs.
