/**
 * ResponsiveMaxWidthControl
 *
 * Wraps MaxWidthControl with responsive breakpoint awareness.
 * Allows setting different max-widths for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@measured/puck';
import { MaxWidthControl, MaxWidthValue } from './MaxWidthControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveMaxWidthValue = ResponsiveValue<MaxWidthValue>;

interface ResponsiveMaxWidthControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveMaxWidthValue;
  onChange: (value: ResponsiveMaxWidthValue) => void;
}

export function ResponsiveMaxWidthControl({ field, value, onChange }: ResponsiveMaxWidthControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<MaxWidthValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <MaxWidthControl
            field={{ label: undefined }}
            value={currentValue}
            onChange={handleChange}
          />
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for max-width property
 */
export function generateMaxWidthCSS(
  className: string,
  value: ResponsiveMaxWidthValue | undefined,
  property: string = 'max-width'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (maxWidth: MaxWidthValue) => {
      if (maxWidth.value === undefined || maxWidth.value === null || maxWidth.value === '') {
        return '';
      }
      if (maxWidth.value === 'none' || maxWidth.value === 'inherit' || maxWidth.value === 'initial') {
        return maxWidth.value;
      }
      return `${maxWidth.value}${maxWidth.unit}`;
    }
  );
}
