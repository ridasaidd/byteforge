# Puck Page Builder - Roadmap & Architecture

> **Branch**: `page-builder`  
> **Last Updated**: January 4, 2026  
> **Status**: Core Architecture Complete | PHASE 1-3 Complete | PHASE 4-5 Planned

---

## 📊 PRIORITY ROADMAP

### ✅ PHASE 1: Typography Polish (COMPLETE)
**Time Estimate**: 2-3 hours  
**Status**: ✅ Complete - All controls implemented and tested

#### 1.1 Line Height Control (Responsive) ✅ COMPLETE
- **Purpose**: Readability control - cramped text on mobile without responsive line-height
- **Pattern**: Follow `ResponsiveFontSizeControl` pattern
- **Values**: `1`, `1.25`, `1.5`, `1.75`, `2`, or custom (em/rem/px/%)
- **Implementation**:
  ```tsx
  ResponsiveLineHeightControl
  typographyAdvancedFields = {
    lineHeight: {
      type: 'custom',
      render: ResponsiveLineHeightControl,
      defaultValue: { mobile: { value: '1.5', unit: 'em' } }
    }
  }
  ```
- **Apply To**: Heading, Text, Button blocks

#### 1.2 Letter Spacing Control (Responsive) ✅ COMPLETE
- **Purpose**: Modern UI styles, uppercase headings
- **Pattern**: Responsive like line-height
- **Values**: `-0.05em` to `0.5em` range, or custom
- **Implementation**:
  ```tsx
  ResponsiveLetterSpacingControl
  letterSpacing: {
    type: 'custom',
    render: ResponsiveLetterSpacingControl,
    defaultValue: { mobile: { value: '0', unit: 'em' } }
  }
  ```
- **Apply To**: Heading, Text, Button blocks

#### 1.3 Text Transform Control ✅ COMPLETE
- **Purpose**: Case transformation for headings/buttons
- **Pattern**: Simple select (NOT responsive - rarely needs breakpoints)
- **Values**: `none`, `uppercase`, `lowercase`, `capitalize`
- **Implementation**:
  ```tsx
  textTransform: {
    type: 'select',
    label: 'Text Transform',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Uppercase', value: 'uppercase' },
      { label: 'Lowercase', value: 'lowercase' },
      { label: 'Capitalize', value: 'capitalize' },
    ],
    defaultValue: 'none',
  }
  ```
- **Apply To**: Heading, Text, Button blocks

**Deliverables**:
- [x] Create `ResponsiveLineHeightControl.tsx`
- [x] Create `ResponsiveLetterSpacingControl.tsx`
- [x] Add `typographyAdvancedFields` to `fieldGroups.tsx`
- [x] Update Heading, Text, Button components
- [x] Update `buildTypographyCSS` to generate line-height/letter-spacing CSS
- [x] Write tests for new controls
- [x] Fix viewport syncing for slider/input values
- [x] Add labels to responsive wrapper

---

### � PHASE 2: Layout Essentials (Current - Common Use Cases)
**Time Estimate**: 1-2 hours  
**Status**: ✅ COMPLETE - All controls fully implemented and integrated
**Why**: Frequently needed for overlays, transparency effects, scroll containers

#### 2.1 Z-Index Control ⚡ HIGH PRIORITY
- **Purpose**: Stacking order for overlapping elements
- **Pattern**: Number input with presets
- **Values**: `-1`, `0`, `10`, `20`, `50`, `100`, `999`, `9999`, or custom
- **Implementation**:
  ```tsx
  zIndex: {
    type: 'select',
    label: 'Z-Index',
    options: [
      { label: 'Auto', value: 'auto' },
      { label: 'Behind (-1)', value: '-1' },
      { label: 'Base (0)', value: '0' },
      { label: 'Elevated (10)', value: '10' },
      { label: 'Dropdown (50)', value: '50' },
      { label: 'Modal (100)', value: '100' },
      { label: 'Tooltip (999)', value: '999' },
      { label: 'Custom', value: 'custom' },
    ],
    defaultValue: 'auto',
  }
  // If custom, show number input
  ```
- **Apply To**: Box, Card, Section blocks

#### 2.2 Opacity Control 📌 MEDIUM PRIORITY
- **Purpose**: Ghost elements, hover effects, overlays
- **Pattern**: Slider (0-100%) + text input
- **Values**: `0` to `1` (displayed as 0-100%)
- **Implementation**:
  ```tsx
  opacity: {
    type: 'custom',
    render: OpacityControl, // Slider + input
    defaultValue: 100, // Store as percentage
  }
  ```
- **Apply To**: Box, Card, Section, Image blocks

#### 2.3 Overflow Control 📌 MEDIUM PRIORITY
- **Purpose**: Scroll containers, hidden content, text truncation
- **Pattern**: Radio or select for X/Y control
- **Values**: `visible`, `hidden`, `scroll`, `auto`
- **Implementation**:
  ```tsx
  overflow: {
    type: 'radio',
    label: 'Overflow',
    options: [
      { label: 'Visible', value: 'visible' },
      { label: 'Hidden', value: 'hidden' },
      { label: 'Scroll', value: 'scroll' },
      { label: 'Auto', value: 'auto' },
    ],
    defaultValue: 'visible',
  }
    ### ✅ PHASE 2: Layout Essentials (COMPLETE)
  ```
- **Apply To**: Box, Card, Section blocks

    **Completion Date**: December 29, 2025
**Deliverables**:
    #### 2.1 Z-Index Control ✅ COMPLETE
- [x] Create `OpacityControl.tsx` (slider + input)
- [x] Add `layoutAdvancedFields` to `fieldGroups.tsx`
- [x] Update Box component (already complete)
    - **Implementation**: ✅ Complete
  BackgroundGradientControl
  backgroundGradient: {
    #### 2.2 Opacity Control ✅ COMPLETE
    render: BackgroundGradientControl,
    defaultValue: {
      enabled: false,
    - **Implementation**: ✅ Complete
  ```
- **Challenges**: UI complexity, preview generation
    #### 2.3 Overflow Control ✅ COMPLETE

#### 3.1 Background Gradient Control ⚠️ DEFERRED
- **Status**: Deferred — focus on cursor/transition first
- **Reason**: UI complexity (angle + multi-stop), lower immediate value
- **Apply To**: Box, Card, Section blocks (later)

#### 3.2 Transition Control ✅ COMPLETE
- **Purpose**: Smooth property changes (hover, focus, state updates)
- **Pattern**: Duration, easing, properties
- **Implementation**: Added `interactionFields.transition` with inline `TransitionField`; CSS emitted via `buildTypographyCSS`
- **Apply To**: Button, Card, Image blocks

#### 3.3 Cursor Control ✅ COMPLETE
- **Purpose**: Clear interaction affordance for clickable/disabled elements
- **Pattern**: Simple select
- **Implementation**: Added `interactionFields.cursor`; CSS emitted in Button/Card
- **Apply To**: Button, Card, Image blocks

**Deliverables**:
- [ ] (Deferred) Create `BackgroundGradientControl.tsx`
- [x] Add `cursor` control (interactionFields)
- [x] Add `transition` control (interactionFields)
- [x] Include interaction fields in Button/Card
- [x] Generate CSS for cursor and transition
- [x] Component tests pass (Button/Card)

---

### ⚪ PHASE 4: Advanced Features (Future - Evaluate Later)
**Time Estimate**: TBD  
**Why**: High complexity, need user feedback to prioritize

#### 4.1 Dynamic HTML Element (Tag) Support 🎯 NEW
**Purpose**: Choose semantic HTML element for Box (div, section, article, header, footer, main, nav, aside)
**Current State**: Field exists in `BoxProps` interface and puckConfig, but not implemented in render
**Challenge**: Need to dynamically render different HTML elements based on `tag` prop
**Implementation Plan**:
```tsx
// In Box.tsx - use React.createElement to render dynamic tag
function BoxComponent({ tag = 'div', ...props }) {
  const Element = tag as React.ElementType;  // Type cast tag to element
  return <Element className={className}>{content}</Element>;
}

// Or use mapping for type safety:
const tagMap = {
  'div': React.Fragment,  // Default
  'section': 'section',
  'article': 'article',
  'header': 'header',
  'footer': 'footer',
  'main': 'main',
  'nav': 'nav',
  'aside': 'aside',
} as const;

const Element = tagMap[tag];
return <Element className={className}>{content}</Element>;
```
**Benefit**: Improved semantic HTML for accessibility and SEO
**Status**: Deferred — TODO in Box component (line 99)

#### 4.2 Hover State Support ⚠️ ARCHITECTURAL DECISION
**Challenge**: Puck doesn't have built-in pseudo-state support

**Options**:
1. **Generate hover CSS via `<style>` tags** ⭐ RECOMMENDED
   ```tsx
   <style>
     .button-123 { background: blue; }
     .button-123:hover { background: darkblue; }
   </style>
   ```
   - ✅ Simple, works with existing architecture
   - ❌ Messy if every property can hover

2. **Build state switcher UI**
   ```tsx
   <Tabs>
     <Tab label="Default" />
     <Tab label="Hover" />
     <Tab label="Active" />
   </Tabs>
   ```
   - ✅ Clean UI pattern
   - ❌ Complex implementation, doubles field count

3. **Inline styles** (CAN'T DO HOVER)
   - ❌ Not possible for pseudo-states

**Recommendation**: If needed, use Option 1 (style tags) for specific high-value controls like `backgroundColor` with hover variant.
**Status**: Deferred — awaiting architectural planning

#### 4.2 Background Gradient Control ⚠️ UI COMPLEXITY
- **Purpose**: Linear/radial gradients for backgrounds
- **Challenge**: Complex UI (angle, multi-stop colors), lower immediate value
- **Decision**: Defer — most use cases covered by solid colors
- **Apply To**: Box, Card, Section blocks (future)
**Status**: Deferred

#### 4.3 Flex Child Control ⚠️ TOO TECHNICAL?
- **Purpose**: Control flex-grow, flex-shrink, flex-basis for items inside flex containers
- **Challenge**: Requires understanding flex algorithm, rarely needed
- **Decision**: Wait for user feedback before implementing
- **Alternative**: Most use cases covered by width/alignment controls
**Status**: Deferred — awaiting user feedback

#### 4.4 Backdrop Blur Control ⚠️ LIMITED BROWSER SUPPORT
- **Purpose**: Glassmorphism effect (`backdrop-filter: blur()`)
- **Challenge**: Not supported in older browsers
- **Decision**: Monitor browser support, implement if requested
**Status**: Deferred — browser support pending

---

### ⚪ PHASE 5: Composite Blocks & Templates (Planned)
**Time Estimate**: TBD  
**Status**: Planning — New phase for pre-built layout combinations  
**Why**: Accelerate page building by providing common patterns using base blocks  
**Concept**: Composite blocks that combine multiple base blocks (Box, Image, Heading, Text) into reusable templates

#### 5.1 Hero Block 🎯 HIGH PRIORITY
- **What**: Pre-built hero section using Box (container), Image, Heading, Text
- **Features**:
  - Background image with overlay
  - Responsive layout (image left/right on desktop, stacked on mobile)
  - CTA button slot
  - Customizable height, overlay opacity, alignment
- **Use Case**: Landing page headers, section introductions
- **Variants**: Hero (Image Right), Hero (Image Left), Hero (Centered)
- **Status**: Planned

#### 5.2 Feature Grid Block 📌 MEDIUM PRIORITY
- **What**: Card grid layout (3 columns desktop, 2 columns tablet, 1 column mobile)
- **Features**:
  - Responsive grid using Box grid layout
  - Card components with icon/image, heading, text, CTA
  - Customizable gap, alignment
- **Use Case**: Features showcase, benefits section
- **Status**: Planned

#### 5.3 Testimonial Section 📌 MEDIUM PRIORITY
- **What**: Carousel or grid of testimonial cards
- **Features**:
  - Quote, author name, role, avatar image
  - Star rating (optional)
  - Responsive layout
- **Use Case**: Social proof, customer testimonials
- **Status**: Planned

#### 5.4 Contact Form Block 📌 MEDIUM PRIORITY
- **What**: Pre-styled form container with fields
- **Features**:
  - Form component with TextInput, Textarea, Select fields
  - Submit button
  - Side-by-side layout with image (optional)
- **Use Case**: Contact pages, lead generation
- **Status**: Planned

#### 5.5 FAQ Accordion Block 📌 MEDIUM PRIORITY
- **What**: Collapsible FAQ section
- **Features**:
  - Accordion items (question/answer)
  - Smooth animations
  - Search/filter (optional)
- **Use Case**: FAQ pages, documentation
- **Status**: Planned

**Implementation Pattern**:
```tsx
// Composite blocks are regular Puck components that internally use base blocks
export const HeroBlock: ComponentConfig<HeroProps> = {
  label: 'Hero Section',
  inline: false,  // Container component
  fields: {
    ...slotField,           // For custom content
    ...backgroundFields,    // Hero background
    ...spacingFields,       // Hero padding
    minHeight: {...},       // Hero-specific field
    overlayOpacity: {...},  // Hero-specific field
  },
  defaultProps: extractDefaults(...),
  render: (props) => <HeroBlockComponent {...props} />,
};

// In render, use base blocks internally
function HeroBlockComponent({ id, items: Items, backgroundImage, minHeight, overlayOpacity }) {
  return (
    <Box 
      display={{ mobile: 'block', desktop: 'flex' }}
      minHeight={minHeight}
      backgroundImage={backgroundImage}
    >
      <Image ... />    {/* Left/right image */}
      <Box>            {/* Content area */}
        <Heading ... />
        <Text ... />
        <Button ... />
      </Box>
    </Box>
  );
}
```

---

## 🏗️ UNIFIED BLOCK DEVELOPMENT PATTERN

This is the **modern approach** we've adopted. Every new block uses these three patterns together:

### Pattern 1: Field Groups (Single Source of Truth)
```tsx
// In fieldGroups.tsx - define fields ONCE with defaults co-located
export const typographyFields = {
  fontSize: {
    type: 'custom',
    render: ResponsiveFontSizeControl,
    defaultValue: { mobile: { value: '16', unit: 'px' } },
  },
  fontWeight: {
    type: 'select',
    options: [100, 300, 400, 500, 600, 700, 900],
    defaultValue: 400,
  },
};

// In your component - spread and use
export const Heading: ComponentConfig<HeadingProps> = {
  fields: {
    ...typographyFields,      // ← Spreads fontSize, fontWeight
    ...layoutFields,
    ...spacingFields,
  },
  defaultProps: extractDefaults(typographyFields, layoutFields, spacingFields),
  // ✅ DRY: Defaults stay in fieldGroups.tsx, never drift
};
```

### Pattern 2: Centralized CSS Builder
```tsx
// In cssBuilder.ts - all CSS generation in ONE place
const layoutCss = buildLayoutCSS({
  className,
  display,
  width,
  padding,
  margin,
  fontSize,
  fontWeight,
  border,
  borderRadius,
  shadow,
  backgroundColor,
});

return (
  <>
    <style>{layoutCss}</style>  {/* Generated CSS here */}
    <h1 className={className}>{text}</h1>
  </>
);
```

### Pattern 3: Conditional Field Resolution
```tsx
// Show/hide fields based on component state
resolveFields: createConditionalResolver(
  // Base fields (always visible)
  ['display', 'width', 'padding', 'margin', 'fontSize'],
  
  // Conditional field groups
  [
    {
      condition: (props) => hasFlexInAnyBreakpoint(props.display),
      fieldKeys: ['direction', 'justify', 'align', 'wrap', 'flexGap'],
    },
    {
      condition: (props) => props.variant === 'outlined',
      fieldKeys: ['borderWidth', 'borderColor'],
    },
  ]
)
```

### Example: Building a New Block (Complete Workflow)

**Goal**: Add a new `Card` component

**Step 1: Add Fields to fieldGroups.tsx**
```tsx
// Reuse existing groups OR create card-specific ones
export const cardFields = {
  // Use existing fields
  backgroundColor: backgroundFields.backgroundColor,
  padding: spacingFields.padding,
  borderRadius: effectsFields.borderRadius,
  
  // Add new card-specific field
  variant: {
    type: 'select',
    label: 'Card Style',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Elevated', value: 'elevated' },
      { label: 'Outlined', value: 'outlined' },
    ],
    defaultValue: 'default',
  },
};
```

**Step 2: Create Component with Unified Pattern**
```tsx
// components/layout/Card.tsx
export interface CardProps {
  items?: () => React.ReactElement;
  variant: 'default' | 'elevated' | 'outlined';
  backgroundColor?: ColorValue;
  padding?: ResponsiveSpacingValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function CardComponent({ id, items: Items, variant, backgroundColor, padding, borderRadius, shadow, customCss }: CardProps) {
  const { resolve } = useTheme();
  const className = `card-${id}`;

  // Generate all CSS in one place
  const layoutCss = buildLayoutCSS({
    className,
    padding,
    borderRadius,
    shadow,
    backgroundColor: resolveColor(backgroundColor),
  });

  // Variant-specific styles
  const variantCss = (() => {
    switch(variant) {
      case 'elevated':
        return `.${className} { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }`;
      case 'outlined':
        return `.${className} { border: 1px solid var(--puck-color-grey-04); }`;
      default:
        return '';
    }
  })();

  return (
    <>
      <style>{layoutCss}{variantCss}</style>
      {Items && <Items {...({ className } as any)} />}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Card: ComponentConfig<CardProps> = {
  label: 'Card',
  inline: true,
  
  // Spread field groups - fields defined once in fieldGroups.tsx
  fields: {
    ...slotField,
    ...cardFields,
    ...spacingFields,
    ...backgroundFields,
    ...effectsFields,
    ...advancedFields,
  },
  
  // Extract defaults from field groups - DRY!
  defaultProps: extractDefaults(
    cardFields,
    spacingFields,
    backgroundFields,
    effectsFields,
    advancedFields
  ),
  
  // Conditional fields - show advanced controls only if needed
  resolveFields: createConditionalResolver(
    ['items', 'variant', 'padding', 'backgroundColor', 'borderRadius', 'shadow'],
    [
      {
        condition: (props) => props.variant === 'outlined',
        fieldKeys: [], // Show additional border controls if needed
      },
    ]
  ),
  
  render: (props) => <CardComponent {...props} />,
};
```

**Step 3: Test Using Unified Pattern**
```tsx
// In test file or blockTestFactory
defineBlockTestSuite({
  name: 'Card',
  block: Card,
  
  validProps: {
    variant: 'default',
    padding: { mobile: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px', linked: true } },
  },
  
  invalidProps: {
    variant: 'invalid-variant', // Should fail validation
  },
  
  testCases: [
    {
      name: 'renders with default variant',
      props: { variant: 'default', items: () => <div>Content</div> },
      assertions: (result) => {
        expect(result).toContain('card-'); // Has className
      },
    },
    {
      name: 'generates correct CSS for elevated variant',
      props: { variant: 'elevated' },
      assertions: (result) => {
        expect(result).toContain('box-shadow: 0 4px 6px');
      },
    },
  ],
});
```

**Benefits of This Pattern**:
- ✅ **DRY**: Fields defined once in `fieldGroups.tsx`, reused across components
- ✅ **Consistent**: All blocks use same structure
- ✅ **Maintainable**: CSS builder handles all generation
- ✅ **Scalable**: Add new field → auto-available to all components using that group
- ✅ **Responsive**: All fields support breakpoints by default
- ✅ **Testable**: Clear props interface, predictable defaults

---

## ARCHITECTURE

### Current File Structure

```
resources/js/shared/puck/
├── components/
│   ├── content/          # Heading, Text, Button, Image, Card
│   ├── forms/            # Form, TextInput, Textarea, Select, etc.
│   ├── layout/           # Box, Section, Container
│   └── navigation/       # Navigation
├── fields/
│   ├── fieldGroups.tsx             # ✅ SINGLE SOURCE OF TRUTH
│   ├── conditionalFields.ts        # Conditional field utilities
│   ├── cssBuilder.ts               # CSS generation
│   ├── ColorPickerControl.tsx      # Color control
│   ├── ResponsiveWidthControl.tsx  # Width control (responsive)
│   ├── ResponsiveFontSizeControl.tsx
│   ├── ResponsiveSpacingControl.tsx
│   ├── BorderControl.tsx
│   ├── BorderRadiusControl.tsx
│   ├── ShadowControl.tsx
│   └── index.ts                    # Exports
└── config.tsx                      # Puck configuration
```

### Field Groups Architecture

**File**: `fields/fieldGroups.tsx`

**Purpose**: Reusable field compositions with co-located default values (DRY principle)

**Available Field Groups**:
- `displayField` - Display property (Puck native select)
- `layoutFields` - Width (responsive)
- `flexLayoutFields` - Flex options (direction, justify, align, wrap, gap)
- `gridLayoutFields` - Grid options (columns, gap, alignItems)
- `spacingFields` - Padding, margin (responsive)
- `backgroundFields` - Background color (theme-aware)
- `backgroundImageFields` - Background image + size/position/repeat **✅ NEW**
- `effectsFields` - Border, border radius, shadow
- `advancedFields` - Custom CSS
- `slotField` - Items slot for containers
- `typographyFields` - Font size, weight, color, alignment

**Pattern**:
```tsx
export const someFields = {
  propertyName: {
    type: 'custom' | 'select' | 'text' | etc.,
    label: 'Label',
    render: CustomControl, // if type: 'custom'
    defaultValue: value,   // ← Co-located default!
  },
  // ... more fields
};
```

**Usage in Components**:
```tsx
export const MyComponent: ComponentConfig<MyProps> = {
  fields: {
    // Spread field groups
    ...displayField,
    ...layoutFields,
    ...spacingFields,
    // ... etc
  },
  
  // Extract defaults from field groups (DRY!)
  defaultProps: extractDefaults(
    displayField,
    layoutFields,
    spacingFields
  ),
  
  // Conditional fields based on display mode
  resolveFields: createConditionalResolver(
    ['display', 'width', 'padding'], // base fields
    [
      {
        condition: (props) => hasFlexInAnyBreakpoint(props.display),
        fieldKeys: ['direction', 'justify', 'align'],
      },
    ]
  ),
};
```

### CSS Generation Strategy

**File**: `fields/cssBuilder.ts`

**Purpose**: Centralized CSS generation to avoid duplication

**Key Function**:
```tsx
buildLayoutCSS(options: LayoutCSSOptions): string
```

Generates CSS for:
- ✅ Display (responsive)
- ✅ Flex layout
- ✅ Grid layout
- ✅ Width, padding, margin (responsive)
- ✅ Border (per-side)
- ✅ Border radius (per-corner)
- ✅ Shadow
- ✅ Background color/image
- 🔜 Line height (responsive)
- 🔜 Letter spacing (responsive)
- 🔜 Text transform
- 🔜 Z-index
- 🔜 Opacity
- 🔜 Overflow

**Usage**:
```tsx
const layoutCss = buildLayoutCSS({
  className,
  display,
  width,
  padding,
  margin,
  border,
  borderRadius,
  shadow,
  backgroundColor,
  backgroundImage,
  // ... more options
});

return (
  <>
    <style>{layoutCss}</style>
    {/* Component JSX */}
  </>
);
```

### Responsive Control Pattern

**All layout/typography values should be responsive**:
```tsx
{
  mobile: { value: '16', unit: 'px' },
  tablet: { value: '18', unit: 'px' },
  desktop: { value: '20', unit: 'px' },
}
```

**Breakpoints** (from theme):
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

**CSS Generation**:
```tsx
// Mobile-first approach
.className {
  property: mobileValue; /* base */
}

@media (min-width: 768px) {
  .className {
    property: tabletValue;
  }
}

@media (min-width: 1024px) {
  .className {
    property: desktopValue;
  }
}
```

### Conditional Fields Pattern

**Problem**: Flex/grid options should only show when `display: flex` or `display: grid`

**Solution**: `createConditionalResolver()` utility

**Key Concept**: Check **ALL breakpoints**, not just mobile!

```tsx
// ✅ Correct: Shows flex controls if ANY breakpoint uses flex
const isFlex = hasFlexInAnyBreakpoint(props.display)

// ❌ Wrong: Only checks mobile
const isFlex = props.display?.mobile === 'flex'
```

**Example**:
```tsx
resolveFields: createConditionalResolver(
  // Base fields (always visible)
  ['display', 'width', 'padding', 'margin'],
  
  // Conditional field groups
  [
    {
      condition: (props) => hasFlexInAnyBreakpoint(props.display),
      fieldKeys: ['direction', 'justify', 'align', 'wrap', 'flexGap'],
    },
    {
      condition: (props) => hasGridInAnyBreakpoint(props.display),
      fieldKeys: ['numColumns', 'gridGap', 'alignItems'],
    },
  ]
)
```

---

## ✅ COMPLETED WORK

### Recent Additions (December 25, 2025)

#### Background Image Picker ✅
- **What**: Media library integration for background images
- **Where**: `fieldGroups.tsx` - `BackgroundImageField` component
- **Features**:
  - Text input for manual URL entry
  - Browse button for media library modal
  - Preview thumbnail
  - Vertical layout (fits 289px sidebar)
  - Puck CSS variables for styling
- **Applied To**: Box block (all container components)

#### Image Block Browse Button Fix ✅
- **What**: Fixed horizontal layout overflow
- **Before**: Text field + Browse button side-by-side (exceeded sidebar)
- **After**: Browse button below text field (vertical layout)
- **File**: `content/Image.tsx` - `ImageUrlField` component

### UI Control Refactoring ✅
- **SpacingControl**: Vertical stacking, auto checkbox, Puck CSS variables
- **BorderRadiusControl**: Matching pattern, visual preview
- **BorderControl**: Puck CSS variables
- **DisplayControl**: Puck CSS variables (used by ResponsiveDisplayControl)

### Field Groups Consolidation ✅
- **Removed**: `fieldGroupsNew.tsx` duplicate
- **Updated**: `displayField` uses Puck native `type: 'select'`
- **Result**: Single source of truth in `fieldGroups.tsx`

### Core Components Implemented ✅
- **Layout**: Box, Section, Container
- **Content**: Heading, Text, Button, Image, Card
- **Forms**: Form, TextInput, Textarea, Select, Checkbox, RadioGroup, SubmitButton
- **Navigation**: Navigation (with metadata support)

### Controls Implemented ✅
- ✅ ColorPickerControl (theme-aware)
- ✅ ResponsiveWidthControl
- ✅ ResponsiveFontSizeControl
- ✅ ResponsiveSpacingControl (padding/margin with auto checkbox)
- ✅ BorderControl (per-side)
- ✅ BorderRadiusControl (per-corner)
- ✅ ShadowControl (presets + custom)
- ✅ BackgroundImageField (media library picker)

---

## 🎯 DESIGN PRINCIPLES

### 1. Responsive by Default
All layout and typography properties support breakpoints (mobile, tablet, desktop).

### 2. Theme Integration
Use `useTheme().resolve()` for theme colors, spacing, typography.

### 3. DRY (Don't Repeat Yourself)
- Field groups with co-located defaults
- `extractDefaults()` utility
- `buildLayoutCSS()` for CSS generation
- Conditional field resolver factory

### 4. Progressive Disclosure
Only show relevant controls:
- Flex options when `display: flex`
- Grid options when `display: grid`
- Hover states when enabled (future)

### 5. Puck CSS Variables
All custom controls use Puck's design system:
- `--puck-color-white`
- `--puck-color-grey-02`, `--puck-color-grey-04`, `--puck-color-grey-05`, `--puck-color-grey-08`
- `--puck-color-azure-04` (primary blue)

### 6. Sidebar Width Constraint
All controls fit 289px sidebar:
- Vertical stacking (slider above input)
- Full-width inputs (`width: 100%`)
- Grid layouts (2×2) for grouped controls

### 7. Inline Components
Use `inline: true` for components with single root element:
- ✅ Heading, Text, Button, Image, Card, Section
- ❌ Flex, Columns (slot-based, need wrapper)

---

## 📚 TESTING STRATEGY

### Block Component Tests - The Unified Pattern

**File**: `blockTestFactory.tsx`

**Coverage**: 89 Puck component tests passing

**Why This Pattern**: 
- Single `defineBlockTestSuite()` function covers all block testing needs
- Consistent test structure across all components
- Auto-validates props, defaults, and renders

### The Test Pattern: `defineBlockTestSuite()`

```tsx
// ✅ MODERN PATTERN - Used for all new blocks
defineBlockTestSuite({
  name: 'MyComponent',  // Component name
  block: MyComponent,   // The ComponentConfig to test
  
  // Props that should be valid
  validProps: {
    text: 'Hello',
    variant: 'primary',
    display: { mobile: 'block' },
  },
  
  // Props that should fail validation
  invalidProps: {
    text: 123, // Should be string
    variant: 'not-a-valid-variant',
  },
  
  // Specific test cases
  testCases: [
    {
      name: 'renders with default props',
      props: { /* minimal props */ },
      assertions: (result) => {
        expect(result).toContain('expected-text');
      },
    },
    {
      name: 'generates responsive CSS for flex display',
      props: { display: { mobile: 'flex', desktop: 'grid' } },
      assertions: (result) => {
        expect(result).toContain('@media (min-width: 1024px)');
        expect(result).toContain('display: grid');
      },
    },
    {
      name: 'applies theme color when backgroundColor is theme value',
      props: { backgroundColor: { type: 'theme', value: 'primary' } },
      assertions: (result) => {
        expect(result).toContain('var(--theme-primary)');
      },
    },
  ],
});
```

### What `defineBlockTestSuite()` Tests Automatically

1. **Render Test**: Component renders without crashing
2. **Props Validation**: Valid props accept, invalid props rejected
3. **Defaults Test**: Default values match `defaultProps` in config
4. **Field Group Test**: All fields in `fields` exist in `defaultProps`
5. **CSS Generation**: Responsive CSS generated correctly
6. **Custom Cases**: Your specific test cases

### Testing Patterns by Component Type

#### Layout Components (Box, Section, Container)
```tsx
defineBlockTestSuite({
  name: 'Box',
  block: Box,
  validProps: {
    display: { mobile: 'flex', desktop: 'grid' },
    width: { mobile: { value: '100', unit: '%' } },
    padding: { mobile: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px', linked: true } },
    backgroundColor: { type: 'theme', value: 'background' },
  },
  testCases: [
    {
      name: 'generates flex CSS when display is flex',
      props: { display: { mobile: 'flex' }, direction: 'row', justify: 'center' },
      assertions: (result) => {
        expect(result).toContain('display: flex');
        expect(result).toContain('justify-content: center');
      },
    },
    {
      name: 'generates grid CSS when display is grid',
      props: { display: { mobile: 'grid' }, numColumns: 3 },
      assertions: (result) => {
        expect(result).toContain('display: grid');
        expect(result).toContain('grid-template-columns: repeat(3, 1fr)');
      },
    },
  ],
});
```

#### Content Components (Heading, Text, Button)
```tsx
defineBlockTestSuite({
  name: 'Heading',
  block: Heading,
  validProps: {
    text: 'My Heading',
    level: 'h1',
    fontSize: { mobile: { value: '24', unit: 'px' }, desktop: { value: '36', unit: 'px' } },
    fontWeight: 700,
    textAlign: 'center',
  },
  testCases: [
    {
      name: 'renders correct heading level',
      props: { text: 'Title', level: 'h2' },
      assertions: (result) => {
        expect(result).toContain('<h2');
      },
    },
    {
      name: 'generates responsive font size CSS',
      props: { 
        fontSize: { 
          mobile: { value: '24', unit: 'px' }, 
          desktop: { value: '36', unit: 'px' } 
        },
      },
      assertions: (result) => {
        expect(result).toContain('font-size: 24px'); // mobile base
        expect(result).toContain('@media (min-width: 1024px)');
        expect(result).toContain('font-size: 36px'); // desktop
      },
    },
  ],
});
```

#### Form Components (TextInput, Select, Checkbox)
```tsx
defineBlockTestSuite({
  name: 'TextInput',
  block: TextInput,
  validProps: {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
  invalidProps: {
    type: 'not-a-valid-input-type',
  },
  testCases: [
    {
      name: 'renders input with correct attributes',
      props: { name: 'username', type: 'text', placeholder: 'Enter username' },
      assertions: (result) => {
        expect(result).toContain('name="username"');
        expect(result).toContain('type="text"');
        expect(result).toContain('placeholder="Enter username"');
      },
    },
  ],
});
```

### Control Tests

Each **custom control** (separate from components) should have:

```tsx
// Example: ResponsiveLineHeightControl.test.tsx
describe('ResponsiveLineHeightControl', () => {
  test('renders slider and input for mobile breakpoint', () => {
    const { container } = render(
      <ResponsiveLineHeightControl 
        field={{ label: 'Line Height' }}
        value={{ mobile: { value: '1.5', unit: 'em' } }}
        onChange={() => {}}
      />
    );
    expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  test('updates value on slider change', () => {
    const onChange = jest.fn();
    const { container } = render(
      <ResponsiveLineHeightControl 
        field={{ label: 'Line Height' }}
        value={{ mobile: { value: '1.5', unit: 'em' } }}
        onChange={onChange}
      />
    );
    const slider = container.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: '2' } });
    expect(onChange).toHaveBeenCalled();
  });

  test('handles multiple breakpoints', () => {
    const { container } = render(
      <ResponsiveLineHeightControl 
        field={{ label: 'Line Height' }}
        value={{ 
          mobile: { value: '1.5', unit: 'em' },
          tablet: { value: '1.6', unit: 'em' },
          desktop: { value: '1.7', unit: 'em' },
        }}
        onChange={() => {}}
      />
    );
    expect(container.textContent).toContain('Mobile');
    expect(container.textContent).toContain('Tablet');
    expect(container.textContent).toContain('Desktop');
  });
});
```

### Integration Tests

Test blocks **within the Puck editor** context:

```tsx
// Example: Card.integration.test.tsx
describe('Card Block - Integration', () => {
  test('renders in Puck editor with field controls', async () => {
    const { container } = render(
      <Puck
        config={puckConfig}
        data={{ 
          content: [{ 
            type: 'Card',
            props: { variant: 'default' }
          }],
        }}
      />
    );
    
    // Sidebar should show card fields
    expect(container.textContent).toContain('Card Style');
    expect(container.textContent).toContain('Background Color');
    expect(container.textContent).toContain('Padding');
  });

  test('updates rendered component when variant changes', async () => {
    const { container, rerender } = render(
      <Puck config={puckConfig} data={initialData} />
    );
    
    // Change variant in sidebar
    const variantSelect = container.querySelector('[name="variant"]');
    fireEvent.change(variantSelect, { target: { value: 'elevated' } });
    
    // Should render with elevated styles
    expect(container.querySelector('.card-123')).toHaveStyle('box-shadow');
  });
});
```

---

## � NEXT IMMEDIATE STEPS

### Priority 1: Typography Advanced Controls
1. Create `ResponsiveLineHeightControl.tsx`
2. Create `ResponsiveLetterSpacingControl.tsx`
3. Add `textTransform` field to `typographyFields`
4. Update `buildLayoutCSS` to generate CSS
5. Apply to Heading, Text, Button components
6. Write tests

### Priority 2: Composite Blocks (PHASE 5) - NEW!
Now that base blocks are solid, create reusable layout templates:
1. Hero Block (image + content layout with responsive variants)
2. Feature Grid Block (responsive 3-col grid of cards)
3. Testimonial Section (carousel/grid of testimonials)
4. Contact Form Block (pre-styled form with layout)
5. FAQ Accordion Block (collapsible Q&A)

### Priority 3: Advanced Features (PHASE 4) - Deferred
1. Hover State Support (needs architectural decision)
2. Background Gradient Control (complex UI, lower priority)
3. User feedback on Flex Child and Backdrop Blur controls

---

## 📖 RELATED DOCUMENTS

### Core Architecture
- `PUCK_ARCHITECTURE_REFACTOR.md` - Field groups, conditional fields, CSS builder
- `FIELD_GROUPS_CONSOLIDATION.md` - Single source of truth for fields
- `UI_CONTROL_REFACTORING.md` - Control styling consistency

### Implementation Guides
- `PUCK_STYLING_GUIDELINES.md` - CSS strategy (style tags vs inline)
- `PUCK_INLINE_STRATEGY.md` - When to use `inline: true`
- `PUCK_COMPONENT_TESTING_GUIDE.md` - Testing patterns

### Status & Checklists
- `PUCK_IMPLEMENTATION_CHECKLIST.md` - Backend/frontend integration status
- `PUCK_TESTING_SUMMARY.md` - Test coverage

---

## 🎓 LESSONS LEARNED

### What Works Well
- **Field Groups Pattern**: Co-located defaults eliminate drift
- **Conditional Resolver**: Clean API for dynamic fields
- **CSS Builder**: Single source of truth for CSS generation
- **Responsive-First**: All controls support breakpoints from day 1
- **Media Library Integration**: Seamless file picking

### What to Improve
- **Hover State Support**: Need architectural decision
- **Gradient Control**: Complex UI, defer until requested
- **Flex Child Control**: Too technical for most users
- **Documentation**: Keep this roadmap updated!

---

## 🤝 CONTRIBUTION GUIDELINES

### The Unified Development Workflow

All new blocks and controls follow the **three-pattern system**:

1. **Field Groups** (`fieldGroups.tsx`) - Define fields once with defaults
2. **CSS Builder** (`cssBuilder.ts`) - Centralized CSS generation
3. **Conditional Resolver** (`createConditionalResolver()`) - Smart field visibility

### Adding a New Control

**Timeline**: 30 mins - 1 hour

1. **Create control component** in `fields/`
   ```tsx
   // Example: OpacityControl.tsx
   export function OpacityControl({ field, value, onChange }) {
     return (
       <div>
         <input type="range" min="0" max="100" value={value ?? 100} onChange={...} />
         <input type="number" min="0" max="100" value={value ?? 100} onChange={...} />
       </div>
     );
   }
   ```

2. **Add to field group** in `fieldGroups.tsx`
   ```tsx
   export const layoutAdvancedFields = {
     opacity: {
       type: 'custom',
       label: 'Opacity (%)',
       render: OpacityControl,
       defaultValue: 100,
     },
   };
   ```

3. **Update `buildLayoutCSS()`** if CSS generation needed
   ```tsx
   // In cssBuilder.ts
   if (opacity !== undefined && opacity !== 100) {
     css += `.${className} { opacity: ${opacity / 100}; }`;
   }
   ```

4. **Apply to relevant components** (spread field group)
   ```tsx
   export const Box: ComponentConfig<BoxProps> = {
     fields: {
       ...layoutAdvancedFields,  // ← Now has opacity
       // ... other fields
     },
   };
   ```

5. **Write tests** using `defineBlockTestSuite()`
   ```tsx
   defineBlockTestSuite({
     name: 'Box with Opacity',
     block: Box,
     testCases: [
       {
         name: 'applies opacity CSS',
         props: { opacity: 50 },
         assertions: (result) => expect(result).toContain('opacity: 0.5'),
       },
     ],
   });
   ```

6. **Update roadmap** - Check off the deliverable in PHASE section

### Adding a New Component (Block)

**Timeline**: 2-4 hours

**Step-by-Step**:

1. **Create component file** in `components/{category}/`
   ```tsx
   // components/layout/MyComponent.tsx
   export interface MyComponentProps {
     id?: string;
     items?: () => React.ReactElement;
     // ... props matching field groups
   }

   function MyComponentComponent({ id, items: Items, ...props }: MyComponentProps) {
     const className = `my-component-${id}`;
     
     // Generate CSS using centralized builder
     const css = buildLayoutCSS({
       className,
       display: props.display,
       width: props.width,
       padding: props.padding,
       // ... all layout props
     });

     return (
       <>
         <style>{css}</style>
         {Items && <Items {...({ className } as any)} />}
       </>
     );
   }
   ```

2. **Create Puck config** (same file)
   ```tsx
   export const MyComponent: ComponentConfig<MyComponentProps> = {
     label: 'My Component',
     inline: true,  // If single root element
     
     // SPREAD field groups - DRY principle!
     fields: {
       ...slotField,
       ...displayField,
       ...layoutFields,
       ...spacingFields,
       ...backgroundFields,
       ...effectsFields,
       ...advancedFields,
     },
     
     // Extract defaults from field groups
     defaultProps: extractDefaults(
       displayField,
       layoutFields,
       spacingFields,
       backgroundFields,
       effectsFields,
       advancedFields
     ),
     
     // Smart field visibility
     resolveFields: createConditionalResolver(
       ['display', 'width', 'padding'],
       [
         {
           condition: (props) => hasFlexInAnyBreakpoint(props.display),
           fieldKeys: ['direction', 'justify', 'align', 'wrap', 'flexGap'],
         },
       ]
     ),
     
     render: (props) => <MyComponentComponent {...props} />,
   };
   ```

3. **Export from index** in `components/index.ts`
   ```tsx
   export { MyComponent, type MyComponentProps } from './layout/MyComponent';
   ```

4. **Write tests** using `defineBlockTestSuite()`
   ```tsx
   defineBlockTestSuite({
     name: 'MyComponent',
     block: MyComponent,
     validProps: { /* ... */ },
     testCases: [
       // ... test cases
     ],
   });
   ```

5. **Add to Puck config** in `config.tsx`
   ```tsx
   import { MyComponent } from './components';
   
   export const config: Config = {
     components: {
       // ... existing
       MyComponent,
     },
   };
   ```

6. **Test in editor** - Open page builder and add new component

### Checklist for New Component

- [ ] Component created in `components/{category}/`
- [ ] Props interface matches field groups
- [ ] Uses `buildLayoutCSS()` for all CSS
- [ ] Spreads field groups in `fields`
- [ ] Uses `extractDefaults()` for defaults
- [ ] Uses `createConditionalResolver()` for conditional fields
- [ ] Has `inline: true` if applicable
- [ ] Tested with `defineBlockTestSuite()`
- [ ] Exported from `components/index.ts`
- [ ] Added to Puck `config.tsx`
- [ ] Test passes locally
- [ ] Roadmap updated

### Checklist for New Control

- [ ] Control component created in `fields/`
- [ ] Added to appropriate field group in `fieldGroups.tsx`
- [ ] Default value co-located in field definition
- [ ] CSS generation updated in `buildLayoutCSS()` if needed
- [ ] Applied to relevant components
- [ ] Tested with `defineBlockTestSuite()`
- [ ] Roadmap updated

### Anti-Patterns to Avoid

❌ **Don't**:
- Define field defaults in multiple places (they drift!)
- Generate CSS in components (use `buildLayoutCSS()`)
- Hard-code field groups per component (spread and extract)
- Forget `extractDefaults()` (causes prop validation issues)
- Add fields to components without adding to `fieldGroups.tsx`
- Write custom CSS by hand (centralize in `buildLayoutCSS()`)

✅ **Do**:
- Define fields ONCE in `fieldGroups.tsx`
- Use `buildLayoutCSS()` for all layout/typography CSS
- Spread field groups and use `extractDefaults()`
- Keep `fieldGroups.tsx` as single source of truth
- Test with `defineBlockTestSuite()`
- Copy patterns from existing components (Box, Heading, Card)

---

**End of Roadmap**
