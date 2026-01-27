/**
 * ResponsiveFontSizeControl
 *
 * Wraps FontSizeControl with responsive breakpoint awareness.
 * Allows setting different font sizes for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@puckeditor/core';
import { FontSizeControl, FontSizeValue } from './FontSizeControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveFontSizeValue = ResponsiveValue<FontSizeValue>;

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

/**
 * Generate responsive CSS for font-size property
 *
 * @param className - The CSS class name to target
 * @param value - Responsive font size value (simple or object with breakpoints)
 * @returns CSS string with media queries
 */
export function generateFontSizeCSS(className: string, value: ResponsiveFontSizeValue): string {
  return generateResponsiveCSS(
    className,
    'font-size',
    value,
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
