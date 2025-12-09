import { FieldLabel } from '@measured/puck';

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
  const displayOptions: Array<{ value: DisplayValue; label: string; description: string }> = [
    { value: 'block', label: 'Block', description: 'Takes full width, stacks vertically' },
    { value: 'inline-block', label: 'Inline Block', description: 'Flows inline but respects width/height' },
    { value: 'flex', label: 'Flex', description: 'Flexible box layout' },
    { value: 'inline-flex', label: 'Inline Flex', description: 'Inline flexible box' },
    { value: 'grid', label: 'Grid', description: 'CSS Grid layout' },
    { value: 'inline-grid', label: 'Inline Grid', description: 'Inline grid layout' },
    { value: 'none', label: 'None', description: 'Hidden from layout' },
  ];

  return (
    <FieldLabel label={field.label || 'Display'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              padding: '12px',
              border: value === option.value ? '2px solid #2563eb' : '1px solid #e5e7eb',
              borderRadius: '6px',
              background: value === option.value ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: value === option.value ? '5px solid #2563eb' : '2px solid #d1d5db',
                  transition: 'all 0.2s',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: value === option.value ? 600 : 500,
                  color: value === option.value ? '#2563eb' : '#374151',
                }}
              >
                {option.label}
              </span>
              <code
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: value === option.value ? '#dbeafe' : '#f3f4f6',
                  color: value === option.value ? '#1e40af' : '#6b7280',
                  fontFamily: 'monospace',
                }}
              >
                {option.value}
              </code>
            </div>
            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '24px' }}>
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </FieldLabel>
  );
}
