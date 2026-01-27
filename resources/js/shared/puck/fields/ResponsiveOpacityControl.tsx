/**
 * ResponsiveOpacityControl
 *
 * Responsive wrapper for opacity property.
 * Allows different opacity values across breakpoints.
 */

import { FieldLabel } from '@puckeditor/core';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';
import { OpacityControl } from './OpacityControl';

export type ResponsiveOpacityValue = ResponsiveValue<number>;

interface ResponsiveOpacityControlProps {
  field: { label?: string };
  value: ResponsiveOpacityValue | undefined;
  onChange: (value: ResponsiveOpacityValue) => void;
}

export function ResponsiveOpacityControl({
  field,
  value,
  onChange,
}: ResponsiveOpacityControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<number>
        value={value}
        onChange={onChange}
        defaultValue={100}
        renderControl={(currentValue, onValueChange) => (
          <OpacityControl
            field={{ label: undefined }}
            value={currentValue || 100}
            onChange={onValueChange}
          />
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for opacity property
 */
export function generateOpacityCSS(
  className: string,
  value: ResponsiveOpacityValue | undefined
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    'opacity',
    value,
    (val) => (val / 100).toString()
  );
}
