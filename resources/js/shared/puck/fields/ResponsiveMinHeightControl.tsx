/**
 * ResponsiveMinHeightControl
 *
 * Wraps MinHeightControl with responsive breakpoint awareness.
 * Allows setting different min-heights for mobile, tablet, and desktop.
 */

import { FieldLabel } from '@measured/puck';
import { MinHeightControl, MinHeightValue } from './MinHeightControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveMinHeightValue = ResponsiveValue<MinHeightValue>;

interface ResponsiveMinHeightControlProps {
  field: {
    label?: string;
  };
  value?: ResponsiveMinHeightValue;
  onChange: (value: ResponsiveMinHeightValue) => void;
}

export function ResponsiveMinHeightControl({ field, value, onChange }: ResponsiveMinHeightControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<MinHeightValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, handleChange) => (
          <MinHeightControl
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
 * Generate responsive CSS for min-height property
 */
export function generateMinHeightCSS(
  className: string,
  value: ResponsiveMinHeightValue | undefined,
  property: string = 'min-height'
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    property,
    value,
    (minHeight: MinHeightValue) => {
      if (minHeight.value === undefined || minHeight.value === null || minHeight.value === '') {
        return '';
      }
      if (minHeight.value === 'auto' || minHeight.value === 'inherit' || minHeight.value === 'initial') {
        return minHeight.value;
      }
      return `${minHeight.value}${minHeight.unit}`;
    }
  );
}
