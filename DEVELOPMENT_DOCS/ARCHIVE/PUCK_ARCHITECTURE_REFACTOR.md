# Puck Component Architecture - DRY/SOLID Implementation

## Overview

This document describes the refactored architecture for Puck components, implementing DRY (Don't Repeat Yourself) and SOLID principles with full responsive control.

## Architecture Components

### 1. Field Groups (`fields/fieldGroups.tsx`)

Reusable field compositions with co-located default values. This eliminates duplication across components.

**Available Field Groups:**

- **`commonLayoutFields`**: backgroundColor, width, padding, margin, border, shadow, customCss
- **`flexLayoutFields`**: direction, justify, align, wrap, flexGap  
- **`gridLayoutFields`**: numColumns, gridGap, alignItems
- **`backgroundImageFields`**: backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat
- **`displayField`**: Responsive display control
- **`slotField`**: Items slot for containers

**Pattern:**
```typescript
export const commonLayoutFields = {
  backgroundColor: {
    type: 'custom',
    label: 'Background Color',
    render: (props: any) => <ColorPickerControl {...props} />,
    defaultValue: { type: 'custom' as const, value: '' }, // Co-located default!
  },
  width: {
    type: 'custom',
    label: 'Width',
    render: (props: any) => <ResponsiveWidthControl {...props} />,
    defaultValue: { mobile: { value: '100', unit: '%' } },
  },
  // ... more fields
};
```

### 2. Conditional Field Utilities (`fields/conditionalFields.ts`)

Helper functions for dynamic field resolution based on display mode.

**Key Functions:**

```typescript
// Check if any breakpoint (mobile, tablet, desktop) matches display modes
hasDisplayModeInAnyBreakpoint(display, ['flex', 'inline-flex'])

// Convenience helpers
hasFlexInAnyBreakpoint(display)  // checks flex, inline-flex
hasGridInAnyBreakpoint(display)  // checks grid, inline-grid

// Factory for creating resolveFields functions
createConditionalResolver(
  baseFieldKeys: string[],
  conditionalGroups: Array<{
    condition: (props) => boolean,
    fieldKeys: string[]
  }>
)

// Extract default values from field groups
extractDefaults(...fieldGroups)
```

**Key Concept - Multi-Breakpoint Checking:**

The architecture checks ALL breakpoints (mobile, tablet, desktop) when determining which fields to show:

```typescript
// ✅ Correct: Shows flex controls if ANY breakpoint uses flex
const isFlex = hasFlexInAnyBreakpoint(props.display)

// ❌ Wrong: Only checks mobile breakpoint
const isFlex = props.display.mobile === 'flex'
```

### 3. Centralized CSS Builder (`fields/cssBuilder.ts`)

Consolidates CSS generation logic to avoid duplication.

**Key Function:**

```typescript
buildLayoutCSS(options: LayoutCSSOptions): string
```

Generates all CSS for layout components including:
- Display CSS (responsive)
- Flex layout CSS
- Grid layout CSS  
- Width, padding, margin CSS (responsive)
- Border CSS
- Shadow CSS

**Benefits:**
- Single source of truth for CSS generation
- Consistent CSS output across all components
- Easier to maintain and update

### 4. Responsive Everything

ALL controls support full breakpoint control (mobile, tablet, desktop):

```typescript
type ResponsiveValue<T> = {
  mobile: T;
  tablet?: T;  // 768px+
  desktop?: T; // 1024px+
};
```

This allows users to set different values for each breakpoint on ANY control.

## Refactored Box Component

The Box component demonstrates the new architecture in action:

```typescript
export const Box: ComponentConfig<BoxProps> = {
  label: 'Box',
  
  // ✅ DRY: Use field groups instead of manual definitions
  fields: {
    ...slotField,
    ...displayField,
    ...commonLayoutFields,
    ...flexLayoutFields,
    ...gridLayoutFields,
    ...backgroundImageFields,
  },
  
  // ✅ DRY: Use factory function instead of manual logic
  resolveFields: createConditionalResolver(
    // Base fields always visible
    [
      'items',
      'display',
      'backgroundColor',
      'backgroundImage',
      'backgroundSize',
      'backgroundPosition',
      'backgroundRepeat',
      'width',
      'padding',
      'margin',
      'border',
      'shadow',
      'customCss',
    ],
    // Conditional fields based on display mode
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
  ),
  
  // ✅ DRY: Extract defaults from field groups
  defaultProps: extractDefaults(
    displayField,
    commonLayoutFields,
    flexLayoutFields,
    gridLayoutFields,
    backgroundImageFields
  ),
  
  render: (props) => <BoxComponent {...props} />,
};
```

### Component Implementation

```typescript
export function BoxComponent({ id, items: Items, display, ... }: BoxProps) {
  const { resolve } = useTheme();
  const className = `box-${id}`;

  // Resolve background color
  const resolvedBackgroundColor = (() => {
    if (!backgroundColor) return undefined;
    if (typeof backgroundColor === 'string') return backgroundColor;
    if (backgroundColor.type === 'theme') {
      return resolve(backgroundColor.value);
    }
    return backgroundColor.value;
  })();

  // ✅ DRY: Use centralized CSS builder
  const layoutCss = buildLayoutCSS({
    className,
    display,
    direction,
    justify,
    align,
    wrap,
    flexGap,
    numColumns,
    gridGap,
    alignItems,
    width,
    padding,
    margin,
    border,
    shadow,
  });

  // Only dynamic values in inline styles
  const styles: React.CSSProperties = {
    backgroundColor: resolvedBackgroundColor,
    ...(backgroundImage && {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
    }),
  };

  return (
    <>
      <style>{layoutCss}</style>
      <div className={className} style={styles}>
        {Items && <Items />}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}
```

## Benefits

### 1. DRY (Don't Repeat Yourself)
- Field definitions written once, reused everywhere
- CSS generation logic centralized
- Default values co-located with field definitions
- Conditional field logic extracted into helpers

### 2. SOLID Principles
- **Single Responsibility**: Each module has one job (field groups, CSS builder, conditional logic)
- **Open/Closed**: Easy to extend (add new field groups) without modifying existing code
- **Composability**: Components compose field groups instead of inheriting

### 3. Maintainability
- Update a field definition once, all components benefit
- Change CSS generation logic in one place
- Clear separation of concerns

### 4. Consistency
- All components use same field groups → consistent UX
- All components use same CSS builder → consistent output
- All components use same conditional logic → predictable behavior

### 5. Type Safety
- TypeScript types enforced throughout
- Co-located defaults ensure type correctness
- Factory functions provide type inference

## Testing

The architecture is validated with comprehensive tests:

- **23 tests** for conditional field utilities (all passing ✅)
- **32 tests** for Box component (all passing ✅)

Tests verify:
- Multi-breakpoint display mode checking
- Conditional field resolution
- Default value extraction
- CSS generation
- Responsive behavior

## Migration Path

To migrate an existing component to the new architecture:

1. **Replace manual field definitions with field groups:**
   ```typescript
   // Before
   fields: {
     backgroundColor: { type: 'custom', render: ... },
     padding: { type: 'custom', render: ... },
     // ... 20 more fields
   }
   
   // After
   fields: {
     ...commonLayoutFields,
     ...flexLayoutFields,
   }
   ```

2. **Replace manual resolveFields with factory:**
   ```typescript
   // Before
   resolveFields: (data, { fields }) => {
     const isFlex = data.props.display === 'flex';
     // ... 50 lines of logic
   }
   
   // After
   resolveFields: createConditionalResolver(
     ['base', 'fields'],
     [{ condition: hasFlexInAnyBreakpoint, fieldKeys: ['flex', 'fields'] }]
   )
   ```

3. **Replace manual defaults with extractDefaults:**
   ```typescript
   // Before
   defaultProps: {
     display: 'block',
     padding: { mobile: { top: '0', ... } },
     // ... 20 more properties
   }
   
   // After
   defaultProps: extractDefaults(commonLayoutFields, flexLayoutFields)
   ```

4. **Use centralized CSS builder in component:**
   ```typescript
   // Before
   const css = `
     .${className} { flex-direction: ${direction}; }
     .${className} { padding: ${padding}px; }
     // ... 100 lines of CSS generation
   `;
   
   // After
   const css = buildLayoutCSS({ className, display, padding, ... });
   ```

## Future Enhancements

- Create more field groups (typography, animation, etc.)
- Add CSS preprocessor support (nested rules, variables)
- Generate TypeScript types from field groups automatically
- Create visual field group composer/editor

## Key Takeaway

**Before:** 100+ lines of duplicated code per component  
**After:** 20 lines of declarative composition

The new architecture makes it trivial to create consistent, well-behaved components with full responsive control.
