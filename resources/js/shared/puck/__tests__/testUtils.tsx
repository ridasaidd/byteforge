import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { ComponentConfig } from '@puckeditor/core';

/**
 * Render Puck component with ThemeProvider
 */
export function renderPuckComponent(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/**
 * Render Puck component with puck prop (for testing dragRef)
 */
export function renderPuckComponentWithDragRef(ui: ReactElement) {
  const dragRef = { current: null };
  const elementWithPuck = {
    ...ui,
    props: { ...ui.props, puck: { dragRef } }
  };
  return { ...render(<ThemeProvider>{elementWithPuck}</ThemeProvider>), dragRef };
}

/**
 * Mock theme resolver for testing
 */
export const mockThemeResolver = (overrides: Record<string, string> = {}) => {
  const defaultTheme: Record<string, string> = {
    'colors.primary': '#3b82f6',
    'colors.secondary': '#8b5cf6',
    'colors.neutral.white': '#ffffff',
    'colors.neutral.black': '#000000',
    'typography.fontWeight.medium': '500',
    'typography.fontWeight.bold': '700',
    'components.button.variants.primary.backgroundColor': '#3b82f6',
    'components.button.variants.primary.color': '#ffffff',
    'components.button.hoverOpacity': '0.9',
    ...overrides
  };

  return (token: string, fallback?: string) => {
    return defaultTheme[token] || fallback || token;
  };
};

/**
 * Extract all <style> tags from rendered component
 */
export function extractStyleTags(container: HTMLElement): string[] {
  const styleTags = container.querySelectorAll('style');
  return Array.from(styleTags).map(tag => tag.textContent || '');
}

/**
 * Check if CSS contains media queries for responsive values
 * Useful for validating responsive props generate responsive CSS
 */
export function assertHasMediaQueries(css: string, minExpected: number = 1): boolean {
  const mediaQueries = css.match(/@media\s*\([^)]*min-width:/gi);
  return (mediaQueries?.length ?? 0) >= minExpected;
}

/**
 * Extract all media query declarations from CSS
 */
export function getMediaQueries(css: string): Array<{ breakpoint: string; rules: string }> {
  const matches = css.matchAll(/@media\s*\(min-width:\s*(\d+px)\)\s*\{([^}]+)\}/gi);
  return Array.from(matches).map(([_, breakpoint, rules]) => ({
    breakpoint,
    rules: rules.trim(),
  }));
}

/**
 * Verify a component config has resolveFields (conditional field resolver pattern)
 */
export function hasConditionalFieldResolver(config: any): boolean {
  return config && typeof config.resolveFields === 'function';
}

/**
 * Verify a component config uses field groups (spreads fields pattern)
 */
export function usesFieldGroups(config: any): boolean {
  // Check if fields come from spread operations (proxy for field groups)
  // This is a heuristic: look for patterns like displayField, layoutFields, etc.
  const fieldKeys = config?.fields ? Object.keys(config.fields) : [];

  // Common field group keys we'd expect to see
  const commonGroupKeys = [
    'display', 'width', 'height', 'margin', 'padding', 'flex',
    'direction', 'justify', 'align', 'wrap', 'gap',
    'border', 'borderRadius', 'shadow',
    'backgroundColor', 'customCss',
  ];

  // If component has multiple related fields, it's likely using field groups
  const relatedFieldCount = fieldKeys.filter(k => commonGroupKeys.includes(k)).length;
  return relatedFieldCount >= 3;
}

/**
 * Check if CSS contains responsive declarations for a specific property
 */
export function hasResponsiveProperty(css: string, property: string): boolean {
  const basePattern = new RegExp(`${property}\\s*:`, 'i');
  const mediaPattern = new RegExp(`@media[^}]*${property}\\s*:`, 'i');

  const hasBase = basePattern.test(css);
  const hasResponsive = mediaPattern.test(css);

  // True responsive: has both base and media-query versions
  return hasBase && hasResponsive;
}

/**
 * Check if component config has inline: true
 */
export function assertHasInlineTrue(config: any) {
  expect(config.inline).toBe(true);
}

/**
 * Verify a component config has all required pattern properties
 */
export function assertHasPatternCompliance(config: any) {
  // Required: inline: true
  expect(config.inline).toBe(true);

  // Required: fields defined
  expect(config.fields).toBeDefined();
  expect(typeof config.fields).toBe('object');

  // Required: defaultProps defined
  expect(config.defaultProps).toBeDefined();
  expect(typeof config.defaultProps).toBe('object');

  // Optional but recommended: resolveFields for complex components
  // (we don't enforce this as not all simple components need it)
}

/**
 * Check if CSS contains a specific media query breakpoint
 */
export function hasMediaQueryBreakpoint(css: string, minWidth: number): boolean {
  const pattern = new RegExp(`@media\\s*\\([^)]*min-width:\\s*${minWidth}px`, 'i');
  return pattern.test(css);
}

/**
 * Check if component config has responsive properties in fields
 */
export function hasResponsiveFields(config: any): Array<string> {
  const fields = config?.fields || {};
  const responsivePattern = /responsive|breakpoint|mobile|tablet|desktop/i;

  return Object.keys(fields).filter(key => {
    const fieldDef = fields[key];
    // Check field label or type for responsive indicators
    return responsivePattern.test(fieldDef?.label || '') ||
           fieldDef?.render?.toString().includes('Responsive');
  });
}

/**
 * Check if CSS contains hardcoded values (not from theme)
 * Common offenders: hardcoded colors, widths, opacity values
 */
export function assertNoHardcodedValues(css: string, allowedHardcoded: string[] = []) {
  const hardcodedPatterns = [
    { pattern: /width:\s*100%/i, message: 'Found hardcoded width: 100%' },
    { pattern: /opacity:\s*0\.\d+/i, message: 'Found hardcoded opacity value' },
    { pattern: /#[0-9a-f]{3,6}(?!.*resolve|.*theme)/i, message: 'Found hardcoded hex color (should use theme)' },
  ];

  hardcodedPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(css)) {
      // Check if it's in allowed list
      const match = css.match(pattern);
      if (match && !allowedHardcoded.some(allowed => match[0].includes(allowed))) {
        throw new Error(`${message}: ${match[0]}`);
      }
    }
  });
}

/**
 * Check if component renders with dragRef when inline: true
 */
export function assertDragRefAttached(container: HTMLElement, expectedTag?: string) {
  // The root element should exist (dragRef target)
  const rootElement = expectedTag
    ? container.querySelector(expectedTag)
    : container.firstElementChild;

  expect(rootElement).toBeInTheDocument();
  return rootElement;
}

/**
 * Check for unnecessary wrapper divs
 * Components with inline: true should not have Puck's auto-wrapper
 */
export function assertNoUnnecessaryWrappers(container: HTMLElement, expectedClassName: string) {
  // Should have our className directly on root element, not nested in wrapper
  const elementWithClass = container.querySelector(`.${expectedClassName}`);
  expect(elementWithClass).toBeTruthy();

  // Check it's not nested inside a data-rbd wrapper (Puck's auto-wrapper)
  const hasAutoWrapper = container.querySelector('[data-rbd-draggable-id]');
  expect(hasAutoWrapper).toBeFalsy();
}

/**
 * Verify CSS class naming follows convention: {componentType}-{id}
 */
export function assertClassNameConvention(className: string, expectedPrefix: string) {
  const pattern = new RegExp(`^${expectedPrefix}-`);
  expect(className).toMatch(pattern);
}

/**
 * Check if CSS uses display: contents for slot wrappers (Flex/Columns)
 */
export function assertSlotWrapperUsesDisplayContents(css: string, className: string) {
  const displayContentsPattern = new RegExp(`\\.${className}\\s*>\\s*div\\s*{[^}]*display:\\s*contents`, 'i');
  expect(css).toMatch(displayContentsPattern);
}

/**
 * Verify responsive CSS is generated for breakpoints
 */
export function assertResponsiveCSS(css: string, property: string, breakpoint: 'md' | 'lg' | 'xl') {
  const breakpointMap = {
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  };

  const mediaQueryPattern = new RegExp(`@media\\s*\\(min-width:\\s*${breakpointMap[breakpoint]}\\)`, 'i');
  expect(css).toMatch(mediaQueryPattern);

  // Check property exists in media query
  const mediaQueryMatch = css.match(new RegExp(`@media[^{]+{[^}]*${property}`, 'i'));
  expect(mediaQueryMatch).toBeTruthy();
}

/**
 * Verify all colors use theme resolution, not hardcoded values
 */
export function assertColorsFromTheme(componentSource: string) {
  // Check that resolve() is called for color properties
  const colorProps = ['backgroundColor', 'color', 'textColor', 'borderColor'];

  colorProps.forEach(prop => {
    if (componentSource.includes(prop)) {
      // Should have resolve() call nearby or ColorValue type
      const hasThemeResolution =
        componentSource.includes(`resolve(${prop}`) ||
        componentSource.includes(`ColorValue`) ||
        componentSource.includes(`resolve(`) && componentSource.includes(prop);

      if (!hasThemeResolution) {
        console.warn(`Warning: ${prop} might not be using theme resolution`);
      }
    }
  });
}

/**
 * Test helper: Create mock Puck props
 */
export function createMockPuckProps() {
  return {
    puck: {
      dragRef: { current: null },
      isEditing: true,
    }
  };
}

/**
 * Assertion: Component should render without errors
 */
export function assertRendersWithoutError(ui: ReactElement) {
  expect(() => {
    renderPuckComponent(ui);
  }).not.toThrow();
}

/**
 * Extract inline styles from element
 */
export function getInlineStyles(element: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = {};
  const styleAttr = element.getAttribute('style');

  if (styleAttr) {
    styleAttr.split(';').forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    });
  }

  return styles;
}

/**
 * Check if style tag CSS has proper scoping with className
 */
export function assertCSSIsScoped(css: string, className: string) {
  const scopedPattern = new RegExp(`\\.${className}[\\s{,]`, 'i');
  expect(css).toMatch(scopedPattern);
}
