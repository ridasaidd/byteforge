import { describe, it, expect } from 'vitest';
import { generateVisibilityCSS, type ResponsiveVisibilityValue } from '../ResponsiveVisibilityControl';

describe('ResponsiveVisibilityControl - CSS Generation', () => {
  it('generates no CSS when all breakpoints are visible', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'visible',
      tablet: 'visible',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    expect(css).toBe('');
  });

  it('generates CSS to hide on mobile only', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'hidden',
      tablet: 'visible',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    expect(css).toContain('.test-component { display: none; }');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('display: revert;');
  });

  it('generates CSS to hide on desktop only', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'visible',
      tablet: 'visible',
      desktop: 'hidden',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    // Mobile base should NOT exist (since mobile is visible)
    expect(css).not.toMatch(/^\.test-component \{ display: none; \}/m);
    
    // Desktop should have media query with display: none
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('display: none;');
  });

  it('generates CSS to hide on tablet only', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'visible',
      tablet: 'hidden',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('display: none;');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('display: revert;');
  });

  it('generates CSS to hide on all breakpoints', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'hidden',
      tablet: 'hidden',
      desktop: 'hidden',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    // Should only have base hidden, no overrides needed
    expect(css).toContain('.test-component { display: none; }');
  });

  it('handles mobile and tablet hidden, desktop visible', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'hidden',
      tablet: 'hidden',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    expect(css).toContain('.test-component { display: none; }');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('display: revert;');
  });

  it('handles undefined tablet value (inherits from mobile)', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'hidden',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    expect(css).toContain('.test-component { display: none; }');
    expect(css).toContain('@media (min-width: 1024px)');
  });

  it('returns empty string for undefined value', () => {
    const css = generateVisibilityCSS('test-component', undefined);
    expect(css).toBe('');
  });

  it('optimizes CSS - does not add redundant rules', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'visible',
      tablet: 'visible',
      desktop: 'visible',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    // Should have no CSS at all when all visible
    expect(css).toBe('');
  });

  it('handles show on mobile, hide on tablet and desktop', () => {
    const value: ResponsiveVisibilityValue = {
      mobile: 'visible',
      tablet: 'hidden',
      desktop: 'hidden',
    };
    const css = generateVisibilityCSS('test-component', value);
    
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('display: none;');
    // Desktop shouldn't have a rule since it matches tablet
    const desktopMatches = css.match(/@media \(min-width: 1024px\)/g);
    expect(desktopMatches).toBeNull();
  });
});
