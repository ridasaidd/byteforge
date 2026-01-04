# Field Groups Consolidation & Best Practices

## What Changed

### Removed Redundancy
- ✅ **Deleted `fieldGroupsNew.tsx`** - Was a duplicate/experimental version of `fieldGroups.tsx`
- Now there's one source of truth: **`fieldGroups.tsx`**

### Fixed DisplayControl Usage
- ✅ Changed `displayField` to use **Puck's native `type: 'select'`** instead of custom render
- **Before:** Custom HTML select with DisplayControl component
- **After:** Puck's native select field with options array

```tsx
// Before - Custom render with DisplayControl
displayField = {
  display: {
    type: 'custom' as const,
    render: ({ field, value, onChange }) => (
      <DisplayControl field={field} value={value} onChange={onChange} />
    ),
  },
}

// After - Native Puck select
displayField = {
  display: {
    type: 'select' as const,
    label: 'Display',
    options: [
      { label: 'Block', value: 'block' },
      { label: 'Flex', value: 'flex' },
      { label: 'Grid', value: 'grid' },
      // ... more options
    ],
    defaultValue: 'block',
  },
}
```

### Benefits
✅ **Consistency** - Uses Puck's native field types when possible
✅ **Simplicity** - Fewer custom render functions = less complexity
✅ **Maintainability** - Single field group file, not duplicates
✅ **Performance** - No unnecessary component overhead for simple selects

---

## DisplayControl Still Exists (For Good Reason)

`DisplayControl.tsx` is still used but in a specific context:

- **Used by:** `ResponsiveDisplayControl` (responsive display control)
- **Purpose:** Used in component configurations that need **responsive display values** (mobile, tablet, desktop variants)
- **Pattern:** Custom component for complex responsive logic

So we have:
- **Simple cases (fieldGroups):** Use Puck's native `type: 'select'`
- **Responsive cases (components):** Use `ResponsiveDisplayControl` wrapper around `DisplayControl`

---

## Field Groups Architecture

### Organization (in `fieldGroups.tsx`)
```
1. Default Values
   ├── DEFAULT_BORDER
   └── DEFAULT_BORDER_RADIUS

2. Layout Fields (display, width)
   ├── displayField (now using Puck select)
   └── layoutFields

3. Typography Fields
   ├── textColorField
   ├── fontSizeField
   ├── fontWeightField
   ├── typographyFields
   └── textAlignField

4. Flex Layout Fields
   ├── direction
   ├── justify
   ├── align
   ├── wrap
   └── flexGap

5. Grid Layout Fields
   ├── numColumns
   ├── gridGap
   └── alignItems

6. Spacing Fields
   ├── padding
   └── margin

7. Background Fields
   ├── backgroundColor
   └── backgroundImageFields

8. Effects Fields
   ├── border
   ├── borderRadius
   └── shadow

9. Advanced Fields
   └── customCss

10. Combined Groups
    ├── slotField
    ├── commonLayoutFields
    └── typographyFields
```

---

## Best Practices Going Forward

### 1. Use Native Puck Fields When Possible
```tsx
// ✅ Good - Use Puck's type: 'select' for simple cases
direction: {
  type: 'select' as const,
  label: 'Direction',
  options: [
    { label: 'Row', value: 'row' },
    { label: 'Column', value: 'column' },
  ],
}

// ❌ Avoid - Custom render if Puck has native support
direction: {
  type: 'custom' as const,
  render: ({ value, onChange }) => <CustomSelect value={value} onChange={onChange} />
}
```

### 2. Use Custom Controls for Complex Logic
```tsx
// ✅ Good - Custom control for complex multi-part input
padding: {
  type: 'custom' as const,
  label: 'Padding',
  render: ({ field, value, onChange }) => (
    <SpacingControl field={field} value={value} onChange={onChange} />
  ),
}
```

### 3. Keep Default Values with Fields
```tsx
// ✅ Good - Default value right next to field
spacingFields = {
  padding: {
    type: 'custom' as const,
    label: 'Padding',
    render: (...) => <SpacingControl />,
    defaultValue: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }
    }
  }
}
```

### 4. Use Puck CSS Variables
```tsx
// ✅ Good - Use Puck's color system
const DEFAULT_BORDER = {
  color: 'var(--puck-color-grey-04)'
}

// ❌ Avoid - Hardcoded colors
const DEFAULT_BORDER = {
  color: '#e5e7eb'
}
```

---

## Files Structure

```
resources/js/shared/puck/fields/
├── fieldGroups.tsx ............. ✅ Main field group definitions
├── index.ts .................... ✅ Re-exports
│
├── DisplayControl.tsx ........... ✅ Used by ResponsiveDisplayControl
├── ResponsiveDisplayControl.tsx . ✅ Responsive version
│
├── SpacingControl.tsx ........... ✅ Custom spacing control
├── ResponsiveSpacingControl.tsx . ✅ Responsive version
│
├── BorderControlNew.tsx ......... ✅ Custom border control
├── BorderRadiusControl.tsx ...... ✅ Custom border-radius control
│
├── WidthControl.tsx ............ ✅ Custom width control
├── ResponsiveWidthControl.tsx ... ✅ Responsive version
│
└── [other controls] ............ ✅ Various other controls

❌ REMOVED:
- fieldGroupsNew.tsx (was redundant)
- SpacingControlBase.tsx (was unused prototype)
```

---

## Migration Path (if components need updating)

If any component is still importing from `fieldGroupsNew.tsx`, update to:
```tsx
import { displayField, spacingFields, effectsFields } from '@/shared/puck/fields/fieldGroups';
```

---

## Testing

✅ Verified:
- `fieldGroups.tsx` compiles without errors
- `displayField` uses native Puck `type: 'select'`
- All imports are clean
- No orphaned references to deleted files
