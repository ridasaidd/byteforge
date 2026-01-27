import { FieldLabel } from '@puckeditor/core';

export interface MinWidthValue {
  value: string;
  unit: 'px' | '%' | 'rem' | 'em' | 'vw' | 'auto';
}

interface MinWidthControlProps {
  field: { label?: string };
  value: MinWidthValue | string | undefined;
  onChange: (value: MinWidthValue) => void;
}

export function MinWidthControl({
  field,
  value,
  onChange,
}: MinWidthControlProps) {
  // Normalize value to MinWidthValue format
  const normalizedValue: MinWidthValue = typeof value === 'string'
    ? parseMinWidthString(value)
    : value || { value: 'auto', unit: 'auto' };

  const handleValueChange = (newValue: string) => {
    if (normalizedValue.unit === 'auto') {
      onChange({ value: newValue, unit: 'px' });
    } else {
      onChange({ ...normalizedValue, value: newValue });
    }
  };

  const handleUnitChange = (newUnit: MinWidthValue['unit']) => {
    if (newUnit === 'auto') {
      onChange({ value: 'auto', unit: 'auto' });
    } else {
      onChange({
        value: normalizedValue.value === 'auto' ? '100' : normalizedValue.value,
        unit: newUnit,
      });
    }
  };

  const unitOptions = [
    { value: 'auto', label: 'auto' },
    { value: 'px', label: 'px' },
    { value: '%', label: '%' },
    { value: 'rem', label: 'rem' },
    { value: 'em', label: 'em' },
    { value: 'vw', label: 'vw' },
  ];

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Value Input */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--puck-color-grey-05)',
            marginBottom: '4px',
          }}
        >
          Value
        </label>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          value={normalizedValue.unit === 'auto' ? 'auto' : normalizedValue.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="0"
          disabled={normalizedValue.unit === 'auto'}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: normalizedValue.unit === 'auto' ? 'var(--puck-color-grey-02)' : 'var(--puck-color-white)',
            color: normalizedValue.unit === 'auto' ? 'var(--puck-color-grey-05)' : 'inherit',
          }}
        />
      </div>

      {/* Unit Toggle Buttons */}
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {unitOptions.map(({ value: unitValue, label: unitLabel }) => (
          <button
            key={unitValue}
            type="button"
            onClick={() => handleUnitChange(unitValue as MinWidthValue['unit'])}
            style={{
              flex: '1 1 calc(33.333% - 2px)',
              minWidth: '40px',
              padding: '4px 6px',
              fontSize: '11px',
              fontWeight: normalizedValue.unit === unitValue ? 600 : 400,
              border: normalizedValue.unit === unitValue ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              backgroundColor: normalizedValue.unit === unitValue ? '#eff6ff' : 'var(--puck-color-white)',
              color: normalizedValue.unit === unitValue ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {unitLabel}
          </button>
        ))}
      </div>
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}

// Helper function to parse minWidth string to MinWidthValue
function parseMinWidthString(str: string): MinWidthValue {
  if (str === 'auto' || !str) {
    return { value: 'auto', unit: 'auto' };
  }

  const match = str.match(/^(\d+\.?\d*)(px|%|rem|em|vw)$/);
  if (match) {
    return {
      value: match[1],
      unit: match[2] as MinWidthValue['unit'],
    };
  }

  return { value: 'auto', unit: 'auto' };
}
