import { ReactElement } from 'react';
import { FieldLabel, createUsePuck } from '@puckeditor/core';

// Create a properly memoized usePuck hook with selector support
const usePuck = createUsePuck();

/**
 * Mobile-first breakpoints matching Puck editor viewports
 * - mobile: default (no media query)
 * - tablet: 768px
 * - desktop: 1024px
 */
export const BREAKPOINTS = {
  mobile: 0,     // Mobile first (default, no media query)
  tablet: 768,   // Tablet devices
  desktop: 1024, // Desktop devices
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Strict Responsive object type
 */
export type ResponsiveObject<T> = {
  mobile: T;
  tablet?: T;
  desktop?: T;
};

/**
 * Responsive value type - either a simple value or responsive object
 */
export type ResponsiveValue<T> = T | ResponsiveObject<T>;

/**
 * Get the current breakpoint based on viewport width
 */
export function getBreakpointFromWidth(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Check if a value is a responsive object
 */
export function isResponsiveValue<T>(value: unknown): value is ResponsiveObject<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'mobile' in value
  );
}

/**
 * Get the value for a specific breakpoint with clean inheritance
 */
export function getValueForBreakpoint<T>(
  value: ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint
): T | undefined {
  if (value === undefined) return undefined;

  if (isResponsiveValue(value)) {
    if (breakpoint === 'desktop') return value.desktop ?? value.tablet ?? value.mobile;
    if (breakpoint === 'tablet') return value.tablet ?? value.mobile;
    return value.mobile;
  }

  return value;
}

/**
 * Set the value for a specific breakpoint
 */
export function setValueForBreakpoint<T>(
  currentValue: ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint,
  newValue: T
): ResponsiveValue<T> {
  // If current value is simple (non-responsive), convert to responsive
  if (!currentValue || !isResponsiveValue<T>(currentValue)) {
    return {
      mobile: currentValue as T || newValue,
      [breakpoint]: newValue,
    };
  }

  // Update the specific breakpoint
  return {
    ...currentValue,
    [breakpoint]: newValue,
  };
}

interface ResponsiveWrapperProps<T> {
  label?: string;
  value: ResponsiveValue<T> | undefined;
  onChange: (value: ResponsiveValue<T>) => void;
  renderControl: (value: T | undefined, onChange: (value: T) => void) => ReactElement;
  defaultValue?: T;
}

/**
 * Responsive wrapper that automatically detects current viewport from Puck
 * and shows the appropriate control for that breakpoint
 */
export function ResponsiveWrapper<T>({
  label,
  value,
  onChange,
  renderControl,
  defaultValue,
}: ResponsiveWrapperProps<T>) {
  // Use selector to get only viewport width and avoid unnecessary re-renders
  // Fallback gracefully when not inside <Puck> (e.g., during unit tests)
  let puckWidth: number | undefined;
  try {
    puckWidth = usePuck((s) => s.appState.ui.viewports.current.width);
  } catch {
    puckWidth = undefined;
  }

  // Be resilient when not rendered inside <Puck> (e.g., during unit tests)
  let currentWidth: number = puckWidth ?? 0;
  if (!currentWidth || typeof currentWidth !== 'number') {
    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
      currentWidth = window.innerWidth;
    } else {
      currentWidth = 1024; // sensible default for desktop
    }
  }

  // Get current viewport width from Puck
  const currentBreakpoint = getBreakpointFromWidth(currentWidth);

  // Get the value for the current breakpoint
  const currentValue = getValueForBreakpoint(value, currentBreakpoint) ?? defaultValue;

  // Handle value change - save to the current breakpoint
  const handleChange = (newValue: T) => {
    const updatedValue = setValueForBreakpoint(value, currentBreakpoint, newValue);
    onChange(updatedValue);
  };

  // Breakpoint labels for UI
  const breakpointLabels: Record<Breakpoint, string> = {
    mobile: 'Mobile',
    tablet: 'Tablet',
    desktop: 'Desktop',
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <FieldLabel label={label} />}
      <div className="text-xs text-gray-500">
        Editing: <span className="font-semibold">{breakpointLabels[currentBreakpoint]}</span>
      </div>
      {renderControl(currentValue, handleChange)}
    </div>
  );
}

/**
 * Generate CSS with media queries from responsive value
 * Mobile-first: base styles + tablet/desktop media queries
 */
export function generateResponsiveCSS<T>(
  className: string,
  property: string,
  value: ResponsiveValue<T> | undefined,
  valueFormatter: (val: T) => string
): string {
  if (!value) return '';

  // If it's a simple value, just return the base style
  if (!isResponsiveValue(value)) {
    const formatted = valueFormatter(value);
    return formatted ? `.${className} { ${property}: ${formatted}; }\n` : '';
  }

  let css = '';

  // Mobile (base, no media query)
  const mobileValue = valueFormatter(value.mobile);
  if (mobileValue) {
    css += `.${className} { ${property}: ${mobileValue}; }\n`;
  }

  // Tablet
  if (value.tablet !== undefined) {
    const tabletValue = valueFormatter(value.tablet);
    if (tabletValue) {
      css += `@media (min-width: ${BREAKPOINTS.tablet}px) {\n`;
      css += `  .${className} { ${property}: ${tabletValue}; }\n`;
      css += `}\n`;
    }
  }

  // Desktop
  if (value.desktop !== undefined) {
    const desktopValue = valueFormatter(value.desktop);
    if (desktopValue) {
      css += `@media (min-width: ${BREAKPOINTS.desktop}px) {\n`;
      css += `  .${className} { ${property}: ${desktopValue}; }\n`;
      css += `}\n`;
    }
  }

  return css;
}

/**
 * Get the mobile (base) value from a responsive value
 */
export function getBaseValue<T>(value: ResponsiveValue<T> | undefined): T | undefined {
  if (value === undefined) return undefined;
  if (isResponsiveValue(value)) {
    return value.mobile;
  }
  return value;
}
