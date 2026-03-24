/**
 * ResponsivePositionControl
 *
 * Responsive wrapper for position property.
 * Allows different position values across breakpoints.
 */

import { FieldLabel } from '@puckeditor/core';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';
import type { PositionOffsetValue } from './PositionOffsetControl';

export type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
export type ResponsivePositionValue = ResponsiveValue<PositionValue>;

/**
 * Utility: Check if a position value is static
 */
export function isPositionStatic(position: PositionValue | undefined): boolean {
  return !position || position === 'static';
}

/**
 * Utility: Check if a position type requires offset properties to work
 * - sticky: REQUIRES at least one offset to function
 * - absolute: typically requires an offset to position meaningfully
 * - fixed: typically requires an offset to position meaningfully
 * - relative: offset is optional (element stays in flow)
 * - static: offset has no effect
 */
export function positionRequiresOffset(position: PositionValue | undefined): boolean {
  if (!position) return false;
  return ['sticky', 'absolute', 'fixed'].includes(position);
}

/**
 * Utility: Get smart default offset values based on position type
 * - static/relative: keep all offsets as 'auto'
 * - sticky: set top: '0' (required for sticky to work)
 * - absolute/fixed: set top: '0', left: '0' (sensible default)
 */
export function getSmartOffsetDefaultForPosition(
  position: PositionValue | undefined
): PositionOffsetValue {
  if (!position || position === 'static' || position === 'relative') {
    return { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto', unit: 'px', linked: false };
  }

  if (position === 'sticky') {
    // Sticky requires at least one offset to function per CSS spec
    return { top: '0', right: 'auto', bottom: 'auto', left: 'auto', unit: 'px', linked: false };
  }

  // absolute and fixed - provide sensible defaults
  return { top: '0', right: 'auto', bottom: 'auto', left: '0', unit: 'px', linked: false };
}

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
