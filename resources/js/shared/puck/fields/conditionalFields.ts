import { ResponsiveValue, isResponsiveValue } from './ResponsiveWrapper';

// Type for display values
type DisplayValue = 'block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'inline-block' | 'none';
type ResponsiveDisplayValue = ResponsiveValue<DisplayValue>;

/**
 * Check if a display value matches any of the given modes in ANY breakpoint
 */
export function hasDisplayModeInAnyBreakpoint(
  displayValue: ResponsiveDisplayValue | DisplayValue | undefined,
  modes: string[]
): boolean {
  if (!displayValue) return false;

  if (isResponsiveValue(displayValue)) {
    const mobile = String(displayValue.mobile);
    const tablet = displayValue.tablet !== undefined ? String(displayValue.tablet) : mobile;
    const desktop = displayValue.desktop !== undefined ? String(displayValue.desktop) : mobile;

    return (
      modes.includes(mobile) ||
      modes.includes(tablet) ||
      modes.includes(desktop)
    );
  }

  return modes.includes(String(displayValue));
}

/**
 * Check if ANY breakpoint uses flex or inline-flex display
 */
export function hasFlexInAnyBreakpoint(displayValue: ResponsiveDisplayValue | undefined): boolean {
  return hasDisplayModeInAnyBreakpoint(displayValue, ['flex', 'inline-flex']);
}

/**
 * Check if ANY breakpoint uses grid or inline-grid display
 */
export function hasGridInAnyBreakpoint(displayValue: ResponsiveDisplayValue | undefined): boolean {
  return hasDisplayModeInAnyBreakpoint(displayValue, ['grid', 'inline-grid']);
}

/**
 * Create a conditional field resolver that shows/hides fields based on conditions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createConditionalResolver<T extends Record<string, any>>(
  baseFieldKeys: string[],
  conditionalGroups: Array<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    condition: (props: any) => boolean;
    fieldKeys: string[];
  }>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data: { props: any }, { fields }: { fields: T }) => {
    // Start with base fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved: Record<string, any> = {};
    baseFieldKeys.forEach((key) => {
      if (fields[key]) {
        resolved[key] = fields[key];
      }
    });

    // Add conditional fields based on conditions
    conditionalGroups.forEach(({ condition, fieldKeys }) => {
      if (condition(data.props)) {
        fieldKeys.forEach((key) => {
          if (fields[key]) {
            resolved[key] = fields[key];
          }
        });
      }
    });

    return resolved as T;
  };
}

/**
 * Extract default values from field definitions
 */
export function extractDefaults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...fieldGroups: Array<Record<string, { defaultValue?: any }>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return fieldGroups.reduce((acc, group) => {
    Object.entries(group).forEach(([key, field]) => {
      if (field.defaultValue !== undefined) {
        acc[key] = field.defaultValue;
      }
    });
    return acc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any>);
}
