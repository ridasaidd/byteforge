import { FieldLabel } from '@puckeditor/core';

export type ObjectPositionValue =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ObjectPositionControlProps {
  field: { label?: string };
  value?: ObjectPositionValue;
  onChange: (value: ObjectPositionValue) => void;
}

export function ObjectPositionControl({
  field,
  value = 'center',
  onChange,
}: ObjectPositionControlProps) {
  const positions: { value: ObjectPositionValue; label: string }[] = [
    { value: 'top-left', label: '↖' },
    { value: 'top-center', label: '↑' },
    { value: 'top-right', label: '↗' },
    { value: 'center-left', label: '←' },
    { value: 'center', label: '●' },
    { value: 'center-right', label: '→' },
    { value: 'bottom-left', label: '↙' },
    { value: 'bottom-center', label: '↓' },
    { value: 'bottom-right', label: '↘' },
  ];

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
        {positions.map(({ value: posValue, label: posLabel }) => (
          <button
            key={posValue}
            type="button"
            onClick={() => onChange(posValue)}
            aria-label={`Position: ${posValue}`}
            style={{
              padding: '8px',
              fontSize: '12px',
              fontWeight: value === posValue ? 600 : 400,
              border: value === posValue ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              backgroundColor: value === posValue ? '#eff6ff' : 'var(--puck-color-white)',
              color: value === posValue ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={`Position: ${posValue}`}
          >
            {posLabel}
          </button>
        ))}
      </div>
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}
