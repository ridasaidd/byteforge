/**
 * ResponsiveOverflowControl
 *
 * Responsive wrapper for overflow property.
 * Allows different overflow values across breakpoints.
 */

import { FieldLabel } from '@measured/puck';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type OverflowValue = 'visible' | 'hidden' | 'scroll' | 'auto';
export type ResponsiveOverflowValue = ResponsiveValue<OverflowValue>;

interface ResponsiveOverflowControlProps {
  field: { label?: string };
  value: ResponsiveOverflowValue | undefined;
  onChange: (value: ResponsiveOverflowValue) => void;
}

const overflowOptions: Array<{ value: OverflowValue; label: string }> = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'auto', label: 'Auto' },
];

export function ResponsiveOverflowControl({
  field,
  value,
  onChange,
}: ResponsiveOverflowControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<OverflowValue>
        value={value}
        onChange={onChange}
        defaultValue="visible"
        renderControl={(currentValue, onValueChange) => (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {overflowOptions.map((option) => (
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
                  name="overflow"
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
 * Generate responsive CSS for overflow property
 */
export function generateOverflowCSS(
  className: string,
  value: ResponsiveOverflowValue | undefined
): string {
  if (!value) return '';
  // Only generate CSS if not 'visible' (the default)
  return generateResponsiveCSS(className, 'overflow', value, (val) => (val === 'visible' ? '' : val));
}
