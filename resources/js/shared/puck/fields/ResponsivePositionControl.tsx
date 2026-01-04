/**
 * ResponsivePositionControl
 *
 * Responsive wrapper for position property.
 * Allows different position values across breakpoints.
 */

import { FieldLabel } from '@measured/puck';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
export type ResponsivePositionValue = ResponsiveValue<PositionValue>;

interface ResponsivePositionControlProps {
  field: { label?: string };
  value: ResponsivePositionValue | undefined;
  onChange: (value: ResponsivePositionValue) => void;
}

const positionOptions: Array<{ value: PositionValue; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'relative', label: 'Relative' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'sticky', label: 'Sticky' },
];

export function ResponsivePositionControl({
  field,
  value,
  onChange,
}: ResponsivePositionControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<PositionValue>
        value={value}
        onChange={onChange}
        defaultValue="static"
        renderControl={(currentValue, onValueChange) => (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {positionOptions.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  border: '1px solid var(--puck-color-grey-04)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor:
                    currentValue === option.value
                      ? 'var(--puck-color-azure-04)'
                      : 'var(--puck-color-white)',
                  color:
                    currentValue === option.value
                      ? 'white'
                      : 'var(--puck-color-grey-08)',
                  transition: 'all 150ms ease',
                }}
              >
                <input
                  type="radio"
                  name="position"
                  value={option.value}
                  checked={currentValue === option.value}
                  onChange={() => onValueChange(option.value)}
                  style={{ margin: 0 }}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for position property
 */
export function generatePositionCSS(
  className: string,
  value: ResponsivePositionValue | undefined
): string {
  if (!value) return '';
  // Only generate CSS if not 'static' (the default)
  return generateResponsiveCSS(className, 'position', value, (val) => (val === 'static' ? '' : val));
}
