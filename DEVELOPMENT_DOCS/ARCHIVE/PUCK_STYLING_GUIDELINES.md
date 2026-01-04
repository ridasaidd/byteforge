# Puck Component Styling Guidelines

## Principles

1. **Responsive by Default**: All layout and visual properties should support breakpoints
2. **Use Controls Over Hard-Coding**: Leverage existing control components instead of hard-coded values
3. **Separate Static from Dynamic**: Static styles → `<style>` tag, Dynamic (theme-resolved) → inline `style`
4. **Minimize Inline Styles**: Only use for runtime-dynamic values that can't be pre-generated

## Property Classification

### ✅ Should be in `<style>` Tag (Static/Responsive)

**Layout & Display:**
- `display` - Already have DisplayControl
- `flexDirection`, `justifyContent`, `alignItems`, `gap`, `flexWrap` - Flex layout
- `gridTemplateColumns`, `gridGap`, `gridAutoRows` - Grid layout
- `position`, `top`, `right`, `bottom`, `left` - Positioning

**Typography:**
- `textAlign` - Already have alignment control
- `fontSize` - Already using ResponsiveFontSizeControl
- `fontWeight` - Already have FontWeightControl  
- `lineHeight` - Can make responsive

**Spacing & Sizing:**
- `padding`, `margin` - ✅ Already in `<style>` tags
- `width`, `height` - ✅ Already in `<style>` tags

**Visual Effects:**
- `border`, `borderRadius` - Already have BorderControl
- `boxShadow` - Already have ShadowControl
- `opacity`, `transform`, `filter`

**Static Properties:**
- `cursor`, `pointerEvents`, `userSelect`
- `textDecoration`, `fontStyle`
- `objectFit`, `objectPosition` (images)
- `transition` (can be static)

### ❌ Must Stay Inline (Runtime-Dynamic)

**Theme-Resolved Colors:**
- `backgroundColor` - Resolved via `resolve(theme.path)` at runtime
- `color` - Text color from theme
- `borderColor` - When using theme colors
- Any property using `useTheme().resolve()`

**Dynamic Content:**
- `backgroundImage` - Dynamic URLs from user uploads
- `backgroundSize`, `backgroundPosition`, `backgroundRepeat` - When paired with dynamic image

**Rare Edge Cases:**
- Properties that change on hover/focus states (if not using CSS hover)
- Properties driven by JavaScript state

## Current Issues Found

### Hard-Coded Styles (Should Use Controls)

#### 1. Form Components - Editor UI Hard-Coding

**RadioGroup.tsx (lines 66-72):**
```tsx
// ❌ BAD - Hard-coded editor UI
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
    Options
  </label>
  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
```

**Select.tsx (lines 68-74):** Same pattern

**Checkbox.tsx (lines 151, 156-160):**
```tsx
// ❌ BAD - Hard-coded colors and spacing
{required && <span style={{ color: colors.error, marginLeft: '4px' }}>*</span>}
<p style={{ 
  margin: '4px 0 0 0',
  fontSize: '13px', 
  color: '#6b7280',
  fontWeight: 'normal',
}}>
```

**Fix:** These are Puck editor field components, not user-facing. They can keep hard-coded styles for consistency, OR extract to CSS classes for editor styling.

#### 2. Button Component - Hard-Coded Values

**Button.tsx (lines 130-140):**
```tsx
// ❌ PARTIAL - Some hard-coded, some controlled
const baseStyles: React.CSSProperties = {
  display: display || 'inline-flex',  // ✅ Using display control
  alignItems: 'center',                // ❌ Should be in <style> tag
  justifyContent: 'center',            // ❌ Should be in <style> tag
  fontWeight: 500,                     // ❌ Hard-coded, should use fontWeight control
  transition: 'all 0.2s',              // ⚠️ Acceptable inline (simple static)
  cursor: 'pointer',                   // ⚠️ Acceptable inline
  textDecoration: 'none',              // ⚠️ Acceptable inline
  // ... colors are correctly inline (dynamic)
};
```

**Fix:** 
- Move `alignItems`, `justifyContent` to `<style>` tag
- Consider adding fontWeight control or use theme value
- Keep colors inline (correct)

#### 3. Heading Component - Static Layout Inline

**Heading.tsx (lines 109-118):**
```tsx
// ❌ BAD - Static properties inline
const styles: React.CSSProperties = {
  color: resolvedColor,              // ✅ Correct (dynamic)
  backgroundColor: resolvedBackgroundColor,  // ✅ Correct (dynamic)
  fontSize: fallbackFontSize,        // ⚠️ OK (fallback only)
  fontWeight: resolvedFontWeight,    // ✅ Correct (dynamic)
  textAlign: align,                  // ❌ Should be in <style> tag for responsive
  display: display || 'block',       // ❌ Should be in <style> tag
  ...borderToCss(border),            // ❌ Should be in <style> tag
  ...shadowToCss(shadow),            // ❌ Should be in <style> tag
};
```

**Fix:** Move `textAlign`, `display`, `border`, `shadow` to `<style>` tag (same pattern as Section)

#### 4. Text Component - Same Pattern

**Text.tsx (similar to Heading):**
```tsx
// ❌ BAD - Same issues as Heading
const styles: React.CSSProperties = {
  color: resolvedColor,              // ✅ Correct
  backgroundColor: resolvedBackgroundColor,  // ✅ Correct
  fontSize: fallbackFontSize,        // ⚠️ OK
  fontWeight: resolvedFontWeight,    // ✅ Correct
  lineHeight: resolvedLineHeight,    // ✅ Correct (could be responsive)
  textAlign: align,                  // ❌ Move to <style> tag
  display: display || 'block',       // ❌ Move to <style> tag
  ...borderToCss(border),            // ❌ Move to <style> tag
  ...shadowToCss(shadow),            // ❌ Move to <style> tag
};
```

#### 5. Flex Component - Layout Properties Inline

**Flex.tsx (lines 119-135):**
```tsx
// ❌ BAD - All layout properties inline
const styles: React.CSSProperties = {
  display: display || 'flex',        // ❌ Should be in <style> tag
  flexDirection: direction,          // ❌ Should be in <style> tag
  justifyContent: justifyMap[justify], // ❌ Should be in <style> tag
  alignItems: alignMap[align],       // ❌ Should be in <style> tag
  flexWrap: wrap,                    // ❌ Should be in <style> tag
  gap: `${gap}px`,                   // ❌ Should be in <style> tag
  backgroundColor: resolvedBackgroundColor, // ✅ Correct (dynamic)
  backgroundImage: ...,              // ✅ Correct (dynamic)
  ...borderToCss(border),            // ❌ Move to <style> tag
  ...shadowToCss(shadow),            // ❌ Move to <style> tag
};
```

**Fix:** Generate all layout properties in `<style>` tag, keep only colors/images inline

#### 6. Form Component - Gap and Direction Inline

**Form.tsx (lines 154-168):**
```tsx
// ❌ BAD - Layout properties inline
const baseStyles: React.CSSProperties = {
  backgroundColor: resolvedBgColor,  // ✅ Correct (dynamic)
  borderRadius: borderRadius ? `${borderRadius}px` : undefined,  // ❌ Move to <style>
  borderWidth: borderWidth ? `${borderWidth}px` : undefined,     // ❌ Move to <style>
  borderStyle: borderWidth && parseInt(borderWidth) > 0 ? 'solid' : undefined, // ❌ Move to <style>
  borderColor: resolvedBorderColor,  // ✅ Correct (dynamic)
  display: 'flex',                   // ❌ Move to <style> tag
  flexDirection: direction,          // ❌ Move to <style> tag
  gap: gap ? `${gap}px` : undefined, // ❌ Move to <style> tag
  width: '100%',                     // ❌ Move to <style> tag
  minHeight: puck?.isEditing ? '100px' : undefined, // ⚠️ OK (editor-specific)
};
```

## Refactoring Pattern

### Before (Current - Bad):
```tsx
const styles: React.CSSProperties = {
  textAlign: align,
  display: display,
  ...borderToCss(border),
  ...shadowToCss(shadow),
  color: resolvedColor,  // dynamic
};

return <h1 style={styles}>{text}</h1>;
```

### After (Correct):
```tsx
// Generate CSS in <style> tag
const alignmentCss = `
  .${className} {
    text-align: ${align};
    display: ${display};
  }
`;

const borderCss = border && border.style !== 'none' ? `
  .${className} {
    border: ${border.width}${border.unit} ${border.style} ${border.color};
    border-radius: ${border.radius}${border.unit};
  }
` : '';

const shadowCss = shadow && shadow.preset !== 'none' ? `
  .${className} {
    box-shadow: ${shadowValue};
  }
` : '';

// Only dynamic values inline
const styles: React.CSSProperties = {
  color: resolvedColor,
  backgroundColor: resolvedBackgroundColor,
};

return (
  <>
    <style>
      {alignmentCss}
      {borderCss}
      {shadowCss}
    </style>
    <h1 className={className} style={styles}>{text}</h1>
  </>
);
```

## Benefits of This Approach

1. **Responsive Support**: Can add media queries to `<style>` tag CSS for breakpoints
2. **Better Performance**: Browser parses CSS once, not recalculating inline styles
3. **Separation of Concerns**: Static layout separate from dynamic theming
4. **Easier Debugging**: Inspect element shows CSS classes with meaningful rules
5. **Future-Proof**: Ready for responsive controls (e.g., different gap per breakpoint)

## Implementation Priority

### High Priority (Breaks Responsive):
1. ✅ Section - DONE (alignment, border, shadow moved to `<style>`)
2. Heading, Text - `textAlign`, `display`, `border`, `shadow`
3. Button - `display`, layout alignment
4. Flex - All flex layout properties
5. Form - `display`, `flexDirection`, `gap`

### Medium Priority (Consistency):
6. Image, Card, Hero - Border and shadow
7. Container, Columns - Layout properties

### Low Priority (Editor UI):
8. Form field components (RadioGroup, Select, Checkbox) - Consider CSS classes for editor

## Notes

- **Theme colors MUST stay inline** - They resolve at runtime based on active theme
- **Background images MUST stay inline** - Dynamic URLs from user uploads  
- **Simple static properties** like `cursor`, `transition` are acceptable inline for simplicity
- **Editor-specific components** can use inline styles if they're not user-facing content
