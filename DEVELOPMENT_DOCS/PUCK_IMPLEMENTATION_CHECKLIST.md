# Puck Page Builder - Step-by-Step Implementation Checklist

> **Status**: Ready to implement - Based on existing codebase analysis  
> **Estimated Time**: ~10 hours total  
> **Last Updated**: November 16, 2025

## 📋 Overview

This checklist provides a **step-by-step action plan** for completing the Puck page builder. The codebase already has significant foundation - we just need to enhance metadata compilation, add caching, and create the editor UI.

### What Already Exists ✅

**Database & Models:**
- ✅ `pages` table with `puck_data` and `puck_data_compiled` columns
- ✅ `navigations` table with `structure` JSON
- ✅ `themes` table with `theme_data` JSON and `is_active`
- ✅ Page, Navigation, Theme, TenantSettings models

**Backend Services:**
- ✅ PuckCompilerService with theme token resolution
- ✅ PageController with publish/update logic
- ✅ TenantSettings for site-wide configuration

**Frontend Components:**
- ✅ Puck components (Button, Card, Columns, Hero, Navigation, etc.)
- ✅ PublicPage with `<Render>` integration
- ✅ ThemePartEditorPage with `<Puck>` editor

### What We're Building 🔨

1. ✅ Enhanced metadata injection (navigations, settings, theme)
2. ✅ Server-side caching for 5-10ms response times
3. ✅ HTTP caching for browser performance
4. ✅ Page editor UI in dashboard
5. ✅ Branded loading shell for UX
6. ⏳ Future: Partial page loading (app shell architecture)

---

## Phase 1: Enhanced Metadata Compilation (2 hours)

**Goal:** Inject global data (navigations, settings, theme) into `puck_data_compiled` to eliminate runtime API calls.

### Step 1.1: Update PuckCompilerService

**File:** `app/Services/PuckCompilerService.php`

**Action:** Replace the `compilePage()` method with metadata injection:

```php
/**
 * Compile a page's Puck data with metadata injection for zero-query rendering.
 */
public function compilePage(Page $page): array
{
    $rawData = $page->puck_data ?? [];
    
    // Get active theme
    $theme = $this->getActiveTheme($page->tenant_id);
    
    // Compile content with theme token resolution
    $compiledContent = $this->compileContent($rawData, $theme);
    
    // Inject metadata for global data
    $metadata = $this->gatherMetadata($page->tenant_id);
    
    return array_merge($compiledContent, ['metadata' => $metadata]);
}

/**
 * Gather all global metadata for a tenant.
 * This data is flushed to JSON to avoid runtime queries.
 */
protected function gatherMetadata(?string $tenantId): array
{
    // Use caching to avoid repeated queries during bulk operations
    $cacheKey = "page_metadata_{$tenantId}";
    
    return Cache::remember($cacheKey, now()->addHour(), function () use ($tenantId) {
        // Get navigations
        $navigations = Navigation::where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'structure'])
            ->toArray();
        
        // Get tenant settings
        $settings = null;
        try {
            $tenantSettings = app(TenantSettings::class);
            $settings = [
                'site_title' => $tenantSettings->site_title,
                'site_description' => $tenantSettings->site_description,
                'logo_url' => $tenantSettings->logo_url,
                'favicon_url' => $tenantSettings->favicon_url,
                'social_links' => $tenantSettings->social_links,
                'seo_meta' => $tenantSettings->seo_meta,
            ];
        } catch (\Exception $e) {
            // Settings not initialized for this tenant yet
        }
        
        // Get active theme data
        $theme = Theme::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->first();
        
        $themeData = $theme ? [
            'id' => $theme->id,
            'name' => $theme->name,
            'slug' => $theme->slug,
            'data' => $theme->theme_data,
        ] : null;
        
        return [
            'navigations' => $navigations,
            'settings' => $settings,
            'theme' => $themeData,
        ];
    });
}
```

**Files to modify:**
- [ ] `app/Services/PuckCompilerService.php` - Add `gatherMetadata()` method
- [ ] `app/Services/PuckCompilerService.php` - Update `compilePage()` to inject metadata
- [ ] Add `use Illuminate\Support\Facades\Cache;` import

**Test:**
```bash
# In tinker
$page = App\Models\Page::first();
$compiler = app(App\Services\PuckCompilerService::class);
$compiled = $compiler->compilePage($page);
dd($compiled['metadata']); // Should show navigations, settings, theme
```

---

### Step 1.2: Auto-Recompile on Navigation Changes

**Goal:** When navigation is updated, invalidate cache and recompile published pages.

**File:** `app/Observers/NavigationObserver.php` (create new)

```php
<?php

namespace App\Observers;

use App\Models\Navigation;
use App\Models\Page;
use App\Services\PuckCompilerService;
use Illuminate\Support\Facades\Cache;

class NavigationObserver
{
    /**
     * Handle the Navigation "updated" event.
     */
    public function updated(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Handle the Navigation "created" event.
     */
    public function created(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Handle the Navigation "deleted" event.
     */
    public function deleted(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Recompile all published pages for a tenant.
     */
    protected function recompilePages(?string $tenantId): void
    {
        // Clear metadata cache
        Cache::forget("page_metadata_{$tenantId}");
        
        // Recompile all published pages for this tenant
        $compiler = app(PuckCompilerService::class);
        
        Page::where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->whereNotNull('puck_data')
            ->chunk(50, function ($pages) use ($compiler) {
                foreach ($pages as $page) {
                    $page->puck_data_compiled = $compiler->compilePage($page);
                    $page->save();
                }
            });
    }
}
```

**File:** `app/Providers/EventServiceProvider.php` (or `bootstrap/providers.php`)

Add observer registration:

```php
use App\Models\Navigation;
use App\Observers\NavigationObserver;

// In boot() method or providers array
Navigation::observe(NavigationObserver::class);
```

**Files to create/modify:**
- [ ] Create `app/Observers/NavigationObserver.php`
- [ ] Register observer in `app/Providers/EventServiceProvider.php` or `bootstrap/providers.php`

**Test:**
```bash
# Update a navigation and check if pages recompile
php artisan tinker
$nav = App\Models\Navigation::first();
$nav->structure = ['updated' => true];
$nav->save();
# Check that metadata cache was cleared and pages recompiled
```

---

### Step 1.3: Update PageController to Use Compiled Metadata

**File:** `app/Http/Controllers/Api/PageController.php`

**Action:** Update `getBySlug()` and `getHomepage()` to return `puck_data_compiled` with HTTP caching headers.

Find this section in `getBySlug()`:
```php
return response()->json([
    'data' => [
        'id' => $page->id,
        'title' => $page->title,
        // ... rest of fields
    ]
]);
```

**Replace with:**
```php
// Use compiled data if published, otherwise draft data
$pageData = $page->status === 'published' && $page->puck_data_compiled
    ? $page->puck_data_compiled
    : $page->puck_data;

return response()->json([
    'data' => [
        'id' => $page->id,
        'title' => $page->title,
        'slug' => $page->slug,
        'page_type' => $page->page_type,
        'puck_data' => $pageData, // Send compiled version with metadata
        'meta_data' => $page->meta_data,
        'status' => $page->status,
        'is_homepage' => $page->is_homepage,
        'published_at' => $page->published_at?->toISOString(),
    ]
])
->header('Cache-Control', 'public, max-age=3600') // Browser cache 1 hour
->header('ETag', md5(json_encode($pageData))); // Enable conditional requests
```

**Do the same for** `getHomepage()` method.

**Files to modify:**
- [ ] `app/Http/Controllers/Api/PageController.php` - Update `getBySlug()`
- [ ] `app/Http/Controllers/Api/PageController.php` - Update `getHomepage()`

**Test:**
```bash
# Check response headers
curl -I http://byteforge.test/api/pages/home
# Should see Cache-Control and ETag headers
```

---

## Phase 2: Frontend Metadata Access (1 hour)

**Goal:** Update frontend to access metadata from compiled JSON instead of making separate API calls.

### Step 2.1: Update PublicPage Component

**File:** `resources/js/apps/central/components/pages/PublicPage.tsx`

**Action:** Access metadata from `puck_data.metadata` instead of making separate API calls.

Current code likely makes separate calls like:
```tsx
const { data: navigations } = useQuery(['navigations'], () => api.get('/navigations'));
const { data: settings } = useQuery(['settings'], () => api.get('/settings'));
```

**Replace with:**
```tsx
// Access metadata from compiled page data
const metadata = page.puck_data?.metadata || {};
const navigations = metadata.navigations || [];
const settings = metadata.settings || {};
const theme = metadata.theme || {};

// Pass metadata to Render component
<Render 
  config={config} 
  data={page.puck_data}
/>
```

The Puck `<Render>` component automatically makes `metadata` available to all components via `puck.metadata`.

**Files to modify:**
- [ ] `resources/js/apps/central/components/pages/PublicPage.tsx`

**Test:**
```bash
# Visit a published page and check network tab
# Should only see 1 API call for page data, no separate calls for navigation/settings
```

---

### Step 2.2: Update Navigation Component

**File:** `resources/js/apps/central/components/pages/puck-components/Navigation.tsx`

**Action:** Update to use metadata instead of external field.

**Before:**
```tsx
// Likely using external field to select navigation
fields: {
  navigationId: {
    type: 'external',
    fetchList: () => fetch('/api/navigations').then(r => r.json()),
  }
}
```

**After:**
```tsx
// Access from metadata
render: ({ navigationId, puck }) => {
  const navigations = puck.metadata?.navigations || [];
  const selectedNav = navigations.find(n => n.id === navigationId);
  
  if (!selectedNav) return <div>Navigation not found</div>;
  
  return <nav>{/* Render navigation from selectedNav.structure */}</nav>;
}
```

**Files to modify:**
- [ ] `resources/js/apps/central/components/pages/puck-components/Navigation.tsx`

---

## Phase 3: Page Editor UI (3 hours)

**Goal:** Create dashboard page for editing pages with Puck visual editor.

### Step 3.1: Create PageEditorPage Component

**File:** `resources/js/apps/central/components/pages/PageEditorPage.tsx` (create new)

**Action:** Copy pattern from `ThemePartEditorPage.tsx` and adapt for pages:

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { ArrowLeft, Save, Eye, Globe } from 'lucide-react';
import { usePageQuery, useUpdatePage } from '@/hooks/usePages';
import { config } from './puck-components';
import { useTheme } from '@/hooks/useTheme';

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const { data: page, isLoading } = usePageQuery(id!);
  const updatePage = useUpdatePage();
  
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (page?.puck_data) {
      puckDataRef.current = page.puck_data as Data;
    }
  }, [page]);
  
  const handleSave = async (data: Data, publish = false) => {
    setIsSaving(true);
    try {
      await updatePage.mutateAsync({
        id: id!,
        puck_data: data,
        status: publish ? 'published' : 'draft',
      });
      
      toast.success(publish ? 'Page published!' : 'Draft saved!');
    } catch (error) {
      toast.error('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) return <div>Loading editor...</div>;
  
  return (
    <div className="page-editor">
      {/* Header with Save/Publish buttons */}
      <div className="editor-header">
        <button onClick={() => navigate('/dashboard/pages')}>
          <ArrowLeft /> Back
        </button>
        
        <div className="actions">
          <button onClick={() => handleSave(puckDataRef.current, false)}>
            <Save /> Save Draft
          </button>
          <button onClick={() => handleSave(puckDataRef.current, true)}>
            <Globe /> Publish
          </button>
          <button onClick={() => window.open(`/pages/${page.slug}`, '_blank')}>
            <Eye /> Preview
          </button>
        </div>
      </div>
      
      {/* Puck Editor */}
      <Puck
        config={config}
        data={puckDataRef.current}
        onChange={(data) => {
          puckDataRef.current = data;
        }}
      />
    </div>
  );
}
```

**Files to create:**
- [ ] `resources/js/apps/central/components/pages/PageEditorPage.tsx`

---

### Step 3.2: Add React Query Hooks for Pages

**File:** `resources/js/hooks/usePages.ts` (create or update)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function usePageQuery(id: string) {
  return useQuery(['pages', id], () => 
    api.get(`/api/pages/${id}`).then(r => r.data.data)
  );
}

export function usePagesQuery(filters = {}) {
  return useQuery(['pages', filters], () =>
    api.get('/api/pages', { params: filters }).then(r => r.data)
  );
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, ...data }: any) => api.put(`/api/pages/${id}`, data),
    {
      onSuccess: (response, variables) => {
        queryClient.invalidateQueries(['pages', variables.id]);
        queryClient.invalidateQueries(['pages']);
      }
    }
  );
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: any) => api.post('/api/pages', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pages']);
      }
    }
  );
}
```

**Files to create:**
- [ ] `resources/js/hooks/usePages.ts`

---

### Step 3.3: Add Route for Page Editor

**File:** `resources/js/apps/central/routes.tsx` (or wherever routes are defined)

```tsx
import PageEditorPage from '@/components/pages/PageEditorPage';

// Add to routes array
{
  path: '/dashboard/pages/:id/edit',
  element: <PageEditorPage />
}
```

**Files to modify:**
- [ ] Add route for `/dashboard/pages/:id/edit`

---

### Step 3.4: Create Pages List Page

**File:** `resources/js/apps/central/components/pages/PagesListPage.tsx` (create new)

Simple list view with Create/Edit/Delete actions:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash, Eye } from 'lucide-react';
import { usePagesQuery, useCreatePage } from '@/hooks/usePages';

export default function PagesListPage() {
  const { data, isLoading } = usePagesQuery();
  const createPage = useCreatePage();
  
  const handleCreate = async () => {
    const page = await createPage.mutateAsync({
      title: 'New Page',
      page_type: 'general',
      status: 'draft',
    });
    
    navigate(`/dashboard/pages/${page.data.id}/edit`);
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="pages-list">
      <div className="header">
        <h1>Pages</h1>
        <button onClick={handleCreate}>
          <Plus /> Create Page
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map(page => (
            <tr key={page.id}>
              <td>{page.title}</td>
              <td>{page.slug}</td>
              <td>{page.status}</td>
              <td>{new Date(page.updated_at).toLocaleDateString()}</td>
              <td>
                <Link to={`/dashboard/pages/${page.id}/edit`}>
                  <Edit />
                </Link>
                <a href={`/pages/${page.slug}`} target="_blank">
                  <Eye />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Files to create:**
- [ ] `resources/js/apps/central/components/pages/PagesListPage.tsx`
- [ ] Add route for `/dashboard/pages`

---

## Phase 4: Loading Shell / Splash Screen (2 hours)

**Goal:** Add branded loading experience to reduce perceived wait time.

### Step 4.1: Create App Shell Template

**File:** `resources/views/tenant.blade.php` (or wherever main app template is)

**Action:** Add CSS-only loading shell with tenant branding:

```html
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $settings->site_title ?? config('app.name') }}</title>
    
    @if($settings->favicon_url)
        <link rel="icon" href="{{ $settings->favicon_url }}">
    @endif
    
    <!-- App Shell CSS - Loads instantly -->
    <style>
        #app-shell {
            position: fixed;
            inset: 0;
            background: {{ $theme->resolve('colors.background') ?? '#ffffff' }};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.3s ease;
        }
        
        #app-shell.loaded {
            opacity: 0;
            pointer-events: none;
        }
        
        .shell-logo {
            width: 120px;
            height: 120px;
            margin-bottom: 2rem;
            animation: pulse 1.5s ease-in-out infinite;
        }
        
        .shell-text {
            color: {{ $theme->resolve('colors.text.secondary') ?? '#666666' }};
            font-size: 0.875rem;
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
        }
        
        /* Optional: Skeleton header */
        .skeleton-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: linear-gradient(90deg, 
                {{ $theme->resolve('colors.gray.100') ?? '#f0f0f0' }} 25%, 
                {{ $theme->resolve('colors.gray.200') ?? '#e0e0e0' }} 50%, 
                {{ $theme->resolve('colors.gray.100') ?? '#f0f0f0' }} 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    </style>
    
    @viteReactRefresh
    @vite(['resources/js/apps/tenant/main.tsx', 'resources/css/app.css'])
</head>
<body>
    <!-- Loading Shell -->
    <div id="app-shell">
        @if($settings->logo_url)
            <img src="{{ $settings->logo_url }}" alt="Loading" class="shell-logo">
        @endif
        <div class="shell-text">Loading {{ $settings->site_title }}...</div>
    </div>
    
    <!-- React App -->
    <div id="app"></div>
    
    <!-- Remove shell when app loads -->
    <script>
        window.addEventListener('DOMContentLoaded', function() {
            const shell = document.getElementById('app-shell');
            setTimeout(() => {
                shell.classList.add('loaded');
                setTimeout(() => shell.remove(), 300);
            }, 100); // Small delay to avoid flash
        });
    </script>
</body>
</html>
```

**Files to modify:**
- [ ] `resources/views/tenant.blade.php` (or main app template)

**Test:**
```bash
# Visit site with throttled network (Chrome DevTools)
# Should see branded logo immediately, smooth fade to app
```

---

### Step 4.2: (Optional) Puck-Editable Splash Screen

**Future Enhancement:** Add SplashScreen component to Puck config, save in `themes.splash_config`, inject into template.

**Skip for MVP** - Can implement later as premium feature.

---

## Phase 5: Performance Validation & Testing (2 hours)

**Goal:** Measure and validate performance improvements.

### Step 5.1: Add Performance Logging

**File:** `app/Http/Middleware/PerformanceLogging.php` (create new)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PerformanceLogging
{
    public function handle(Request $request, Closure $next)
    {
        $start = microtime(true);
        $queryStart = \DB::getQueryLog();
        \DB::enableQueryLog();
        
        $response = $next($request);
        
        $duration = (microtime(true) - $start) * 1000;
        $queries = \DB::getQueryLog();
        $queryCount = count($queries) - count($queryStart);
        
        if ($request->is('api/pages/*') && $request->isMethod('GET')) {
            Log::info('Page Load Performance', [
                'url' => $request->fullUrl(),
                'duration_ms' => round($duration, 2),
                'queries' => $queryCount,
            ]);
        }
        
        return $response;
    }
}
```

Register in `app/Http/Kernel.php` or middleware config.

**Files to create:**
- [ ] `app/Http/Middleware/PerformanceLogging.php`

---

### Step 5.2: Performance Benchmarks

**Test Plan:**

1. **Before Optimization** (baseline):
   ```bash
   # Measure page load without metadata injection
   curl -w "@curl-format.txt" http://byteforge.test/api/pages/home
   ```

2. **After Metadata Injection**:
   ```bash
   # Should see reduced queries (4 → 1)
   # Check logs for query count
   ```

3. **After Server Caching**:
   ```bash
   # Second request should be <10ms
   # Check Cache::remember hit rate
   ```

4. **After HTTP Caching**:
   ```bash
   # Check ETag/Cache-Control headers
   curl -I http://byteforge.test/api/pages/home
   ```

**Expected Results:**
| Optimization | Queries | Duration | Payload |
|-------------|---------|----------|---------|
| None | 4 | 200ms | 30KB |
| Metadata Injection | 1 | 50ms | 30KB |
| + Server Cache | 1 | 5-10ms | 30KB |
| + HTTP Cache | 0 | 0ms (cached) | 0KB |

**Files to create:**
- [ ] `tests/Performance/PageLoadTest.php` (optional)

---

## Phase 6: Documentation & Cleanup (1 hour)

### Step 6.1: Update Architecture Docs

**Files to update:**
- [ ] `DEVELOPMENT_DOCS/PUCK_PAGE_BUILDER_IMPLEMENTATION_PLAN.md` - Archive old plan
- [ ] `DEVELOPMENT_DOCS/API_DOCUMENTATION.md` - Document page endpoints
- [ ] `README.md` - Add Puck setup instructions

---

### Step 6.2: Add Code Comments

Ensure all new code has clear comments explaining:
- Why metadata is injected (performance)
- How caching invalidation works (navigation observer)
- What gets flushed vs kept dynamic

---

## Future Enhancements (Post-MVP)

### Partial Page Loading (App Shell Architecture)
**Estimated Time:** 3-4 hours

Add query param support for content-only responses:

```php
// PageController
public function getBySlug(Request $request, string $slug): JsonResponse
{
    $partial = $request->query('partial') === 'true';
    
    if ($partial) {
        // Return only page content, client reuses metadata
        return response()->json([
            'content' => $page->puck_data_compiled['content'],
        ]);
    }
    
    // Full response with metadata
    return response()->json([
        'data' => $page->puck_data_compiled,
    ]);
}
```

**Benefits:**
- 83% smaller payloads on navigation (30KB → 5KB)
- Instant page transitions
- Reuse cached metadata from memory

---

### CDN Integration
**Estimated Time:** 2 hours

Add CloudFlare or AWS CloudFront caching:
- Serve `puck_data_compiled` from edge locations
- <10ms response times globally
- Auto-purge on publish

---

### A/B Testing Splash Screens
**Estimated Time:** 4 hours

Track which splash designs reduce bounce rate:
- Multiple splash configs per tenant
- Analytics integration
- Winner selection

---

## Summary

**Total Estimated Time:** ~10 hours

**Breakdown:**
- Phase 1: Metadata Compilation (2h)
- Phase 2: Frontend Updates (1h)
- Phase 3: Editor UI (3h)
- Phase 4: Loading Shell (2h)
- Phase 5: Performance Testing (2h)
- Phase 6: Documentation (1h)

**What This Achieves:**
✅ Zero-query page rendering (4 queries → 1)  
✅ 5-10ms response times with caching  
✅ Professional branded loading experience  
✅ Visual page editing with Puck  
✅ Metadata auto-updates on navigation changes  
✅ HTTP caching for browser performance  

**Next Steps:**
1. Start with Phase 1 (metadata injection)
2. Test thoroughly before moving to frontend
3. Build editor UI incrementally
4. Measure performance at each stage
5. Deploy to staging for real-world testing
