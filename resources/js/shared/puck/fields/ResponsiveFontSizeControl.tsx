/**
 * ResponsiveFontSizeControl
 *
 * Wraps FontSizeControl with responsive breakpoint awareness.
 * Allows setting different font sizes for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@puckeditor/core';
import { FontSizeControl, FontSizeValue } from './FontSizeControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS, isResponsiveValue } from './ResponsiveWrapper';

export type ResponsiveFontSizeValue = ResponsiveValue<FontSizeValue>;

type ThemeResolver = (path: string, defaultValue?: string) => string;

interface ResponsiveFontSizeControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveFontSizeValue;
  onChange: (value: ResponsiveFontSizeValue) => void;
}

export function ResponsiveFontSizeControl({ field, value, onChange }: ResponsiveFontSizeControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<FontSizeValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <FontSizeControl
            field={{ label: undefined }}
            value={currentValue || { type: 'custom', value: '16px' }}
            onChange={handleChange}
          />
        )}
      />
    </div>
  );
}

function normalizeFontSizeEntry(entry: FontSizeValue | string, resolver?: ThemeResolver): FontSizeValue | string {
  if (typeof entry === 'string') {
    const resolved = entry.startsWith('typography.') ? resolver?.(entry, entry) ?? entry : entry;
    return { type: 'custom', value: resolved };
  }

  if (entry.type === 'theme') {
    const rawValue = entry.value || '';
    const resolved = rawValue ? resolver?.(rawValue, rawValue) ?? rawValue : rawValue;

    return {
      type: 'custom',
      value: resolved,
    };
  }

  return entry;
}

export function resolveResponsiveFontSizeValue(
  value: ResponsiveFontSizeValue | undefined,
  resolver?: ThemeResolver,
): ResponsiveFontSizeValue | undefined {
  if (!value) {
    return value;
  }

  if (!isResponsiveValue<FontSizeValue>(value)) {
    return normalizeFontSizeEntry(value, resolver) as ResponsiveFontSizeValue;
  }

  const resolved: Partial<Record<'mobile' | 'tablet' | 'desktop', FontSizeValue | string>> = {
    mobile: normalizeFontSizeEntry(value.mobile, resolver),
  };

  if (value.tablet !== undefined) {
    resolved.tablet = normalizeFontSizeEntry(value.tablet, resolver);
  }

  if (value.desktop !== undefined) {
    resolved.desktop = normalizeFontSizeEntry(value.desktop, resolver);
  }

  return resolved as ResponsiveFontSizeValue;
}

/**
 * Generate responsive CSS for font-size property
 *
 * @param className - The CSS class name to target
 * @param value - Responsive font size value (simple or object with breakpoints)
 * @returns CSS string with media queries
 */
export function generateFontSizeCSS(className: string, value: ResponsiveFontSizeValue, resolver?: ThemeResolver): string {
  const resolvedValue = resolveResponsiveFontSizeValue(value, resolver);

  return generateResponsiveCSS(
    className,
    'font-size',
    resolvedValue,
    (fontSize: FontSizeValue) => {
      // Handle string (theme key) or custom value object
      if (typeof fontSize === 'string') {
        return fontSize;
      }
      if (fontSize.type === 'custom') {
        return fontSize.value;
      }
      // For theme values, just return the value (will be resolved at render time)
      return fontSize.value || '16px';
    }
  );
}
