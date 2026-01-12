import { FieldLabel } from '@measured/puck';

export interface HeightValue {
  value: string;
  unit: 'px' | '%' | 'rem' | 'em' | 'vh' | 'vw' | 'auto';
}

interface HeightControlProps {
  field: { label?: string };
  value: HeightValue | string | undefined; // Support legacy string values and undefined
  onChange: (value: HeightValue) => void;
}

export function HeightControl({
  field,
  value,
  onChange,
}: HeightControlProps) {
  // Normalize value to HeightValue format
  const normalizedValue: HeightValue = typeof value === 'string'
    ? parseHeightString(value)
    : value || { value: 'auto', unit: 'auto' };

  const handleValueChange = (newValue: string) => {
    if (normalizedValue.unit === 'auto') {
      // Switching from auto to a numeric unit
      onChange({ value: newValue, unit: 'px' });
    } else {
      onChange({ ...normalizedValue, value: newValue });
    }
  };

  const handleUnitChange = (newUnit: HeightValue['unit']) => {
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
    { value: 'vh', label: 'vh' },
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
            onClick={() => handleUnitChange(unitValue as HeightValue['unit'])}
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

  // Only render a FieldLabel when a label is explicitly provided.
  // This prevents duplicate labels when used inside ResponsiveHeightControl,
  // which already renders the outer label.
  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}

// Helper function to parse height string to HeightValue
function parseHeightString(str: string): HeightValue {
  if (str === 'auto' || !str) {
    return { value: 'auto', unit: 'auto' };
  }

  const match = str.match(/^(\d+\.?\d*)(px|%|rem|em|vh|vw)$/);
  if (match) {
    return {
      value: match[1],
      unit: match[2] as HeightValue['unit'],
    };
  }

  // Default fallback
  return { value: 'auto', unit: 'auto' };
}
