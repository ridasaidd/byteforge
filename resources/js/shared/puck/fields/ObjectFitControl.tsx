import { FieldLabel } from '@measured/puck';

export type ObjectFitValue = 'fill' | 'contain' | 'cover' | 'scale-down';

interface ObjectFitControlProps {
  field: { label?: string };
  value?: ObjectFitValue;
  onChange: (value: ObjectFitValue) => void;
}

export function ObjectFitControl({
  field,
  value = 'cover',
  onChange,
}: ObjectFitControlProps) {
  const options: { value: ObjectFitValue; label: string; description: string }[] = [
    { value: 'fill', label: 'Fill', description: 'Stretch to fill' },
    { value: 'contain', label: 'Contain', description: 'Keep aspect ratio' },
    { value: 'cover', label: 'Cover', description: 'Fill & crop' },
    { value: 'scale-down', label: 'Scale', description: 'Smaller size' },
  ];

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {options.map(({ value: optionValue, label: optionLabel }) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-label={optionLabel}
            style={{
              flex: '1 1 calc(50% - 2px)',
              minWidth: '50px',
              padding: '6px',
              fontSize: '11px',
              fontWeight: value === optionValue ? 600 : 400,
              border: value === optionValue ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              backgroundColor: value === optionValue ? '#eff6ff' : 'var(--puck-color-white)',
              color: value === optionValue ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title={`Object fit: ${optionLabel}`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}
