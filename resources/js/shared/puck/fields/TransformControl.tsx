import { FieldLabel } from '@puckeditor/core';

export interface TransformValue {
  translateX?: string;
  translateXUnit?: 'px' | '%' | 'rem';
  translateY?: string;
  translateYUnit?: 'px' | '%' | 'rem';
  scale?: string;
  rotate?: string;
}

interface TransformControlProps {
  field: { label?: string };
  value: TransformValue;
  onChange: (value: TransformValue) => void;
}

export function TransformControl({
  field,
  value = {},
  onChange,
}: TransformControlProps) {

  const labelStyle = {
    display: 'block' as const,
    fontSize: '12px',
    color: 'var(--puck-color-grey-05)',
    marginBottom: '4px',
  };

  const inputStyle = {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid var(--puck-color-grey-04)',
    borderRight: 'none',
    borderRadius: '4px 0 0 4px',
    fontSize: '13px',
    backgroundColor: 'var(--puck-color-white)',
    width: '100%',
  };

  const selectStyle = {
    width: '60px',
    padding: '6px 4px',
    border: '1px solid var(--puck-color-grey-04)',
    borderRadius: '0 4px 4px 0',
    fontSize: '13px',
    backgroundColor: '#f9fafb',
    color: 'var(--puck-color-grey-06)',
  };

  const simpleInputStyle = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid var(--puck-color-grey-04)',
    borderRadius: '4px',
    fontSize: '13px',
    backgroundColor: 'var(--puck-color-white)',
  };

  const renderUnitInput = (
    label: string,
    val: string | undefined,
    unit: string | undefined,
    fieldKey: keyof TransformValue,
    unitKey: keyof TransformValue
  ) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={val || ''}
          onChange={(e) => onChange({ ...value, [fieldKey]: e.target.value })}
          placeholder="0"
          style={inputStyle}
        />
        <select
          value={unit || 'px'}
          onChange={(e) => onChange({ ...value, [unitKey]: e.target.value })}
          style={selectStyle}
        >
          <option value="px">px</option>
          <option value="%">%</option>
          <option value="rem">rem</option>
        </select>
      </div>
    </div>
  );

  return (
    <FieldLabel label={field.label || 'Transform'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

        {/* Translate X */}
        {renderUnitInput('Translate X', value.translateX, value.translateXUnit, 'translateX', 'translateXUnit')}

        {/* Translate Y */}
        {renderUnitInput('Translate Y', value.translateY, value.translateYUnit, 'translateY', 'translateYUnit')}

        {/* Scale */}
        <div>
           <label style={labelStyle}>Scale</label>
           <input
             type="text"
             value={value.scale || ''}
             onChange={(e) => onChange({ ...value, scale: e.target.value })}
             placeholder="1"
             style={simpleInputStyle}
           />
        </div>

        {/* Rotate */}
        <div>
           <label style={labelStyle}>Rotate (deg)</label>
           <input
             type="text"
             value={value.rotate || ''}
             onChange={(e) => onChange({ ...value, rotate: e.target.value })}
             placeholder="0"
             style={simpleInputStyle}
           />
        </div>

      </div>
    </FieldLabel>
  );
}
