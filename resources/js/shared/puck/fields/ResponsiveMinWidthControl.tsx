/**
 * ResponsiveMinWidthControl
 *
 * Wraps MinWidthControl with responsive breakpoint awareness.
 * Allows setting different min-widths for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@puckeditor/core';
import { MinWidthControl, MinWidthValue } from './MinWidthControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveMinWidthValue = ResponsiveValue<MinWidthValue>;

interface ResponsiveMinWidthControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveMinWidthValue;
  onChange: (value: ResponsiveMinWidthValue) => void;
}

export function ResponsiveMinWidthControl({ field, value, onChange }: ResponsiveMinWidthControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<MinWidthValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <MinWidthControl
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
 * Generate responsive CSS for min-width property
 */
export function generateMinWidthCSS(
  className: string,
  value: ResponsiveMinWidthValue | undefined,
  property: string = 'min-width'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (minWidth: MinWidthValue) => {
      if (minWidth.value === undefined || minWidth.value === null || minWidth.value === '') {
        return '';
      }
      if (minWidth.value === 'auto' || minWidth.value === 'inherit' || minWidth.value === 'initial') {
        return minWidth.value;
      }
      return `${minWidth.value}${minWidth.unit}`;
    }
  );
}
