/**
 * ResponsiveLetterSpacingControl
 *
 * Responsive control for letter-spacing property.
 * Allows setting different letter spacing for mobile, tablet, and desktop.
 * Supports values from -0.05em to 0.5em or custom em/rem/px values.
 */

import { FieldLabel } from '@measured/puck';
import { useState, useEffect } from 'react';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export interface LetterSpacingValue {
  value: string; // e.g., "0", "-0.05em", "0.1em", "2px"
  unit: 'em' | 'rem' | 'px';
}

export type ResponsiveLetterSpacingValue = ResponsiveValue<LetterSpacingValue>;

interface ResponsiveLetterSpacingControlProps {
  field: { label?: string };
  value?: ResponsiveLetterSpacingValue;
  onChange: (value: ResponsiveLetterSpacingValue) => void;
}

/**
 * Letter spacing control - slider + input
 * Range: -0.05em to 0.5em for em unit, scales for other units
 */
function LetterSpacingControl({
  field,
  value,
  onChange,
}: {
  field: { label?: string };
  value?: LetterSpacingValue;
  onChange: (value: LetterSpacingValue) => void;
}) {
  const currentValue = value || { value: '0', unit: 'em' };
  const [numValue, setNumValue] = useState(
    parseFloat(currentValue.value) || 0
  );
  const [unit, setUnit] = useState<'em' | 'rem' | 'px'>(currentValue.unit || 'em');

  // Sync internal state when value prop changes (e.g., viewport change)
  useEffect(() => {
    const newValue = parseFloat(currentValue.value) || 0;
    setNumValue(newValue);
    setUnit(currentValue.unit || 'em');
  }, [currentValue.value, currentValue.unit]);

  const presets = [
    { label: 'None', value: 0 },
    { label: 'Tight', value: -0.05 },
    { label: 'Normal', value: 0.02 },
    { label: 'Wide', value: 0.1 },
    { label: 'Extra', value: 0.2 },
  ];

  const handleChange = (newValue: number) => {
    setNumValue(newValue);
    onChange({
      value: newValue.toString(),
      unit,
    });
  };

  const handleUnitChange = (newUnit: 'em' | 'rem' | 'px') => {
    setUnit(newUnit);
    onChange({
      value: numValue.toString(),
      unit: newUnit,
    });
  };

  const handleCustomInput = (input: string) => {
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) {
      handleChange(parsed);
    }
  };

  // Determine slider range based on unit
  const sliderRange = unit === 'px' ? { min: -2, max: 10 } : { min: -0.1, max: 0.5 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {field.label && <FieldLabel label={field.label} />}

      {/* Unit selector */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['em', 'rem', 'px'] as const).map((u) => (
          <button
            key={u}
            onClick={() => handleUnitChange(u)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: unit === u ? 600 : 400,
              backgroundColor: unit === u ? 'var(--puck-color-azure-04)' : 'var(--puck-color-white)',
              color: unit === u ? 'white' : '#374151',
              border: unit === u ? 'none' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {u}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="range"
          min={sliderRange.min}
          max={sliderRange.max}
          step={unit === 'px' ? 0.5 : 0.01}
          value={numValue}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          style={{ flex: 1, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={numValue.toFixed(unit === 'px' ? 1 : 3)}
          onChange={(e) => handleCustomInput(e.target.value)}
          style={{
            width: '70px',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
          placeholder="0"
        />
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handleChange(preset.value)}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: numValue === preset.value ? 600 : 400,
              backgroundColor:
                numValue === preset.value ? 'var(--puck-color-azure-04)' : 'var(--puck-color-white)',
              color: numValue === preset.value ? 'white' : '#374151',
              border: numValue === preset.value ? 'none' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResponsiveLetterSpacingControl({
  field,
  value,
  onChange,
}: ResponsiveLetterSpacingControlProps) {
  return (
    <ResponsiveWrapper<LetterSpacingValue>
      label={field.label || 'Letter Spacing'}
      value={value}
      onChange={onChange}
      renderControl={(currentValue, handleChange) => (
        <LetterSpacingControl
          field={{ label: undefined }}
          value={currentValue || { value: '0', unit: 'em' }}
          onChange={handleChange}
        />
      )}
    />
  );
}

/**
 * Generate CSS for letter-spacing property
 */
export function generateLetterSpacingCSS(
  className: string,
  value: ResponsiveLetterSpacingValue
): string {
  return generateResponsiveCSS(
    className,
    'letter-spacing',
    value,
    (letterSpacing: LetterSpacingValue) => {
      const { value: val, unit } = letterSpacing;
      return `${val}${unit}`;
    }
  );
}
