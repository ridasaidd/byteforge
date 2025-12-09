# Puck Page Builder Implementation Plan
## Simplified Visual Editor for React

**Status:** IN PROGRESS - Core Features Complete, Theme Bundles Next  
**Target:** Clean, maintainable Puck integration with visual theme building  
**Date:** October 22, 2025  
**Last Updated:** November 16, 2025

---

## 🎉 **MAJOR MILESTONES COMPLETED**

### ✅ **Phase 1: Core Infrastructure** (COMPLETE)
- ✅ Database schema (pages, themes, theme_parts, navigations)
- ✅ Page CRUD with Puck integration
- ✅ Backend compilation service (merges header + content + footer)
- ✅ Metadata injection (navigations, settings, theme)
- ✅ Zero-query storefront rendering (2 API calls only!)

### ✅ **Phase 2: Performance Optimization** (COMPLETE)
- ✅ Metadata propagation via Puck's native `metadata` prop
- ✅ Navigation instant rendering (no spinner flash)
- ✅ Automatic recompilation triggers:
  - ✅ NavigationObserver (navigation changes)
  - ✅ ThemePartObserver (header/footer changes)
  - ✅ Page update detection (header_id, footer_id, puck_data)

### ✅ **Phase 3: Theme System** (COMPLETE)
- ✅ Themes table with settings (colors, fonts, spacing)
- ✅ Theme parts (header/footer with Puck data)
- ✅ Theme sync from disk to database
- ✅ Theme activation, reset, duplicate, export
- ✅ Theme gallery in Central app

---

## 🚀 **NEXT PHASE: Theme Bundle System**

### **Vision: Themes as Complete Site Bundles**
Instead of just styling, themes become complete starter sites that admins build visually in Puck.

---

## 🎯 **CURRENT ARCHITECTURE** (November 2025)

### **What We Have Working:**

**Backend Compilation:**
```php
// PuckCompilerService.compilePage()
1. Merges header.content + page.content + footer.content
2. Resolves theme tokens
3. Injects metadata (navigations, settings, theme)
4. Returns compiled JSON for storefront

Triggers:
- Page publish
- Navigation changes (NavigationObserver)
- Theme part changes (ThemePartObserver)
- Header/footer assignment changes
```

**Frontend Rendering:**
```tsx
// PublicPage.tsx
<Render 
  config={config}
  data={pageData}
  metadata={pageData.metadata} // ← Puck propagates this to ALL components!
/>

// Navigation.tsx - Instant rendering
const metadataNav = puck?.metadata?.navigations?.find(...);
// No API call, no spinner, instant!
```

**Performance:**
- ✅ 2 API calls only (page + user auth)
- ✅ Zero calls for navigation/theme
- ✅ 50-67% reduction in API calls
- ✅ HTTP caching (1 hour max-age + ETags)

---

## 📖 **WHAT WE HAVE WORKING**

### ✅ Core Features (Implemented)
### ✅ Core Features (Implemented)

1. **✅ Page Builder (Puck Integration)**
   - Page editor with visual drag-drop
   - Component library (Section, Container, Columns, Flex, Grid, Heading, Text, Button, Card, Image, Hero, Navigation)
   - Media library integration
   - Save/publish workflow
   - Page CRUD (list, create, edit, delete)

2. **✅ Theme System**
   - Themes table with settings (colors, fonts, spacing)
   - Theme sync from disk to database
   - Theme activation, reset, duplicate, export
   - Theme gallery (Central app)
   - Active theme API endpoint

3. **✅ Theme Parts (Header/Footer)**
   - Create/edit header/footer in Puck
   - Published/draft status
   - Assigned to pages via header_id/footer_id
   - Backend compilation merges parts into pages

4. **✅ Navigation System**
   - Navigation CRUD
   - Structure stored as JSON
   - Metadata injection into compiled pages
   - Zero-query rendering on storefront
   - NavigationObserver auto-recompiles pages

5. **✅ Backend Compilation Pipeline**
   - PuckCompilerService.compilePage()
   - Merges header + content + footer
   - Injects global metadata (navigations, settings, theme)
   - Auto-recompilation on data changes
   - Caches metadata (1 hour)

6. **✅ Storefront Performance**
   - Pre-compiled JSON served
   - Metadata propagated via Puck's native prop
   - 2 API calls only (page + auth)
   - HTTP caching enabled
   - Instant navigation rendering

7. **✅ Media Library**
   - Full CRUD operations
   - Folder support
   - Integrated into Image component
   - External field type support

### ⚠️ What Needs Enhancement
### ⚠️ What Needs Enhancement

1. **Theme Bundles** - Themes should include starter pages (not just styling)
2. **Component Library** - More marketing/content blocks needed
3. **Component Controls** - Better control refinement (responsive, spacing, colors)
4. **Page Templates** - Standalone templates vs theme bundles
5. **Theme Customization UI** - Visual editor for tenant color/font overrides

---

## 🏗️ **NEW ARCHITECTURE: Theme Bundles** (In Planning)

### **Concept: Themes as Complete Site Bundles**

Instead of themes being just styling (colors/fonts), they become **complete starter sites** that admins build visually in Puck.

```
Theme Bundle Structure:
├── Metadata (name, description, preview, category)
├── Settings (colors, fonts, spacing) ← Current
├── Theme Parts (header, footer) ← NEW: Bundled with theme
└── Page Templates (homepage, about, contact, etc.) ← NEW: Bundled with theme
```

**When Tenant Activates Theme:**
1. Creates tenant-specific header/footer (from theme's parts)
2. Creates pages (from theme's page templates)
3. Sets header_id/footer_id references
4. Compiles all pages
5. Updates tenant's active_theme_id

**Result:** Tenant gets a complete, professional site instantly. They just customize content.

---

## 📋 **IMPLEMENTATION PLAN: Theme Bundle System**

### **PHASE 4: Theme Bundle Foundation** (Estimated: 3 days)

#### Step 4.1: Database Schema Updates (30 min)

**Migration: Link Templates and Parts to Themes**

```sql
-- Link page_templates to themes
ALTER TABLE page_templates 
  ADD COLUMN theme_id BIGINT NULL AFTER id,
  ADD FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  ADD INDEX idx_theme_category (theme_id, category);

-- Link theme_parts to themes (for blueprint storage)
-- theme_parts can be:
--   1. Theme blueprints: theme_id set, tenant_id NULL (central)
--   2. Tenant instances: theme_id NULL, tenant_id set (activated)
ALTER TABLE theme_parts
  ADD COLUMN theme_id BIGINT NULL AFTER tenant_id,
  ADD FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  ADD INDEX idx_theme_type (theme_id, type);

-- Add theme category for better organization
ALTER TABLE themes
  ADD COLUMN category VARCHAR(100) NULL AFTER description,
  ADD COLUMN is_system_theme BOOLEAN DEFAULT true AFTER category,
  ADD INDEX idx_category_status (category, is_active);
```

**Model Relationships:**

```php
// Theme.php
public function parts() {
    return $this->hasMany(ThemePart::class);
}

public function pageTemplates() {
    return $this->hasMany(PageTemplate::class);
}

// PageTemplate.php
public function theme() {
    return $this->belongsTo(Theme::class);
}

// ThemePart.php  
public function theme() {
    return $this->belongsTo(Theme::class);
}
```

**Status:**
- [ ] Create migration
- [ ] Update models
- [ ] Test relationships

---

#### Step 4.2: Theme Builder UI (Central App) (2 days)

**Theme Builder Page Structure:**

```
┌──────────────────────────────────────────┐
│ Theme: Modern SaaS                        │
│ Tabs: [Overview] [Parts] [Pages] [Settings] │
└──────────────────────────────────────────┘

Overview Tab:
- Theme name, slug, description
- Category (SaaS, Agency, E-commerce, etc.)
- Preview image upload
- Publish status

Parts Tab:
- Header editor (opens Puck)
- Footer editor (opens Puck)
- Preview renderings

Pages Tab:
- List of page templates
- [+ Add Page Template] button
- Each template opens in Puck editor

Settings Tab:
- Color palette editor
- Font selection
- Spacing configuration
- Export theme button
```

**Components to Create:**

```tsx
// Central App
resources/js/apps/central/components/pages/
  ├── ThemeBuilderPage.tsx (main page)
  ├── ThemeBuilderOverview.tsx (metadata form)
  ├── ThemeBuilderParts.tsx (header/footer management)
  ├── ThemeBuilderPages.tsx (page templates list)
  ├── ThemeBuilderSettings.tsx (theme settings editor)
  └── ThemePartEditorPage.tsx (Puck editor for parts) ← Already exists!
```

**Status:**
- [ ] Create ThemeBuilderPage layout
- [ ] Build Overview tab
- [ ] Build Parts tab (link to existing editors)
- [ ] Build Pages tab
- [ ] Build Settings tab
- [ ] Add navigation routes

---

#### Step 4.3: Theme Activation Service (1 day)

**Backend Service:**

```php
// app/Services/ThemeActivationService.php
class ThemeActivationService
{
    public function activateTheme(string $tenantId, int $themeId): array
    {
        $theme = Theme::with(['parts', 'pageTemplates'])->findOrFail($themeId);
        
        return DB::transaction(function () use ($tenantId, $theme) {
            // 1. Create header/footer for tenant
            $header = $this->createTenantThemePart($tenantId, $theme, 'header');
            $footer = $this->createTenantThemePart($tenantId, $theme, 'footer');
            
            // 2. Create pages from templates
            $pages = [];
            foreach ($theme->pageTemplates as $template) {
                $page = $this->createPageFromTemplate(
                    $tenantId, 
                    $template, 
                    $header->id, 
                    $footer->id
                );
                $pages[] = $page;
            }
            
            // 3. Set homepage
            $this->setHomepage($pages);
            
            // 4. Compile all pages
            $this->compilePages($pages);
            
            // 5. Update tenant theme
            $tenant = Tenant::find($tenantId);
            $tenant->update([
                'active_theme_id' => $theme->id,
                'theme_settings' => $theme->theme_data
            ]);
            
            return [
                'pages_created' => count($pages),
                'header_id' => $header->id,
                'footer_id' => $footer->id
            ];
        });
    }
    
    protected function createTenantThemePart($tenantId, $theme, $type) {
        $themePart = $theme->parts()->where('type', $type)->first();
        if (!$themePart) return null;
        
        return ThemePart::create([
            'tenant_id' => $tenantId,
            'theme_id' => null, // Tenant instance, not blueprint
            'name' => "{$theme->name} {$type}",
            'slug' => "{$theme->slug}-{$type}",
            'type' => $type,
            'puck_data_raw' => $themePart->puck_data_raw,
            'puck_data_compiled' => $themePart->puck_data_compiled,
            'status' => 'published',
            'created_by' => auth()->id()
        ]);
    }
    
    protected function createPageFromTemplate($tenantId, $template, $headerId, $footerId) {
        return Page::create([
            'tenant_id' => $tenantId,
            'title' => $template->name,
            'slug' => $template->slug,
            'page_type' => $template->category,
            'puck_data' => $template->puck_data,
            'header_id' => $headerId,
            'footer_id' => $footerId,
            'is_homepage' => $template->category === 'home',
            'status' => 'published',
            'published_at' => now(),
            'created_by' => auth()->id()
        ]);
    }
}
```

**API Endpoint:**

```php
// ThemeController.php
public function activateBundle(Request $request) {
    $validated = $request->validate([
        'theme_id' => 'required|exists:themes,id'
    ]);
    
    $service = app(ThemeActivationService::class);
    $result = $service->activateTheme(
        tenant()->id, 
        $validated['theme_id']
    );
    
    return response()->json([
        'message' => 'Theme activated successfully',
        'data' => $result
    ]);
}
```

**Status:**
- [ ] Create ThemeActivationService
- [ ] Add controller method
- [ ] Add route
- [ ] Test activation flow

---

#### Step 4.4: Theme Gallery Enhancement (Both Apps) (1 day)

**Central App Gallery:**
- Show system themes (is_system_theme = true)
- Preview theme's pages
- Activate for Central app testing
- Edit theme button

**Tenant App Gallery:**
- Show published themes
- Preview before activation
- Activation warning/confirmation
- View included pages

**Preview Modal Component:**

```tsx
// ThemePreviewModal.tsx
interface Props {
  theme: Theme;
  onActivate: () => void;
  onClose: () => void;
}

<Modal>
  <Tabs>
    <Tab label="Overview">
      {theme.description}
      Includes: {theme.pageTemplates.length} pages
    </Tab>
    
    <Tab label="Pages">
      {theme.pageTemplates.map(template => (
        <PagePreview 
          key={template.id}
          data={template.puck_data}
        />
      ))}
    </Tab>
    
    <Tab label="Settings">
      Colors, fonts, spacing preview
    </Tab>
  </Tabs>
  
  <Actions>
    <Button onClick={onClose}>Cancel</Button>
    <Button onClick={onActivate}>Activate Theme</Button>
  </Actions>
</Modal>
```

**Status:**
- [ ] Create preview modal
- [ ] Update ThemesPage (both apps)
- [ ] Add activation confirmation
- [ ] Test preview flow

---

### **PHASE 5: Content & Polish** (Estimated: 2-3 days)

#### Step 5.1: Component Library Expansion (1-2 days)

---

## 🏗️ **SIMPLIFIED ARCHITECTURE**

```
┌─────────────────────────────────────────────────────┐
│  SINGLE DATA FORMAT (Puck JSON)                    │
│  {                                                   │
│    content: [...components],                        │
│    root: { header: [...], footer: [...] }          │
│  }                                                   │
└─────────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴──────────────┐
        │                             │
┌───────▼──────────┐      ┌──────────▼─────────┐
│  EDITOR (Puck)   │      │  PUBLIC (Render)   │
│  useTheme()      │      │  useTheme()        │
│  Components      │      │  Components        │
│  resolve theme   │      │  resolve theme     │
└──────────────────┘      └────────────────────┘
```

### Data Flow
1. **Editor**: Components use `useTheme()` to get theme values
2. **Save Draft**: Store raw Puck JSON in `puck_data`
3. **Publish**: Merge navigation into `puck_data_published`
4. **Public**: Return pre-compiled JSON with navigation included
5. **No runtime merging** - Everything ready to render

### Navigation Compilation Strategy
```php
// When page is published, merge navigation data
{
  "content": [...],           // Puck components
  "root": {
    "props": { "title": "..." }
  },
  "metadata": {               // ← Navigation merged here!
    "navigations": {
      "main-menu": { "items": [...] },
      "footer-menu": { "items": [...] }
    }
  }
}
```

**Benefits:**
- ✅ **Single API call** - Page + navigation in one JSON
- ✅ **No runtime merging** - Pre-compiled on publish
- ✅ **Fast public rendering** - JSON ready to use
- ✅ **Cache friendly** - Static JSON response
- ✅ **No Blade needed** - Pure React + JSON

**Trigger Recompilation:**
- When page is published
- When navigation is updated (webhook/observer)
- Manual "rebuild" action if needed

### Component Pattern
```tsx
export const Button: ComponentConfig<ButtonProps> = {
  render: ({ text, variant }) => {
    const theme = useTheme(); // Works in editor AND public
    
    return (
      <button style={{
        backgroundColor: theme.resolve(`colors.${variant}`),
        padding: theme.resolve('spacing.4')
      }}>
        {text}
      </button>
    );
  }
};
```

---

## 📋 **SIMPLIFIED IMPLEMENTATION PLAN**

### PHASE 1: Database & API (2 hours)

#### Step 1.1: Database Schema
```sql
-- Simple pages table
CREATE TABLE pages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  puck_data JSON NOT NULL,              -- Raw Puck JSON (editor data)
  puck_data_published JSON NULL,        -- Merged with navigation for public
  status ENUM('draft', 'published') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tenant_slug (tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### Step 1.2: Laravel Model
```php
// app/Models/Page.php
class Page extends Model
{
    protected $fillable = [
        'tenant_id', 'title', 'slug', 'puck_data', 
        'puck_data_published', 'status', 'published_at'
    ];
    
    protected $casts = [
        'puck_data' => 'array',
        'puck_data_published' => 'array',
        'published_at' => 'datetime'
    ];
    
    public function tenant() {
        return $this->belongsTo(Tenant::class);
    }
    
    /**
     * Compile page with ALL global data for static storefront rendering
     * Zero database hits needed - everything pre-compiled into JSON
     */
    public function compileForPublic(): void
    {
        $metadata = [];
        
        // 1. NAVIGATIONS (header, footer, sidebar menus)
        $navigations = Navigation::where('tenant_id', $this->tenant_id)
            ->where('status', 'published')
            ->get()
            ->keyBy('slug')
            ->map(fn($nav) => $nav->structure);
        
        if ($navigations->isNotEmpty()) {
            $metadata['navigations'] = $navigations->toArray();
        }
        
        // 2. TENANT SETTINGS (branding, contact, SEO)
        $settings = app(\App\Settings\TenantSettings::class);
        $metadata['settings'] = [
            'site_title' => $settings->site_title,
            'site_description' => $settings->site_description,
            'logo_url' => $settings->logo_url,
            'favicon_url' => $settings->favicon_url,
            'social_links' => $settings->social_links,     // FB, Twitter, Instagram, etc.
            'seo_meta' => $settings->seo_meta,              // Default OG tags, meta descriptions
            'maintenance_mode' => $settings->maintenance_mode,
        ];
        
        // 3. THEME DATA (colors, typography, spacing)
        // If theme is in database (vs file-based)
        $activeTheme = Theme::where('tenant_id', $this->tenant_id)
            ->where('is_active', true)
            ->first();
        
        if ($activeTheme) {
            $metadata['theme'] = $activeTheme->theme_data;
        }
        
        // 4. CONTACT INFORMATION (for footers, contact pages)
        $metadata['contact'] = [
            'email' => $settings->social_links['email'] ?? null,
            'phone' => $settings->social_links['phone'] ?? null,
            'address' => $settings->social_links['address'] ?? null,
        ];
        
        // 5. LEGAL LINKS (privacy, terms, cookies)
        // These rarely change, perfect for static inclusion
        $metadata['legal'] = [
            'privacy_policy_url' => '/legal/privacy',
            'terms_of_service_url' => '/legal/terms',
            'cookie_policy_url' => '/legal/cookies',
        ];
        
        // 6. GLOBAL WIDGETS (newsletter forms, social feeds, etc.)
        // Future: Store reusable components
        // $metadata['widgets'] = Widget::active()->forTenant($this->tenant_id)->get();
        
        // 7. SITE STRUCTURE (for breadcrumbs, sitemaps)
        // Could include page hierarchy if needed
        // $metadata['site_structure'] = Page::published()->select('id', 'title', 'slug', 'parent_id')->get();
        
        // Merge everything into published data
        $this->puck_data_published = array_merge($this->puck_data, [
            'metadata' => $metadata
        ]);
        
        $this->save();
    }
}
```

#### Step 1.3: API Routes & Controllers
```php
// routes/tenant.php
Route::middleware(['auth:api'])->group(function () {
    Route::apiResource('pages', PageController::class);
    Route::post('pages/{page}/publish', [PageController::class, 'publish']);
});

// Public route (no auth)
Route::get('/pages/{slug}', [PublicPageController::class, 'show']);
```

```php
// app/Http/Controllers/Api/PageController.php
class PageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:pages,slug',
            'puck_data' => 'required|array',
            'status' => 'in:draft,published'
        ]);
        
        $page = Page::create([
            'tenant_id' => tenant('id'),
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'puck_data' => $validated['puck_data'],
            'status' => $validated['status'] ?? 'draft'
        ]);
        
        // Auto-compile on creation if published
        if ($page->status === 'published') {
            $page->compileForPublic();
        }
        
        return response()->json(['data' => $page]);
    }
    
    public function update(Request $request, Page $page)
    {
        $validated = $request->validate([
            'title' => 'string|max:255',
            'slug' => 'string|max:255|unique:pages,slug,' . $page->id,
            'puck_data' => 'array',
            'status' => 'in:draft,published'
        ]);
        
        $page->update($validated);
        
        // Recompile if published
        if ($page->status === 'published') {
            $page->compileForPublic();
        }
        
        return response()->json(['data' => $page]);
    }
    
    public function publish(Page $page)
    {
        $page->update([
            'status' => 'published',
            'published_at' => now()
        ]);
        
        // Compile navigation into published JSON
        $page->compileForPublic();
        
        return response()->json([
            'message' => 'Page published successfully',
            'data' => $page
        ]);
    }
}
```

```php
// app/Http/Controllers/Api/PublicPageController.php
class PublicPageController extends Controller
{
    public function show($slug)
    {
        $page = Page::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();
        
        // Return pre-compiled JSON with navigation merged
        return response()->json([
            'data' => $page->puck_data_published ?? $page->puck_data
        ]);
    }
}
```

```php
// app/Http/Controllers/Api/PublicPageController.php
class PublicPageController extends Controller
{
    public function show($slug)
    {
        $page = Page::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();
        
        // Return pre-compiled JSON with navigation merged
        return response()->json([
            'data' => $page->puck_data_published ?? $page->puck_data
        ]);
    }
}
```

**Verification:**
- ✅ Pages table has both `puck_data` and `puck_data_published` columns
- ✅ Publishing triggers navigation merge
- ✅ Public API returns pre-compiled JSON
- ✅ No runtime overhead on storefront

**Example Flow:**

1. **Save Draft** (Editor)
```json
POST /api/pages
{
  "title": "Homepage",
  "slug": "home",
  "status": "draft",
  "puck_data": {
    "content": [
      { "type": "Hero", "props": { "title": "Welcome" } }
    ],
    "root": { "props": { "title": "Homepage" } }
  }
}
```

2. **Publish Page** (Triggers Compilation)
```json
POST /api/pages/1/publish
→ Fetches navigations from database
→ Merges into puck_data_published
```

3. **Public Request** (Storefront)
```json
GET /api/pages/home
Response:
{
  "data": {
    "content": [
      { "type": "Hero", "props": { "title": "Welcome" } }
    ],
    "root": { "props": { "title": "Homepage" } },
    "metadata": {
      "navigations": {
        "main-menu": {
          "items": [
            { "label": "Home", "url": "/" },
            { "label": "Products", "url": "/products" }
          ]
        },
        "footer-menu": {
          "items": [
            { "label": "About", "url": "/about" }
          ]
        }
      }
    }
  }
}
```

4. **React Rendering** (Everything Available Instantly)
```tsx
// ALL global data available in metadata!
const rootConfig = {
  render: ({ children, puck }) => {
    const { navigations, settings, widgets } = puck.metadata;
    
    return (
      <>
        <Header 
          items={navigations['main-menu']?.items}
          logo={settings.logo_url}
          siteName={settings.site_title}
        />
        
        <main>{children}</main>
        
        <Footer 
          items={navigations['footer-menu']?.items}
          socialLinks={settings.social_links}
          newsletter={widgets?.['footer-newsletter']}
        />
      </>
    );
  }
};

// Components can also access metadata
const Hero: ComponentConfig = {
  render: ({ title, puck }) => {
    const settings = puck.metadata.settings;
    
    return (
      <section>
        <h1>{title}</h1>
        {/* Can use global settings anywhere */}
        <img src={settings.logo_url} alt={settings.site_title} />
      </section>
    );
  }
};
```

**Future: Dynamic Widgets from Database**
```tsx
// Sidebar component can render widgets from metadata
const Sidebar: ComponentConfig = {
  render: ({ puck }) => {
    const widgets = puck.metadata.widgets || {};
    
    return (
      <aside>
        {Object.entries(widgets)
          .filter(([key]) => key.startsWith('sidebar-'))
          .map(([key, widget]) => (
            <Widget key={key} type={widget.type} props={widget.props} />
          ))
        }
      </aside>
    );
  }
};
```

**Auto-Recompilation on Global Data Changes:**
```php
// app/Observers/NavigationObserver.php
class NavigationObserver
{
    public function updated(Navigation $navigation)
    {
        // Recompile all published pages when navigation changes
        $this->recompilePublishedPages($navigation->tenant_id);
    }
    
    public function deleted(Navigation $navigation)
    {
        $this->recompilePublishedPages($navigation->tenant_id);
    }
    
    private function recompilePublishedPages(string $tenantId)
    {
        Page::where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->each(fn($page) => $page->compileForPublic());
    }
}

// app/Observers/TenantSettingsObserver.php
class TenantSettingsObserver
{
    public function updated()
    {
        // Recompile when logo, site title, or other settings change
        Page::where('tenant_id', tenant('id'))
            ->where('status', 'published')
            ->each(fn($page) => $page->compileForPublic());
    }
}

// Register observers in AppServiceProvider
public function boot()
{
    Navigation::observe(NavigationObserver::class);
    // Settings observer registered via spatie/laravel-settings
}
```

**Example Compiled JSON with ALL Global Data:**
```json
{
  "content": [
    { "type": "Hero", "props": { "title": "Welcome" } }
  ],
  "root": { "props": { "title": "Homepage" } },
  "metadata": {
    "navigations": {
      "main-menu": { "items": [...] },
      "footer-menu": { "items": [...] },
      "sidebar-menu": { "items": [...] }
    },
    "settings": {
      "site_title": "My Store",
      "logo_url": "/storage/logo.png",
      "favicon_url": "/storage/favicon.ico",
      "social_links": {
        "facebook": "https://...",
        "twitter": "https://..."
      },
      "seo_meta": {
        "default_description": "...",
        "og_image": "/storage/og.jpg"
      }
    },
    "widgets": {
      "footer-newsletter": {
        "type": "NewsletterForm",
        "props": { "endpoint": "/api/subscribe" }
      },
      "sidebar-recent-posts": {
        "type": "RecentPosts",
        "props": { "limit": 5 }
      }
    }
  }
}
```

**📋 Complete Checklist: What Gets Flushed to Static JSON**

For **static storefront pages**, compile these into `puck_data_published`:

✅ **Navigations** - All menus (header, footer, sidebar)  
✅ **Site Settings** - Title, description, logo, favicon  
✅ **Social Links** - Facebook, Twitter, Instagram, YouTube  
✅ **Contact Info** - Email, phone, address  
✅ **Theme Tokens** - Colors, typography, spacing (if DB-stored)  
✅ **SEO Defaults** - OG image, meta descriptions  
✅ **Legal Links** - Privacy, Terms, Cookies URLs  
✅ **Maintenance Mode** - Flag to show/hide site  

❌ **DON'T Flush (Keep Dynamic via API):**
- User sessions/auth state
- Shopping cart contents
- Product inventory/prices
- Search results
- Form CSRF tokens
- Comments/reviews
- Real-time analytics

**The Rule:** Flush if global, static, and needed immediately. Keep dynamic if user-specific or changes frequently.

**Result: Storefront = 1 JSON Request, ZERO Database Queries!** 🎯

---
- [ ] Migration runs
- [ ] Model works
- [ ] Can create/read pages via API

---

### PHASE 2: Theme Integration (3 hours)

#### Step 2.1: Update Components to Use Theme

**Pattern for ALL components:**
```tsx
import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/contexts/ThemeContext';

export const Heading: ComponentConfig<HeadingProps> = {
  fields: {
    text: { type: 'textarea' },
    level: { 
      type: 'select',
      options: [
        { label: 'H1', value: 'h1' },
        { label: 'H2', value: 'h2' },
        // ...
      ]
    }
  },
  defaultProps: {
    text: 'Heading',
    level: 'h2'
  },
  render: ({ text, level }) => {
    const theme = useTheme();
    const Tag = level;
    
    const styles = {
      fontSize: theme.resolve(`typography.sizes.${level}`),
      color: theme.resolve('colors.foreground'),
      fontFamily: theme.resolve('typography.fontFamilyHeading'),
      marginBottom: theme.resolve('spacing.4')
    };
    
    return <Tag style={styles}>{text}</Tag>;
  }
};
```

**Update These Components:**
1. ✅ Heading - Use theme typography
2. ✅ Text - Use theme typography + colors
3. ✅ Button - Use theme colors + spacing
4. ✅ Card - Use theme colors + shadows + borderRadius
5. ✅ Section - Use theme spacing + colors
6. ✅ Container - Use theme layout + spacing

**Verification:**
- [ ] Components render with theme values
- [ ] Changing theme updates components
- [ ] Works in both editor and preview

---

### PHASE 3: Puck Editor Integration (4 hours)

#### Step 3.1: Puck Config
```tsx
// resources/js/apps/central/config/puck-config.ts
import { Config } from '@measured/puck';
import {
  Heading, Text, Button, Card, Image,
  Section, Container, Grid, Flex
} from '@/shared/puck/components';

export const puckConfig: Config = {
  components: {
    // Layout
    Section,
    Container,
    Grid,
    Flex,
    
    // Content
    Heading,
    Text,
    Button,
    Card,
    Image
  },
  categories: {
    layout: {
      title: "Layout",
      components: ['Section', 'Container', 'Grid', 'Flex'],
      defaultExpanded: true
    },
    content: {
      title: "Content",
      components: ['Heading', 'Text', 'Button', 'Card', 'Image'],
      defaultExpanded: true
    }
  },
  root: {
    fields: {
      header: { 
        type: 'slot',
        label: 'Header Content'
      },
      footer: { 
        type: 'slot',
        label: 'Footer Content'
      }
    },
    defaultProps: {
      header: [],
      footer: []
    },
    render: ({ children, header: Header, footer: Footer }) => (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header>
          <Header />
        </header>
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <footer>
          <Footer />
        </footer>
      </div>
    )
  }
};
```

#### Step 3.2: Page Editor Component
```tsx
// resources/js/apps/central/components/pages/PageEditorPage.tsx
import { Puck } from '@measured/puck';
import { puckConfig } from '@/apps/central/config/puck-config';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import '@measured/puck/puck.css';

export function PageEditorPage() {
  const { id } = useParams();
  const [page, setPage] = useState(null);
  const { data: theme } = useTheme(); // From API
  
  useEffect(() => {
    if (id) {
      fetch(`/api/central/pages/${id}`)
        .then(r => r.json())
        .then(setPage);
    }
  }, [id]);
  
  const handlePublish = async (data) => {
    await fetch(`/api/central/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puck_data: data,
        status: 'published',
        published_at: new Date()
      })
    });
    toast.success('Page published!');
  };
  
  if (!page || !theme) return <div>Loading...</div>;
  
  return (
    <ThemeProvider theme={theme}>
      <Puck
        config={puckConfig}
        data={page.puck_data}
        onPublish={handlePublish}
        headerTitle={page.title}
      />
    </ThemeProvider>
  );
}
```

**Verification:**
- [ ] Editor loads with existing data
- [ ] Can drag/drop components
- [ ] Preview shows correct theme
- [ ] Save/publish works

---

### PHASE 4: Public Rendering (2 hours)

#### Step 4.1: Public Page Component
```tsx
// resources/js/apps/public/components/PageRenderer.tsx
import { Render } from '@measured/puck';
import { puckConfig } from '@/apps/central/config/puck-config';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

export function PageRenderer({ slug }: { slug: string }) {
  const [page, setPage] = useState(null);
  const [theme, setTheme] = useState(null);
  
  useEffect(() => {
    Promise.all([
      fetch(`/api/tenant/pages/${slug}`).then(r => r.json()),
      fetch('/api/tenant/theme').then(r => r.json())
    ]).then(([pageData, themeData]) => {
      setPage(pageData);
      setTheme(themeData);
      
      // Set meta tags
      document.title = pageData.title;
    });
  }, [slug]);
  
  if (!page || !theme) return <div>Loading...</div>;
  
  return (
    <ThemeProvider theme={theme}>
      <Render config={puckConfig} data={page.puck_data} />
    </ThemeProvider>
  );
}
```

#### Step 4.2: Router Setup
```tsx
// resources/js/apps/public/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageRenderer } from './components/PageRenderer';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageRenderer slug="home" />} />
        <Route path="/:slug" element={<PageRenderer />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Verification:**
- [ ] Pages render correctly
- [ ] Theme applies
- [ ] Navigation works
- [ ] Meta tags update

---

### PHASE 5: Page Management UI (3 hours)

#### Step 5.1: Page List
```tsx
// resources/js/apps/central/components/pages/PagesPage.tsx
import { useCrud } from '@/shared/hooks/useCrud';

export function PagesPage() {
  const {
    items: pages,
    loading,
    create,
    update,
    destroy
  } = useCrud('/api/central/pages');
  
  return (
    <PageContainer>
      <PageHeader
        title="Pages"
        description="Manage your pages"
        action={
          <Button onClick={() => navigate('/pages/create')}>
            <Plus className="w-4 h-4" />
            New Page
          </Button>
        }
      />
      
      <DataTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'slug', label: 'URL' },
          { key: 'status', label: 'Status' },
          { key: 'updated_at', label: 'Last Modified' }
        ]}
        data={pages}
        onEdit={(page) => navigate(`/pages/${page.id}/edit`)}
        onDelete={destroy}
      />
    </PageContainer>
  );
}
```

**Verification:**
- [ ] Can list pages
- [ ] Can create pages
- [ ] Can edit pages
- [ ] Can delete pages

---

### PHASE 6: Polish & Optimization (2 hours)

#### Step 6.1: Loading States
- Add skeleton loaders
- Show spinner while saving
- Handle errors gracefully

#### Step 6.2: Validation
- Validate slug format
- Check for duplicate slugs
- Validate required fields

#### Step 6.3: UX Improvements
- Auto-save drafts
- Keyboard shortcuts
- Confirm before delete

**Verification:**
- [ ] Good loading experience
- [ ] Validation prevents errors
- [ ] UX feels smooth

---

## ✨ **KEY SIMPLIFICATIONS**

### What We Removed
1. ❌ **Pre-compilation pipeline** - Too complex, not needed
2. ❌ **Separate ThemeProvider for editor** - Use existing one
3. ❌ **Theme parts + layouts** - Use root slots instead
4. ❌ **Complex navigation system** - Use root header/footer
5. ❌ **Multi-theme switching** - One theme per tenant (for now)
6. ❌ **Compiled vs raw JSON** - Single JSON format

### What We Kept
1. ✅ **Puck for editing** - Core value proposition
2. ✅ **Slot-based layouts** - Grid/Flex working well
3. ✅ **Theme system** - Already working
4. ✅ **Media library** - Already integrated
5. ✅ **Component library** - Simple, reusable
6. ✅ **Laravel backend** - Minimal changes

---

## 📊 **ESTIMATED TIMELINE**

| Phase | Description | Time |
|-------|-------------|------|
| 1 | Database & API | 2h |
| 2 | Theme Integration | 3h |
| 3 | Editor Integration | 4h |
| 4 | Public Rendering | 2h |
| 5 | Page Management | 3h |
| 6 | Polish | 2h |
| **TOTAL** | **Complete Implementation** | **16h (2 days)** |

---

## 🎓 **COMPONENT DEVELOPMENT GUIDE**

### Standard Component Template
```tsx
import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/contexts/ThemeContext';

export interface MyComponentProps {
  // Your props
}

export const MyComponent: ComponentConfig<MyComponentProps> = {
  label: "My Component",
  
  fields: {
    // Define fields
  },
  
  defaultProps: {
    // Set defaults
  },
  
  render: ({ ...props }) => {
    const theme = useTheme();
    
    // Use theme.resolve() for all theme values
    const styles = {
      color: theme.resolve('colors.primary'),
      padding: theme.resolve('spacing.4')
    };
    
    return <div style={styles}>Content</div>;
  }
};
```

### Theme Resolution Pattern
```tsx
// Colors
theme.resolve('colors.primary')        // #3b82f6
theme.resolve('colors.secondary')      // #8b5cf6

// Typography
theme.resolve('typography.sizes.h1')         // 3rem
theme.resolve('typography.fontFamilyHeading') // Inter

// Spacing
theme.resolve('spacing.4')             // 1rem
theme.resolve('spacing.8')             // 2rem

// Border Radius
theme.resolve('borderRadius.md')       // 0.375rem

// Shadows
theme.resolve('shadows.lg')            // 0 10px 15px...
```

### Slot Component Pattern
```tsx
export const Container: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      label: 'Content'
    }
  },
  render: ({ content: Content }) => {
    const theme = useTheme();
    
    return (
      <div style={{
        maxWidth: theme.resolve('layout.contentSize'),
        padding: theme.resolve('spacing.6')
      }}>
        <Content />
      </div>
    );
  }
};
```

---

## 🚀 **NEXT STEPS**

1. **Review this simplified plan** - Make sure it makes sense
2. **Run Phase 1** - Database + API (2h)
3. **Run Phase 2** - Update components to use theme (3h)
4. **Run Phase 3** - Integrate Puck editor (4h)
5. **Run Phase 4** - Public rendering (2h)
6. **Run Phase 5** - Page management (3h)
7. **Run Phase 6** - Polish (2h)

**Total: 2 days of focused work**

---

## 💡 **BENEFITS OF THIS APPROACH**

1. **Simple** - Easy to understand and maintain
2. **Fast** - 16 hours vs weeks
3. **Portable** - Clean JSON, no vendor lock-in
4. **Flexible** - Easy to extend later
5. **Proven** - Based on Puck best practices
6. **Maintainable** - Less code, less complexity

---

## 📚 **RESOURCES**

- **Puck Docs**: https://puckeditor.com/docs
- **Puck Demo**: https://demo.puckeditor.com
- **GitHub**: https://github.com/measuredco/puck
- **Discord**: https://discord.gg/D9e4E3MQVZ

---

## � **PUCK CORE CONCEPTS & BEST PRACTICES**

This section documents essential Puck concepts to help us build components the right way and avoid common pitfalls.

---

### **1. Component Configuration Basics**

#### TypeScript Type Safety
Always strictly type your Puck config for better DX:

```typescript
import type { Config } from "@measured/puck";

type Components = {
  HeadingBlock: {
    title: string;
    level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  };
  ButtonBlock: {
    text: string;
    variant: 'primary' | 'secondary' | 'outline';
  };
};

const config: Config<Components> = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: 'text' },
        level: { 
          type: 'select',
          options: [
            { label: 'H1', value: 'h1' },
            { label: 'H2', value: 'h2' },
            // ...
          ]
        }
      },
      render: ({ title, level }) => {
        const Tag = level;
        return <Tag>{title}</Tag>;
      }
    }
  }
};
```

**Benefits:**
- ✅ Autocomplete for props
- ✅ Type errors caught at compile time
- ✅ Better refactoring support

#### Component Structure

Every component has these optional parameters:

```typescript
const MyComponent: ComponentConfig = {
  // Display name in editor sidebar
  label: "My Component",
  
  // User input fields
  fields: {
    title: { type: 'text' }
  },
  
  // Default values when inserted
  defaultProps: {
    title: 'Hello, world'
  },
  
  // Render function (required)
  render: ({ title, puck }) => <h1>{title}</h1>,
  
  // Remove wrapper div (for advanced layouts)
  inline: false,
  
  // Additional metadata (accessible in render)
  metadata: {
    category: 'content'
  },
  
  // Set permissions
  permissions: {
    delete: true,
    duplicate: true
  },
  
  // Dynamic prop resolution (async)
  resolveData: async ({ props }) => ({ props }),
  
  // Dynamic field configuration
  resolveFields: (data) => ({}),
  
  // Dynamic permissions
  resolvePermissions: (data) => ({})
};
```

#### Special Render Props

The `render` function receives special props from Puck:

```typescript
render: ({ title, puck }) => {
  // puck.dragRef - Required when using inline: true
  // puck.isEditing - Boolean, true when in <Puck> editor
  // puck.metadata - Global + component metadata merged
  // puck.renderDropZone - For RSC compatibility (use slot field instead)
  
  return (
    <div ref={puck.isEditing ? puck.dragRef : undefined}>
      {title}
    </div>
  );
}
```

**Key insight:** Use `puck.isEditing` to show editor-only UI elements (drag handles, placeholders, etc.)

---

### **2. Data Model Understanding**

#### The Data Structure

Puck produces a JSON payload with this structure:

```json
{
  "content": [
    {
      "type": "HeadingBlock",
      "props": {
        "id": "HeadingBlock-1234",
        "title": "Hello, world"
      }
    },
    {
      "type": "ButtonBlock",
      "props": {
        "id": "ButtonBlock-5678",
        "text": "Click me",
        "variant": "primary"
      }
    }
  ],
  "root": {
    "props": {
      "title": "My Page"
    }
  },
  "zones": {
    "Section-123:content": [
      {
        "type": "Container",
        "props": {
          "id": "Container-456"
        }
      }
    ]
  }
}
```

**Key Points:**
- **content[]** - Array of components in the main content area
- **root** - Props for the root component (wraps everything)
- **zones** - Object with nested content areas (being replaced by slot fields)
- **type** - Component name (must match config key)
- **props.id** - Auto-generated unique ID for each instance

Architectural note (Nov 2025):
- Authoring stores portable raw JSON (editor-oriented, may include token references and placeholders)
- Publishing stores a compiled JSON (public-oriented) where theme tokens are resolved to concrete values and external data is embedded
- The public site will prefer compiled JSON when available

#### Slot Fields vs Zones

**Old way (zones, being deprecated):**
```typescript
// Don't use this anymore
<DropZone zone="my-content" />
```

**New way (slot fields):**
```typescript
fields: {
  content: {
    type: 'slot',
    label: 'Content'
  }
}

render: ({ content: Content }) => {
  return <Content />;
}
```

**In Data:**
Slot data is stored directly in props, not in zones:
```json
{
  "type": "Section",
  "props": {
    "id": "Section-123",
    "content": [
      { "type": "Heading", "props": { "id": "Heading-456", "text": "Hi" } }
    ]
  }
}
```

---

### **3. Overlay Portals for Interactive Elements**

Overlay portals let you make elements interactive in the editor preview.

**Problem:** By default, Puck overlays all components to enable drag-drop. This blocks clicks, hovers, etc.

**Solution:** Register elements as "portals" to disable the overlay:

```typescript
import { registerOverlayPortal } from "@measured/puck";

const TabsBlock: ComponentConfig = {
  render: ({ tabs }) => {
    const tabsRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (tabsRef.current) {
        // Disable overlay on these buttons
        registerOverlayPortal(tabsRef.current);
      }
    }, [tabsRef.current]);
    
    return (
      <div>
        <div ref={tabsRef} className="tab-buttons">
          {tabs.map(tab => (
            <button onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <div>{/* Tab content */}</div>
      </div>
    );
  }
};
```

**Use Cases:**
- ✅ Clickable tabs/accordions in editor
- ✅ Interactive forms preview
- ✅ Carousel navigation
- ✅ Modal triggers
- ✅ Any element that should respond to user interaction

---

### **4. Composition - Custom Editor Layouts**

Puck supports compositional patterns for custom editor interfaces.

**Default Editor:**
```typescript
<Puck config={config} data={data} onPublish={handlePublish} />
```

**Custom Layout:**
```typescript
import { Puck } from "@measured/puck";

function CustomEditor() {
  return (
    <Puck config={config} data={data}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
        {/* Left: Component library */}
        <div>
          <h2>Components</h2>
          <Puck.Components />
        </div>
        
        {/* Right: Preview + Fields */}
        <div>
          <Puck.Preview />
          <Puck.Fields />
        </div>
      </div>
    </Puck>
  );
}
```

**Available Components:**
- **`<Puck.Components />`** - Draggable component list
- **`<Puck.Fields />`** - Fields for selected item
- **`<Puck.Outline />`** - Interactive outline tree
- **`<Puck.Preview />`** - Drag-drop preview canvas

**Helper Components:**
- **`<Drawer>`** - Generic draggable list
- **`<Drawer.Item>`** - Individual draggable item
- **`<FieldLabel>`** - Styled label for custom fields

**When to use:**
- 🔄 Custom editor layouts (3-panel, full-screen, etc.)
- 🔄 Embed Puck in existing admin UI
- 🔄 Add custom toolbars, sidebars
- 🔄 Multi-language editor switcher

---

### **5. Field Transforms for Custom Rendering**

Field transforms modify how props render in the editor (not on public site).

**Example: Inline Text Editing**

```typescript
const fieldTransforms = {
  text: ({ value }) => {
    const ref = useRef<HTMLParagraphElement>(null);
    
    useEffect(() => {
      if (ref.current) {
        registerOverlayPortal(ref.current);
      }
    }, [ref.current]);
    
    return (
      <p ref={ref} contentEditable suppressContentEditableWarning>
        {value}
      </p>
    );
  }
};

<Puck config={config} fieldTransforms={fieldTransforms} />
```

**Use Cases:**
- ✅ Inline text editing (WYSIWYG)
- ✅ Custom field preview rendering
- ✅ Rich visualizations of data
- ✅ Transform data before showing in editor

**Important:** Field transforms ONLY apply in `<Puck>` editor, not in `<Render>` for public site.

---

### **6. Internal Puck API**

Access Puck's internal state for advanced customization.

#### Within Render Lifecycle (usePuck)

```typescript
import { createUsePuck } from "@measured/puck";

const usePuck = createUsePuck();

function MyCustomComponent() {
  // Use selector to limit re-renders
  const selectedType = usePuck(s => s.selectedItem?.type);
  const data = usePuck(s => s.appState.data);
  
  return (
    <div>
      Selected: {selectedType || 'Nothing'}
      Total components: {data.content.length}
    </div>
  );
}
```

#### Outside Render Lifecycle (useGetPuck)

```typescript
import { useGetPuck } from "@measured/puck";

function MyComponent() {
  const getPuck = useGetPuck();
  
  const handleClick = useCallback(() => {
    const puck = getPuck();
    console.log(puck.appState.data);
    console.log(puck.selectedItem);
  }, [getPuck]);
  
  return <button onClick={handleClick}>Log State</button>;
}
```

**PuckApi Properties:**
- **`appState`** - Full editor state
- **`appState.data`** - The Data object
- **`selectedItem`** - Currently selected component
- **`history`** - Undo/redo state

**When to use:**
- 🔄 Custom fields that need editor state
- 🔄 UI overrides that respond to selection
- 🔄 Custom toolbars with component actions
- 🔄 Analytics/debugging tools

---

### **7. Config Structure Reference**

```typescript
const config: Config = {
  // Required: Component definitions
  components: {
    HeadingBlock: {
      label: "Heading",
      fields: {},
      defaultProps: {},
      render: () => <h1>Hi</h1>
    }
  },
  
  // Optional: Root component (wraps everything)
  root: {
    fields: {
      title: { type: 'text' }
    },
    render: ({ children, title }) => (
      <html>
        <head><title>{title}</title></head>
        <body>{children}</body>
      </html>
    )
  },
  
  // Optional: Categories for sidebar
  categories: {
    layout: {
      title: "Layout",
      components: ["Section", "Container"],
      visible: true,
      defaultExpanded: true
    },
    content: {
      title: "Content",
      components: ["Heading", "Text"],
      visible: true,
      defaultExpanded: false
    },
    // Special category for uncategorized
    other: {
      title: "Other",
      defaultExpanded: false
    }
  }
};
```

**Category Best Practices:**
- ✅ Group related components (Layout, Content, Media, Forms)
- ✅ Keep categories collapsed by default except most-used
- ✅ Use descriptive titles
- ✅ Hide advanced categories initially

---

### **8. Permissions System**

Control what users can do with components.

#### Global Permissions

```typescript
<Puck
  config={config}
  permissions={{
    delete: true,
    duplicate: true,
    insert: true
  }}
/>
```

#### Component-Level Permissions

```typescript
const HeadingBlock: ComponentConfig = {
  permissions: {
    delete: false, // Can't delete any heading
    duplicate: true
  },
  render: ({ title }) => <h1>{title}</h1>
};
```

#### Dynamic Permissions (resolvePermissions)

```typescript
const HeadingBlock: ComponentConfig = {
  resolvePermissions: ({ props }, { permissions }) => {
    // Disable deletion for H1 headings
    if (props.level === 'h1') {
      return {
        delete: false,
        duplicate: false
      };
    }
    
    return permissions; // Inherit
  }
};
```

**Available Permissions:**
- **delete** - Can delete component
- **duplicate** - Can duplicate component
- **insert** - Can insert new components (global only)

**Use Cases:**
- 🔄 Protect critical components (header, footer)
- 🔄 Enforce structure (require H1, disable multiple)
- 🔄 Role-based editing restrictions
- 🔄 Template lock-down (some areas editable, others not)

---

### **9. Performance Best Practices**

#### Prevent Unnecessary API Calls

```typescript
resolveData: async ({ props }, { changed, lastData }) => {
  // GOOD: Only fetch when ID changes
  if (!changed.postId) {
    return lastData; // Return cached data
  }
  
  const post = await fetch(`/api/posts/${props.postId}`).then(r => r.json());
  return { props: { title: post.title } };
}
```

#### Optimize resolveFields

```typescript
resolveFields: async (data, { changed, lastFields }) => {
  // GOOD: Only update when category changes
  if (!changed.category) {
    return lastFields;
  }
  
  const products = await fetch(`/api/categories/${data.props.category}/products`)
    .then(r => r.json());
  
  return {
    category: {
      type: 'select',
      options: [/* ... */]
    },
    product: {
      type: 'select',
      options: products.map(p => ({ label: p.name, value: p.id }))
    }
  };
}
```

#### Use Selectors in usePuck

```typescript
// BAD: Re-renders on every state change
const puck = usePuck();

// GOOD: Only re-renders when data changes
const data = usePuck(s => s.appState.data);

// BETTER: Only re-renders when content length changes
const contentLength = usePuck(s => s.appState.data.content.length);
```

---

### **10. Quick Reference Checklist**

#### When Creating a Component

- [ ] Define TypeScript types for props
- [ ] Set appropriate `label` for sidebar
- [ ] Define `fields` for user input
- [ ] Set `defaultProps` for better UX
- [ ] Use `puck.isEditing` to hide/show editor-only UI
- [ ] Consider `inline: true` for advanced layouts
- [ ] Add to appropriate `category`
- [ ] Test with theme values (if using theme system)

#### When Using Advanced Features

- [ ] Use `resolveData` for API calls and computed props
- [ ] Mark computed fields as `readOnly`
- [ ] Use `changed` param to prevent duplicate calls
- [ ] Use `resolveFields` for conditional fields
- [ ] Use `external` field type for data selection
- [ ] Use `registerOverlayPortal` for interactive elements
- [ ] Use slot fields (not DropZones)
- [ ] Restrict slot contents with `allow`/`disallow`

#### Data Model

- [ ] Understand `content`, `root`, `zones` structure
- [ ] Know that slot data is in props, not zones
- [ ] Remember zones are deprecated
- [ ] Store portable JSON (no functions, no refs)
- [ ] Use `id` prop for component identification

#### Performance

- [ ] Check `changed` before async operations
- [ ] Return `lastData` or `lastFields` when nothing changes
- [ ] Use selectors in `usePuck` to limit re-renders
- [ ] Debounce search in external fields
- [ ] Cache API responses when possible

---

## �📋 **Step-by-Step Implementation Plan**
### Priority: Critical → High → Medium → Low

---

## **PHASE 1: Foundation & Setup** (Days 1-2)
**Priority:** 🔴 CRITICAL

### Step 1.1: Install Dependencies & Setup
**Time:** 30 minutes  
**Priority:** 🔴 CRITICAL

```bash
# Install Puck and dependencies
npm install @measured/puck@latest
npm install @tohuhono/puck-rich-text@latest # Rich text editor component
npm install react-router-dom@latest # For app-like routing
npm install @dnd-kit/core @dnd-kit/sortable # For menu builder drag-drop
```

**Files to create:**
- `resources/js/apps/tenant/main.tsx` - Tenant app entry point
- `vite.config.ts` - Add tenant app build entry

**Verification:**
- [ ] Puck installs without errors
- [ ] Vite builds tenant app successfully
- [ ] React Router works

---

### Step 1.2: Database Schema for Pages & Themes
**Time:** 1 hour  
**Priority:** 🔴 CRITICAL

**Tables to create:**
```sql
-- Themes
CREATE TABLE themes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  config JSON NOT NULL, -- theme.json structure
  preview_image VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pages
CREATE TABLE pages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  puck_data JSON NOT NULL, -- Puck's data payload
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  is_homepage BOOLEAN DEFAULT false,
  template VARCHAR(100) DEFAULT 'default',
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tenant_slug (tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_slug (slug)
);

-- Navigation Menus
CREATE TABLE navigation_menus (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  location VARCHAR(100) DEFAULT 'primary', -- primary, footer, mobile
  items JSON NOT NULL, -- Menu structure
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tenant_slug (tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tenant Theme Settings
ALTER TABLE tenants ADD COLUMN theme_id BIGINT NULL;
ALTER TABLE tenants ADD COLUMN theme_customization JSON NULL; -- Color overrides, logo, etc.
ALTER TABLE tenants ADD FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE SET NULL;
```

**Migrations to create:**
- `2025_10_22_create_themes_table.php`
- `2025_10_22_create_pages_table.php`
- `2025_10_22_create_navigation_menus_table.php`
- `2025_10_22_add_theme_to_tenants_table.php`

**Verification:**
- [ ] Migrations run successfully
- [ ] Foreign keys work correctly
- [ ] Can insert test data

---

### Step 1.3: Laravel Models & Relationships
**Time:** 1 hour  
**Priority:** 🔴 CRITICAL

**Models to create:**
```php
// app/Models/Theme.php
class Theme extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'config', 'preview_image', 'is_active'];
    protected $casts = ['config' => 'array', 'is_active' => 'boolean'];
    
    public function tenants() {
        return $this->hasMany(Tenant::class);
    }
}

// app/Models/Page.php
class Page extends Model
{
    protected $fillable = [
        'tenant_id', 'title', 'slug', 'puck_data', 
        'seo_title', 'seo_description', 'seo_keywords',
        'status', 'published_at', 'is_homepage', 'template',
        'created_by', 'updated_by'
    ];
    
    protected $casts = [
        'puck_data' => 'array',
        'is_homepage' => 'boolean',
        'published_at' => 'datetime'
    ];
    
    public function tenant() {
        return $this->belongsTo(Tenant::class);
    }
    
    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }
}

// app/Models/NavigationMenu.php
class NavigationMenu extends Model
{
    protected $fillable = ['tenant_id', 'name', 'slug', 'location', 'items'];
    protected $casts = ['items' => 'array'];
    
    public function tenant() {
        return $this->belongsTo(Tenant::class);
    }
}

// Update app/Models/Tenant.php
public function theme() {
    return $this->belongsTo(Theme::class);
}

public function pages() {
    return $this->hasMany(Page::class);
}

public function navigationMenus() {
    return $this->hasMany(NavigationMenu::class);
}
```

**Verification:**
- [ ] Models created with correct relationships
- [ ] Casts work correctly
- [ ] Can query relationships

---

## **PHASE 2: Theme System** (Days 2-3)
**Priority:** 🔴 CRITICAL

### Step 2.1: Create theme.json Structure
**Time:** 2 hours  
**Priority:** 🔴 CRITICAL

**File:** `resources/themes/modern/theme.json`

```json
{
  "version": 1,
  "name": "Modern Theme",
  "slug": "modern",
  "description": "Clean, modern design with bold typography",
  "author": "ByteForge",
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#3b82f6", "name": "Primary Blue" },
        { "slug": "secondary", "color": "#8b5cf6", "name": "Purple" },
        { "slug": "accent", "color": "#f59e0b", "name": "Amber" },
        { "slug": "background", "color": "#ffffff", "name": "White" },
        { "slug": "foreground", "color": "#1f2937", "name": "Dark Gray" },
        { "slug": "muted", "color": "#6b7280", "name": "Gray" },
        { "slug": "border", "color": "#e5e7eb", "name": "Light Gray" }
      ],
      "gradients": [
        {
          "slug": "primary-gradient",
          "gradient": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          "name": "Primary Gradient"
        }
      ]
    },
    "typography": {
      "fontFamily": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "fontFamilyHeading": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "fontFamilyMono": "'JetBrains Mono', 'Fira Code', monospace",
      "fontSizes": [
        { "slug": "xs", "size": "0.75rem", "name": "Extra Small" },
        { "slug": "sm", "size": "0.875rem", "name": "Small" },
        { "slug": "base", "size": "1rem", "name": "Base" },
        { "slug": "lg", "size": "1.125rem", "name": "Large" },
        { "slug": "xl", "size": "1.25rem", "name": "Extra Large" },
        { "slug": "2xl", "size": "1.5rem", "name": "2X Large" },
        { "slug": "3xl", "size": "1.875rem", "name": "3X Large" },
        { "slug": "4xl", "size": "2.25rem", "name": "4X Large" },
        { "slug": "5xl", "size": "3rem", "name": "5X Large" }
      ],
      "fontWeights": {
        "light": 300,
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700,
        "extrabold": 800
      },
      "lineHeight": {
        "tight": 1.25,
        "snug": 1.375,
        "normal": 1.5,
        "relaxed": 1.625,
        "loose": 2
      }
    },
    "spacing": {
      "scale": {
        "0": "0",
        "px": "1px",
        "0.5": "0.125rem",
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem",
        "32": "8rem"
      }
    },
    "layout": {
      "contentSize": "1200px",
      "wideSize": "1400px",
      "containerPadding": "1.5rem"
    },
    "borderRadius": {
      "none": "0",
      "sm": "0.125rem",
      "md": "0.375rem",
      "lg": "0.5rem",
      "xl": "0.75rem",
      "2xl": "1rem",
      "full": "9999px"
    },
    "shadows": {
      "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
    }
  },
  "styles": {
    "global": {
      "body": {
        "fontFamily": "var(--font-family)",
        "fontSize": "var(--font-size-base)",
        "lineHeight": "var(--line-height-normal)",
        "color": "var(--color-foreground)",
        "backgroundColor": "var(--color-background)"
      }
    },
    "components": {
      "Button": {
        "borderRadius": "var(--border-radius-lg)",
        "paddingX": "1.5rem",
        "paddingY": "0.75rem",
        "fontWeight": "var(--font-weight-semibold)",
        "fontSize": "var(--font-size-base)",
        "transition": "all 0.2s ease",
        "variants": {
          "primary": {
            "backgroundColor": "var(--color-primary)",
            "color": "#ffffff",
            "hover": {
              "backgroundColor": "#2563eb"
            }
          },
          "secondary": {
            "backgroundColor": "var(--color-secondary)",
            "color": "#ffffff",
            "hover": {
              "backgroundColor": "#7c3aed"
            }
          },
          "outline": {
            "backgroundColor": "transparent",
            "color": "var(--color-primary)",
            "border": "2px solid var(--color-primary)",
            "hover": {
              "backgroundColor": "var(--color-primary)",
              "color": "#ffffff"
            }
          }
        },
        "sizes": {
          "sm": {
            "paddingX": "1rem",
            "paddingY": "0.5rem",
            "fontSize": "var(--font-size-sm)"
          },
          "md": {
            "paddingX": "1.5rem",
            "paddingY": "0.75rem",
            "fontSize": "var(--font-size-base)"
          },
          "lg": {
            "paddingX": "2rem",
            "paddingY": "1rem",
            "fontSize": "var(--font-size-lg)"
          }
        }
      },
      "Heading": {
        "fontFamily": "var(--font-family-heading)",
        "fontWeight": "var(--font-weight-bold)",
        "lineHeight": "var(--line-height-tight)",
        "color": "var(--color-foreground)",
        "marginBottom": "var(--spacing-4)",
        "levels": {
          "h1": {
            "fontSize": "var(--font-size-5xl)",
            "marginBottom": "var(--spacing-6)"
          },
          "h2": {
            "fontSize": "var(--font-size-4xl)",
            "marginBottom": "var(--spacing-5)"
          },
          "h3": {
            "fontSize": "var(--font-size-3xl)",
            "marginBottom": "var(--spacing-4)"
          },
          "h4": {
            "fontSize": "var(--font-size-2xl)",
            "marginBottom": "var(--spacing-3)"
          },
          "h5": {
            "fontSize": "var(--font-size-xl)",
            "marginBottom": "var(--spacing-2)"
          },
          "h6": {
            "fontSize": "var(--font-size-lg)",
            "marginBottom": "var(--spacing-2)"
          }
        }
      },
      "Text": {
        "fontSize": "var(--font-size-base)",
        "lineHeight": "var(--line-height-relaxed)",
        "color": "var(--color-foreground)",
        "marginBottom": "var(--spacing-4)"
      },
      "Container": {
        "maxWidth": "var(--layout-content-size)",
        "paddingX": "var(--layout-container-padding)",
        "marginX": "auto",
        "width": "100%"
      },
      "Section": {
        "paddingY": "var(--spacing-16)",
        "paddingX": "var(--spacing-4)"
      },
      "Card": {
        "backgroundColor": "var(--color-background)",
        "borderRadius": "var(--border-radius-xl)",
        "boxShadow": "var(--shadow-md)",
        "padding": "var(--spacing-6)",
        "border": "1px solid var(--color-border)"
      },
      "Image": {
        "borderRadius": "var(--border-radius-lg)"
      }
    }
  }
}
```

**Also create:**
- `resources/themes/classic/theme.json` - Traditional serif theme
- `resources/themes/bold/theme.json` - High contrast, large text
- `resources/themes/minimal/theme.json` - Clean, lots of whitespace

**Seeder:**
```php
// database/seeders/ThemeSeeder.php
class ThemeSeeder extends Seeder
{
    public function run()
    {
        $themes = ['modern', 'classic', 'bold', 'minimal'];
        
        foreach ($themes as $themeSlug) {
            $config = json_decode(
                file_get_contents(resource_path("themes/{$themeSlug}/theme.json")),
                true
            );
            
            Theme::create([
                'name' => $config['name'],
                'slug' => $config['slug'],
                'description' => $config['description'],
                'config' => $config,
                'is_active' => true
            ]);
        }
    }
}
```

**Verification:**
- [ ] All 4 theme.json files created
- [ ] Seeder runs successfully
- [ ] Themes in database with correct JSON

---

### Step 2.2: Theme Context Provider (Dashboard-only)
**Time:** 1.5 hours  
**Priority:** 🔴 CRITICAL

**File:** `resources/js/shared/contexts/ThemeContext.tsx`

```tsx
import React, { createContext, useContext, useEffect, useMemo } from 'react';

interface ThemeConfig {
  version: number;
  name: string;
  slug: string;
  settings: {
    color: {
      palette: Array<{ slug: string; color: string; name: string }>;
      gradients?: Array<{ slug: string; gradient: string; name: string }>;
    };
    typography: {
      fontFamily: string;
      fontFamilyHeading?: string;
      fontFamilyMono?: string;
      fontSizes: Array<{ slug: string; size: string; name: string }>;
      fontWeights: Record<string, number>;
      lineHeight: Record<string, number>;
    };
    spacing: {
      scale: Record<string, string>;
    };
    layout: {
      contentSize: string;
      wideSize: string;
      containerPadding: string;
    };
    borderRadius: Record<string, string>;
    shadows: Record<string, string>;
  };
  styles: {
    global: Record<string, any>;
    components: Record<string, any>;
  };
}

interface ProcessedTheme {
  raw: ThemeConfig;
  colors: Record<string, string>;
  typography: {
    fontFamily: string;
    fontFamilyHeading: string;
    fontFamilyMono: string;
    fontSizes: Record<string, string>;
    fontWeights: Record<string, number>;
    lineHeight: Record<string, number>;
  };
  spacing: Record<string, string>;
  layout: {
    contentSize: string;
    wideSize: string;
    containerPadding: string;
  };
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  components: Record<string, any>;
}

const ThemeContext = createContext<ProcessedTheme | null>(null);

export function ThemeProvider({ 
  theme, 
  children,
  customization = {}
}: { 
  theme: ThemeConfig; 
  children: React.ReactNode;
  customization?: Record<string, any>;
}) {
  const processedTheme = useMemo<ProcessedTheme>(() => {
    // Convert palette to colors object
    const colors = theme.settings.color.palette.reduce((acc, color) => ({
      ...acc,
      [color.slug]: customization.colors?.[color.slug] || color.color
    }), {});
    
    // Convert font sizes
    const fontSizes = theme.settings.typography.fontSizes.reduce((acc, size) => ({
      ...acc,
      [size.slug]: size.size
    }), {});
    
    return {
      raw: theme,
      colors,
      typography: {
        fontFamily: theme.settings.typography.fontFamily,
        fontFamilyHeading: theme.settings.typography.fontFamilyHeading || theme.settings.typography.fontFamily,
        fontFamilyMono: theme.settings.typography.fontFamilyMono || 'monospace',
        fontSizes,
        fontWeights: theme.settings.typography.fontWeights,
        lineHeight: theme.settings.typography.lineHeight
      },
      spacing: theme.settings.spacing.scale,
      layout: theme.settings.layout,
      borderRadius: theme.settings.borderRadius,
      shadows: theme.settings.shadows,
      components: theme.styles.components
    };
  }, [theme, customization]);
  
  // Inject CSS variables into DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Colors
    Object.entries(processedTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Typography
    root.style.setProperty('--font-family', processedTheme.typography.fontFamily);
    root.style.setProperty('--font-family-heading', processedTheme.typography.fontFamilyHeading);
    root.style.setProperty('--font-family-mono', processedTheme.typography.fontFamilyMono);
    
    Object.entries(processedTheme.typography.fontSizes).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    
    Object.entries(processedTheme.typography.fontWeights).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value.toString());
    });
    
    Object.entries(processedTheme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value.toString());
    });
    
    // Spacing
    Object.entries(processedTheme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Layout
    Object.entries(processedTheme.layout).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--layout-${cssKey}`, value);
    });
    
    // Border Radius
    Object.entries(processedTheme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value);
    });
    
    // Shadows
    Object.entries(processedTheme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }, [processedTheme]);
  
  return (
    <ThemeContext.Provider value={processedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ProcessedTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}

// Helper to get component styles
export function useComponentStyles(componentName: string) {
  const theme = useTheme();
  return theme.components[componentName] || {};
}
```

**Verification:**
- [ ] ThemeProvider injects CSS variables (editor/dashboard only)
- [ ] useTheme() hook works in Puck editor
- [ ] CSS variables accessible for previewing themes while authoring

Architectural note (Nov 2025): The public renderer will not rely on ThemeProvider at runtime; it consumes pre-compiled JSON.

---

## **PHASE 3: Basic Puck Components** (Days 3-4)
**Priority:** 🔴 CRITICAL

### Step 3.1: Core Component Library
**Time:** 4 hours  
**Priority:** 🔴 CRITICAL

**Create these components:**

#### 1. Button Component
**File:** `resources/js/shared/puck/components/Button.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';
import { useComponentStyles } from '@/shared/contexts/ThemeContext';

export interface ButtonProps {
  text: string;
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  href?: string;
  openInNewTab?: boolean;
}

export const ButtonBlock: ComponentConfig<ButtonProps> = {
  fields: {
    text: {
      type: 'text',
      label: 'Button Text'
    },
    variant: {
      type: 'select',
      label: 'Style',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Outline', value: 'outline' }
      ]
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' }
      ]
    },
    href: {
      type: 'text',
      label: 'Link URL (optional)'
    },
    openInNewTab: {
      type: 'radio',
      label: 'Open in new tab?',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
      ]
    }
  },
  defaultProps: {
    text: 'Click me',
    variant: 'primary',
    size: 'md',
    openInNewTab: false
  },
  render: ({ text, variant, size, href, openInNewTab }) => {
    const styles = useComponentStyles('Button');
    
    // Build Tailwind classes from theme
    const baseClasses = 'inline-flex items-center justify-center transition-all font-semibold cursor-pointer';
    const variantClasses = {
      primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90',
      secondary: 'bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90',
      outline: 'bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'
    };
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm rounded-[var(--border-radius-md)]',
      md: 'px-6 py-3 text-base rounded-[var(--border-radius-lg)]',
      lg: 'px-8 py-4 text-lg rounded-[var(--border-radius-xl)]'
    };
    
    const className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
    
    if (href) {
      return (
        <a 
          href={href} 
          className={className}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
        >
          {text}
        </a>
      );
    }
    
    return (
      <button className={className}>
        {text}
      </button>
    );
  }
};
```

#### 2. Heading Component
**File:** `resources/js/shared/puck/components/Heading.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface HeadingProps {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  align: 'left' | 'center' | 'right';
}

export const HeadingBlock: ComponentConfig<HeadingProps> = {
  fields: {
    text: {
      type: 'textarea',
      label: 'Heading Text'
    },
    level: {
      type: 'select',
      label: 'Heading Level',
      options: [
        { label: 'H1', value: 'h1' },
        { label: 'H2', value: 'h2' },
        { label: 'H3', value: 'h3' },
        { label: 'H4', value: 'h4' },
        { label: 'H5', value: 'h5' },
        { label: 'H6', value: 'h6' }
      ]
    },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' }
      ]
    }
  },
  defaultProps: {
    text: 'Heading',
    level: 'h2',
    align: 'left'
  },
  render: ({ text, level, align }) => {
    const Tag = level;
    const alignClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    
    const levelClasses = {
      h1: 'text-[var(--font-size-5xl)] mb-[var(--spacing-6)]',
      h2: 'text-[var(--font-size-4xl)] mb-[var(--spacing-5)]',
      h3: 'text-[var(--font-size-3xl)] mb-[var(--spacing-4)]',
      h4: 'text-[var(--font-size-2xl)] mb-[var(--spacing-3)]',
      h5: 'text-[var(--font-size-xl)] mb-[var(--spacing-2)]',
      h6: 'text-[var(--font-size-lg)] mb-[var(--spacing-2)]'
    };
    
    return (
      <Tag className={`font-bold leading-tight text-[var(--color-foreground)] ${levelClasses[level]} ${alignClass[align]}`}>
        {text}
      </Tag>
    );
  }
};
```

#### 3. Text Component
**File:** `resources/js/shared/puck/components/Text.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface TextProps {
  text: string;
  align: 'left' | 'center' | 'right' | 'justify';
  size: 'sm' | 'base' | 'lg' | 'xl';
}

export const TextBlock: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: 'textarea',
      label: 'Text Content'
    },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
        { label: 'Justify', value: 'justify' }
      ]
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Base', value: 'base' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' }
      ]
    }
  },
  defaultProps: {
    text: 'Enter your text here...',
    align: 'left',
    size: 'base'
  },
  render: ({ text, align, size }) => {
    const alignClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify'
    };
    
    const sizeClass = {
      sm: 'text-[var(--font-size-sm)]',
      base: 'text-[var(--font-size-base)]',
      lg: 'text-[var(--font-size-lg)]',
      xl: 'text-[var(--font-size-xl)]'
    };
    
    return (
      <p className={`leading-relaxed text-[var(--color-foreground)] mb-[var(--spacing-4)] ${alignClass[align]} ${sizeClass[size]}`}>
        {text}
      </p>
    );
  }
};
```

#### 3b. Rich Text Component (Using Plugin)
**File:** `resources/js/shared/puck/components/RichText.tsx`

**Installation:**
```bash
npm install @tohuhono/puck-rich-text@latest
```

**Usage:**
```tsx
import { PuckRichText, PuckRichTextProps } from '@tohuhono/puck-rich-text';

// In your puck config
export const puckConfig: Config = {
  components: {
    RichText: PuckRichText,
    // ... other components
  }
};
```

**Features:**
- ✅ Inline rich text editing
- ✅ Bold, italic, underline, strikethrough
- ✅ Headings (H1-H6)
- ✅ Lists (ordered, unordered)
- ✅ Links
- ✅ Code blocks
- ✅ Blockquotes
- ✅ Clean, minimal toolbar
- ✅ Works inside Puck editor

**Note:** This plugin provides a better editing experience than plain textarea. Highly recommended for content-heavy pages.

#### 4. Container Component
**File:** `resources/js/shared/puck/components/Container.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth: 'full' | 'wide' | 'content' | 'narrow';
  paddingY: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ContainerBlock: ComponentConfig<ContainerProps> = {
  fields: {
    children: {
      type: 'slot',
      label: 'Content'
    },
    maxWidth: {
      type: 'select',
      label: 'Max Width',
      options: [
        { label: 'Full Width', value: 'full' },
        { label: 'Wide', value: 'wide' },
        { label: 'Content', value: 'content' },
        { label: 'Narrow', value: 'narrow' }
      ]
    },
    paddingY: {
      type: 'select',
      label: 'Vertical Padding',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' }
      ]
    }
  },
  defaultProps: {
    maxWidth: 'content',
    paddingY: 'md'
  },
  render: ({ children, maxWidth, paddingY }) => {
    const widthClass = {
      full: 'max-w-full',
      wide: 'max-w-[var(--layout-wide-size)]',
      content: 'max-w-[var(--layout-content-size)]',
      narrow: 'max-w-3xl'
    };
    
    const paddingClass = {
      none: 'py-0',
      sm: 'py-[var(--spacing-8)]',
      md: 'py-[var(--spacing-12)]',
      lg: 'py-[var(--spacing-16)]',
      xl: 'py-[var(--spacing-24)]'
    };
    
    return (
      <div className={`mx-auto px-[var(--layout-container-padding)] w-full ${widthClass[maxWidth]} ${paddingClass[paddingY]}`}>
        {children}
      </div>
    );
  }
};
```

#### 5. Section Component
**File:** `resources/js/shared/puck/components/Section.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface SectionProps {
  children: React.ReactNode;
  backgroundColor: 'default' | 'primary' | 'secondary' | 'muted';
  fullWidth: boolean;
}

export const SectionBlock: ComponentConfig<SectionProps> = {
  fields: {
    children: {
      type: 'slot',
      label: 'Content'
    },
    backgroundColor: {
      type: 'select',
      label: 'Background Color',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Muted', value: 'muted' }
      ]
    },
    fullWidth: {
      type: 'radio',
      label: 'Full Width',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
      ]
    }
  },
  defaultProps: {
    backgroundColor: 'default',
    fullWidth: false
  },
  render: ({ children, backgroundColor, fullWidth }) => {
    const bgClass = {
      default: 'bg-[var(--color-background)]',
      primary: 'bg-[var(--color-primary)] text-white',
      secondary: 'bg-[var(--color-secondary)] text-white',
      muted: 'bg-gray-50'
    };
    
    return (
      <section className={`${bgClass[backgroundColor]} ${fullWidth ? 'w-full' : ''}`}>
        {children}
      </section>
    );
  }
};
```

#### 6. Columns Component
**File:** `resources/js/shared/puck/components/Columns.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface ColumnsProps {
  columns: number;
  gap: 'sm' | 'md' | 'lg' | 'xl';
  column1: React.ReactNode;
  column2: React.ReactNode;
  column3?: React.ReactNode;
  column4?: React.ReactNode;
}

export const ColumnsBlock: ComponentConfig<ColumnsProps> = {
  fields: {
    columns: {
      type: 'select',
      label: 'Number of Columns',
      options: [
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 }
      ]
    },
    gap: {
      type: 'select',
      label: 'Gap',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' }
      ]
    },
    column1: {
      type: 'slot',
      label: 'Column 1'
    },
    column2: {
      type: 'slot',
      label: 'Column 2'
    },
    column3: {
      type: 'slot',
      label: 'Column 3 (optional)'
    },
    column4: {
      type: 'slot',
      label: 'Column 4 (optional)'
    }
  },
  defaultProps: {
    columns: 2,
    gap: 'md'
  },
  render: ({ columns, gap, column1, column2, column3, column4 }) => {
    const gapClass = {
      sm: 'gap-[var(--spacing-4)]',
      md: 'gap-[var(--spacing-6)]',
      lg: 'gap-[var(--spacing-8)]',
      xl: 'gap-[var(--spacing-12)]'
    };
    
    const gridClass = {
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };
    
    return (
      <div className={`grid ${gridClass[columns]} ${gapClass[gap]}`}>
        <div>{column1}</div>
        <div>{column2}</div>
        {columns >= 3 && column3 && <div>{column3}</div>}
        {columns >= 4 && column4 && <div>{column4}</div>}
      </div>
    );
  }
};
```

**Verification:**
- [ ] All 6 basic components render correctly
- [ ] RichText plugin works with inline editing
- [ ] Slot fields work for Container/Section/Columns
- [ ] Theme styles apply to all components
- [ ] Fields show properly in Puck editor

---

### Step 3.2: Image Component with Media Library Picker
**Time:** 2 hours  
**Priority:** 🔴 CRITICAL

**File:** `resources/js/shared/puck/components/Image.tsx`

```tsx
// Use 'external' field type to pick from media library
export const ImageBlock: ComponentConfig<ImageProps> = {
  fields: {
    image: {
      type: 'external',
      label: 'Image',
      fetchList: async ({ query }) => {
        // Fetch from our media library API
        const response = await fetch(`/api/media?search=${query}`);
        const data = await response.json();
        return data.data.map(media => ({
          title: media.name,
          id: media.id,
          thumbnail: media.url
        }));
      },
      showSearch: true,
      placeholder: 'Search media library...'
    },
    alt: {
      type: 'text',
      label: 'Alt Text'
    },
    width: {
      type: 'select',
      label: 'Width',
      options: [
        { label: 'Full', value: 'full' },
        { label: 'Large', value: 'large' },
        { label: 'Medium', value: 'medium' },
        { label: 'Small', value: 'small' }
      ]
    }
  },
  // ... render function
};
```

**Verification:**
- [ ] Media library picker shows files
- [ ] Search works
- [ ] Selected image displays

---

## **PHASE 4: Navigation System** (Day 4-5)
**Priority:** 🟠 HIGH

### Step 4.1: Navigation Menu Builder UI
**Time:** 3 hours  
**Priority:** 🟠 HIGH

**Features:**
- Drag-drop menu items
- Nested menu support (dropdowns)
- Link types: Page, External URL, Custom
- Icon support (optional)
- Active state configuration

**File:** `resources/js/apps/tenant/components/pages/NavigationPage.tsx`

**Uses:**
- `@dnd-kit/core` for drag-drop
- `@dnd-kit/sortable` for reordering
- Recursive component for nested menus

**Verification:**
- [ ] Can create menu items
- [ ] Drag-drop reordering works
- [ ] Nesting works (2-3 levels)
- [ ] Saves to database
- [ ] Status options match backend ('draft' | 'published')

---

### Step 4.2: App-Like Routing System
**Time:** 2 hours  
**Priority:** 🟠 HIGH

**Setup React Router for Tenant Public Site:**

```tsx
// resources/js/apps/public/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageRenderer } from './components/PageRenderer';
import { Navigation } from './components/Navigation';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

export function App() {
  const [theme, setTheme] = useState(null);
  const [navigation, setNavigation] = useState(null);
  
  useEffect(() => {
    // Load tenant theme and navigation on mount
    Promise.all([
      fetch('/api/public/theme').then(r => r.json()),
      fetch('/api/public/navigation').then(r => r.json())
    ]).then(([themeData, navData]) => {
      setTheme(themeData);
      setNavigation(navData);
    });
  }, []);
  
  if (!theme || !navigation) return <div>Loading...</div>;
  
  return (
    <ThemeProvider theme={theme.config} customization={theme.customization}>
      <BrowserRouter>
        <Navigation menu={navigation} />
        <Routes>
          <Route path="/" element={<PageRenderer slug="home" />} />
          <Route path="/:slug" element={<PageRenderer />} />
          <Route path="*" element={<div>404</div>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

**Key Features:**
- No full page reload when clicking navigation
- Smooth page transitions
- Active link highlighting
- Back/forward button support

**Verification:**
- [ ] Navigation loads correctly
- [ ] Clicking links doesn't reload page
- [ ] Pages transition smoothly
- [ ] Active state works

---

## **PHASE 5: Page Builder Editor** (Days 5-6)
**Priority:** 🟠 HIGH

### Step 5.1: Page Editor Interface
**Time:** 3 hours  
**Priority:** 🟠 HIGH

**File:** `resources/js/apps/tenant/components/pages/PageEditorPage.tsx`

```tsx
import { Puck } from '@measured/puck';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { puckConfig } from '@/apps/tenant/config/puck-config';
import '@measured/puck/puck.css';

export function PageEditorPage() {
  const { id } = useParams();
  const [page, setPage] = useState(null);
  const [theme, setTheme] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Load page data and theme
  useEffect(() => {
    if (id) {
      fetch(`/api/tenant/pages/${id}`).then(r => r.json()).then(setPage);
    }
    fetch('/api/tenant/theme').then(r => r.json()).then(setTheme);
  }, [id]);
  
  const handlePublish = async (data) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puck_data: data,
          status: 'published'
        })
      });
      if (response.ok) {
        toast.success('Page published!');
      }
    } finally {
      setSaving(false);
    }
  };
  
  if (!theme || !page) return <div>Loading...</div>;
  
  return (
    <ThemeProvider theme={theme.config} customization={theme.customization}>
      <Puck
        config={puckConfig}
        data={page.puck_data}
        onPublish={handlePublish}
        renderHeader={({ children }) => (
          <div className="flex items-center justify-between p-4 border-b">
            <h1>{page.title}</h1>
            {children}
          </div>
        )}
      />
    </ThemeProvider>
  );
}
```

**Features:**
- Live preview while editing
- Auto-save drafts
- Publish/unpublish
- Viewport switcher (mobile/tablet/desktop)
- Undo/redo

**Verification:**
- [ ] Editor loads with page data
- [ ] Changes reflected in preview
- [ ] Save/publish works
- [ ] Viewport switcher works

---

### Step 5.2: Page List & Management
**Time:** 2 hours  
**Priority:** 🟠 HIGH

**Features:**
- List all pages
- Create new page
- Duplicate page
- Delete page
- Search/filter
- Status badges (draft/published)

**Use existing `useCrud` hook pattern from other pages.**

**Verification:**
- [ ] Page list loads
- [ ] CRUD operations work
- [ ] Search works

---

## **PHASE 6: Public Site Renderer** (Day 6-7)
**Priority:** 🟠 HIGH

### Step 6.1: Page Renderer Component (Compiled JSON)
**Time:** 2 hours  
**Priority:** 🟠 HIGH

```tsx
// resources/js/apps/public/components/PageRenderer.tsx
import { Render } from '@measured/puck';
import { puckConfig } from '@/apps/tenant/config/puck-config';
import { useParams } from 'react-router-dom';

export function PageRenderer({ slug }: { slug?: string }) {
  const params = useParams();
  const pageSlug = slug || params.slug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/public/pages/${pageSlug}`)
      .then(r => r.json())
      .then(data => {
        setPage(data);
        // Update meta tags for SEO
        document.title = data.seo_title || data.title;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', data.seo_description || '');
        }
      })
      .finally(() => setLoading(false));
  }, [pageSlug]);
  
  if (loading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;
  
  // Prefer compiled data for instant render
  return <Render config={puckConfig} data={page.puck_data_compiled ?? page.puck_data} />;
}
```

**Verification:**
- [ ] Pages render correctly (no flash of styles)
- [ ] SEO meta tags update
- [ ] Components styled correctly from compiled values
- [ ] No client requests from public components (e.g., Navigation)

### Step 6.2: Compilation Pipeline (New)
Implement a backend compiler that runs on save/publish:
- Input: raw Puck JSON, theme tokens, external references (navigation IDs, etc.)
- Process:
  - Resolve theme tokens to concrete values (e.g., colors, sizes)
  - Expand external references (embed navigation structures, media details as needed)
  - Compose global parts (header/footer/layout) into final render bundle
- Output: `puck_data_compiled` and/or `page_render_bundle`

Verification:
- [ ] Compiled JSON contains concrete styles and embedded data
- [ ] Public renderer uses compiled JSON without additional fetches

### Step 6.3: Invalidation Strategy (New)
- On Theme update (publish): recompile all impacted pages
- On Navigation update (publish): recompile pages containing that navigation
- On ThemePart/Layout update: recompile pages referencing them
- Use Laravel queues for background processing

---

## **PHASE 7: Theme Customization** (Day 7-8)
**Priority:** 🟡 MEDIUM

### Step 7.1: Theme Customizer UI
**Time:** 3 hours  
**Priority:** 🟡 MEDIUM

**Features:**
- Color picker for primary/secondary/accent
- Font family selector
- Logo upload
- Favicon upload
- Preview changes live
- Reset to theme defaults

**File:** `resources/js/apps/tenant/components/pages/ThemeCustomizerPage.tsx`

**Verification:**
- [ ] Color picker works
- [ ] Changes preview live (dashboard/editor)
- [ ] Save persists customization and triggers recompilation of affected pages
- [ ] Reset works

Architectural note (Nov 2025): Theme customizations impact compiled output; saving/publishing a theme or customization should enqueue page recompiles.

---

## New: Theme Parts and Layouts (Divi-style)

To avoid duplicating headers/footers across pages and to support variants/assignment rules:

### ThemePart Entity
- type: `header` | `footer` | `sidebar_left` | `sidebar_right` | `section`
- status: `draft` | `published`
- puck_data_raw, puck_data_compiled

### Layout Entity
- header_id, footer_id, optional sidebars
- status: `draft` | `published`

### Page Composition
- Page references a layout (or overrides header/footer)
- Compiler composes: header.compiled + page.compiled + footer.compiled into a render bundle

### Assignment Rules (Phase 2)
- Default header/footer
- By `page_type` or specific `page_ids`
- Resolution order: per-page override > layout > assignment > default

### Verification
- [ ] Build/edit/publish headers and footers once, reuse across pages
- [ ] Multiple variants supported and assignable
- [ ] Editing a header/footer triggers recompiles for dependent pages

---

## Performance and Routing Clarifications

- Public pages should not use ThemeProvider; they read compiled values
- Navigation links:
  - Internal (with `page_id`) → React Router SPA (<Link>)
  - Custom links (no `page_id`) → classic <a> with target
- Ensure navigation status uses `draft` | `published`
- Prefer skeletons over spinners in dashboard/editor; public should render instantly

---

## Migration Steps (from runtime resolution → pre-compiled)

1) Add compiler service in backend
2) Update page save/publish to write `puck_data_compiled`
3) Update Navigation component and others to support pre-injected data
4) Update PublicPage/PageRenderer to prefer compiled JSON
5) Add ThemePart/Layout models + editors
6) Add invalidation + queue jobs (theme, navigation, theme parts, layouts)
7) Gradually remove client-side fetches from public components

---

## **PHASE 8: Advanced Features** (Days 8-10)
**Priority:** 🟡 MEDIUM - ⚪ LOW

### Step 8.1: Advanced Components
**Time:** 4 hours  
**Priority:** 🟡 MEDIUM

**Components to add:**
- Gallery Block (grid of images)
- Video Block (YouTube/Vimeo embed)
- Testimonial Block
- Pricing Table Block
- FAQ/Accordion Block
- Form Block (contact form)
- Social Links Block
- Spacer Block

---

### Step 8.2: SEO Optimization
**Time:** 2 hours  
**Priority:** 🟡 MEDIUM

**Features:**
- Meta title/description per page
- Open Graph tags
- Twitter Card tags
- Canonical URLs
- Sitemap generation
- Robots.txt management

---

### Step 8.3: Performance Optimization
**Time:** 3 hours  
**Priority:** 🟡 MEDIUM

**Optimizations:**
- Image lazy loading
- Code splitting
- Bundle optimization
- CDN support
- Caching headers
- Preload critical resources

---

## **PHASE 9: Testing & Polish** (Days 10-11)
**Priority:** 🟡 MEDIUM

### Step 9.1: Testing
**Time:** 4 hours  
**Priority:** 🟡 MEDIUM

**Tests to create:**
- Page CRUD tests
- Navigation menu tests
- Theme application tests
- Puck data serialization tests
- Public page rendering tests

---

### Step 9.2: Documentation
**Time:** 2 hours  
**Priority:** ⚪ LOW

**Create:**
- User guide for page builder
- Theme development guide
- Component library docs
- API documentation

---

## 📚 **PUCK ADVANCED FEATURES GUIDE**

### Overview
Puck provides several advanced features for building sophisticated page builder components. Understanding these features helps us avoid reinventing the wheel and follow best practices.

---

## **1. Multi-Column Layouts (Slot Fields)**

### What It Is
The `slot` field type allows components to accept other components as children, enabling nested layouts and multi-column designs.

### Use Cases
- Container components (wrap other components)
- Column layouts (2, 3, 4 columns)
- Section components (full-width sections)
- Grid layouts (flexible positioning)

### Basic Usage - Nested Components

```tsx
const ContainerBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      label: 'Content'
    }
  },
  render: ({ content: Content }) => {
    return <Content />;
  }
};
```

### Fixed Layouts - Multiple Columns

```tsx
const TwoColumnsBlock: ComponentConfig = {
  fields: {
    leftColumn: {
      type: 'slot',
      label: 'Left Column'
    },
    rightColumn: {
      type: 'slot',
      label: 'Right Column'
    }
  },
  render: ({ leftColumn: LeftColumn, rightColumn: RightColumn }) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <LeftColumn />
        <RightColumn />
      </div>
    );
  }
};
```

### Fluid Layouts - CSS Grid/Flex

```tsx
const GridBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      label: 'Grid Items'
    },
    columns: {
      type: 'select',
      options: [
        { label: '2 Columns', value: '2fr 1fr' },
        { label: '3 Columns', value: '1fr 1fr 1fr' }
      ]
    }
  },
  render: ({ content: Content, columns }) => (
    <Content
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: 16
      }}
    />
  )
};
```

### Advanced - Inline Mode (No Wrapper)

For components that need to be direct children (e.g., grid items that use `grid-column`):

```tsx
const GridItemBlock: ComponentConfig = {
  inline: true, // Removes Puck's wrapper div
  fields: {
    text: { type: 'text' },
    spanCol: { 
      type: 'number',
      label: 'Column Span',
      min: 1,
      max: 4
    },
    spanRow: {
      type: 'number',
      label: 'Row Span',
      min: 1,
      max: 4
    }
  },
  render: ({ text, spanCol, spanRow, puck }) => (
    <div
      ref={puck.dragRef} // REQUIRED for inline components
      style={{
        gridColumn: `span ${spanCol}`,
        gridRow: `span ${spanRow}`
      }}
    >
      {text}
    </div>
  )
};
```

### Restricting Components

Limit which components can be dropped into a slot:

```tsx
const CardContainerBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      allow: ['Card'], // Only allow Card components
      // OR
      disallow: ['Button'] // Allow everything except Button
    }
  },
  render: ({ content: Content }) => <Content />
};

// With categories
const config = {
  categories: {
    typography: {
      components: ['Heading', 'Text']
    }
  },
  components: {
    Section: {
      fields: {
        content: {
          type: 'slot',
          allow: categories.typography.components
        }
      },
      render: ({ content: Content }) => <Content />
    }
  }
};
```

### Setting Default Props

Pre-populate slots when component is inserted:

```tsx
const HeroBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot'
    }
  },
  defaultProps: {
    content: [
      {
        type: 'Heading',
        props: {
          text: 'Welcome to our site',
          level: 'h1'
        }
      },
      {
        type: 'Text',
        props: {
          text: 'This is a pre-populated hero section'
        }
      },
      {
        type: 'Button',
        props: {
          text: 'Get Started',
          variant: 'primary'
        }
      }
    ]
  },
  render: ({ content: Content }) => <Content />
};
```

**Our Usage:**
- ✅ Already using `slot` in Section, Container, Columns components
- ✅ Consider adding `allow`/`disallow` for better UX
- ✅ Use `defaultProps` with slots for demo templates
- ✅ Use `inline: true` if we build advanced grid components

---

## **2. Dynamic Props (resolveData)**

### What It Is
`resolveData` allows you to modify component props after the user changes them. Useful for API calls, computed values, and making fields read-only.

### Use Cases
- Fetch data from APIs based on user selection
- Compute values from other props
- Sync external data sources
- Set fields as read-only based on conditions

### Basic Usage - Copy Prop Values

```tsx
const HeadingBlock: ComponentConfig = {
  fields: {
    title: {
      type: 'text'
    },
    resolvedTitle: {
      type: 'text',
      label: 'Computed Title'
    }
  },
  resolveData: async ({ props }) => {
    return {
      props: {
        resolvedTitle: props.title.toUpperCase()
      }
    };
  },
  render: ({ resolvedTitle }) => <h1>{resolvedTitle}</h1>
};
```

### Setting Fields as Read-Only

```tsx
const ProductBlock: ComponentConfig = {
  fields: {
    productId: { type: 'text' },
    productName: { type: 'text' },
    productPrice: { type: 'text' }
  },
  resolveData: async ({ props }) => {
    if (props.productId) {
      const product = await fetch(`/api/products/${props.productId}`)
        .then(r => r.json());
      
      return {
        props: {
          productName: product.name,
          productPrice: product.price
        },
        readOnly: {
          productName: true,
          productPrice: true
        }
      };
    }
    
    return { props };
  },
  render: ({ productName, productPrice }) => (
    <div>
      <h3>{productName}</h3>
      <p>${productPrice}</p>
    </div>
  )
};
```

### Preventing Duplicate Calls

Only call expensive operations when specific props change:

```tsx
const PostBlock: ComponentConfig = {
  fields: {
    postId: { type: 'text' },
    postContent: { type: 'textarea' }
  },
  resolveData: async ({ props }, { changed }) => {
    // Only fetch if postId changed
    if (!changed.postId) return { props };
    
    const post = await fetch(`/api/posts/${props.postId}`)
      .then(r => r.json());
    
    return {
      props: {
        postContent: post.content
      }
    };
  },
  render: ({ postContent }) => <div>{postContent}</div>
};
```

### Dynamic Root Props

Also available on the root component:

```tsx
const config = {
  components: {},
  root: {
    fields: {
      title: { type: 'text' },
      resolvedTitle: { type: 'text' }
    },
    resolveData: async ({ props }) => {
      return {
        props: {
          resolvedTitle: props.title
        }
      };
    },
    render: ({ children, resolvedTitle }) => (
      <>
        <h1>{resolvedTitle}</h1>
        {children}
      </>
    )
  }
};
```

**Our Usage:**
- 🔄 Use for Media Library integration (fetch media details by ID)
- 🔄 Use for Page selector (fetch page data by ID)
- 🔄 Use for external data (blog posts, products from API)
- 🔄 Make computed fields read-only to prevent user confusion

---

## **3. Dynamic Fields (resolveFields)**

### What It Is
`resolveFields` allows you to change the field configuration based on component props. Fields can appear/disappear or have different options based on other field values.

### Use Cases
- Conditional fields (show field X only if Y is selected)
- Dynamic options (populate dropdown based on another field)
- Asynchronous field options (fetch from API)
- Complex form logic

### Basic Usage - Conditional Fields

```tsx
const DrinkBlock: ComponentConfig = {
  resolveFields: (data) => {
    const fields = {
      drink: {
        type: 'radio',
        options: [
          { label: 'Water', value: 'water' },
          { label: 'Orange juice', value: 'orange-juice' }
        ]
      }
    };
    
    // Show waterType field only if drink is 'water'
    if (data.props.drink === 'water') {
      return {
        ...fields,
        waterType: {
          type: 'radio',
          options: [
            { label: 'Still', value: 'still' },
            { label: 'Sparkling', value: 'sparkling' }
          ]
        }
      };
    }
    
    return fields;
  },
  render: ({ drink, waterType }) => (
    <div>
      Drink: {drink}
      {waterType && ` (${waterType})`}
    </div>
  )
};
```

### Asynchronous Calls - Populate Options from API

```tsx
const CategoryProductBlock: ComponentConfig = {
  resolveFields: async (data, { changed, lastFields }) => {
    // Don't call API unless category changed
    if (!changed.category) return lastFields;
    
    // Fetch products for selected category
    const products = await fetch(`/api/categories/${data.props.category}/products`)
      .then(r => r.json());
    
    return {
      category: {
        type: 'radio',
        options: [
          { label: 'Fruit', value: 'fruit' },
          { label: 'Vegetables', value: 'vegetables' }
        ]
      },
      product: {
        type: 'select',
        options: products.map(p => ({
          label: p.name,
          value: p.id
        }))
      }
    };
  },
  render: ({ product }) => <div>Selected: {product}</div>
};
```

### Limitations

- ⚠️ `slot` fields are NOT supported by Dynamic Fields
- Use Dynamic Props (`resolveData`) for most slot use-cases

**Our Usage:**
- 🔄 Category → Item selection (Blog Category → Posts)
- 🔄 Conditional styling options (show border options only if border is enabled)
- 🔄 Dynamic Media Library categories
- 🔄 Page template selector (template → available fields)

---

## **4. External Data Sources**

### What It Is
The `external` field type allows users to select data from third-party sources (CMS, database, API) using a searchable picker UI.

### Use Cases
- Select blog posts from headless CMS
- Pick products from e-commerce API
- Choose team members from database
- Link to external content

### Basic Usage - External Field

```tsx
const BlogPostBlock: ComponentConfig = {
  fields: {
    post: {
      type: 'external',
      fetchList: async ({ query }) => {
        // Query API for posts
        const posts = await fetch(`/api/posts?search=${query}`)
          .then(r => r.json());
        
        return posts.map(post => ({
          title: post.title,
          description: post.excerpt,
          id: post.id,
          thumbnail: post.featured_image
        }));
      },
      showSearch: true,
      placeholder: 'Search posts...'
    }
  },
  render: ({ post }) => {
    if (!post) return <p>No post selected</p>;
    
    return (
      <div>
        <h3>{post.title}</h3>
        <p>{post.description}</p>
      </div>
    );
  }
};
```

### Data Syncing with resolveData

Keep data in sync with external source:

```tsx
const ExternalPostBlock: ComponentConfig = {
  fields: {
    post: {
      type: 'external',
      fetchList: async () => {
        const posts = await fetch('/api/posts').then(r => r.json());
        return posts.map(p => ({
          title: p.title,
          id: p.id
        }));
      }
    }
  },
  resolveData: async ({ props }, { changed }) => {
    if (!props.post) return { props };
    if (!changed.post) return { props }; // Only fetch if selection changed
    
    // Re-fetch full post data
    const latestPost = await fetch(`/api/posts/${props.post.id}`)
      .then(r => r.json());
    
    return {
      props: {
        post: latestPost
      }
    };
  },
  render: ({ post }) => (
    <div>
      <h3>{post.title}</h3>
      <p>{post.content}</p>
    </div>
  )
};
```

### Hybrid Authoring

Allow users to edit inline OR populate from external source:

```tsx
const HybridBlock: ComponentConfig = {
  fields: {
    externalData: {
      type: 'external',
      fetchList: async () => {
        // Fetch options
      }
    },
    title: {
      type: 'text',
      label: 'Title'
    }
  },
  resolveData: async ({ props }, { changed }) => {
    // If external data is selected, populate title and make read-only
    if (props.externalData) {
      if (!changed.externalData) return { props };
      
      return {
        props: {
          title: props.externalData.title
        },
        readOnly: {
          title: true
        }
      };
    }
    
    // If no external data, make title editable
    return {
      props,
      readOnly: {
        title: false
      }
    };
  },
  render: ({ title }) => <h2>{title}</h2>
};
```

### External Data Packages

Puck provides helper packages:
- **@measured/puck-field-contentful** - Contentful CMS integration
- More coming soon

**Our Usage:**
- ✅ Already using `external` for Media Library (Image component)
- 🔄 Use for Page selector (link to other pages)
- 🔄 Use for Blog post selector (if we add blog)
- 🔄 Use for Product selector (if we add e-commerce)
- 🔄 Combine with `resolveData` to keep content synced

---

## **IMPLEMENTATION RECOMMENDATIONS**

### ✅ Already Implemented
- **Slot fields** in Section, Container, Columns
- **External field** for Media Library in Image component
- **Custom fields** for better UX (Image component with FieldLabel)

### 🔄 Should Implement Next

#### 1. Add Component Restrictions
Update Container/Section components to restrict allowed children:

```tsx
// Section should only allow layout components
const SectionBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      allow: ['Container', 'Columns'] // Only layout components
    }
  }
};

// Container allows content components
const ContainerBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      disallow: ['Section'] // Prevent nesting sections
    }
  }
};
```

#### 2. Use resolveData for Media Library
Enhance Image component to fetch full media details:

```tsx
const ImageBlock: ComponentConfig = {
  fields: {
    mediaId: {
      type: 'external',
      fetchList: async ({ query }) => {
        // Current implementation
      }
    },
    alt: { type: 'text' },
    width: { type: 'text' },
    height: { type: 'text' }
  },
  resolveData: async ({ props }, { changed }) => {
    if (!props.mediaId || !changed.mediaId) return { props };
    
    // Fetch full media details
    const media = await fetch(`/api/media/${props.mediaId}`)
      .then(r => r.json());
    
    return {
      props: {
        alt: media.alt_text || props.alt,
        width: media.width,
        height: media.height,
        src: media.url
      },
      readOnly: {
        width: true,
        height: true
      }
    };
  }
};
```

#### 3. Add Page Link Component with resolveData

```tsx
const PageLinkBlock: ComponentConfig = {
  fields: {
    page: {
      type: 'external',
      fetchList: async ({ query }) => {
        const pages = await fetch(`/api/tenant/pages?search=${query}`)
          .then(r => r.json());
        return pages.data.map(p => ({
          title: p.title,
          id: p.id
        }));
      },
      showSearch: true
    },
    text: {
      type: 'text',
      label: 'Link Text'
    }
  },
  resolveData: async ({ props }, { changed }) => {
    if (!props.page || !changed.page) return { props };
    
    // Auto-populate link text with page title
    return {
      props: {
        text: props.page.title,
        url: `/${props.page.slug}`
      },
      readOnly: {
        url: true
      }
    };
  },
  render: ({ text, url }) => (
    <a href={url}>{text}</a>
  )
};
```

#### 4. Use resolveFields for Conditional Styling

```tsx
const ButtonBlock: ComponentConfig = {
  resolveFields: (data) => {
    const baseFields = {
      text: { type: 'text' },
      variant: {
        type: 'select',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Outline', value: 'outline' },
          { label: 'Custom', value: 'custom' }
        ]
      }
    };
    
    // Show color picker only if variant is 'custom'
    if (data.props.variant === 'custom') {
      return {
        ...baseFields,
        customColor: {
          type: 'text',
          label: 'Custom Color (hex)'
        },
        customBgColor: {
          type: 'text',
          label: 'Custom Background'
        }
      };
    }
    
    return baseFields;
  }
};
```

#### 5. Add Default Props to Templates

Use slot `defaultProps` to pre-populate demo templates:

```tsx
// In theme.json templates
{
  "templates": [
    {
      "name": "Homepage - Hero",
      "puckData": {
        "content": [
          {
            "type": "Section",
            "props": {
              "content": [ // Pre-populated slot
                {
                  "type": "Heading",
                  "props": { "text": "Welcome" }
                },
                {
                  "type": "Button",
                  "props": { "text": "Get Started" }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

---

## **BEST PRACTICES**

### 1. Performance
- ✅ Use `changed` param in `resolveData` to prevent unnecessary API calls
- ✅ Use `changed` param in `resolveFields` to prevent re-rendering
- ✅ Cache API responses when possible
- ✅ Debounce search in `external` fields

### 2. User Experience
- ✅ Mark computed fields as `readOnly` to avoid confusion
- ✅ Use `allow`/`disallow` to guide users (prevent invalid nesting)
- ✅ Use `defaultProps` with slots for better starting point
- ✅ Provide helpful labels and placeholders

### 3. Architecture
- ✅ Keep components simple - one responsibility
- ✅ Use `resolveData` for external data fetching
- ✅ Use `resolveFields` for complex form logic
- ✅ Use `external` fields for user selection (not hardcoded dropdowns)
- ✅ Combine features (external + resolveData + readOnly = powerful hybrid authoring)

### 4. Documentation
- ✅ Document which components can nest (via `allow`/`disallow`)
- ✅ Document async operations (API calls in resolveData)
- ✅ Provide examples for each component
- ✅ Show template examples using components

---

## 🧭 **CRITICAL: Navigation System Architecture Decision**

### The Challenge
We need to solve how navigation works in a page builder context. There are two competing needs:
1. **Simple Navigation** - Traditional menu with links (Home, About, Contact)
2. **Complex Mega Menus** - Rich navigation with descriptions, icons, featured content, CTAs

### ❓ **The Question**
Should navigation be:
- **A) Separate Menu Builder** (WordPress classic approach) - Global, reusable, simple
- **B) Puck Component** (Gutenberg approach) - Per-page, flexible, complex
- **C) Hybrid Approach** - Best of both worlds

---

## **Solution: HYBRID APPROACH** ✅ RECOMMENDED

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Navigation Strategy (3-Tier System)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        │                                            │
┌───────▼─────────┐                   ┌──────────────▼──────────┐
│  GLOBAL MENUS   │                   │  PUCK NAVIGATION BLOCK  │
│  (Database)     │                   │  (Per-Page Override)    │
└─────────────────┘                   └─────────────────────────┘
│                                     │
│  • navigation_menus table           │  • Navigation component
│  • Menu Builder UI                  │  • Can use global menu
│  • Reusable across pages            │  • Or build custom layout
│  • Simple links                     │  • Mega menu support
│  • Nested dropdowns                 │  • Per-page customization
│                                     │
└──────────┬──────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   RENDER    │
    │   ENGINE    │
    └─────────────┘
    Automatically uses global menu unless page has custom navigation
```

---

## **TIER 1: Global Navigation System** (Traditional WordPress)

### Use Case
- **Simple sites** - Standard header/footer navigation
- **Consistent navigation** across all pages
- **Quick setup** - Build menu once, use everywhere
- **No per-page editing needed**

### Implementation

#### Database (Already Created)
```sql
CREATE TABLE navigation_menus (
  id BIGINT PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  location VARCHAR(100) DEFAULT 'primary', -- primary, footer, mobile
  items JSON NOT NULL, -- Menu structure
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Menu Structure (JSON)
```json
{
  "items": [
    {
      "id": "1",
      "label": "Home",
      "type": "page", // or "url", "custom"
      "page_id": 123,
      "url": "/",
      "target": "_self",
      "icon": null,
      "children": []
    },
    {
      "id": "2",
      "label": "Services",
      "type": "custom",
      "url": "#",
      "children": [
        {
          "id": "2-1",
          "label": "Web Design",
          "type": "page",
          "page_id": 456,
          "url": "/services/web-design"
        },
        {
          "id": "2-2",
          "label": "Development",
          "type": "page",
          "page_id": 457,
          "url": "/services/development"
        }
      ]
    },
    {
      "id": "3",
      "label": "Contact",
      "type": "page",
      "page_id": 789,
      "url": "/contact"
    }
  ]
}
```

#### Menu Builder Component
**File:** `resources/js/apps/tenant/components/pages/NavigationBuilderPage.tsx`

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuItem {
  id: string;
  label: string;
  type: 'page' | 'url' | 'custom';
  page_id?: number;
  url?: string;
  target?: '_self' | '_blank';
  icon?: string;
  children?: MenuItem[];
}

export function NavigationBuilderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [pages, setPages] = useState([]);
  
  // Load menus and pages
  useEffect(() => {
    fetch('/api/tenant/navigation-menus').then(r => r.json()).then(setSelectedMenu);
    fetch('/api/tenant/pages').then(r => r.json()).then(data => setPages(data.data));
  }, []);
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const addMenuItem = (type: 'page' | 'url' | 'custom') => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      label: 'New Item',
      type,
      children: []
    };
    setMenuItems([...menuItems, newItem]);
  };
  
  const saveMenu = async () => {
    await fetch('/api/tenant/navigation-menus/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: { items: menuItems }
      })
    });
    toast.success('Navigation saved!');
  };
  
  return (
    <div className="p-6">
      <PageHeader
        title="Navigation Builder"
        description="Build and manage your site navigation"
        action={
          <Button onClick={saveMenu}>
            <Save className="w-4 h-4" />
            Save Navigation
          </Button>
        }
      />
      
      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Left: Menu Items */}
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Menu Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={menuItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {menuItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} pages={pages} />
                  ))}
                </SortableContext>
              </DndContext>
              
              {menuItems.length === 0 && (
                <div className="text-center py-8 text-muted">
                  No menu items yet. Add one to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right: Add Items */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => addMenuItem('page')} variant="outline" className="w-full">
                <FileText className="w-4 h-4" />
                Add Page Link
              </Button>
              <Button onClick={() => addMenuItem('url')} variant="outline" className="w-full">
                <Link className="w-4 h-4" />
                Add Custom URL
              </Button>
              <Button onClick={() => addMenuItem('custom')} variant="outline" className="w-full">
                <Folder className="w-4 h-4" />
                Add Dropdown
              </Button>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pages.map(page => (
                  <div
                    key={page.id}
                    draggable
                    className="p-2 border rounded cursor-move hover:bg-accent"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('page', JSON.stringify(page));
                    }}
                  >
                    {page.title}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## **TIER 2: Puck Navigation Component** (Gutenberg-Style)

### Use Case
- **Complex layouts** - Mega menus, featured content
- **Per-page customization** - Different nav on different pages
- **Rich content** - Images, descriptions, CTAs in navigation
- **Full design control** - Theme doesn't restrict layout

### Implementation

#### Navigation Component (Puck Block)
**File:** `resources/js/shared/puck/components/Navigation.tsx`

```tsx
import { ComponentConfig } from '@measured/puck';

export interface NavigationProps {
  source: 'global' | 'custom';
  menuId?: number;
  layout: 'horizontal' | 'vertical' | 'mega';
  logoUrl?: string;
  logoText?: string;
  customLinks?: React.ReactNode; // Slot for custom content
}

export const NavigationBlock: ComponentConfig<NavigationProps> = {
  fields: {
    source: {
      type: 'radio',
      label: 'Navigation Source',
      options: [
        { label: 'Use Global Menu', value: 'global' },
        { label: 'Build Custom', value: 'custom' }
      ]
    },
    menuId: {
      type: 'external',
      label: 'Select Menu',
      fetchList: async () => {
        const menus = await fetch('/api/tenant/navigation-menus').then(r => r.json());
        return menus.data.map(menu => ({
          id: menu.id,
          title: menu.name
        }));
      },
      // Only show when source is 'global'
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
        { label: 'Mega Menu', value: 'mega' }
      ]
    },
    logoUrl: {
      type: 'external',
      label: 'Logo Image',
      fetchList: async ({ query }) => {
        const media = await fetch(`/api/media?search=${query}`).then(r => r.json());
        return media.data.map(m => ({
          id: m.id,
          title: m.name,
          thumbnail: m.url
        }));
      },
      showSearch: true
    },
    logoText: {
      type: 'text',
      label: 'Logo Text (if no image)'
    },
    customLinks: {
      type: 'slot',
      label: 'Custom Navigation Items'
    }
  },
  defaultProps: {
    source: 'global',
    layout: 'horizontal'
  },
  resolveData: async ({ props }) => {
    // Load menu data if using global menu
    if (props.source === 'global' && props.menuId) {
      const menu = await fetch(`/api/tenant/navigation-menus/${props.menuId}`)
        .then(r => r.json());
      
      return {
        props: {
          ...props,
          menuData: menu.items
        }
      };
    }
    
    return { props };
  },
  render: ({ source, menuData, layout, logoUrl, logoText, customLinks }) => {
    const theme = useTheme();
    
    if (source === 'global' && menuData) {
      // Render global menu
      return (
        <nav className="sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)]">
          <div className="max-w-[var(--layout-content-size)] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8" />
                ) : (
                  <span className="text-xl font-bold">{logoText || 'Site Name'}</span>
                )}
              </div>
              
              {/* Menu Items */}
              <div className="flex items-center gap-6">
                {menuData.items.map(item => (
                  <NavItem key={item.id} item={item} layout={layout} />
                ))}
              </div>
            </div>
          </div>
        </nav>
      );
    }
    
    // Render custom navigation with slots
    return (
      <nav className="sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-[var(--layout-content-size)] mx-auto px-4 py-4">
          {customLinks}
        </div>
      </nav>
    );
  }
};

// NavItem component for rendering menu items
function NavItem({ item, layout }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (item.children && item.children.length > 0) {
    // Dropdown
    return (
      <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        <button className="flex items-center gap-1 hover:text-[var(--color-primary)]">
          {item.label}
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg min-w-[200px]">
            {item.children.map(child => (
              <a
                key={child.id}
                href={child.url}
                className="block px-4 py-2 hover:bg-accent"
              >
                {child.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <a href={item.url} className="hover:text-[var(--color-primary)] transition-colors">
      {item.label}
    </a>
  );
}
```

---

## **TIER 3: Mega Menu Components** (Advanced)

### Use Case
- **Marketing sites** - Complex navigation with featured content
- **E-commerce** - Product categories with images
- **Portals** - Multi-level navigation with icons/descriptions

### Implementation

#### Mega Menu Link Component
**File:** `resources/js/shared/puck/components/MegaMenuLink.tsx`

```tsx
export interface MegaMenuLinkProps {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
  href: string;
  badge?: string;
}

export const MegaMenuLinkBlock: ComponentConfig<MegaMenuLinkProps> = {
  fields: {
    title: { type: 'text', label: 'Title' },
    description: { type: 'textarea', label: 'Description' },
    icon: { type: 'text', label: 'Icon (optional)' },
    image: {
      type: 'external',
      label: 'Image',
      fetchList: async ({ query }) => {
        const media = await fetch(`/api/media?search=${query}`).then(r => r.json());
        return media.data.map(m => ({ id: m.id, title: m.name, thumbnail: m.url }));
      }
    },
    href: { type: 'text', label: 'Link URL' },
    badge: { type: 'text', label: 'Badge Text (New, Hot, etc.)' }
  },
  render: ({ title, description, icon, image, href, badge }) => {
    return (
      <a
        href={href}
        className="group block p-4 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="flex gap-4">
          {image && (
            <img src={image} alt={title} className="w-16 h-16 object-cover rounded" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {icon && <span className="text-xl">{icon}</span>}
              <h4 className="font-semibold group-hover:text-[var(--color-primary)]">
                {title}
              </h4>
              {badge && (
                <span className="px-2 py-0.5 text-xs bg-[var(--color-accent)] text-white rounded">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted mt-1">{description}</p>
            )}
          </div>
        </div>
      </a>
    );
  }
};
```

#### Mega Menu Column Component
```tsx
export interface MegaMenuColumnProps {
  title?: string;
  links: React.ReactNode; // Slot for MegaMenuLink components
}

export const MegaMenuColumnBlock: ComponentConfig<MegaMenuColumnProps> = {
  fields: {
    title: { type: 'text', label: 'Column Title (optional)' },
    links: { type: 'slot', label: 'Links' }
  },
  render: ({ title, links }) => {
    return (
      <div className="space-y-2">
        {title && (
          <h3 className="font-bold text-sm uppercase text-muted mb-3">
            {title}
          </h3>
        )}
        <div className="space-y-1">
          {links}
        </div>
      </div>
    );
  }
};
```

---

## **How They Work Together** 🔄

### Scenario 1: Simple Site (Global Menu Only)
```tsx
// Tenant creates menu in Menu Builder
// Pages automatically use global menu
// Navigation component not added to pages manually
// Theme renders global menu in header automatically
```

### Scenario 2: Custom Navigation on Homepage
```tsx
// Homepage has custom navigation built in Puck
<Puck>
  <NavigationBlock source="custom">
    <Slot name="customLinks">
      <Button href="/">Home</Button>
      <Button href="/about">About</Button>
      <MegaMenuColumnBlock title="Services">
        <MegaMenuLinkBlock title="Web Design" href="/services/web" />
        <MegaMenuLinkBlock title="Branding" href="/services/brand" />
      </MegaMenuColumnBlock>
    </Slot>
  </NavigationBlock>
</Puck>

// Other pages still use global menu
```

### Scenario 3: Hybrid Approach
```tsx
// Global menu exists for standard pages
// Landing pages use custom Puck navigation
// Product pages use mega menu with featured products
// All navigation is app-like (no page reloads)
```

---

## **Root Configuration for Automatic Navigation**

### Option A: Theme Automatically Adds Navigation
**File:** `resources/js/apps/tenant/config/puck-config.tsx`

```tsx
export const puckConfig: Config = {
  root: {
    fields: {
      useCustomNav: {
        type: 'radio',
        label: 'Navigation',
        options: [
          { label: 'Use Global Menu', value: false },
          { label: 'Custom Navigation (build below)', value: true }
        ]
      }
    },
    defaultProps: {
      useCustomNav: false
    },
    render: async ({ children, useCustomNav, puck }) => {
      let navigation = null;
      
      if (!useCustomNav) {
        // Load and render global menu
        const menu = await fetch('/api/tenant/navigation-menus/primary').then(r => r.json());
        navigation = <GlobalNavigation menu={menu} />;
      }
      
      // Check if page has Navigation component
      const hasCustomNav = puck.data.content.some(
        item => item.type === 'Navigation'
      );
      
      return (
        <ThemeLayout>
          {/* Only show global nav if not custom */}
          {!hasCustomNav && !useCustomNav && navigation}
          
          {/* Page content (may include custom Navigation component) */}
          {children}
        </ThemeLayout>
      );
    }
  },
  components: {
    Navigation: NavigationBlock,
    MegaMenuColumn: MegaMenuColumnBlock,
    MegaMenuLink: MegaMenuLinkBlock,
    // ... other components
  }
};
```

---

## **Database Updates**

### Add Navigation Override to Pages
```sql
ALTER TABLE pages ADD COLUMN use_global_navigation BOOLEAN DEFAULT true;
ALTER TABLE pages ADD COLUMN custom_navigation_id VARCHAR(255) NULL; -- Component ID in puck_data
```

---

## **✅ RECOMMENDED IMPLEMENTATION ORDER**

### Phase 1: Global Menu System (Week 1)
1. ✅ Create Menu Builder UI with drag-drop
2. ✅ Build GlobalNavigation component for theme
3. ✅ API endpoints for CRUD operations
4. ✅ Test with simple horizontal menu

### Phase 2: Puck Navigation Component (Week 2)
5. ✅ Create NavigationBlock with global/custom toggle
6. ✅ Add slot support for custom links
7. ✅ Test per-page overrides

### Phase 3: Mega Menu Components (Week 3)
8. ✅ Create MegaMenuLink component
9. ✅ Create MegaMenuColumn component
10. ✅ Build demo mega menu page

---

## **Pros & Cons**

### Global Menu Builder
✅ **Pros:**
- Simple to use
- Consistent across site
- Fast to set up
- Familiar to WordPress users
- Good for most sites

❌ **Cons:**
- Limited layout options
- Can't have rich content
- Same menu everywhere
- No mega menu support

### Puck Navigation Component
✅ **Pros:**
- Full design control
- Mega menu support
- Per-page customization
- Rich content (images, descriptions)
- Theme independent

❌ **Cons:**
- More complex to build
- Inconsistent if not careful
- Requires Puck knowledge
- Slower to set up

### Hybrid Approach ⭐
✅ **Pros:**
- Best of both worlds
- Start simple, add complexity when needed
- Flexibility without overwhelming users
- Supports all use cases

❌ **Cons:**
- More code to maintain
- Users need to understand both systems

---

## **🎯 Final Recommendation**

**Implement ALL THREE tiers:**

1. **TIER 1** (Global Menu) - For 90% of pages
2. **TIER 2** (Puck Navigation) - For landing pages, custom layouts
3. **TIER 3** (Mega Menu) - For enterprise/e-commerce sites

This gives ByteForge maximum flexibility while keeping it simple for basic users.

---

### 🔴 CRITICAL (Must Have - Days 1-4)
1. ✅ Database schema & models
2. ✅ Theme system (`theme.json` + ThemeProvider)
3. ✅ Basic Puck components (Button, Heading, Text, Image, Container)
4. ✅ Page editor integration
5. ✅ Media library picker

### 🟠 HIGH (Should Have - Days 4-7)
6. ✅ Navigation menu builder
7. ✅ App-like routing system
8. ✅ Page management UI
9. ✅ Public site renderer
10. ✅ Page transitions

### 🟡 MEDIUM (Nice to Have - Days 7-9)
11. ◯ Theme customizer UI
12. ◯ Advanced components (Gallery, Video, Testimonial)
13. ◯ SEO optimization
14. ◯ Performance optimization

### ⚪ LOW (Future - Days 10+)
15. ◯ Comprehensive testing
16. ◯ Documentation
17. ◯ Advanced forms
18. ◯ Analytics integration

---

## 🎯 **Success Criteria**

### Must Achieve:
- [ ] Tenant can create/edit pages visually
- [ ] Theme system works with 4 pre-built themes
- [ ] Navigation menus work with app-like routing
- [ ] No page reloads when navigating
- [ ] Media library integrated with image picker
- [ ] Pages render correctly on public site
- [ ] Theme styles apply consistently

### Nice to Achieve:
- [ ] Smooth page transitions
- [ ] Mobile responsive editor
- [ ] Theme customization UI
- [ ] SEO meta tags working
- [ ] Fast page load times

---

## 📚 **Key Technical Decisions**

### ✅ Decisions Made:
1. **Puck Editor** - Block-based visual editor
2. **theme.json** - WordPress-style theme configuration
3. **React Router** - Client-side routing for app-like experience
4. **CSS Variables** - Theme token injection
5. **JSON Storage** - Puck data stored as JSON in database
6. **ThemeProvider** - React Context for theme access

### ❓ Questions to Answer:
1. Should tenants be able to create custom components? (Probably not - security risk)
2. Do we want multi-language support? (Future)
3. Should we allow custom CSS/JS? (Risky - maybe advanced feature)
4. Server-side rendering or client-side only? (Client-side for now)

---

## 🚀 **Getting Started Checklist**

Before starting implementation:
- [ ] Review this entire document
- [ ] Understand Puck architecture
- [ ] Understand theme system approach
- [ ] Set up git branch: `git checkout -b feature/puck-page-builder`
- [ ] Create project board/tasks
- [ ] Read Puck documentation: https://puckeditor.com/docs
- [ ] Install dependencies: `npm install @measured/puck @tohuhono/puck-rich-text react-router-dom @dnd-kit/core @dnd-kit/sortable`
- [ ] Check out awesome-puck for more plugins: https://github.com/puckeditor/awesome-puck

---

## 📝 **Next Immediate Steps**

1. **Review this plan** with team/stakeholders
2. **Install Puck** and dependencies
3. **Create database migrations**
4. **Build theme.json files** (4 themes)
5. **Start with ThemeProvider** implementation
6. **Build first component** (Button)
7. **Test in Puck editor**
8. **Iterate and build remaining components**

---

## 🎓 **DEVELOPMENT PRINCIPLES & PATTERNS**

### **Component Development Workflow**

#### 1. Plan the Component
```
✓ What does it do?
✓ What props does it need?
✓ Does it contain other components (slot)?
✓ Does it need external data (API)?
✓ Does it need dynamic fields?
✓ Should it be interactive in editor?
```

#### 2. Define Types & Fields
```typescript
// 1. Define prop types
type ButtonProps = {
  text: string;
  variant: 'primary' | 'secondary';
  href?: string;
};

// 2. Add to Config type
type Components = {
  Button: ButtonProps;
};

// 3. Define fields
const ButtonBlock: ComponentConfig<ButtonProps> = {
  label: "Button",
  fields: {
    text: {
      type: 'text',
      label: 'Button Text'
    },
    variant: {
      type: 'radio',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' }
      ]
    },
    href: {
      type: 'text',
      label: 'Link URL (optional)'
    }
  },
  defaultProps: {
    text: 'Click me',
    variant: 'primary'
  },
  render: ({ text, variant, href, puck }) => {
    // Implementation
  }
};
```

#### 3. Implement Render
```typescript
render: ({ text, variant, href, puck }) => {
  // Get theme values
  const theme = useTheme();
  
  // Resolve styles
  const styles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: 'white'
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: 'white'
    }
  };
  
  // Editor-only UI
  if (puck.isEditing && !href) {
    return (
      <button style={styles[variant]}>
        {text}
        <span style={{ opacity: 0.5 }}>(No link set)</span>
      </button>
    );
  }
  
  // Production render
  return href ? (
    <a href={href} style={styles[variant]}>{text}</a>
  ) : (
    <button style={styles[variant]}>{text}</button>
  );
}
```

#### 4. Add Advanced Features (If Needed)

**External Data:**
```typescript
fields: {
  page: {
    type: 'external',
    fetchList: async ({ query }) => {
      const pages = await fetch(`/api/pages?search=${query}`).then(r => r.json());
      return pages.map(p => ({ title: p.title, id: p.id }));
    },
    showSearch: true
  }
}
```

**Dynamic Props:**
```typescript
resolveData: async ({ props }, { changed }) => {
  if (!props.page || !changed.page) return { props };
  
  const page = await fetch(`/api/pages/${props.page.id}`).then(r => r.json());
  return {
    props: {
      title: page.title,
      url: `/${page.slug}`
    },
    readOnly: {
      url: true
    }
  };
}
```

**Conditional Fields:**
```typescript
resolveFields: (data, { changed, lastFields }) => {
  if (!changed.linkType) return lastFields;
  
  if (data.props.linkType === 'page') {
    return {
      linkType: { type: 'radio', options: [/*...*/] },
      page: { type: 'external', fetchList: async () => {/*...*/} }
    };
  }
  
  return {
    linkType: { type: 'radio', options: [/*...*/] },
    url: { type: 'text', label: 'URL' }
  };
}
```

#### 5. Test Component
```
✓ Insert component in editor
✓ Fill all fields
✓ Check preview renders correctly
✓ Test with different themes
✓ Test in mobile/tablet viewports
✓ Verify JSON output
✓ Test on public site (<Render>)
```

#### 6. Add to Category
```typescript
categories: {
  content: {
    title: "Content",
    components: ["Heading", "Text", "Button"], // Add here
    defaultExpanded: true
  }
}
```

---

### **Common Patterns**

#### Pattern: Theme-Aware Component
```typescript
import { useTheme } from '@/contexts/ThemeContext';

const StyledComponent: ComponentConfig = {
  render: ({ variant }) => {
    const theme = useTheme();
    
    return (
      <div style={{
        backgroundColor: theme.colors[variant],
        padding: theme.spacing[4],
        borderRadius: theme.borderRadius.md
      }}>
        Content
      </div>
    );
  }
};
```

#### Pattern: Layout Container with Slot
```typescript
const ContainerBlock: ComponentConfig = {
  fields: {
    content: {
      type: 'slot',
      label: 'Content',
      allow: ['Heading', 'Text', 'Button'], // Restrict contents
      // OR
      disallow: ['Section'] // Allow everything except Section
    },
    maxWidth: {
      type: 'select',
      options: [
        { label: 'Narrow', value: '720px' },
        { label: 'Normal', value: '1200px' },
        { label: 'Wide', value: '1400px' }
      ]
    }
  },
  defaultProps: {
    content: [ // Pre-populate with demo content
      {
        type: 'Heading',
        props: { text: 'Welcome', level: 'h2' }
      }
    ],
    maxWidth: '1200px'
  },
  render: ({ content: Content, maxWidth }) => {
    const theme = useTheme();
    
    return (
      <div style={{
        maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: theme.spacing[6]
      }}>
        <Content />
      </div>
    );
  }
};
```

#### Pattern: External Data Selection + Sync
```typescript
const BlogPostBlock: ComponentConfig = {
  fields: {
    post: {
      type: 'external',
      fetchList: async ({ query }) => {
        const posts = await fetch(`/api/posts?search=${query}`)
          .then(r => r.json());
        return posts.map(p => ({
          title: p.title,
          id: p.id,
          thumbnail: p.featured_image
        }));
      },
      showSearch: true
    }
  },
  resolveData: async ({ props }, { changed }) => {
    if (!props.post || !changed.post) return { props };
    
    // Re-fetch fresh data whenever post selection changes
    const latestPost = await fetch(`/api/posts/${props.post.id}`)
      .then(r => r.json());
    
    return {
      props: {
        post: {
          ...props.post,
          title: latestPost.title,
          content: latestPost.content,
          updated_at: latestPost.updated_at
        }
      }
    };
  },
  render: ({ post }) => {
    if (!post) return <p>Select a post</p>;
    
    return (
      <article>
        <h2>{post.title}</h2>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
        <small>Updated: {post.updated_at}</small>
      </article>
    );
  }
};
```

#### Pattern: Interactive Element (Tabs, Accordion)
```typescript
import { registerOverlayPortal } from "@measured/puck";

const TabsBlock: ComponentConfig = {
  fields: {
    tabs: {
      type: 'array',
      arrayFields: {
        label: { type: 'text' },
        content: { type: 'slot' }
      }
    }
  },
  render: ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);
    const tabsRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (tabsRef.current) {
        // Make tabs clickable in editor
        registerOverlayPortal(tabsRef.current);
      }
    }, [tabsRef.current]);
    
    return (
      <div>
        <div ref={tabsRef} className="tab-buttons">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={i === activeTab ? 'active' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-content">
          {tabs[activeTab]?.content}
        </div>
      </div>
    );
  }
};
```

#### Pattern: Conditional Styling
```typescript
const BoxBlock: ComponentConfig = {
  resolveFields: (data, { changed, lastFields }) => {
    if (!changed.hasBorder) return lastFields;
    
    const baseFields = {
      hasBorder: {
        type: 'radio',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false }
        ]
      },
      backgroundColor: {
        type: 'text',
        label: 'Background Color'
      }
    };
    
    // Show border options only if hasBorder is true
    if (data.props.hasBorder) {
      return {
        ...baseFields,
        borderWidth: {
          type: 'select',
          options: [
            { label: '1px', value: '1px' },
            { label: '2px', value: '2px' },
            { label: '4px', value: '4px' }
          ]
        },
        borderColor: {
          type: 'text',
          label: 'Border Color'
        },
        borderRadius: {
          type: 'select',
          options: [
            { label: 'None', value: '0' },
            { label: 'Small', value: '4px' },
            { label: 'Medium', value: '8px' },
            { label: 'Large', value: '16px' }
          ]
        }
      };
    }
    
    return baseFields;
  },
  render: ({ hasBorder, backgroundColor, borderWidth, borderColor, borderRadius }) => {
    return (
      <div style={{
        backgroundColor,
        ...(hasBorder && {
          border: `${borderWidth} solid ${borderColor}`,
          borderRadius
        })
      }}>
        Content
      </div>
    );
  }
};
```

---

### **Debugging Tips**

#### Check Data Structure
```typescript
// In render function
render: ({ ...props, puck }) => {
  if (puck.isEditing) {
    console.log('Component props:', props);
    console.log('Puck state:', puck);
  }
  
  return <div>...</div>;
}
```

#### Inspect Generated Data
```typescript
// In custom editor layout
function DebugPanel() {
  const data = usePuck(s => s.appState.data);
  
  return (
    <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '400px' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

<Puck config={config}>
  <Puck.Preview />
  <DebugPanel />
</Puck>
```

#### Test resolveData/resolveFields
```typescript
resolveData: async ({ props }, { changed, trigger }) => {
  console.log('resolveData triggered:', trigger);
  console.log('Changed props:', changed);
  console.log('Current props:', props);
  
  // ... rest of logic
}
```

#### Verify Theme Values
```typescript
render: () => {
  const theme = useTheme();
  
  console.log('Theme colors:', theme.colors);
  console.log('Theme spacing:', theme.spacing);
  
  return <div>...</div>;
}
```

---

### **Testing Checklist**

#### Component Tests
- [ ] Component renders in editor
- [ ] All fields appear and are editable
- [ ] Default props are applied
- [ ] Props update preview in real-time
- [ ] Component renders on public site
- [ ] Theme values apply correctly
- [ ] Responsive on mobile/tablet/desktop
- [ ] Works inside container/section
- [ ] Drag-drop works
- [ ] Duplicate works
- [ ] Delete works
- [ ] Undo/redo works

#### Slot Field Tests
- [ ] Can drag components into slot
- [ ] Slot renders child components
- [ ] Restriction (allow/disallow) works
- [ ] Default content appears
- [ ] Nested slots work (slot in slot)
- [ ] Empty state shows placeholder

#### resolveData Tests
- [ ] Async data fetches correctly
- [ ] `changed` param prevents duplicate calls
- [ ] Read-only fields are locked
- [ ] Works on initial load (trigger: 'load')
- [ ] Works on field change (trigger: 'replace')
- [ ] Works on insert (trigger: 'insert')

#### resolveFields Tests
- [ ] Fields change based on conditions
- [ ] Async field options load
- [ ] `changed` param prevents duplicate calls
- [ ] `lastFields` preserves state

#### External Field Tests
- [ ] Search works
- [ ] Results display correctly
- [ ] Selection updates props
- [ ] Thumbnail shows (if provided)
- [ ] Works with resolveData for syncing

---

### **Code Organization**

```
resources/js/
├── shared/
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── puck/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Section.tsx
│   │   │   │   ├── Container.tsx
│   │   │   │   ├── Columns.tsx
│   │   │   │   ├── Flex.tsx
│   │   │   │   └── index.ts
│   │   │   ├── content/
│   │   │   │   ├── Heading.tsx
│   │   │   │   ├── Text.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Image.tsx
│   │   │   │   └── index.ts
│   │   │   ├── media/
│   │   │   │   ├── Gallery.tsx
│   │   │   │   ├── Video.tsx
│   │   │   │   └── index.ts
│   │   │   ├── interactive/
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Accordion.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts  (exports all)
│   │   ├── config/
│   │   │   └── puck-config.ts  (main config)
│   │   └── fields/
│   │       ├── MediaField.tsx  (custom fields)
│   │       └── PageLinkField.tsx
│   └── services/
│       └── api.ts
└── apps/
    └── central/
        └── components/
            └── pages/
                ├── PagesPage.tsx
                ├── PageEditorPage.tsx
                └── ThemesPage.tsx
```

**Import Pattern:**
```typescript
// In puck-config.ts
import { layout } from './components/layout';
import { content } from './components/content';
import { media } from './components/media';

export const puckConfig: Config = {
  components: {
    ...layout,
    ...content,
    ...media
  },
  categories: {
    layout: {
      title: "Layout",
      components: Object.keys(layout)
    },
    content: {
      title: "Content",
      components: Object.keys(content)
    },
    media: {
      title: "Media",
      components: Object.keys(media)
    }
  }
};
```

---

### **Key Takeaways**

1. **Start Simple**: Build basic components first (Heading, Text, Button)
2. **Add Slots**: Container and Section components for layouts
3. **Integrate Theme**: All components should use theme values
4. **Use TypeScript**: Strict typing prevents bugs
5. **Performance Matters**: Use `changed` param, selectors, caching
6. **Test Thoroughly**: Editor AND public site
7. **Document Components**: What they do, what props they accept
8. **Follow Patterns**: Consistent structure = easier maintenance
9. **Leverage Features**: Don't reinvent (external fields, resolveData, etc.)
10. **Think Portability**: Data should be JSON-serializable and portable

---

## 💡 **Additional Resources**

- Puck Docs: https://puckeditor.com/docs
- Puck GitHub: https://github.com/measuredco/puck
- Puck Discord: https://discord.gg/D9e4E3MQVZ
- **Awesome Puck (Community Plugins)**: https://github.com/puckeditor/awesome-puck
- **Rich Text Component**: https://www.npmjs.com/package/@tohuhono/puck-rich-text
- WordPress theme.json: https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/

### 🎨 **Community Plugins Worth Exploring:**
- **@tohuhono/puck-rich-text** - Rich text editor with inline editing ✅ **RECOMMENDED**
- **plugin-heading-analyzer** - Visualize heading structure and SEO
- **plugin-emotion-cache** - Style injection for emotion CSS
- **field-contentful** - Contentful CMS integration (if needed)

---

**Ready to build an amazing page builder? Let's go! 🚀**
