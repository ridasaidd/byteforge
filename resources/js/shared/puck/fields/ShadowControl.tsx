import { FieldLabel } from '@measured/puck';

export interface ShadowValue {
  preset: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  custom?: string;
}

interface ShadowControlProps {
  field: { label?: string };
  value: ShadowValue;
  onChange: (value: ShadowValue) => void;
}

export function ShadowControl({
  field,
  value = { preset: 'none' },
  onChange,
}: ShadowControlProps) {
  const shadowPresets = [
    { value: 'none', label: 'None', shadow: 'none' },
    { value: 'sm', label: 'Small', shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    { value: 'md', label: 'Medium', shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
    { value: 'lg', label: 'Large', shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
    { value: 'xl', label: 'Extra Large', shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    { value: 'custom', label: 'Custom', shadow: '' },
  ];

  return (
    <FieldLabel label={field.label || 'Box Shadow'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Preset Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
            Preset
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {shadowPresets.map(({ value: presetValue, label, shadow }) => (
              <button
                key={presetValue}
                type="button"
                onClick={() => onChange({ ...value, preset: presetValue as ShadowValue['preset'] })}
                style={{
                  padding: '24px 12px',
                  borderWidth: value.preset === presetValue ? '2px' : '1px',
                  borderStyle: 'solid',
                  borderColor: value.preset === presetValue ? '#2563eb' : '#e5e7eb',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
                title={label}
              >
                {/* Shadow Preview */}
                {presetValue !== 'none' && presetValue !== 'custom' && (
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      background: 'white',
                      margin: '0 auto 8px',
                      borderRadius: '4px',
                      boxShadow: shadow,
                    }}
                  />
                )}
                <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                  {label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Shadow Input */}
        {value.preset === 'custom' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Custom CSS Shadow
            </label>
            <textarea
              value={value.custom || ''}
              onChange={(e) => onChange({ ...value, custom: e.target.value })}
              placeholder="0 4px 6px rgba(0, 0, 0, 0.1)"
              rows={3}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
              Example: 0 4px 6px rgba(0, 0, 0, 0.1)
            </div>
          </div>
        )}

        {/* Shadow Preview */}
        {value.preset !== 'none' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Preview
            </label>
            <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '4px' }}>
              <div
                style={{
                  width: '100px',
                  height: '60px',
                  background: 'white',
                  margin: '0 auto',
                  borderRadius: '8px',
                  boxShadow: value.preset === 'custom'
                    ? value.custom
                    : shadowPresets.find(p => p.value === value.preset)?.shadow,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
