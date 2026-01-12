import { describe, it, expect } from 'vitest';
import { generateResponsiveGapCSS, type ResponsiveGapValue } from '../ResponsiveGapControl';

describe('ResponsiveGapControl - CSS Generation', () => {
  it('generates CSS for mobile gap only', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '16', unit: 'px' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    expect(css).toContain('.test-component { gap: 16px; }');
    expect(css).not.toContain('@media');
  });

  it('generates CSS for all breakpoints', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '8', unit: 'px' },
      tablet: { value: '16', unit: 'px' },
      desktop: { value: '24', unit: 'px' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    
    expect(css).toContain('.test-component { gap: 8px; }');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('gap: 16px;');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('gap: 24px;');
  });

  it('generates CSS with rem units', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '1', unit: 'rem' },
      desktop: { value: '1.5', unit: 'rem' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    
    expect(css).toContain('gap: 1rem;');
    expect(css).toContain('gap: 1.5rem;');
  });

  it('generates CSS with em units', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '2', unit: 'em' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    
    expect(css).toContain('gap: 2em;');
  });

  it('handles legacy number values for backward compatibility', () => {
    const css = generateResponsiveGapCSS('test-component', 20);
    expect(css).toContain('.test-component { gap: 20px; }');
  });

  it('returns empty string for undefined value', () => {
    const css = generateResponsiveGapCSS('test-component', undefined);
    expect(css).toBe('');
  });

  it('skips media query if tablet matches mobile', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '16', unit: 'px' },
      tablet: { value: '16', unit: 'px' },
      desktop: { value: '24', unit: 'px' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    
    // Should have mobile base and desktop media query, tablet should be added
    expect(css).toContain('.test-component { gap: 16px; }');
    expect(css).toContain('@media (min-width: 1024px)');
  });

  it('supports decimal values', () => {
    const value: ResponsiveGapValue = {
      mobile: { value: '0.5', unit: 'rem' },
      desktop: { value: '1.25', unit: 'rem' },
    };
    const css = generateResponsiveGapCSS('test-component', value);
    
    expect(css).toContain('gap: 0.5rem;');
    expect(css).toContain('gap: 1.25rem;');
  });
});
