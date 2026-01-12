import { FieldLabel } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import { useState } from 'react';

export interface FontWeightValue {
  type: 'theme' | 'custom';
  value: string; // e.g., "typography.fontWeight.bold" or "700"
}

interface FontWeightControlProps {
  field: { label?: string };
  value: FontWeightValue | string | number;
  onChange: (value: FontWeightValue) => void;
  showCustom?: boolean;
}

export function FontWeightControl({
  field,
  value,
  onChange,
  showCustom = true,
}: FontWeightControlProps) {
  const { theme, resolve } = useTheme();

  // Normalize value to FontWeightValue format
  const normalizedValue: FontWeightValue = typeof value === 'number'
    ? { type: 'custom', value: value.toString() }
    : typeof value === 'string'
    ? { type: value.startsWith('typography.') ? 'theme' : 'custom', value }
    : value || { type: 'theme', value: 'typography.fontWeight.normal' };

  const [activeTab, setActiveTab] = useState<'theme' | 'custom'>(normalizedValue.type);
  const [customWeight, setCustomWeight] = useState(
    normalizedValue.type === 'custom' ? normalizedValue.value : '400'
  );

  // Extract font weights from theme
  const themeFontWeights = theme?.theme_data?.typography?.fontWeight || {};
  const fontWeightOptions = Object.entries(themeFontWeights).map(([key, value]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    token: `typography.fontWeight.${key}`,
    value: value as string,
  }));

  const handleThemeWeightSelect = (token: string) => {
    onChange({ type: 'theme', value: token });
  };

  const handleCustomWeightChange = (weight: string) => {
    setCustomWeight(weight);
    onChange({ type: 'custom', value: weight });
  };

  return (
    <FieldLabel label={field.label || 'Font Weight'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderBottom: activeTab === 'theme' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'theme' ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'theme' ? 600 : 400,
            }}
          >
            Theme Weights
          </button>
          {showCustom && (
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderBottom: activeTab === 'custom' ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === 'custom' ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === 'custom' ? 600 : 400,
              }}
            >
              Custom
            </button>
          )}
        </div>

        {/* Theme Weights Tab */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fontWeightOptions.map(({ label, token, value }) => {
              const resolvedValue = resolve(token) || value;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleThemeWeightSelect(token)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    border: normalizedValue.value === token ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: normalizedValue.value === token ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {resolvedValue}
                    </span>
                  </div>
                  <span style={{ fontWeight: parseInt(resolvedValue), fontSize: '16px', color: '#6b7280' }}>
                    Aa
                  </span>
                </button>
              );
            })}

            {fontWeightOptions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                No theme font weights available
              </div>
            )}
          </div>
        )}

        {/* Custom Weight Tab */}
        {activeTab === 'custom' && showCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <input
                type="range"
                value={parseInt(customWeight) || 400}
                onChange={(e) => handleCustomWeightChange(e.target.value)}
                min={100}
                max={900}
                step={100}
                style={{
                  width: '100%',
                  accentColor: '#2563eb',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '4px',
              }}>
                <span>100 (Thin)</span>
                <span>900 (Black)</span>
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={customWeight}
              onChange={(e) => handleCustomWeightChange(e.target.value)}
              placeholder="400"
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />

            {/* Preview */}
            <div style={{
              padding: '16px',
              borderRadius: '6px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontWeight: parseInt(customWeight), fontSize: '16px', color: '#374151' }}>
                Preview Text ({customWeight})
              </div>
            </div>
          </div>
        )}

        {/* Selected weight info */}
        {normalizedValue.value && (
          <div style={{
            padding: '8px 12px',
            background: '#f9fafb',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            <strong>Selected:</strong> {normalizedValue.type === 'theme' ? normalizedValue.value : normalizedValue.value}
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
