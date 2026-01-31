# Puck Page Builder - Roadmap & Architecture

> **Branch**: `page-builder`  
> **Last Updated**: January 7, 2026  
> **Status**: Core Architecture Complete | PHASE 1-4 Complete | PHASE 5 Deferred | PHASE 6 Planned

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

### ✅ PHASE 4: Essential Controls - Round 2 (COMPLETE)
**Time Estimate**: 4-6 hours  
**Status**: ✅ COMPLETE - All 7 controls fully implemented, tested, and integrated  
**Completion Date**: January 7, 2026  
**Why**: Complete core control coverage before composite blocks

#### 4.1 Height Control ⚡ HIGH PRIORITY ✅ COMPLETE
- **Purpose**: Height control alongside width (aspect ratios, fixed heights, hero sections, full-viewport sections)
- **Pattern**: Responsive control following `ResponsiveWidthControl` pattern
- **Values**: `auto`, `px`, `%`, `vh`, `rem`, `em`
- **Implementation**:
  ```tsx
  // In fields/ directory - create ResponsiveHeightControl.tsx
  export const ResponsiveHeightControl = ({ field, value, onChange }) => {
    // Same pattern as ResponsiveWidthControl
    // Supports all units: auto, px, %, vh, rem, em
  };
  
  // In fieldGroups.tsx - add to layoutFields
  export const layoutFields = {
    width: { /* existing */ },
    height: {
      type: 'custom',
      label: 'Height',
      render: ({ field, value, onChange }) => (
        <ResponsiveHeightControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: { value: 'auto', unit: 'auto' } },
    },
  };
  
  // In cssBuilder.ts - add height generation
  export function buildLayoutCSS(options: LayoutCSSOptions) {
    // ... existing code
    if (height) {
      css += generateHeightCSS(className, height);
    }
  }
  ```
- **Apply To**: Box, Section, Image, Card blocks

**Deliverables**:
- [x] Create `ResponsiveHeightControl.tsx` (follow width control pattern)
- [x] Add to `layoutFields` in `fieldGroups.tsx`
- [x] Add `generateHeightCSS()` to respective control file
- [x] Update `buildLayoutCSS()` to include height
- [x] Apply to Box, Section, Image, Card
- [x] Write tests using `defineBlockTestSuite()`

Notes:
- Fixed cssBuilder bug by destructuring `height` in `buildLayoutCSS()` to resolve "height is not defined" errors; Height control tests passing.

---

#### 4.2 Object Fit & Position ⚡ HIGH PRIORITY ✅ COMPLETE
- **Purpose**: Image scaling/cropping control (critical for Image block)
- **Pattern**: Simple radio/select controls (NOT responsive - rarely needs breakpoints)
- **Values**: 
  - `objectFit`: `cover`, `contain`, `fill`, `none`, `scale-down`
  - `objectPosition`: `center`, `top`, `bottom`, `left`, `right`, `top left`, `top right`, `bottom left`, `bottom right`
- **Implementation**:
  ```tsx
  // In fieldGroups.tsx - create imageFields group
  export const imageFields = {
    objectFit: {
      type: 'radio',
      label: 'Object Fit',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
        { label: 'Scale Down', value: 'scale-down' },
      ],
      defaultValue: 'cover',
    },
    
    objectPosition: {
      type: 'select',
      label: 'Object Position',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Top', value: 'top' },
        { label: 'Bottom', value: 'bottom' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
        { label: 'Top Left', value: 'top left' },
        { label: 'Top Right', value: 'top right' },
        { label: 'Bottom Left', value: 'bottom left' },
        { label: 'Bottom Right', value: 'bottom right' },
      ],
      defaultValue: 'center',
    },
  };
  
  // In cssBuilder.ts - add to buildLayoutCSS
  if (objectFit) {
    css += `.${className} { object-fit: ${objectFit}; }`;
  }
  if (objectPosition) {
    css += `.${className} { object-position: ${objectPosition}; }`;
  }
  ```
- **Apply To**: Image block (primary), potentially Box with background images

**Deliverables**:
- [x] Add `imageFields` group to `fieldGroups.tsx`
- [x] Update `buildLayoutCSS()` to handle object-fit/position
- [x] Apply to Image component
- [x] Write tests for Image block with object-fit/position

Notes:
- Added `aria-label` to `ObjectPositionControl` buttons for accessibility and reliable testing; tests updated to query by label.

---

#### 4.3 Min/Max Width & Height 📌 MEDIUM PRIORITY ✅ COMPLETE
- **Purpose**: Responsive constraints (max-width containers, min-height sections)
- **Pattern**: Responsive controls following existing pattern
- **Values**: `none`, `px`, `%`, `vh`, `vw`, `rem`
- **Implementation**:
  ```tsx
  // In fields/ directory - create controls
  ResponsiveMinWidthControl.tsx
  ResponsiveMaxWidthControl.tsx
  ResponsiveMinHeightControl.tsx
  ResponsiveMaxHeightControl.tsx
  
  // In fieldGroups.tsx - add to layoutAdvancedFields
  export const layoutAdvancedFields = {
    // ... existing (position, zIndex, opacity, overflow)
    
    minWidth: {
      type: 'custom',
      label: 'Min Width',
      render: ({ field, value, onChange }) => (
        <ResponsiveMinWidthControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: { value: '0', unit: 'px' } },
    },
    
    maxWidth: {
      type: 'custom',
      label: 'Max Width',
      render: ({ field, value, onChange }) => (
        <ResponsiveMaxWidthControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: { value: 'none', unit: 'none' } },
    },
    
    minHeight: {
      type: 'custom',
      label: 'Min Height',
      render: ({ field, value, onChange }) => (
        <ResponsiveMinHeightControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: { value: '0', unit: 'px' } },
    },
    
    maxHeight: {
      type: 'custom',
      label: 'Max Height',
      render: ({ field, value, onChange }) => (
        <ResponsiveMaxHeightControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: { value: 'none', unit: 'none' } },
    },
  };
  
  // In cssBuilder.ts - add generation
  if (minWidth) css += generateMinWidthCSS(className, minWidth);
  if (maxWidth) css += generateMaxWidthCSS(className, maxWidth);
  if (minHeight) css += generateMinHeightCSS(className, minHeight);
  if (maxHeight) css += generateMaxHeightCSS(className, maxHeight);
  ```
- **Apply To**: Box, Section, Container blocks

**Deliverables**:
- [x] Create 4 responsive controls (min/max width/height)
- [x] Add to `layoutAdvancedFields` in `fieldGroups.tsx`
- [x] Add CSS generation functions
- [x] Update `buildLayoutCSS()` to include all 4
- [x] Apply to Box, Section, Container
- [x] Write tests

Notes:
- MinMaxWidthControl and MinMaxHeightControl test suites are passing.

---

#### 4.4 Aspect Ratio ✅ COMPLETE
- **Purpose**: Modern CSS property for maintaining ratios (16:9 videos, 1:1 avatars, card thumbnails)
- **Pattern**: Simple select with common presets + custom option
- **Values**: `auto`, `16/9`, `4/3`, `1/1`, `21/9`, `3/2`, `2/3`, `custom`
- **Implementation**:
  ```tsx
  // In fieldGroups.tsx - add to layoutAdvancedFields
  export const layoutAdvancedFields = {
    // ... existing fields
    
    aspectRatio: {
      type: 'select',
      label: 'Aspect Ratio',
      options: [
        { label: 'None', value: 'auto' },
        { label: '16:9 (Widescreen)', value: '16/9' },
        { label: '4:3 (Standard)', value: '4/3' },
        { label: '1:1 (Square)', value: '1/1' },
        { label: '21:9 (Ultrawide)', value: '21/9' },
        { label: '3:2 (Photo)', value: '3/2' },
        { label: '2:3 (Portrait)', value: '2/3' },
        { label: 'Custom', value: 'custom' },
      ],
      defaultValue: 'auto',
    },
    
    // Show only if aspectRatio === 'custom'
    aspectRatioCustom: {
      type: 'text',
      label: 'Custom Ratio (e.g., 5/4)',
      defaultValue: '1/1',
    },
  };
  
  // In cssBuilder.ts
  if (aspectRatio && aspectRatio !== 'auto') {
    const ratio = aspectRatio === 'custom' ? aspectRatioCustom : aspectRatio;
    css += `.${className} { aspect-ratio: ${ratio}; }`;
  }
  ```
- **Apply To**: Image, Box, Card blocks
- **Conditional Field**: Show `aspectRatioCustom` only when `aspectRatio === 'custom'`

**Deliverables**:
- [x] Add `aspectRatio` fields to `layoutAdvancedFields`
- [x] Add conditional resolver for custom ratio input
- [x] Update `buildLayoutCSS()` to generate aspect-ratio CSS
- [x] Apply to Image, Box, Card
- [x] Write tests

**Notes**:
- Completed January 7, 2026
- All tests passing
- CSS generation integrated into buildLayoutCSS
- Conditional display of aspectRatioCustom field works correctly

---

#### 4.5 Text Decoration ✅ COMPLETE
- **Purpose**: Underlines, strikethroughs for text/links
- **Pattern**: Simple select (NOT responsive)
- **Values**: `none`, `underline`, `line-through`, `overline`
- **Implementation**:
  ```tsx
  // In fieldGroups.tsx - add to typographyAdvancedFields
  export const typographyAdvancedFields = {
    // ... existing (lineHeight, letterSpacing, textTransform)
    
    textDecoration: {
      type: 'select',
      label: 'Text Decoration',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Underline', value: 'underline' },
        { label: 'Line Through', value: 'line-through' },
        { label: 'Overline', value: 'overline' },
      ],
      defaultValue: 'none',
    },
    
    textDecorationStyle: {
      type: 'select',
      label: 'Decoration Style',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Double', value: 'double' },
        { label: 'Dotted', value: 'dotted' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Wavy', value: 'wavy' },
      ],
      defaultValue: 'solid',
    },
  };
  
  // In cssBuilder.ts or buildTypographyCSS
  if (textDecoration && textDecoration !== 'none') {
    css += `.${className} { text-decoration: ${textDecoration}; }`;
    if (textDecorationStyle) {
      css += `.${className} { text-decoration-style: ${textDecorationStyle}; }`;
    }
  }
  ```
- **Apply To**: Text, Heading, Button blocks
- **Conditional Field**: Show `textDecorationStyle` only when `textDecoration !== 'none'`

**Deliverables**:
- [x] Add fields to `typographyAdvancedFields`
- [x] Add conditional resolver for decoration style
- [x] Update CSS builder to generate text-decoration CSS
- [x] Apply to Text, Heading, Button
- [x] Write tests

**Notes**:
- Completed January 7, 2026
- Conditional textDecorationStyle field displays only when textDecoration !== 'none'
- All decoration styles (solid, double, dotted, dashed, wavy) supported

---

#### 4.6 Responsive Gap (Flex/Grid Unified) ✅ COMPLETE
- **Purpose**: Fix inconsistency - flex gap is number, grid gap is responsive
- **Pattern**: Create unified `ResponsiveGapControl` used by both flex and grid
- **Values**: Responsive pixels (0-200px range)
- **Implementation**:
  ```tsx
  // In fields/ directory - create ResponsiveGapControl.tsx
  export const ResponsiveGapControl = ({ field, value, onChange }) => {
    // Similar to ResponsiveGridGapControl but more flexible
    // Support all breakpoints with slider + input
  };
  
  // In fieldGroups.tsx - update both flex and grid
  export const flexLayoutFields = {
    // ... existing fields
    
    flexGap: {
      type: 'custom',
      label: 'Gap',
      render: ({ field, value, onChange }) => (
        <ResponsiveGapControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: 16 },
    },
  };
  
  export const gridLayoutFields = {
    // ... existing fields
    
    gridGap: {
      type: 'custom',
      label: 'Gap',
      render: ({ field, value, onChange }) => (
        <ResponsiveGapControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: 16 },
    },
  };
  
  // In cssBuilder.ts - update both flex and grid gap generation
  if (flexGap) {
    css += generateGapCSS(className, flexGap); // Now responsive
  }
  if (gridGap) {
    css += generateGapCSS(className, gridGap); // Uses same function
  }
  ```
- **Apply To**: Box (flex/grid modes), Section blocks
- **Breaking Change**: Convert existing `flexGap: number` to responsive format

**Deliverables**:
- [x] Create `ResponsiveGapControl.tsx`
- [x] Update `flexLayoutFields.flexGap` to use responsive control
- [x] Keep `gridLayoutFields.gridGap` but ensure same control
- [x] Update `buildLayoutCSS()` gap generation to handle responsive values
- [x] Migrate existing components using flexGap
- [x] Write tests

**Notes**:
- Completed January 7, 2026
- BREAKING CHANGE: flexGap changed from `GapValue` to `ResponsiveGapValue`
- Both flex and grid now use responsive gap controls
- Backward compatibility maintained for legacy number values
- All tests passing

---

#### 4.7 Visibility Control ✅ COMPLETE
- **Purpose**: Hide elements at specific breakpoints (responsive visibility)
- **Pattern**: Responsive control with simple visible/hidden toggle per breakpoint
- **Values**: `visible`, `hidden`
- **Implementation**:
  ```tsx
  // In fields/ directory - create ResponsiveVisibilityControl.tsx
  export const ResponsiveVisibilityControl = ({ field, value, onChange }) => {
    // Toggle per breakpoint: visible or hidden
    // Mobile | Tablet | Desktop
    // [Show] | [Show]  | [Hide]
  };
  
  // In fieldGroups.tsx - add to layoutAdvancedFields
  export const layoutAdvancedFields = {
    // ... existing fields
    
    visibility: {
      type: 'custom',
      label: 'Visibility',
      render: ({ field, value, onChange }) => (
        <ResponsiveVisibilityControl field={field} value={value} onChange={onChange} />
      ),
      defaultValue: { mobile: 'visible', tablet: 'visible', desktop: 'visible' },
    },
  };
  
  // In cssBuilder.ts
  if (visibility) {
    css += generateVisibilityCSS(className, visibility);
    // Generates: .className { visibility: hidden; } at specific breakpoints
    // OR: .className { display: none; } depending on preference
  }
  ```
- **Apply To**: All blocks (Box, Section, Heading, Text, etc.)
- **Use Case**: "Hide on mobile, show on desktop" or vice versa

**Deliverables**:
- [x] Create `ResponsiveVisibilityControl.tsx`
- [x] Add to `layoutAdvancedFields`
- [x] Add `generateVisibilityCSS()` function
- [x] Update `buildLayoutCSS()` to include visibility
- [x] Apply to all major blocks
- [x] Write tests

**Notes**:
- Completed January 7, 2026
- Optimized CSS generation: only generates rules when needed
- Toggle UI with visual feedback (green/red colors)
- All edge cases tested (hide on mobile, tablet, desktop, combinations)

---

### ⚪ PHASE 5: Advanced Features - Deferred (Evaluate Later)
**Time Estimate**: TBD  
**Why**: High complexity or low user demand - wait for feedback

#### 5.1 Dynamic HTML Element (Tag) Support 🎯
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

#### 5.2 Hover State Support ⚠️ ARCHITECTURAL DECISION
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

#### 5.3 Background Gradient Control ⚠️ UI COMPLEXITY
- **Purpose**: Linear/radial gradients for backgrounds
- **Challenge**: Complex UI (angle, multi-stop colors), lower immediate value
- **Decision**: Defer — most use cases covered by solid colors
- **Apply To**: Box, Card, Section blocks (future)
**Status**: Deferred

#### 5.4 Flex Child Control ⚠️ TOO TECHNICAL?
- **Purpose**: Control flex-grow, flex-shrink, flex-basis for items inside flex containers
- **Challenge**: Requires understanding flex algorithm, rarely needed
- **Decision**: Wait for user feedback before implementing
- **Alternative**: Most use cases covered by width/alignment controls
**Status**: Deferred — awaiting user feedback

#### 5.5 Backdrop Blur Control ⚠️ LIMITED BROWSER SUPPORT
- **Purpose**: Glassmorphism effect (`backdrop-filter: blur()`)
- **Challenge**: Not supported in older browsers
- **Decision**: Monitor browser support, implement if requested
**Status**: Deferred — browser support pending

#### 5.6 Image Filters (Blur, Brightness, etc.) ⚠️ COMPLEX UI
- **Purpose**: Image effects (grayscale, blur, brightness, contrast, saturate)
- **Challenge**: Needs multi-value control UI (slider for each filter)
- **Example**: `filter: blur(5px) brightness(1.2) contrast(1.1);`
- **Decision**: Defer — complex UI, most use cases covered by image editing tools
**Status**: Deferred — await user demand

#### 5.7 Static Transform (Rotate, Scale, Translate) ⚠️ COMPLEX
- **Purpose**: Initial transform state (not just hover)
- **Current**: Hover transform exists ✅
- **Challenge**: Needs multi-axis control UI (rotate X/Y/Z, scale X/Y, translate X/Y)
- **Decision**: Defer — hover covers most use cases
**Status**: Deferred

---

### ⚪ PHASE 6: Composite Blocks & Templates (Planned)
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
│   ├── cssBuilder.ts               # CSS generation (with theme token resolver)
│   ├── ColorPickerControlColorful.tsx  # Primary color picker (react-colorful)
│   ├── ColorPickerControl.tsx      # Legacy color control (native input)
│   ├── ResponsiveWidthControl.tsx  # Width control (responsive)
│   ├── ResponsiveFontSizeControl.tsx
│   ├── ResponsiveSpacingControl.tsx
│   ├── BorderControl.tsx           # Uses ColorPickerControlColorful
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
- ✅ ColorPickerControlColorful (react-colorful with RGBA, theme swatches, semantic colors)
- ✅ ColorPickerControl (legacy, native input)
- ✅ ResponsiveWidthControl
- ✅ ResponsiveFontSizeControl
- ✅ ResponsiveSpacingControl (padding/margin with auto checkbox)
- ✅ BorderControl (per-side, uses ColorPickerControlColorful)
- ✅ BorderRadiusControl (per-corner)
- ✅ ShadowControl (presets + custom)
- ✅ BackgroundImageField (media library picker)
- ✅ ResponsiveLineHeightControl
- ✅ ResponsiveLetterSpacingControl
- ✅ ResponsivePositionControl
- ✅ ResponsiveZIndexControl
- ✅ ResponsiveOpacityControl
- ✅ ResponsiveOverflowControl
- ✅ ResponsiveGridColumnsControl
- ✅ ResponsiveGridGapControl

### Newly Completed Controls ✅
- ✅ ResponsiveHeightControl
- ✅ ResponsiveMinWidthControl
- ✅ ResponsiveMaxWidthControl
- ✅ ResponsiveMinHeightControl
- ✅ ResponsiveMaxHeightControl
- ✅ ObjectFitControl
- ✅ ObjectPositionControl

**Note**: All custom numeric controls use `type="text"` with `inputMode="decimal"` or `inputMode="numeric"` and pattern validation to support float values starting with 0 (e.g., 0.5, 0.75). This avoids the input issue where `type="number"` prevents typing "0." when entering decimal values.

**Gap Controls**: Both `flexGap` and `gridGap` use a unit selector (px, rem, em) via `GapControl` and `ResponsiveGridGapControl`. Grid gap is responsive (mobile/tablet/desktop), while flex gap is a single value with unit selection.

**Unit Selection Pattern**: Controls with unit selection (FontSize, Gap) use button toggles instead of dropdowns to prevent sidebar overflow. Units are displayed as toggle buttons below the input field (e.g., [px] [rem] [em]).

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

### Current Testing Notes
- Legacy UI tests for Border and BorderRadius controls expect dropdowns/combobox roles. Controls now use button-toggle patterns to fit the sidebar and improve UX. Migrate selectors and assertions to query buttons and active states instead of role-based combobox queries.
- Integration tests depend on external API availability and proper environment configuration. Recent failures include network/auth issues (e.g., login ERR_NETWORK) and API validation (e.g., Users returning 422). Prefer mocking/stubbing HTTP calls for CI, or ensure test environment variables and seed data are configured for local runs.

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
    
    // Change vaEssential Controls - Round 2 (PHASE 4)
**Time**: 4-6 hours
1. **Height Control** (HIGH) - responsive, mirrors width
2. **Object Fit/Position** (HIGH) - critical for Image block
3. **Min/Max Width/Height** (MEDIUM) - responsive constraints
4. **Aspect Ratio** (MEDIUM) - modern CSS, common use case
5. **Responsive Gap** (MEDIUM) - fix flex/grid inconsistency
6. **Text Decoration** (LOW-MEDIUM) - simple typography enhancement
7. **Visibility Control** (LOW) - responsive show/hide

### Priority 2: Composite Blocks (PHASE 6

---

## 🎯 NEXT IMMEDIATE STEPS

### ✅ Phase 1-4 Complete!
All essential controls are now implemented. The Puck page builder has:
- ✅ Complete typography controls (font size, weight, line height, letter spacing, transform, decoration)
- ✅ Complete layout controls (display, width, height, min/max, position, z-index, opacity, overflow)
- ✅ Complete spacing controls (padding, margin - responsive)
- ✅ Complete visual controls (border, radius, shadow, background)
- ✅ Complete flex/grid controls (direction, justify, align, gap - responsive)
- ✅ Complete advanced controls (aspect ratio, visibility, object fit/position)

### Priority 1: Composite Blocks (PHASE 6) - RECOMMENDED NEXT
Now that base blocks are rock-solid, create reusable layout templates:
1. **Hero Block** (image + content layout with responsive variants)
2. **Feature Grid Block** (responsive 3-col grid of cards)
3. **Testimonial Section** (carousel/grid of testimonials)
4. **Contact Form Block** (pre-styled form with layout)
5. **FAQ Accordion Block** (collapsible Q&A)

**Why Composite Blocks?**: Base controls are comprehensive. Composite blocks will provide more immediate user value by offering pre-built patterns.

### Priority 2: Advanced Features (PHASE 5) - Deferred
Evaluate these based on user feedback:
1. Hover State Support (needs architectural decision)
2. Background Gradient Control (complex UI, lower priority)
3. Dynamic HTML Element (Tag) Support
4. Flex Child Control (too technical?)
5. Backdrop Blur, Image Filters, Static Transform

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
