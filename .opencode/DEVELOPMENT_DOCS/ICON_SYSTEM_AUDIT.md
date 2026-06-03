# Icon System Audit & Recommendations

## Overview

Audit of icon usage across ByteForge and proposal for an optimized icon component that follows the same "generate only what's needed" philosophy as the CSS system.

**Date:** February 3, 2026  
**Status:** Planning - Not Implemented  
**Priority:** Medium (UX consistency & component library completeness)

---

## Icon Optimization Strategy 🎯

### The Philosophy

**Similar to CSS generation:** Only ship SVG icons actually used on the page, not the entire icon library.

```
Editor/Builder:
1. Full Lucide library available (1000+ React components)
2. User selects "Star" icon → Extract SVG markup
3. Save both icon name + rendered SVG to database

Storefront:
4. Render inline SVG (no icon library needed)
5. Zero bundle size for icons
6. Only icons actually used on page
```

**Bundle Size Impact:**
```
Traditional Approach:
- Load entire Lucide library: ~600KB
- Use 3 icons on page
- Waste: 99.5%

SVG Extraction Approach:
- Lucide only in editor (dev bundle)
- 3 icons × 500 bytes = ~1.5KB
- Savings: ~598.5KB (99.75% reduction!)
```

### Data Structure

**Storage in puck_data:**
```json
{
  "type": "Icon",
  "props": {
    "id": "Icon-abc123",
    "name": "Star",
    "svg": "<svg xmlns=\"...\"><path d=\"...\"/></svg>",
    "size": 32,
    "color": { "type": "custom", "value": "#f59e0b" }
  }
}
```

**Why store both `name` and `svg`?**
- `name`: Used in editor for re-selection/editing (dropdown shows "Star")
- `svg`: Rendered on storefront (no library needed)
- `name` is unique → can serve as component ID if needed

**Editing Flow:**
1. User opens page editor
2. Icon component shows `name: "Star"` in dropdown
3. User changes to "Heart"
4. Extract new SVG from Lucide Heart component
5. Save both `name: "Heart"` and new `svg: "<svg>..."`

---

## Current State

### Installed Icon Packages

**package.json dependencies:**
```json
{
  "@heroicons/react": "^2.2.0",    // Installed but UNUSED
  "lucide-react": "^0.544.0"       // ACTIVELY USED
}
```

**Font Awesome:**
- User reports seeing "Font Awesome Free 6.6.0" copyright in browser
- **Not found** in:
  - `package.json` dependencies
  - Blade templates
  - Public assets
  - Build output
- **Mystery:** Where is this coming from?

### Icon Usage Analysis

#### Dashboard/Admin Interface
**Uses:** `lucide-react` (React component library)

**Examples:**
```typescript
// Dashboard
import { FileText, Image, Menu, Activity } from 'lucide-react';

// Navigation Page
import { Plus, Edit, Trash2, Menu as MenuIcon } from 'lucide-react';

// Page Editor
import { Loader2, Monitor, Tablet, Smartphone } from 'lucide-react';

// Theme Pages
import { Copy, RotateCcw, Trash2, Check, Plus, Edit } from 'lucide-react';
```

**Icons Used (sample):**
- FileText, Image, Menu, Activity
- Users, Building2, Settings
- Upload, Download
- Plus, Edit, Trash2, Pencil
- Save, Lock, Check
- Monitor, Tablet, Smartphone
- Loader2, ArrowLeft

**Characteristics:**
- ✅ Consistent style (outline icons, 24px stroke)
- ✅ Tree-shakeable (only import what you use)
- ✅ React components (TypeScript support)
- ✅ 1000+ icons available
- ✅ No external CSS required

#### Puck Components
**Uses:** `lucide-react` (limited hardcoded icon map)

**Card Component:**
```typescript
import {
  Feather, Heart, Star, Zap, Shield, CheckCircle,
  Users, TrendingUp, Award, Target, Box, Package,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  feather: Feather,
  heart: Heart,
  star: Star,
  // ... only 12 icons available
};
```

**Current Limitations:**
- ❌ Limited to 12 hardcoded icons
- ❌ Not extensible without code changes
- ❌ No user-friendly icon picker

**Future:**
- ✅ Card component will be superseded by flexible composition
- ✅ Users will build cards with: Box + Heading + Text + Icon
- ✅ More flexible, no component bloat

**Navigation Component:**
```typescript
import { Menu, ChevronDown, ExternalLink, X } from 'lucide-react';
// Icons for UI only (hamburger, chevrons, etc.)
// No support for custom menu item icons
```

#### Storefront/Public Pages
**Uses:** None (native CSS only)

**Font Awesome in Development:**
- ✅ **Resolved:** Font Awesome comes from Laravel Debugbar
- Only loaded in local/development environment
- Not in production builds
- No action needed - can ignore

#### Heroicons
**Status:** Installed but UNUSED

```bash
npm ls @heroicons/react
# @heroicons/react@2.2.0
# No grep results in codebase
```

**Should we remove it?** Yes (cleanup)

---

## Problems Identified

### 1. No Icon Component for Page Builder

**Issue:** Users can't add icons to pages easily

**Current State:**
- Card component: Limited to 12 hardcoded icons
- No standalone Icon component
- No icon picker UI
- Can't use icons in: Heading, Text, Button, Box, etc.

**User Experience:**
```
User: "I want to add a phone icon next to my contact info"
Current: Can't do it (unless using Card component)
Desired: <Icon name="phone" size={24} color="primary" />
```

### 2. Inconsistent Icon Strategy

**Different approaches in different contexts:**
- Admin: Direct lucide-react imports
- Puck components: Hardcoded icon maps
- Storefront: Mystery Font Awesome?

**Should be:**
- Unified icon system across all contexts
- Single source of truth
- Consistent API

### 3. Limited Icon Selection in Components

**Card component icon picker:**
```typescript
// Only these 12 icons available:
feather, heart, star, zap, shield, checkCircle,
users, trendingUp, award, target, box, package
```

**Lucide-react has 1000+ icons but we're limiting to 12**

### 4. No Menu Item Icons

**Navigation component:**
```typescript
showIcons?: boolean;  // Exists but not implemented
```

**Common use case:**
```
🏠 Home
📄 About  
⚙️ Services
  └ 💼 Consulting
  └ 🔧 Development
📧 Contact
```

**Currently:** Can't add icons to menu items

---

## Technical Details

### SVG Extraction Process

**Step 1: User selects icon in editor**
```typescript
// Icon dropdown shows all Lucide icons
<Select value="Star" onChange={handleIconChange}>
  <Option value="Star">Star</Option>
  <Option value="Heart">Heart</Option>
  {/* ...1000+ options */}
</Select>
```

**Step 2: Extract SVG on selection**
```typescript
import { renderToStaticMarkup } from 'react-dom/server';
import { Star } from 'lucide-react';

const svgString = renderToStaticMarkup(
  <Star size={24} strokeWidth={2} />
);

// Result:
// '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"...>
//   <path d="M12 2l3.09 6.26L22..."/>
// </svg>'
```

**Step 3: Store in database**
```json
{
  "name": "Star",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"...>",
  "size": 24,
  "color": { "type": "custom", "value": "#f59e0b" }
}
```

**Step 4: Render on storefront**
```tsx
// No Lucide library loaded
<span 
  style={{ color: '#f59e0b' }}
  dangerouslySetInnerHTML={{ __html: svgString }}
/>
```

### Icon Name as Unique ID

**Lucide icon names are unique:**
- "Star" !== "StarHalf" !== "StarOff"
- CamelCase naming convention
- No duplicates in library

**Usage:**
```typescript
// Can use icon name for CSS classes
className={`icon-${name.toLowerCase()}`}
// → "icon-star", "icon-heart", etc.

// Can use as React key
key={`icon-${name}-${index}`}

// Can use for analytics
trackIconUsage(iconName);
```

### Dynamic Color/Size Control

**SVG uses `currentColor` for stroke:**
```xml
<svg stroke="currentColor">
  <path d="..."/>
</svg>
```

**Control via CSS:**
```tsx
<span style={{ 
  color: resolvedColor,      // Controls stroke color
  fontSize: `${size}px`,     // Can control size
  width: size, 
  height: size 
}}>
  {svgHtml}
</span>
```

**Or inject into SVG:**
```typescript
const styledSvg = svg
  .replace(/width="\d+"/, `width="${size}"`)
  .replace(/height="\d+"/, `height="${size}"`)
  .replace(/stroke-width="\d+"/, `stroke-width="${strokeWidth}"`);
```

### Performance Characteristics

**Editor (Development):**
- Lucide library: ~600KB (loaded once)
- Tree-shaken imports: Only used icons
- React components: Fast rendering

**Storefront (Production):**
- No icon library: 0KB
- Inline SVG: ~500 bytes per icon
- Native browser rendering: Instant
- No JavaScript required for rendering

**Comparison:**
```
10 pages × 5 icons each:

Icon Library Approach:
- 600KB library × 10 pages = 6MB total
- Plus JavaScript execution overhead

SVG Extraction:
- 500 bytes × 5 icons × 10 pages = 25KB total
- Zero JavaScript overhead
- 240x smaller!
```

---

**Source:** Laravel Debugbar (development only)

**Details:**
- Debugbar includes Font Awesome for its UI icons
- Only loads in `local` and `development` environments
- Not present in production builds
- No impact on production bundle size

**Conclusion:** No action needed - this is expected behavior for development tooling.

---

## Proposed Solutions

### ✅ **Recommended: SVG Extraction with Inline Rendering**

**Concept:** Extract SVG from Lucide in editor, store it, render inline on storefront

This follows the same optimization philosophy as the CSS system: **only include what's actually used**.

#### Architecture

**1. Icon Component Interface:**
```typescript
export interface IconProps {
  id?: string;
  name: string;          // "Star" - for editor dropdown
  svg?: string;          // "<svg>...</svg>" - for storefront rendering
  size?: number;         // 24
  color?: ColorValue;    // { type: "custom", value: "#f59e0b" }
  strokeWidth?: number;  // 2
  // ... standard layout props (padding, margin, etc.)
}
```

**2. SVG Extraction Utility:**
```typescript
// resources/js/shared/utils/extractIconSvg.ts
import { renderToStaticMarkup } from 'react-dom/server';
import * as LucideIcons from 'lucide-react';

export function extractIconSvg(
  iconName: string,
  size: number = 24,
  strokeWidth: number = 2
): string {
  const Icon = LucideIcons[iconName as keyof typeof LucideIcons];
  
  if (!Icon) {
    throw new Error(`Icon "${iconName}" not found in Lucide`);
  }
  
  // Render to static SVG string
  return renderToStaticMarkup(
    <Icon size={size} strokeWidth={strokeWidth} />
  );
}
```

**3. Component Rendering Logic:**
```typescript
function IconRenderer({ name, svg, size, color, strokeWidth, puck }) {
  const { resolve } = useTheme();
  const isEditor = usePuckEditMode();
  
  // In editor: Use React component for live editing
  if (isEditor) {
    const Icon = LucideIcons[name];
    const resolvedColor = resolveColor(color);
    
    return (
      <Icon 
        size={size} 
        strokeWidth={strokeWidth}
        color={resolvedColor}
      />
    );
  }
  
  // On storefront: Use stored SVG
  const resolvedColor = resolveColor(color);
  
  // Inject dynamic color/size into SVG
  const styledSvg = svg
    ?.replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
    .replace(/stroke-width="\d+"/, `stroke-width="${strokeWidth}"`);
  
  return (
    <span 
      className={`icon-${name.toLowerCase()}`}
      style={{ color: resolvedColor, display: 'inline-block' }}
      dangerouslySetInnerHTML={{ __html: styledSvg || '' }}
    />
  );
}
```

**4. Save Handler:**
```typescript
// When user selects/changes icon in editor
const handleIconChange = (newIconName: string) => {
  // Extract SVG from Lucide
  const svgString = extractIconSvg(
    newIconName,
    props.size || 24,
    props.strokeWidth || 2
  );
  
  // Update component props with both name and SVG
  onChange({
    ...props,
    name: newIconName,
    svg: svgString,
  });
};
```

#### Benefits

- ✅ **Zero Bundle Impact:** No icon library loaded on storefront
- ✅ **Optimal Performance:** Only SVGs actually used (~500 bytes each)
- ✅ **Full Customization:** Direct access to SVG attributes
- ✅ **Offline Ready:** No external dependencies to load
- ✅ **Re-editable:** Icon name preserved for changing icons later
- ✅ **Consistent Philosophy:** Matches CSS generation strategy

#### Real-World Example

**Page with 5 unique icons:**
```
Traditional: 600KB icon library
SVG Extraction: 2.5KB of inline SVG
Reduction: 99.6%
```

**10 pages with different icons:**
```
Traditional: 600KB × 10 = 6MB total
SVG Extraction: ~3KB per page = 30KB total
Reduction: 99.5%
```

---

### Component Composition Strategy

**Card Component → Deprecated**

Instead of maintaining a Card component with limited icon choices:

```typescript
// OLD: Limited Card component
<Card 
  icon="star"        // Only 12 options
  title="Feature"
  description="..."
/>

// NEW: Flexible composition
<Box padding="medium" backgroundColor="white" borderRadius="8">
  <Icon name="Star" size={32} color="primary" />
  <Heading level="3" text="Feature" />
  <RichText content="..." />
</Box>
```

**Benefits:**
- ✅ Unlimited icon choices (1000+ from Lucide)
- ✅ More flexible layouts
- ✅ Less component bloat
- ✅ Users learn core primitives (Box, Icon, etc.)
- ✅ No legacy code to maintain (fresh start)

---

## Implementation Roadmap

### **Phase 1: Core Icon Component (6-8 hours)**

**Goal:** Working Icon component with SVG extraction

**Tasks:**
1. Create SVG extraction utility
   - `extractIconSvg()` function
   - Handle all Lucide icons
   - Generate clean SVG markup

2. Create Icon component
   - Puck component configuration
   - Icon name dropdown (all 1000+ Lucide icons)
   - Size, strokeWidth, color controls
   - Standard layout props

3. Implement dual rendering
   - Editor: Live Lucide React component
   - Storefront: Inline SVG from database
   - Save handler extracts and stores SVG

4. Test and document
   - Verify SVG extraction works
   - Test editor → storefront flow
   - Measure bundle size savings

**Files:**
```
NEW:
- resources/js/shared/utils/extractIconSvg.ts
- resources/js/shared/puck/components/media/Icon.tsx
- resources/js/shared/puck/components/media/index.ts

MODIFIED:
- resources/js/shared/puck/components/index.ts
- resources/js/shared/puck/config/index.tsx
```

**Deliverable:**
- Standalone Icon component
- 1000+ icons available
- Zero bundle size impact on storefront
- Re-editable (name preserved for future changes)

---

### **Phase 2: Enhanced Icon Picker (8-12 hours)**

**Goal:** Better UX for selecting from 1000+ icons

**Tasks:**
1. Create IconPickerModal
   - Modal UI with search
   - Visual grid of icons
   - Category filtering
   - Recently used section

2. Integrate with Icon component
   - Replace basic dropdown
   - Show icon preview in field
   - Keyboard navigation support

3. Performance optimization
   - Virtualized list for 1000+ icons
   - Lazy load icon previews
   - Debounced search

**Features:**
- Search bar (fuzzy matching)
- Categories (UI, Arrows, Shapes, etc.)
- Grid view with hover preview
- Selected icon highlight
- Recently used persistence

---

### **Phase 3: Navigation Menu Icons (4-6 hours)**

**Goal:** Icons in navigation menus

**Tasks:**
1. Add icon field to Navigation menu items
2. Extract SVG for menu icons on save
3. Render icons alongside menu labels
4. Support in all navigation styles (horizontal, vertical, mobile)

**Example:**
```typescript
menuItems: [
  { 
    label: 'Home', 
    url: '/', 
    icon: 'Home',
    iconSvg: '<svg>...</svg>' 
  },
  { 
    label: 'Services', 
    url: '/services', 
    icon: 'Briefcase',
    iconSvg: '<svg>...</svg>',
    children: [...]
  }
]
```

---

### **Phase 4: Custom SVG Support (Optional - 6-8 hours)**

**Goal:** Users can paste/upload custom brand icons

**Tasks:**
1. Add iconSource field (library vs custom)
2. SVG paste/upload UI
3. SVG validation and sanitization
4. Color customization for custom SVGs

**Use Cases:**
- Company logos
- Social media icons (X, LinkedIn, etc.)
- Custom brand elements
- Icons not in Lucide library

---

### **Phase 5: Component Integration (Future)**

**Tasks:**
1. Add optional icon to Button component
2. Add icon to Heading component  
3. Deprecate Card component (document migration)

**Note:** Not urgent - users can compose these with existing primitives

---

## Additional Improvements

### 1. Card Component Migration

**Current:** Limited to 12 hardcoded icons

**Future:** Deprecate in favor of flexible composition

**Migration Guide:**
```typescript
// BEFORE: Card component (limited)
<Card 
  icon="star"
  title="Great Feature"
  description="Lorem ipsum..."
/>

// AFTER: Flexible composition (unlimited)
<Box padding="24px" backgroundColor="white" borderRadius="8px">
  <Icon name="Star" size={48} color="primary" />
  <Heading level="3" text="Great Feature" />
  <RichText content="<p>Lorem ipsum...</p>" />
</Box>
```

**Benefits:**
- ✅ Full access to 1000+ icons
- ✅ More layout flexibility
- ✅ Learn core primitives (transferable knowledge)
- ✅ No legacy code burden (clean slate)

---

### 2. Navigation Menu Icons

**Enable icons in Navigation component:**
```typescript
// Menu item structure
{
  label: 'Services',
  url: '/services',
  icon: 'Briefcase',          // Icon name
  iconSvg: '<svg>...</svg>',  // Extracted SVG
}
```

**Rendering (with iconSvg):**
```tsx
{showIcons && item.iconSvg && (
  <span 
    className="menu-icon"
    dangerouslySetInnerHTML={{ __html: item.iconSvg }}
  />
)}
<span>{item.label}</span>
```

---

### 3. Remove Unused Heroicons

**Cleanup:**
```bash
npm uninstall @heroicons/react
```

**Savings:**
- ~500KB from node_modules
- Cleaner dependencies
- No confusion about which library to use

---

## Mystery Font Awesome - Action Plan

### Investigation Steps

1. **Check node_modules:**
   ```bash
   find node_modules -name "*fontawesome*" -o -name "*font-awesome*"
   ```

2. **Check Puck dependencies:**
   ```bash
   npm ls @puckeditor/core
   # Check if Puck includes Font Awesome
   ```

3. **Check compiled CSS:**
   ```bash
   grep -r "@font-face" public/build/
   ```

4. **Check browser:**
   - Disable all extensions
   - Clear cache
   - View Page Source (not Inspect Element)
   - Check Network tab for Font Awesome requests

5. **Check third-party scripts:**
   - Any analytics?
   - Chat widgets?
   - CDN scripts?

### If Found

**If Font Awesome is actually being loaded:**
- Determine source (dependency, CDN, package)
- Assess if it's being used
- Remove if unused (reduce bundle size)
- Document if needed

**If Not Found:**
- User may be confused/seeing different site
- Browser extension injecting it
- False positive in developer tools

---

## Implementation Files

### Phase 1 - Core Icon Component

**New Files:**
```
resources/js/shared/utils/
  └── extractIconSvg.ts              # SVG extraction utility

resources/js/shared/puck/components/media/
  ├── Icon.tsx                       # Icon component with dual rendering
  └── index.ts                       # Export
```

**Modified Files:**
```
resources/js/shared/puck/components/index.ts
  # Add Icon to exports

resources/js/shared/puck/config/index.tsx
  # Register Icon component
```

### Phase 2 - Icon Picker

**New Files:**
```
resources/js/shared/components/icon-picker/
  ├── IconPickerModal.tsx            # Modal with search/grid
  ├── IconGrid.tsx                   # Virtualized icon grid
  ├── IconSearch.tsx                 # Search with fuzzy matching
  ├── IconCategory.tsx               # Category filter
  └── index.ts                       # Exports

resources/js/shared/puck/fields/
  └── IconPickerControl.tsx          # Custom field for icon selection
```

### Phase 3 - Navigation Integration

**Modified Files:**
```
resources/js/shared/puck/components/navigation/Navigation.tsx
  # Add icon/iconSvg to menu item structure
  # Render icons inline from SVG

resources/js/shared/services/api/types.ts
  # Add icon/iconSvg to MenuItem interface
```

---

## Testing Requirements

### SVG Extraction
- [ ] extractIconSvg() works for all Lucide icons
- [ ] SVG output is valid XML
- [ ] SVG includes proper namespaces
- [ ] Size and strokeWidth parameters apply correctly
- [ ] Error handling for invalid icon names

### Icon Component (Editor)
- [ ] Dropdown shows all 1000+ Lucide icons
- [ ] Icon preview renders correctly
- [ ] Color customization works (theme + custom)
- [ ] Size changes apply in real-time
- [ ] StrokeWidth changes apply in real-time
- [ ] Icon name saved to database
- [ ] SVG extracted and saved on icon change

### Icon Component (Storefront)
- [ ] Inline SVG renders correctly
- [ ] Color styling applies (via currentColor)
- [ ] Size attributes correct
- [ ] No Lucide library loaded (verify network tab)
- [ ] SVG accessible (proper ARIA if needed)
- [ ] Multiple icons on same page work
- [ ] Icons work in all themes

### Re-editing
- [ ] Icon name shown in dropdown when reopening
- [ ] Can change from Star → Heart
- [ ] New SVG extracted on change
- [ ] Old SVG replaced in database
- [ ] Preview updates immediately

### Performance
- [ ] Page load time unchanged (no library)
- [ ] Bundle size zero increase on storefront
- [ ] Editor performance acceptable with 1000+ options
- [ ] SVG extraction < 100ms per icon
- [ ] Multiple icons render efficiently

### Integration
- [ ] Navigation menu icons render inline
- [ ] Menu icons work in all styles (horizontal/vertical)
- [ ] Mobile navigation shows icons
- [ ] Icon + text alignment correct

---

## Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-03 | Use SVG extraction strategy | Matches CSS optimization philosophy, zero bundle impact |
| 2026-02-03 | Store both icon name + SVG | Name for re-editing, SVG for rendering |
| 2026-02-03 | Deprecate Card component | Flexible composition preferred (Box + Icon + Text) |
| 2026-02-03 | Use Lucide as icon source | Already installed, 1000+ icons, consistent with dashboard |
| 2026-02-03 | Remove Heroicons | Unused, cleanup |
| 2026-02-03 | Font Awesome from Debugbar - ignore | Development-only, not in production |
| 2026-02-03 | Icon name as unique ID | Lucide names are unique, can use for CSS classes/keys |
| TBD | Implement custom SVG support | After core icon component proves valuable |

---

## Questions to Answer

1. ~~**Is Font Awesome actually being loaded?**~~ ✅ **Resolved:** Laravel Debugbar (dev only)

2. **Icon picker UX:**
   - Simple dropdown initially, or go straight to modal picker?
   - Recommendation: Start simple (dropdown), upgrade to modal in Phase 2

3. **SVG sanitization needed?**
   - Lucide SVGs are trusted (from library)
   - Custom SVG (Phase 4) will need sanitization
   - Action: Safe to skip for Phase 1

4. **Icon size units:**
   - Pixels only, or support rem/em?
   - Recommendation: Pixels initially (simpler), can add units later

5. **Accessibility:**
   - Add aria-label to icons?
   - Add role="img"?
   - Recommendation: Add in Phase 1 (good practice)

---

## Estimated Effort

**Phase 1 (SVG Extraction + Core Icon Component):** 6-8 hours
- SVG extraction utility: 2 hours
- Icon component (editor + storefront): 3 hours
- Testing: 2 hours
- Documentation: 1 hour

**Phase 2 (Icon Picker UI):** 8-12 hours
- Modal component: 3 hours
- Search/filter: 3 hours
- Virtualized grid: 2 hours
- Integration: 2 hours
- Testing: 2 hours

**Phase 3 (Navigation Integration):** 4-6 hours
- Add icon fields: 2 hours
- SVG extraction for menu items: 2 hours
- Rendering logic: 1 hour
- Testing: 1 hour

**Phase 4 (Custom SVG):** 6-8 hours
- Upload/paste UI: 2 hours
- SVG validation/sanitization: 3 hours
- Color customization: 2 hours
- Testing: 1 hour

**Total:** 24-34 hours (significantly less than previous approach)

**Savings from SVG extraction approach:**
- No complex library loading logic needed
- No runtime icon resolution
- Simpler codebase
- Better performance by default

---

## References

**Icon Libraries:**
- Lucide: https://lucide.dev/ (1000+ icons, MIT license)
- Heroicons: https://heroicons.com/ (unused, can remove)
- Font Awesome: https://fontawesome.com/ (mystery dependency?)

**Similar Implementations:**
- WordPress Dashicons
- Elementor Icon Library
- Webflow Icon Component
- Framer Icon Component

**Related Files:**
- `resources/js/shared/puck/components/content/Card.tsx`
- `resources/js/shared/puck/components/navigation/Navigation.tsx`
- `package.json`

---

## Estimated Effort

**Phase 1 (Icon Component):** 8 hours
- Component creation: 3 hours
- Integration: 2 hours
- Testing: 2 hours
- Documentation: 1 hour

**Phase 2 (Icon Picker UI):** 12 hours
- Modal UI: 4 hours
- Search/filter: 3 hours
- Grid layout: 2 hours
- Integration: 2 hours
- Testing: 1 hour

**Phase 3 (Component Integration):** 6 hours
- Button: 1 hour
- Navigation: 2 hours
- Card: 1 hour
- Heading: 1 hour
- Testing: 1 hour

**Phase 4 (Custom SVG):** 8 hours
- Upload/paste UI: 2 hours
- SVG validation: 3 hours
- Color customization: 2 hours
- Testing: 1 hour

**Total:** 34 hours (spread across multiple sprints)
