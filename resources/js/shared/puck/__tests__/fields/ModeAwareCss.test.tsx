import { describe, it, expect } from 'vitest';
import { BREAKPOINTS, isResponsiveValue, type ResponsiveDisplayValue } from '../../fields';

/**
 * These tests verify that mode-specific CSS (flex/grid properties) is only
 * emitted when the display value is appropriate for that mode.
 *
 * This prevents stale CSS rules when switching display from flex to block.
 */

// Replicate the flex CSS generation logic from Flex.tsx
function generateFlexModeCss(
  className: string,
  display: ResponsiveDisplayValue | undefined,
  direction: string = 'row',
  justify: string = 'flex-start',
  align: string = 'stretch',
  wrap: string = 'nowrap',
  gap: number = 16
): string {
  const flexProps = `flex-direction: ${direction}; justify-content: ${justify}; align-items: ${align}; flex-wrap: ${wrap}; gap: ${gap}px;`;

  // If no display or simple non-flex value, omit flex props
  if (!display || !isResponsiveValue(display)) {
    const val = (display as string) || 'flex';
    if (val !== 'flex' && val !== 'inline-flex') return '';
    return `.${className} { ${flexProps} }`;
  }

  let css = '';

  // Mobile
  if (display.mobile === 'flex' || display.mobile === 'inline-flex') {
    css += `.${className} { ${flexProps} }\n`;
  }

  // Breakpoints
  (['tablet', 'desktop'] as const).forEach(bp => {
    const val = display[bp];
    if (val === 'flex' || val === 'inline-flex') {
      css += `@media (min-width: ${BREAKPOINTS[bp]}px) {\n  .${className} { ${flexProps} }\n}\n`;
    }
  });

  return css;
}

// Replicate the grid CSS generation logic from Columns.tsx
function generateGridModeCss(
  className: string,
  display: ResponsiveDisplayValue | undefined,
  numColumns: number = 2,
  gap: number = 16,
  alignItems: string = 'stretch'
): string {
  const gridProps = `grid-template-columns: repeat(${numColumns}, 1fr); gap: ${gap}px; align-items: ${alignItems};`;

  if (!display || !isResponsiveValue(display)) {
    const val = (display as string) || 'grid';
    if (val !== 'grid' && val !== 'inline-grid') return '';
    return `.${className} { ${gridProps} }`;
  }

  let css = '';

  if (display.mobile === 'grid' || display.mobile === 'inline-grid') {
    css += `.${className} { ${gridProps} }\n`;
  }

  (['tablet', 'desktop'] as const).forEach(bp => {
    const val = display[bp];
    if (val === 'grid' || val === 'inline-grid') {
      css += `@media (min-width: ${BREAKPOINTS[bp]}px) {\n  .${className} { ${gridProps} }\n}\n`;
    }
  });

  return css;
}

describe('Mode-aware CSS emission for Flex', () => {
  describe('omits flex props when display is not flex-like', () => {
    it('omits flex props when display is block', () => {
      const css = generateFlexModeCss('flex-test', 'block' as any);
      expect(css).toBe('');
    });

    it('omits flex props when display is none', () => {
      const css = generateFlexModeCss('flex-test', 'none' as any);
      expect(css).toBe('');
    });

    it('omits flex props when display is grid', () => {
      const css = generateFlexModeCss('flex-test', 'grid' as any);
      expect(css).toBe('');
    });

    it('omits flex props when responsive base is block', () => {
      const css = generateFlexModeCss('flex-test', { mobile: 'block' });
      expect(css).toBe('');
    });

    it('omits flex props when responsive base is none', () => {
      const css = generateFlexModeCss('flex-test', { mobile: 'none' });
      expect(css).toBe('');
    });
  });

  describe('emits flex props when display is flex-like', () => {
    it('emits flex props when display is flex', () => {
      const css = generateFlexModeCss('flex-test', 'flex' as any);
      expect(css).toContain('flex-direction');
      expect(css).toContain('justify-content');
      expect(css).toContain('align-items');
      expect(css).toContain('flex-wrap');
      expect(css).toContain('gap');
    });

    it('emits flex props when display is inline-flex', () => {
      const css = generateFlexModeCss('flex-test', 'inline-flex' as any);
      expect(css).toContain('flex-direction');
    });

    it('emits flex props for responsive base: flex', () => {
      const css = generateFlexModeCss('flex-test', { mobile: 'flex' });
      expect(css).toContain('flex-direction');
    });
  });

  describe('handles mixed responsive values', () => {
    it('emits flex props only for breakpoints where display is flex', () => {
      const display: ResponsiveDisplayValue = { mobile: 'block', tablet: 'flex', desktop: 'none' };
      const css = generateFlexModeCss('flex-test', display);

      // Mobile is block - no flex props at mobile
      expect(css).not.toMatch(/^\.flex-test \{ flex-direction/);

      // tablet is flex - should have flex props
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.tablet}px)`);
      expect(css).toContain('flex-direction');

      // desktop is none - no flex props
      expect(css).not.toContain(`@media (min-width: ${BREAKPOINTS.desktop}px)`);
    });
  });
});

describe('Mode-aware CSS emission for Grid (Columns)', () => {
  describe('omits grid props when display is not grid-like', () => {
    it('omits grid props when display is block', () => {
      const css = generateGridModeCss('grid-test', 'block' as any);
      expect(css).toBe('');
    });

    it('omits grid props when display is flex', () => {
      const css = generateGridModeCss('grid-test', 'flex' as any);
      expect(css).toBe('');
    });

    it('omits grid props when display is none', () => {
      const css = generateGridModeCss('grid-test', 'none' as any);
      expect(css).toBe('');
    });

    it('omits grid props when responsive base is block', () => {
      const css = generateGridModeCss('grid-test', { mobile: 'block' });
      expect(css).toBe('');
    });
  });

  describe('emits grid props when display is grid-like', () => {
    it('emits grid props when display is grid', () => {
      const css = generateGridModeCss('grid-test', 'grid' as any);
      expect(css).toContain('grid-template-columns');
      expect(css).toContain('gap');
      expect(css).toContain('align-items');
    });

    it('emits grid props when display is inline-grid', () => {
      const css = generateGridModeCss('grid-test', 'inline-grid' as any);
      expect(css).toContain('grid-template-columns');
    });

    it('emits grid props for responsive base: grid', () => {
      const css = generateGridModeCss('grid-test', { mobile: 'grid' });
      expect(css).toContain('grid-template-columns');
    });
  });

  describe('handles mixed responsive values', () => {
    it('emits grid props only for breakpoints where display is grid', () => {
      const display: ResponsiveDisplayValue = { mobile: 'none', tablet: 'grid' };
      const css = generateGridModeCss('grid-test', display);

      // Mobile is none - no grid props at mobile
      expect(css).not.toMatch(/^\.grid-test \{ grid-template-columns/);

      // tablet is grid - should have grid props
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.tablet}px)`);
      expect(css).toContain('grid-template-columns');
    });
  });
});
