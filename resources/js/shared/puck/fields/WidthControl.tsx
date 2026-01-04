import { FieldLabel } from '@measured/puck';

export interface WidthValue {
  value: string;
  unit: 'px' | '%' | 'rem' | 'em' | 'vw' | 'vh' | 'fr' | 'auto';
}

interface WidthControlProps {
  field: { label?: string };
  value: WidthValue | string | undefined; // Support legacy string values and undefined
  onChange: (value: WidthValue) => void;
}

export function WidthControl({
  field,
  value,
  onChange,
}: WidthControlProps) {
  // Normalize value to WidthValue format
  const normalizedValue: WidthValue = typeof value === 'string'
    ? parseWidthString(value)
    : value || { value: 'auto', unit: 'auto' };

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

  const content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <input
              type="text"
              value={normalizedValue.unit === 'auto' ? 'auto' : normalizedValue.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="0"
              disabled={normalizedValue.unit === 'auto'}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: normalizedValue.unit === 'auto' ? '#f9fafb' : 'white',
                color: normalizedValue.unit === 'auto' ? '#6b7280' : '#000',
              }}
            />
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
                padding: '6px 8px',
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
      </div>
  );

  // Only render a FieldLabel when a label is explicitly provided.
  // This prevents duplicate labels when used inside ResponsiveWidthControl,
  // which already renders the outer label.
  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
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
