/**
 * OpacityControl
 *
 * Slider + input control for opacity property (0-100%).
 * Used for transparency effects, ghost elements, overlays.
 */

import { FieldLabel } from '@puckeditor/core';
import { useState, useEffect } from 'react';

interface OpacityControlProps {
  field: { label?: string };
  value?: number; // 0-100
  onChange: (value: number) => void;
}

export function OpacityControl({
  field,
  value = 100,
  onChange,
}: OpacityControlProps) {
  const [opacityValue, setOpacityValue] = useState(value);

  // Sync internal state when value prop changes
  useEffect(() => {
    setOpacityValue(value);
  }, [value]);

  const handleChange = (newValue: number) => {
    // Clamp between 0-100
    const clamped = Math.max(0, Math.min(100, newValue));
    setOpacityValue(clamped);
    onChange(clamped);
  };

  return (
    <FieldLabel label={field.label || 'Opacity'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Slider */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={opacityValue}
          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            cursor: 'pointer',
          }}
        />

        {/* Input field */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={opacityValue}
            onChange={(e) => handleChange(parseInt(e.target.value, 10) || 0)}
            placeholder="100"
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: 'var(--puck-color-white)',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--puck-color-grey-05)', minWidth: '24px' }}>
            %
          </span>
        </div>

        {/* Visual preview */}
        <div
          style={{
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: 'var(--puck-color-azure-04)',
            opacity: opacityValue / 100,
            textAlign: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Preview ({opacityValue}%)
        </div>

        {/* Info text */}
        <div style={{ fontSize: '11px', color: 'var(--puck-color-grey-05)' }}>
          {opacityValue === 100
            ? 'Fully visible'
            : opacityValue === 0
              ? 'Fully transparent (invisible)'
              : `${opacityValue}% visible`}
        </div>
      </div>
    </FieldLabel>
  );
}
