# Puck Page Builder Implementation Plan
## WordPress-Style Theme System with App-Like Experience

**Status:** Planning Phase  
**Target:** Full CMS with Page Builder, Navigation, Themes  
**Date:** October 22, 2025

---

## 🎯 **What We Want to Accomplish**

### Core Vision
Build a **WordPress-style CMS** with **app-like navigation experience** using Puck Editor that:
- ✅ Provides visual drag-drop page building
- ✅ Uses `theme.json` for styling consistency (like WordPress)
- ✅ Supports multiple themes that tenants can select
- ✅ Enables app-like navigation between pages (no full page reloads)
- ✅ Integrates with our existing media library
- ✅ Allows tenant branding customization
- ✅ Produces clean, portable JSON data
- ✅ Renders fast on the public site

### Key Features
1. **Page Builder (Puck Editor)**
   - Visual drag-drop component editor
   - Real-time preview
   - Mobile/tablet/desktop viewports
   - Undo/redo functionality
   - Component library with categories

2. **Theme System**
   - `theme.json` configuration (WordPress-style)
   - Design tokens (colors, typography, spacing)
   - Component-level styling
   - Theme switcher (multiple pre-built themes)
   - Tenant theme customization

3. **Navigation Management**
   - Menu builder with drag-drop ordering
   - Nested menu support (dropdown)
   - External/internal links
   - Active state tracking
   - Mobile responsive menu

4. **App-Like Experience**
   - Client-side routing (React Router)
   - Page transitions
   - Persistent navigation state
   - Smooth page switching
   - Loading states

5. **Media Library Integration**
   - Image picker from existing media library
   - Drag-drop image uploads
   - Image blocks with media library
   - Gallery blocks

6. **Tenant Features**
   - Per-tenant page management
   - Per-tenant navigation
   - Per-tenant theme selection
   - Custom branding (logo, colors)
   - SEO settings per page

---

## 📋 **Step-by-Step Implementation Plan**
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

### Step 2.2: Theme Context Provider
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
- [ ] ThemeProvider injects CSS variables
- [ ] useTheme() hook works
- [ ] CSS variables accessible in components

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

### Step 6.1: Page Renderer Component
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
  
  return <Render config={puckConfig} data={page.puck_data} />;
}
```

**Verification:**
- [ ] Pages render correctly
- [ ] SEO meta tags update
- [ ] Components styled correctly

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
- [ ] Changes preview live
- [ ] Save persists customization
- [ ] Reset works

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
