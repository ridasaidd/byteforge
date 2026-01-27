/**
 * ResponsiveZIndexControl
 *
 * Responsive wrapper for z-index property.
 * Allows different z-index values across breakpoints.
 */

import { FieldLabel } from '@puckeditor/core';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';
import { ZIndexControl, ZIndexValue } from './ZIndexControl';

export type ResponsiveZIndexValue = ResponsiveValue<ZIndexValue>;

interface ResponsiveZIndexControlProps {
  field: { label?: string };
  value: ResponsiveZIndexValue | undefined;
  onChange: (value: ResponsiveZIndexValue) => void;
}

export function ResponsiveZIndexControl({
  field,
  value,
  onChange,
}: ResponsiveZIndexControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<ZIndexValue>
        value={value}
        onChange={onChange}
        defaultValue="auto"
        renderControl={(currentValue, onValueChange) => (
          <ZIndexControl
            field={{ label: undefined }}
            value={currentValue || 'auto'}
            onChange={onValueChange}
          />
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for z-index property
 */
export function generateZIndexCSS(
  className: string,
  value: ResponsiveZIndexValue | undefined
): string {
  if (!value) return '';
  return generateResponsiveCSS(
    className,
    'z-index',
    value,
    (val) => (val === 'auto' ? 'auto' : val.toString())
  );
}
