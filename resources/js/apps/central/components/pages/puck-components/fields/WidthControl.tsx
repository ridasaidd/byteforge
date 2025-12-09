import { FieldLabel } from '@measured/puck';

export interface WidthValue {
  value: string;
  unit: 'px' | '%' | 'rem' | 'em' | 'vw' | 'vh' | 'fr' | 'auto';
}

interface WidthControlProps {
  field: { label?: string };
  value: WidthValue | string | undefined; // Support legacy string values and undefined
  onChange: (value: WidthValue) => void;
  minValue?: number;
  maxValue?: number;
  showPresets?: boolean;
}

export function WidthControl({
  field,
  value,
  onChange,
  minValue = 0,
  maxValue = 9999,
  showPresets = true,
}: WidthControlProps) {
  // Normalize value to WidthValue format
  const normalizedValue: WidthValue = typeof value === 'string'
    ? parseWidthString(value)
    : value || { value: 'auto', unit: 'auto' };

  const presets = [
    { label: 'Auto', value: { value: 'auto', unit: 'auto' as const } },
    { label: '25%', value: { value: '25', unit: '%' as const } },
    { label: '50%', value: { value: '50', unit: '%' as const } },
    { label: '75%', value: { value: '75', unit: '%' as const } },
    { label: '100%', value: { value: '100', unit: '%' as const } },
  ];

  const handleValueChange = (newValue: string) => {
    if (normalizedValue.unit === 'auto') {
      // Switching from auto to a numeric unit
      onChange({ value: newValue, unit: 'px' });
    } else {
      onChange({ ...normalizedValue, value: newValue });
    }
  };

  const handleUnitChange = (newUnit: WidthValue['unit']) => {
    if (newUnit === 'auto') {
      onChange({ value: 'auto', unit: 'auto' });
    } else {
      onChange({
        value: normalizedValue.value === 'auto' ? '100' : normalizedValue.value,
        unit: newUnit,
      });
    }
  };

  const handlePresetClick = (preset: WidthValue) => {
    onChange(preset);
  };

  return (
    <FieldLabel label={field.label || 'Width'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Presets */}
        {showPresets && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                style={{
                  padding: '6px 12px',
                  border:
                    normalizedValue.value === preset.value.value &&
                    normalizedValue.unit === preset.value.unit
                      ? '2px solid #2563eb'
                      : '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background:
                    normalizedValue.value === preset.value.value &&
                    normalizedValue.unit === preset.value.unit
                      ? '#eff6ff'
                      : 'white',
                  color:
                    normalizedValue.value === preset.value.value &&
                    normalizedValue.unit === preset.value.unit
                      ? '#2563eb'
                      : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Value Input */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px',
              }}
            >
              Value
            </label>
            {normalizedValue.unit === 'auto' ? (
              <input
                type="text"
                value="auto"
                disabled
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                }}
              />
            ) : (
              <input
                type="number"
                value={normalizedValue.value}
                onChange={(e) => handleValueChange(e.target.value)}
                min={minValue}
                max={maxValue}
                step="1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px',
              }}
            >
              Unit
            </label>
            <select
              value={normalizedValue.unit}
              onChange={(e) => handleUnitChange(e.target.value as WidthValue['unit'])}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              <option value="auto">auto</option>
              <option value="fr">fr</option>
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="rem">rem</option>
              <option value="em">em</option>
              <option value="vw">vw</option>
              <option value="vh">vh</option>
            </select>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          <strong>Preview:</strong>{' '}
          <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '2px' }}>
            {normalizedValue.unit === 'auto'
              ? 'auto'
              : `${normalizedValue.value}${normalizedValue.unit}`}
          </code>
        </div>
      </div>
    </FieldLabel>
  );
}

// Helper function to parse width string to WidthValue
function parseWidthString(str: string): WidthValue {
  if (str === 'auto' || !str) {
    return { value: 'auto', unit: 'auto' };
  }

  const match = str.match(/^(\d+\.?\d*)(px|%|rem|em|vw|vh|fr)$/);
  if (match) {
    return {
      value: match[1],
      unit: match[2] as WidthValue['unit'],
    };
  }

  // Default fallback
  return { value: 'auto', unit: 'auto' };
}
