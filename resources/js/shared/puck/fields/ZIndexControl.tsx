/**
 * ZIndexControl
 *
 * Control for z-index property with common presets and custom input.
 * Used for controlling stacking order of elements.
 */

import { FieldLabel } from '@measured/puck';
import { useState, useEffect } from 'react';

export type ZIndexValue = 'auto' | number;

interface ZIndexControlProps {
  field: { label?: string };
  value?: ZIndexValue;
  onChange: (value: ZIndexValue) => void;
}

const Z_INDEX_PRESETS = [
  { label: 'Auto', value: 'auto' as const },
  { label: 'Behind (-1)', value: -1 },
  { label: 'Base (0)', value: 0 },
  { label: 'Elevated (10)', value: 10 },
  { label: 'Dropdown (50)', value: 50 },
  { label: 'Modal (100)', value: 100 },
  { label: 'Tooltip (999)', value: 999 },
];

export function ZIndexControl({
  field,
  value = 'auto',
  onChange,
}: ZIndexControlProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState<number>(0);

  // Check if current value is a preset
  useEffect(() => {
    const isPreset = value === 'auto' || Z_INDEX_PRESETS.some(p => p.value === value);
    setIsCustom(!isPreset);
    if (typeof value === 'number' && !isPreset) {
      setCustomValue(value);
    }
  }, [value]);

  const handlePresetChange = (newValue: string) => {
    if (newValue === 'custom') {
      setIsCustom(true);
      onChange(customValue);
    } else if (newValue === 'auto') {
      setIsCustom(false);
      onChange('auto');
    } else {
      setIsCustom(false);
      onChange(parseInt(newValue, 10));
    }
  };

  const handleCustomChange = (input: string) => {
    const parsed = parseInt(input, 10);
    if (!isNaN(parsed)) {
      setCustomValue(parsed);
      onChange(parsed);
    }
  };

  return (
    <FieldLabel label={field.label || 'Z-Index'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Preset selector */}
        <select
          value={isCustom ? 'custom' : value?.toString() || 'auto'}
          onChange={(e) => handlePresetChange(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: 'var(--puck-color-white)',
          }}
        >
          {Z_INDEX_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value.toString()}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>

        {/* Custom input (shown when custom is selected) */}
        {isCustom && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--puck-color-grey-05)',
                marginBottom: '4px',
              }}
            >
              Custom Value
            </label>
            <input
              type="number"
              value={typeof value === 'number' ? value : customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Enter z-index"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--puck-color-grey-04)',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: 'var(--puck-color-white)',
              }}
            />
          </div>
        )}

        {/* Info text */}
        <div style={{ fontSize: '11px', color: 'var(--puck-color-grey-05)' }}>
          {value === 'auto'
            ? 'Auto: Stack based on document order'
            : `Current: ${value} - ${typeof value === 'number' && value < 0 ? 'Behind parent' : 'Above parent'}`}
        </div>
      </div>
    </FieldLabel>
  );
}
