import { FieldLabel } from '@measured/puck';

export interface BorderValue {
  width: string;
  style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
  radius: string;
  unit: 'px' | 'em' | 'rem' | '%';
}

interface BorderControlProps {
  field: { label?: string };
  value: BorderValue;
  onChange: (value: BorderValue) => void;
}

export function BorderControl({
  field,
  value = { width: '1', style: 'solid', color: '#e5e7eb', radius: '0', unit: 'px' },
  onChange,
}: BorderControlProps) {
  const borderStyles = [
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
  ];

  return (
    <FieldLabel label={field.label || 'Border'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Border Style */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Style
          </label>
          <select
            value={value.style}
            onChange={(e) => onChange({ ...value, style: e.target.value as BorderValue['style'] })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            {borderStyles.map(({ value: styleValue, label }) => (
              <option key={styleValue} value={styleValue}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {value.style !== 'none' && (
          <>
            {/* Border Width and Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Width
                </label>
                <input
                  type="number"
                  value={value.width}
                  onChange={(e) => onChange({ ...value, width: e.target.value })}
                  min="0"
                  step="0.5"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Unit
                </label>
                <select
                  value={value.unit}
                  onChange={(e) => onChange({ ...value, unit: e.target.value as BorderValue['unit'] })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="px">px</option>
                  <option value="em">em</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>

            {/* Border Color */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={value.color}
                  onChange={(e) => onChange({ ...value, color: e.target.value })}
                  style={{
                    width: '50px',
                    height: '38px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={value.color}
                  onChange={(e) => onChange({ ...value, color: e.target.value })}
                  placeholder="#000000"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Radius
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="range"
                  value={value.radius}
                  onChange={(e) => onChange({ ...value, radius: e.target.value })}
                  min="0"
                  max="100"
                  style={{
                    flex: 1,
                  }}
                />
                <input
                  type="number"
                  value={value.radius}
                  onChange={(e) => onChange({ ...value, radius: e.target.value })}
                  min="0"
                  style={{
                    width: '70px',
                    padding: '6px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{value.unit}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </FieldLabel>
  );
}
