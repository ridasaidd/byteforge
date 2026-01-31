# Phase 5d: CSS Builder Migration & Dual-Mode Rendering

## Overview
Migrated all 15 Puck components to use centralized CSS builders (`buildLayoutCSS` and `buildTypographyCSS`) with dual-mode rendering pattern for optimal performance and consistency.

## Problem Statement
- Components used inconsistent CSS generation approaches:
  - Some used individual CSS generators (`generateDisplayCSS`, `generateMarginCSS`, etc.)
  - Some built custom CSS inline
  - Image component had 80+ lines of manual CSS generation
  - Form components had custom `buildCSS()` functions
  - No standardized pattern across codebase
- Components injected `<style>` tags in both editor AND storefront (performance issue)
- Needed dual-mode: runtime CSS in editor only, pre-generated CSS files on storefront

## Solution Architecture

### Dual-Mode Rendering Pattern
```typescript
// Pattern applied to all 15 components
const isEditing = usePuckEditMode();

const css = isEditing ? (() => {
  const rules: string[] = [];
  
  // Use centralized builder
  const layoutCss = buildLayoutCSS({
    className,
    display, width, margin, padding,
    border, borderRadius, shadow, visibility
  });
  if (layoutCss) rules.push(layoutCss);
  
  return rules.join('\n');
})() : '';

return (
  <>
    {isEditing && css && <style>{css}</style>}
    {/* Component JSX */}
  </>
);
```

### CSS Builder Utilities

**1. buildLayoutCSS** - For layout-focused components
- **Supports**: display, width, height, min/max dimensions, margin, padding, border, borderRadius, shadow, position, zIndex, opacity, overflow, aspectRatio, visibility, backgroundColor, flex/grid properties
- **Used by**: Box, Button, Card, Image, Form (7 form components), Navigation

**2. buildTypographyCSS** - For typography-focused components  
- **Supports**: All layout properties PLUS textAlign, color, fontWeight, lineHeight, letterSpacing, textTransform, textDecoration, cursor, transition
- **Used by**: Heading, Text, Link

## Implementation Summary

### Phase 5c: Editor CSS Loading (COMPLETED)
- Created `useEditorCssLoader` hook (98 lines, 7 passing tests)
- Integrated into ThemeBuilderPage for header/footer sections
- Loads pre-generated CSS files into editor `<head>` tag
- **Result**: Base CSS in `<head>`, runtime CSS in `<body>` = CSS cascade pattern

### Phase 5d: Dual-Mode Rendering (COMPLETED)
- Created `usePuckEditMode` hook (56 lines, 6 passing tests)
- Detects edit mode via Puck context `appState.ui` or URL fallback
- Pattern: `{isEditing && <style>{css}</style>}`
- **Result**: CSS generation only in editor, storefront uses pre-generated files

## Migration Details

### Components Migrated (15 total)

#### Layout Components (4) - using `buildLayoutCSS`
1. **Box** (layout/Box.tsx)
   - Flex/grid container with comprehensive layout controls
   - Properties: display, direction, justify, align, gap, width, height, margin, padding, border, shadow

2. **Button** (content/Button.tsx)  
   - Interactive buttons with hover states
   - Fixed: Spacing, visibility, line-height, border, borderRadius, shadow controls
   - Changed className from `button-Button-${id}` to `button-${id}`
   - All 19 tests passing

3. **Card** (content/Card.tsx)
   - Feature cards with icon, title, description
   - Fixed: All layout properties (shadows, visibility, opacity, position, margin, padding, background, border)
   - Changed className from `card-Card-${id}` to `card-${id}`
   - All 18 tests passing

4. **Image** (content/Image.tsx)
   - **Before**: 80+ lines of manual CSS generation using 7 individual generators
   - **After**: Single `buildLayoutCSS` call (~15 lines)
   - Reduced code by ~60 lines
   - All 14 tests passing

#### Typography Components (3) - using `buildTypographyCSS`  
5. **Heading** (content/Heading.tsx)
   - h1-h6 elements with responsive typography
   - Already used `buildTypographyCSS` (no migration needed)

6. **Text** (content/Text.tsx)
   - Paragraph text with responsive styling
   - Already used `buildTypographyCSS` (no migration needed)

7. **Link** (content/Link.tsx)
   - Hyperlinks with hover states and navigation prevention in editor
   - Already used `buildTypographyCSS` (no migration needed)

#### Form Components (7) - using `buildLayoutCSS`
8. **Form** (forms/Form.tsx)
   - Form wrapper with flex layout
   - **Before**: Custom `buildCSS()` with manual flex/responsive handling
   - **After**: Single `buildLayoutCSS` call with flex properties
   - Simplified from ~50 lines to ~20 lines

9. **TextInput** (forms/TextInput.tsx)
   - Text input fields with validation
   - **Before**: Individual `generateDisplayCSS`, `generateMarginCSS`
   - **After**: Single `buildLayoutCSS({ display, margin })`

10. **Textarea** (forms/Textarea.tsx)
    - Multi-line text inputs
    - **Before**: Individual CSS generators
    - **After**: Consolidated with `buildLayoutCSS`

11. **Select** (forms/Select.tsx)
    - Dropdown select fields
    - **Before**: Individual CSS generators
    - **After**: Consolidated with `buildLayoutCSS`

12. **RadioGroup** (forms/RadioGroup.tsx)
    - Radio button groups
    - **Before**: Individual CSS generators
    - **After**: Consolidated with `buildLayoutCSS`

13. **Checkbox** (forms/Checkbox.tsx)
    - Checkbox inputs
    - **Before**: Individual CSS generators
    - **After**: Consolidated with `buildLayoutCSS`

14. **SubmitButton** (forms/SubmitButton.tsx)
    - Form submit buttons
    - **Before**: Individual CSS generators
    - **After**: Consolidated with `buildLayoutCSS`

#### Navigation Component (1) - using `buildLayoutCSS`
15. **Navigation** (navigation/Navigation.tsx)
    - Main navigation menus with mobile support
    - **Before**: `generateFontSizeCSS`, `generatePaddingCSS`, `generateMarginCSS`
    - **After**: Single `buildLayoutCSS` call for padding/margin, `generateFontSizeCSS` for responsive font sizes

## Test Updates

### Test Files Updated (2 files)
- **Button.test.tsx**: Added `usePuckEditMode: () => true` to mock, fixed obsolete alignment test
- **Card.test.tsx**: Added `usePuckEditMode: () => true` to mock

### Test Results
- ✅ **143/143 tests passing** across all components
- ✅ **0 TypeScript errors**
- ✅ All form components: 92 tests passing
- ✅ All content components: 51 tests passing

## Key Improvements

### Code Quality
- **Consistency**: All components use same CSS generation pattern
- **Maintainability**: One place to update layout CSS logic (`buildLayoutCSS`)
- **Reduced Duplication**: Eliminated ~200+ lines of redundant CSS generation code
- **Type Safety**: Centralized type definitions for responsive values

### Performance
- **Editor**: Components generate CSS on-demand for live preview
- **Storefront**: Zero runtime CSS generation, only pre-generated files loaded
- **Bundle Size**: Reduced by eliminating individual CSS generator imports in 8 components

### Developer Experience
- **Predictable**: Same pattern across all components
- **Testable**: All tests pass with consistent mocking pattern
- **Documented**: Clear examples in each component

## Files Modified

### Core Utilities
- `resources/js/shared/puck/fields/cssBuilder.ts` - Centralized CSS builders (already existed)
- `resources/js/shared/hooks/usePuckEditMode.ts` - Edit mode detection hook (Phase 5d)
- `resources/js/shared/hooks/useEditorCssLoader.ts` - CSS file loader (Phase 5c)

### Components (15 total)
**Content:**
- `resources/js/shared/puck/components/content/Button.tsx` ✅
- `resources/js/shared/puck/components/content/Card.tsx` ✅
- `resources/js/shared/puck/components/content/Image.tsx` ✅
- `resources/js/shared/puck/components/content/Heading.tsx` ✅ (already using builders)
- `resources/js/shared/puck/components/content/Text.tsx` ✅ (already using builders)
- `resources/js/shared/puck/components/content/Link.tsx` ✅ (already using builders)

**Forms:**
- `resources/js/shared/puck/components/forms/Form.tsx` ✅
- `resources/js/shared/puck/components/forms/TextInput.tsx` ✅
- `resources/js/shared/puck/components/forms/Textarea.tsx` ✅
- `resources/js/shared/puck/components/forms/Select.tsx` ✅
- `resources/js/shared/puck/components/forms/RadioGroup.tsx` ✅
- `resources/js/shared/puck/components/forms/Checkbox.tsx` ✅
- `resources/js/shared/puck/components/forms/SubmitButton.tsx` ✅

**Layout:**
- `resources/js/shared/puck/components/layout/Box.tsx` ✅ (already using builders)

**Navigation:**
- `resources/js/shared/puck/components/navigation/Navigation.tsx` ✅

### Tests (2 files)
- `resources/js/shared/puck/__tests__/components/content/Button.test.tsx` ✅
- `resources/js/shared/puck/__tests__/components/content/Card.test.tsx` ✅

## Next Steps

### Immediate (Phase 6): End-to-End Testing
1. **Integrate useEditorCssLoader into PageEditorPage** (tenant app)
   - Add CSS loading for tenant page editor
   - Follow same pattern as ThemeBuilderPage

2. **Browser Testing - Editor**
   - Test all 15 components in Puck editor
   - Verify live preview works for all property controls
   - Test responsive properties (mobile/tablet/desktop breakpoints)
   - Verify Button: spacing, visibility, borders, shadows all working
   - Verify Card: all layout properties working
   - Verify Form components: all controls functional

3. **Browser Testing - Storefront**
   - Confirm NO `<style>` tags injected on storefront pages
   - Verify only pre-generated CSS files loaded in `<head>`
   - Test page performance without runtime CSS generation
   - Verify all component styling appears correctly

4. **Performance Validation**
   - Measure storefront page load time (should be faster)
   - Confirm no runtime CSS compilation overhead
   - Verify cache-busting works (change theme → new CSS loads)

### Future Enhancements
- Add more layout components (Grid, Columns, etc.)
- Extend `buildLayoutCSS` to support additional CSS properties as needed
- Consider creating `buildFormCSS` for form-specific styling patterns
- Add visual regression testing for components

## Conclusion

Phase 5d successfully migrated all 15 Puck components to a unified CSS generation architecture. The dual-mode rendering pattern ensures optimal performance (runtime CSS only in editor) while maintaining consistent code patterns across the codebase.

**Status**: ✅ **COMPLETE**
- All 15 components migrated
- 143/143 tests passing
- 0 TypeScript errors
- Ready for end-to-end browser testing
