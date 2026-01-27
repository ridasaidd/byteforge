import { FieldLabel } from '@puckeditor/core';

export type DisplayValue = 'block' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none';

interface DisplayControlProps {
  field: { label?: string };
  value: DisplayValue;
  onChange: (value: DisplayValue) => void;
}

export function DisplayControl({
  field,
  value = 'block',
  onChange,
}: DisplayControlProps) {
  const displayOptions: Array<{ value: DisplayValue; label: string }> = [
    { value: 'block', label: 'Block' },
    { value: 'inline-block', label: 'Inline Block' },
    { value: 'flex', label: 'Flex' },
    { value: 'inline-flex', label: 'Inline Flex' },
    { value: 'grid', label: 'Grid' },
    { value: 'inline-grid', label: 'Inline Grid' },
    { value: 'none', label: 'None (Hidden)' },
  ];

  return (
    <FieldLabel label={field.label || 'Display'}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DisplayValue)}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid var(--puck-color-grey-04)',
          borderRadius: '4px',
          fontSize: '13px',
          backgroundColor: 'var(--puck-color-white)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--puck-color-grey-08)',
        }}
      >
        {displayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}
