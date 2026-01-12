import { FieldLabel } from '@measured/puck';

export interface MaxWidthValue {
  value: string;
  unit: 'px' | '%' | 'rem' | 'em' | 'vw' | 'none';
}

interface MaxWidthControlProps {
  field: { label?: string };
  value: MaxWidthValue | string | undefined;
  onChange: (value: MaxWidthValue) => void;
}

export function MaxWidthControl({
  field,
  value,
  onChange,
}: MaxWidthControlProps) {
  // Normalize value to MaxWidthValue format
  const normalizedValue: MaxWidthValue = typeof value === 'string'
    ? parseMaxWidthString(value)
    : value || { value: 'none', unit: 'none' };

  const handleValueChange = (newValue: string) => {
    if (normalizedValue.unit === 'none') {
      onChange({ value: newValue, unit: 'px' });
    } else {
      onChange({ ...normalizedValue, value: newValue });
    }
  };

  const handleUnitChange = (newUnit: MaxWidthValue['unit']) => {
    if (newUnit === 'none') {
      onChange({ value: 'none', unit: 'none' });
    } else {
      onChange({
        value: normalizedValue.value === 'none' ? '100' : normalizedValue.value,
        unit: newUnit,
      });
    }
  };

  const unitOptions = [
    { value: 'none', label: 'none' },
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
          value={normalizedValue.unit === 'none' ? 'none' : normalizedValue.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="0"
          disabled={normalizedValue.unit === 'none'}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: normalizedValue.unit === 'none' ? 'var(--puck-color-grey-02)' : 'var(--puck-color-white)',
            color: normalizedValue.unit === 'none' ? 'var(--puck-color-grey-05)' : 'inherit',
          }}
        />
      </div>

      {/* Unit Toggle Buttons */}
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {unitOptions.map(({ value: unitValue, label: unitLabel }) => (
          <button
            key={unitValue}
            type="button"
            onClick={() => handleUnitChange(unitValue as MaxWidthValue['unit'])}
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

// Helper function to parse maxWidth string to MaxWidthValue
function parseMaxWidthString(str: string): MaxWidthValue {
  if (str === 'none' || !str) {
    return { value: 'none', unit: 'none' };
  }

  const match = str.match(/^(\d+\.?\d*)(px|%|rem|em|vw)$/);
  if (match) {
    return {
      value: match[1],
      unit: match[2] as MaxWidthValue['unit'],
    };
  }

  return { value: 'none', unit: 'none' };
}
