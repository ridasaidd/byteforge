# Puck `inline` Property Strategy

## Why Use `inline: true`?

When `inline: false` (the default), Puck wraps components in a `<div>` with drag/drop handlers. This can:
- Break CSS layouts (flex, grid)
- Add unwanted spacing
- Interfere with responsive design

When `inline: true`:
- No wrapper div - component renders directly
- Better CSS control and cleaner HTML
- **Requirement**: Must apply `puck.dragRef` to root element

## Component-by-Component Analysis

### ✅ Should Have `inline: true`

**Layout Components:**
- ✅ **Section** - Already has it, dragRef on `<section>`
- ✅ **Container** - Already has it, dragRef on `<div>`
- ❌ **Flex** - CAN'T use inline (renders slot, no root element)
- ❌ **Columns** - CAN'T use inline (renders slot, no root element)

**Content Components:**
- ✅ **Heading** - ADDED, dragRef on `<h1-6>`
- ✅ **Text** - ADDED, dragRef on `<p>`
- ⚠️ **Button** - COMPLEX (has conditional wrapper for alignment)
- ✅ **Image** - Should add, dragRef on `<img>` or wrapper
- ✅ **Card** - Should add, dragRef on `<div>`
- ✅ **Hero** - Should add, dragRef on root element

**Form Components:**
- ✅ **Form** - Already has it, dragRef on `<form>`
- ✅ **TextInput** - Should add, dragRef on wrapper `<div>`
- ✅ **Textarea** - Should add, dragRef on wrapper `<div>`  
- ✅ **Select** - Should add, dragRef on wrapper `<div>`
- ✅ **Checkbox** - Should add, dragRef on wrapper `<label>`
- ✅ **RadioGroup** - Should add, dragRef on wrapper `<div>`
- ✅ **SubmitButton** - Should add, dragRef on `<button>`

**Navigation:**
- ⚠️ **Navigation** - COMPLEX (conditional rendering, mobile menu)

### ❌ Cannot Have `inline: true`

Components that use **slot rendering** without a single root element:
- **Flex** - Passes styles to `Items` slot
- **Columns** - Passes styles to multiple column slots

These MUST keep wrapper divs for Puck's drag/drop to work.

## Implementation Pattern

### Simple Components (Single Root Element)

```tsx
// 1. Add puck prop to interface
function MyComponent({ id, text, puck }: MyProps & { puck?: { dragRef?: React.Ref<any> } }) {
  return <div ref={puck?.dragRef} className={className}>{text}</div>;
}

// 2. Add inline: true to config
export const My: ComponentConfig<MyProps> = {
  label: 'My Component',
  inline: true,  // ← Add this
  fields: { /* ... */ },
  render: (props) => <MyComponent {...props} />,
};
```

### Complex Components (Conditional Wrapper)

**Button** has alignment wrapper - two options:

**Option A**: Always render wrapper with dragRef
```tsx
return (
  <div ref={puck?.dragRef} className={`${className}-wrapper`}>
    {alignment ? (
      <div className={`${className}-container`}>{buttonElement}</div>
    ) : buttonElement}
  </div>
);
```

**Option B**: Apply dragRef conditionally
```tsx
{alignment ? (
  <div ref={puck?.dragRef} className={`${className}-container`}>
    {buttonElement}
  </div>
) : (
  <button ref={puck?.dragRef} /* ... */>{text}</button>
)}
```

### Slot Components (Cannot Use Inline)

```tsx
// Keep inline: false (default)
export const Flex: ComponentConfig<FlexProps> = {
  label: 'Flex',
  // inline: false,  // Don't set this - let Puck wrap it
  fields: {
    items: { type: 'slot', label: 'Items' },
  },
  render: ({ items: Items, ...props }) => {
    // Passes styles to slot - no root element to attach dragRef
    return Items && <Items style={styles} className={className} />;
  },
};
```

## Current Status

**Completed:**
- ✅ Section
- ✅ Container  
- ✅ Form
- ✅ Heading
- ✅ Text

**Remaining:**
- [ ] Image
- [ ] Card
- [ ] Hero
- [ ] Button (needs decision on wrapper strategy)
- [ ] Form fields (TextInput, Textarea, Select, Checkbox, RadioGroup, SubmitButton)
- [ ] Navigation (needs analysis)

**Cannot Do:**
- ❌ Flex (slot rendering)
- ❌ Columns (slot rendering)

## Benefits After Implementation

1. **Cleaner HTML** - No unnecessary wrapper divs
2. **Better Layout Control** - CSS applies directly to component
3. **Responsive Design** - No interference from Puck wrappers
4. **Performance** - Fewer DOM nodes
5. **Developer Experience** - Inspect element shows actual component structure
