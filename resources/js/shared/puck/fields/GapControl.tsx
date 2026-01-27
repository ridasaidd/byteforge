import { FieldLabel } from '@puckeditor/core';

export interface GapValue {
  value: string;
  unit: 'px' | 'rem' | 'em';
}

interface GapControlProps {
  field: { label?: string };
  value: GapValue | number | undefined; // Support legacy number values
  onChange: (value: GapValue) => void;
}

export function GapControl({
  field,
  value,
  onChange,
}: GapControlProps) {
  // Normalize value to GapValue format
  const normalizedValue: GapValue = typeof value === 'number'
    ? { value: value.toString(), unit: 'px' }
    : value || { value: '16', unit: 'px' };

  const handleValueChange = (newValue: string) => {
    onChange({ ...normalizedValue, value: newValue });
  };

  const handleUnitChange = (newUnit: GapValue['unit']) => {
    onChange({ ...normalizedValue, unit: newUnit });
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Value Input */}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={normalizedValue.value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="16"
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid var(--puck-color-grey-04)',
          borderRadius: '4px',
          fontSize: '13px',
          backgroundColor: 'var(--puck-color-white)',
        }}
      />

      {/* Unit Toggle Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['px', 'rem', 'em'] as const).map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => handleUnitChange(unit)}
            style={{
              flex: 1,
              padding: '6px',
              border: normalizedValue.unit === unit ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: normalizedValue.unit === unit ? 600 : 400,
              backgroundColor: normalizedValue.unit === unit ? '#eff6ff' : 'var(--puck-color-white)',
              color: normalizedValue.unit === unit ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-05)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {unit}
          </button>
        ))}
      </div>
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}
