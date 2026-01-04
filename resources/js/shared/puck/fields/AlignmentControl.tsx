import { FieldLabel } from '@measured/puck';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export interface AlignmentValue {
  horizontal: 'left' | 'center' | 'right' | 'justify';
  vertical?: 'top' | 'middle' | 'bottom';
}

interface AlignmentControlProps {
  field: { label?: string };
  value: AlignmentValue;
  onChange: (value: AlignmentValue) => void;
  showVertical?: boolean;
}

export function AlignmentControl({
  field,
  value = { horizontal: 'left' },
  onChange,
  showVertical = false,
}: AlignmentControlProps) {
  const horizontalOptions = [
    { value: 'left', icon: AlignLeft, label: 'Left' },
    { value: 'center', icon: AlignCenter, label: 'Center' },
    { value: 'right', icon: AlignRight, label: 'Right' },
    { value: 'justify', icon: AlignJustify, label: 'Justify' },
  ];

  const verticalOptions = [
    { value: 'top', label: 'Top' },
    { value: 'middle', label: 'Middle' },
    { value: 'bottom', label: 'Bottom' },
  ];

  return (
    <FieldLabel label={field.label || 'Alignment'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Horizontal Alignment */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
            Horizontal
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {horizontalOptions.map(({ value: optionValue, icon: Icon, label }) => (
              <button
                key={optionValue}
                type="button"
                onClick={() => onChange({ ...value, horizontal: optionValue as AlignmentValue['horizontal'] })}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background: value.horizontal === optionValue ? '#2563eb' : 'white',
                  color: value.horizontal === optionValue ? 'white' : '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Alignment (optional) */}
        {showVertical && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Vertical
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {verticalOptions.map(({ value: optionValue, label }) => (
                <button
                  key={optionValue}
                  type="button"
                  onClick={() => onChange({ ...value, vertical: optionValue as AlignmentValue['vertical'] })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    background: value.vertical === optionValue ? '#2563eb' : 'white',
                    color: value.vertical === optionValue ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
