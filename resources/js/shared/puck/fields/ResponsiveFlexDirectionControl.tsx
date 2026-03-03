import { FieldLabel } from '@puckeditor/core';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type FlexDirectionValue = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type ResponsiveFlexDirectionValue = ResponsiveValue<FlexDirectionValue>;

interface ResponsiveFlexDirectionControlProps {
  field: { label?: string };
  value: ResponsiveFlexDirectionValue | undefined;
  onChange: (value: ResponsiveFlexDirectionValue) => void;
}

const options: { value: FlexDirectionValue; label: string }[] = [
  { value: 'row', label: 'Row' },
  { value: 'row-reverse', label: 'Row Reverse' },
  { value: 'column', label: 'Column' },
  { value: 'column-reverse', label: 'Column Reverse' },
];

export function ResponsiveFlexDirectionControl({ field, value, onChange }: ResponsiveFlexDirectionControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<FlexDirectionValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, onValueChange) => (
           <select
            value={currentValue || ''}
            onChange={(e) => onValueChange(e.target.value as FlexDirectionValue)}
            style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--puck-color-grey-04)',
                fontSize: '14px',
                backgroundColor: 'var(--puck-color-white)',
            }}
          >
            <option value="" disabled>Select Direction</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for flex-direction
 */
export function generateFlexDirectionCSS(
  className: string,
  value: ResponsiveFlexDirectionValue | undefined,
): string {
  if (!value) return '';

  // If value is simple string (legacy compat), normalize it?
  // generateResponsiveCSS handles ResponsiveValue type.
  // We need to handle migration in cssBuilder or here.
  // generateResponsiveCSS expects { mobile: ..., ... }

  return generateResponsiveCSS(className, 'flex-direction', value, (val) => val);
}
