import { describe, it, expect } from 'vitest';
import {
  generateDisplayCSS,
  BREAKPOINTS,
  isResponsiveValue,
  type ResponsiveDisplayValue,
} from '../../fields';

describe('generateDisplayCSS', () => {
  describe('simple (non-responsive) values', () => {
    it('generates display:flex CSS', () => {
      const css = generateDisplayCSS('test-class', 'flex');
      expect(css).toContain('.test-class { display: flex; }');
    });

    it('generates display:none CSS', () => {
      const css = generateDisplayCSS('test-class', 'none');
      expect(css).toContain('.test-class { display: none; }');
    });

    it('generates display:block CSS', () => {
      const css = generateDisplayCSS('test-class', 'block');
      expect(css).toContain('.test-class { display: block; }');
    });

    it('generates display:grid CSS', () => {
      const css = generateDisplayCSS('test-class', 'grid');
      expect(css).toContain('.test-class { display: grid; }');
    });
  });

  describe('responsive values', () => {
    it('generates mobile display CSS', () => {
      const display: ResponsiveDisplayValue = { mobile: 'flex' };
      const css = generateDisplayCSS('test-class', display);
      expect(css).toContain('.test-class { display: flex; }');
    });

    it('generates display:none at mobile breakpoint', () => {
      const display: ResponsiveDisplayValue = { mobile: 'none' };
      const css = generateDisplayCSS('test-class', display);
      expect(css).toContain('.test-class { display: none; }');
    });

    it('generates media queries for responsive display values', () => {
      const display: ResponsiveDisplayValue = { mobile: 'block', tablet: 'flex', desktop: 'grid' };
      const css = generateDisplayCSS('test-class', display);

      // Mobile
      expect(css).toContain('.test-class { display: block; }');

      // tablet breakpoint
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.tablet}px)`);
      expect(css).toContain('display: flex;');

      // desktop breakpoint
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.desktop}px)`);
      expect(css).toContain('display: grid;');
    });

    it('supports hiding at specific breakpoints', () => {
      const display: ResponsiveDisplayValue = { mobile: 'flex', tablet: 'none' };
      const css = generateDisplayCSS('test-class', display);

      expect(css).toContain('.test-class { display: flex; }');
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.tablet}px)`);
      expect(css).toContain('display: none;');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for undefined', () => {
      const css = generateDisplayCSS('test-class', undefined);
      expect(css).toBe('');
    });

    it('handles all breakpoints', () => {
      const display: ResponsiveDisplayValue = {
        mobile: 'block',
        tablet: 'flex',
        desktop: 'grid',
      };
      const css = generateDisplayCSS('test-class', display);

      expect(css).toContain('display: block;');
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.tablet}px)`);
      expect(css).toContain('display: flex;');
      expect(css).toContain(`@media (min-width: ${BREAKPOINTS.desktop}px)`);
      expect(css).toContain('display: grid;');
    });
  });
});

describe('isResponsiveValue', () => {
  it('returns true for objects with mobile property', () => {
    expect(isResponsiveValue({ mobile: 'flex' })).toBe(true);
    expect(isResponsiveValue({ mobile: 'block', tablet: 'flex' })).toBe(true);
  });

  it('returns false for simple values', () => {
    expect(isResponsiveValue('flex')).toBe(false);
    expect(isResponsiveValue('block')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isResponsiveValue(null)).toBe(false);
    expect(isResponsiveValue(undefined)).toBe(false);
  });
});
