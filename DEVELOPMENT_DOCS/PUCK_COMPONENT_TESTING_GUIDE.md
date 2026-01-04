# Puck Component Testing Guide

## Overview

This guide outlines testing standards for Puck page builder components to ensure consistency, quality, and adherence to architectural patterns.

## Test Utilities

Location: `resources/js/shared/puck/__tests__/testUtils.tsx`

### Key Utilities

#### `renderPuckComponent(ui)`
Renders component with ThemeProvider wrapper.

#### `renderPuckComponentWithDragRef(ui)`
Renders component with mock puck.dragRef for testing `inline: true` components.

#### `mockThemeResolver(overrides)`
Creates mock theme resolver with default theme tokens.

#### `extractStyleTags(container)`
Extracts all `<style>` tag contents from rendered component.

---

## Testing Patterns

### 1. Component Configuration Tests

Every component should test its `ComponentConfig`:

```typescript
import { assertHasInlineTrue } from '../testUtils';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent Config', () => {
  it('should have inline: true', () => {
    assertHasInlineTrue(MyComponent);
  });
});
```

### 2. No Hardcoded Values

Components should use theme resolution, not hardcoded values:

```typescript
import { renderPuckComponent, extractStyleTags, assertNoHardcodedValues } from '../testUtils';

it('should not have hardcoded CSS values', () => {
  const { container } = renderPuckComponent(<MyComponentRender {...props} />);
  const css = extractStyleTags(container).join('\n');
  
  // Allow specific hardcoded values if necessary
  assertNoHardcodedValues(css, ['0px', 'none']);
});
```

**Common hardcoded violations:**
- ❌ `width: 100%` (should be responsive or conditional)
- ❌ `opacity: 0.9` (should use `resolve('component.hoverOpacity', '0.9')`)
- ❌ `#3b82f6` (should use `resolve('colors.primary')`)
- ❌ `font-weight: 500` (should use `resolve('typography.fontWeight.medium')`)

### 3. DragRef Attachment (inline: true components)

Components with `inline: true` must attach `dragRef`:

```typescript
import { renderPuckComponentWithDragRef, assertDragRefAttached } from '../testUtils';

it('should attach dragRef to root element', () => {
  const { container, dragRef } = renderPuckComponentWithDragRef(
    <MyComponentRender {...props} />
  );
  
  assertDragRefAttached(container, 'section'); // or 'div', 'nav', etc.
  expect(dragRef.current).toBeTruthy();
});
```

### 4. No Unnecessary Wrappers

Components should not have Puck's auto-wrapper when using `inline: true`:

```typescript
import { assertNoUnnecessaryWrappers } from '../testUtils';

it('should not have Puck auto-wrapper', () => {
  const { container } = renderPuckComponent(<MyComponentRender id="test-123" />);
  
  assertNoUnnecessaryWrappers(container, 'mycomponent-test-123');
});
```

### 5. Slot Components (Flex, Columns)

Slot components need special testing for `display: contents`:

```typescript
import { assertSlotWrapperUsesDisplayContents } from '../testUtils';

it('should use display: contents for slot wrapper', () => {
  const { container } = renderPuckComponent(
    <FlexRender id="test" direction="row" />
  );
  
  const css = extractStyleTags(container).join('\n');
  assertSlotWrapperUsesDisplayContents(css, 'flex-test');
});
```

### 6. Responsive CSS

Test that responsive properties generate media queries:

```typescript
import { assertResponsiveCSS } from '../testUtils';

it('should generate responsive padding CSS', () => {
  const { container } = renderPuckComponent(
    <MyComponentRender 
      padding={{
        base: { top: '16', unit: 'px' },
        lg: { top: '32', unit: 'px' }
      }}
    />
  );
  
  const css = extractStyleTags(container).join('\n');
  assertResponsiveCSS(css, 'padding', 'lg');
});
```

### 7. Theme Resolution

Verify colors use theme tokens:

```typescript
it('should resolve backgroundColor from theme', () => {
  const { container } = renderPuckComponent(
    <MyComponentRender 
      backgroundColor={{ type: 'theme', value: 'colors.primary' }}
    />
  );
  
  const element = container.querySelector('.mycomponent-test');
  const styles = getInlineStyles(element);
  
  // Should have resolved to actual color value
  expect(styles.backgroundColor).toBe('#3b82f6'); // or whatever theme resolves to
});
```

### 8. CSS Scoping

Ensure generated CSS is scoped to component className:

```typescript
import { assertCSSIsScoped } from '../testUtils';

it('should scope CSS to component className', () => {
  const { container } = renderPuckComponent(<MyComponentRender id="abc" />);
  
  const css = extractStyleTags(container).join('\n');
  assertCSSIsScoped(css, 'mycomponent-abc');
});
```

---

## Component Test Checklist

When testing a Puck component, verify:

- [ ] **Config has `inline: true`** (if component doesn't use slots)
- [ ] **DragRef is attached** to root element
- [ ] **No hardcoded values** in CSS (colors, sizes, opacity)
- [ ] **Theme resolution** for all dynamic values
- [ ] **Responsive CSS** generated for breakpoints
- [ ] **CSS is scoped** to component className
- [ ] **No Puck auto-wrapper** in rendered output
- [ ] **Display: contents** for slot wrapper (Flex/Columns only)
- [ ] **Renders without errors** with default props
- [ ] **Conditional rendering** works (alignment wrappers, etc.)

---

## Example: Complete Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { 
  renderPuckComponent, 
  renderPuckComponentWithDragRef,
  extractStyleTags,
  assertHasInlineTrue,
  assertNoHardcodedValues,
  assertDragRefAttached,
  assertNoUnnecessaryWrappers,
  assertCSSIsScoped,
  getInlineStyles
} from '../testUtils';
import { Button } from '../../components/content/Button';

const ButtonRender = Button.render;

describe('Button Component', () => {
  const defaultProps = {
    id: 'test-button',
    text: 'Click me',
    size: 'md' as const,
    linkType: 'none' as const,
    backgroundColor: { type: 'theme' as const, value: 'colors.primary' },
    textColor: { type: 'theme' as const, value: 'colors.neutral.white' }
  };

  describe('Configuration', () => {
    it('should have inline: true', () => {
      assertHasInlineTrue(Button);
    });
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      expect(() => {
        renderPuckComponent(<ButtonRender {...defaultProps} />);
      }).not.toThrow();
    });

    it('should attach dragRef when inline: true', () => {
      const { container } = renderPuckComponentWithDragRef(
        <ButtonRender {...defaultProps} />
      );
      
      assertDragRefAttached(container, 'div');
    });

    it('should not have Puck auto-wrapper', () => {
      const { container } = renderPuckComponent(<ButtonRender {...defaultProps} />);
      assertNoUnnecessaryWrappers(container, 'button-test-button');
    });
  });

  describe('Styling', () => {
    it('should not have hardcoded CSS values', () => {
      const { container } = renderPuckComponent(<ButtonRender {...defaultProps} />);
      const css = extractStyleTags(container).join('\n');
      
      // Allow common safe values
      assertNoHardcodedValues(css, ['0px', 'none', 'transparent']);
    });

    it('should scope CSS to component className', () => {
      const { container } = renderPuckComponent(<ButtonRender {...defaultProps} />);
      const css = extractStyleTags(container).join('\n');
      
      assertCSSIsScoped(css, 'button-test-button');
    });

    it('should resolve colors from theme', () => {
      const { container } = renderPuckComponent(<ButtonRender {...defaultProps} />);
      const button = container.querySelector('button, a');
      const styles = getInlineStyles(button as HTMLElement);
      
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.color).toBeTruthy();
    });
  });

  describe('Behavior', () => {
    it('should render as button when no link', () => {
      const { container } = renderPuckComponent(
        <ButtonRender {...defaultProps} linkType="none" />
      );
      
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('should render as link with href', () => {
      const { container } = renderPuckComponent(
        <ButtonRender 
          {...defaultProps} 
          linkType="external" 
          href="https://example.com"
        />
      );
      
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });
});
```

---

## Anti-Patterns to Test Against

### ❌ Hardcoded Width
```typescript
// BAD
const css = `.container { width: 100%; }`;

// GOOD
const css = alignment ? `.container { display: flex; }` : `.container { display: contents; }`;
```

### ❌ Hardcoded Opacity
```typescript
// BAD
e.currentTarget.style.opacity = '0.9';

// GOOD
e.currentTarget.style.opacity = resolve('components.button.hoverOpacity', '0.9');
```

### ❌ Hardcoded Colors
```typescript
// BAD
backgroundColor: '#3b82f6'

// GOOD
backgroundColor: resolve('colors.primary')
```

### ❌ Missing dragRef (inline: true)
```typescript
// BAD
return <div className={className}>{children}</div>

// GOOD (when inline: true)
return <div ref={puck?.dragRef} className={className}>{children}</div>
```

---

## Running Tests

```bash
# Run all tests
npm run test

# Run Puck component tests only
npm run test -- resources/js/shared/puck/__tests__

# Run specific component test
npm run test -- Button.test.tsx

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

---

## Next Steps

1. ✅ **Phase 1 Complete**: Test utilities created
2. 🔄 **Phase 2**: Write tests for existing components incrementally
3. 🔄 **Phase 3**: TDD for new components (write tests first)

When refactoring a component:
1. Write tests based on this guide
2. Run tests (they should fail)
3. Fix component to pass tests
4. Verify no regression in integration tests
