/**
 * ResponsiveHeightControl
 *
 * Wraps HeightControl with responsive breakpoint awareness.
 * Allows setting different heights for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@puckeditor/core';
import { HeightControl, HeightValue } from './HeightControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveHeightValue = ResponsiveValue<HeightValue>;

interface ResponsiveHeightControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveHeightValue;
  onChange: (value: ResponsiveHeightValue) => void;
}

export function ResponsiveHeightControl({ field, value, onChange }: ResponsiveHeightControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<HeightValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <HeightControl
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
 * Generate responsive CSS for height property
 */
export function generateHeightCSS(
  className: string,
  value: ResponsiveHeightValue | undefined,
  property: string = 'height'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (height: HeightValue) => {
      // Skip if value is undefined or null
      if (height.value === undefined || height.value === null || height.value === '') {
        return '';
      }
      // Special values like 'auto' don't need a unit
      if (height.value === 'auto' || height.value === 'inherit' || height.value === 'initial') {
        return height.value;
      }
      return `${height.value}${height.unit}`;
    }
  );
}
