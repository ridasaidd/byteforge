/**
 * ResponsiveMaxHeightControl
 *
 * Wraps MaxHeightControl with responsive breakpoint awareness.
 * Allows setting different max-heights for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@puckeditor/core';
import { MaxHeightControl, MaxHeightValue } from './MaxHeightControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveMaxHeightValue = ResponsiveValue<MaxHeightValue>;

interface ResponsiveMaxHeightControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveMaxHeightValue;
  onChange: (value: ResponsiveMaxHeightValue) => void;
}

export function ResponsiveMaxHeightControl({ field, value, onChange }: ResponsiveMaxHeightControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<MaxHeightValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <MaxHeightControl
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
 * Generate responsive CSS for max-height property
 */
export function generateMaxHeightCSS(
  className: string,
  value: ResponsiveMaxHeightValue | undefined,
  property: string = 'max-height'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (maxHeight: MaxHeightValue) => {
      if (maxHeight.value === undefined || maxHeight.value === null || maxHeight.value === '') {
        return '';
      }
      if (maxHeight.value === 'none' || maxHeight.value === 'inherit' || maxHeight.value === 'initial') {
        return maxHeight.value;
      }
      return `${maxHeight.value}${maxHeight.unit}`;
    }
  );
}
