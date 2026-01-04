/**
 * ResponsiveWidthControl
 *
 * Wraps WidthControl with responsive breakpoint awareness.
 * Allows setting different widths for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@measured/puck';
import { WidthControl, WidthValue } from './WidthControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveWidthValue = ResponsiveValue<WidthValue>;

interface ResponsiveWidthControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveWidthValue;
  onChange: (value: ResponsiveWidthValue) => void;
}

export function ResponsiveWidthControl({ field, value, onChange }: ResponsiveWidthControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<WidthValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <WidthControl
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
 * Generate responsive CSS for width property
 */
export function generateWidthCSS(
  className: string,
  value: ResponsiveWidthValue | undefined,
  property: string = 'width'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (width: WidthValue) => {
      // Skip if value is undefined or null
      if (width.value === undefined || width.value === null || width.value === '') {
        return '';
      }
      // Special values like 'auto' don't need a unit
      if (width.value === 'auto' || width.value === 'inherit' || width.value === 'initial') {
        return width.value;
      }
      return `${width.value}${width.unit}`;
    }
  );
}
