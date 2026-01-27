/**
 * ResponsiveLineHeightControl
 *
 * Responsive control for line-height property.
 * Allows setting different line heights for mobile, tablet, and desktop.
 * Supports values like 1, 1.5, 2, or custom em/rem/px values.
 */

import { FieldLabel } from '@puckeditor/core';
import { useState, useEffect } from 'react';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export interface LineHeightValue {
  value: string; // e.g., "1.5", "1", "1.75", "2em", "1.5rem"
  unit: 'em' | 'rem' | 'px' | 'unitless'; // unitless for numbers like 1, 1.5
}

export type ResponsiveLineHeightValue = ResponsiveValue<LineHeightValue>;

interface ResponsiveLineHeightControlProps {
  field: { label?: string };
  value?: ResponsiveLineHeightValue;
  onChange: (value: ResponsiveLineHeightValue) => void;
}

/**
 * Line height control - slider + input
 * Supports common presets (1, 1.25, 1.5, 1.75, 2) or custom values
 */
function LineHeightControl({
  field,
  value,
  onChange,
}: {
  field: { label?: string };
  value?: LineHeightValue;
  onChange: (value: LineHeightValue) => void;
}) {
  const currentValue = value || { value: '1.5', unit: 'unitless' };
  const [numValue, setNumValue] = useState(
    parseFloat(currentValue.value) || 1.5
  );

  // Sync internal state when value prop changes (e.g., viewport change)
  useEffect(() => {
    const newValue = parseFloat(currentValue.value) || 1.5;
    setNumValue(newValue);
  }, [currentValue.value]);

  const presets = [
    { label: '1', value: 1 },
    { label: '1.25', value: 1.25 },
    { label: '1.5', value: 1.5 },
    { label: '1.75', value: 1.75 },
    { label: '2', value: 2 },
  ];

  const handleChange = (newValue: number) => {
    setNumValue(newValue);
    onChange({
      value: newValue.toString(),
      unit: 'unitless',
    });
  };

  const handleCustomInput = (input: string) => {
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) {
      handleChange(parsed);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {field.label && <FieldLabel label={field.label} />}

      {/* Slider */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.05"
          value={numValue}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          style={{ flex: 1, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={numValue.toFixed(2)}
          onChange={(e) => handleCustomInput(e.target.value)}
          style={{
            width: '60px',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
          placeholder="1.5"
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
              fontSize: '12px',
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

export function ResponsiveLineHeightControl({
  field,
  value,
  onChange,
}: ResponsiveLineHeightControlProps) {
  return (
    <ResponsiveWrapper<LineHeightValue>
      label={field.label || 'Line Height'}
      value={value}
      onChange={onChange}
      renderControl={(currentValue, handleChange) => (
        <LineHeightControl
          field={{ label: undefined }}
          value={currentValue || { value: '1.5', unit: 'unitless' }}
          onChange={handleChange}
        />
      )}
    />
  );
}

/**
 * Generate CSS for line-height property
 */
export function generateLineHeightCSS(
  className: string,
  value: ResponsiveLineHeightValue
): string {
  return generateResponsiveCSS(
    className,
    'line-height',
    value,
    (lineHeight: LineHeightValue) => {
      const { value: val, unit } = lineHeight;
      return unit === 'unitless' ? val : `${val}${unit}`;
    }
  );
}
