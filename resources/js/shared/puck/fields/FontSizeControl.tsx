import { FieldLabel } from '@puckeditor/core';
import { useState, useContext } from 'react';
import { ThemeContext } from '@/shared/contexts/theme-context';

export interface FontSizeValue {
  type: 'theme' | 'custom';
  value: string; // e.g., "typography.fontSize.xl" or "24px"
}

interface FontSizeControlProps {
  field: { label?: string };
  value: FontSizeValue | string;
  onChange: (value: FontSizeValue) => void;
  showCustom?: boolean;
}

export function FontSizeControl({
  field,
  value,
  onChange,
  showCustom = true,
}: FontSizeControlProps) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme ?? null;
  const resolve = (path: string, def: string = '') => themeCtx?.resolve(path, def) ?? def;

  // Normalize value to FontSizeValue format
  const normalizedValue: FontSizeValue = typeof value === 'string'
    ? { type: value.startsWith('typography.') ? 'theme' : 'custom', value }
    : value || { type: 'theme', value: 'typography.fontSize.base' };

  const [activeTab, setActiveTab] = useState<'theme' | 'custom'>(normalizedValue.type);
  const [customSize, setCustomSize] = useState(
    normalizedValue.type === 'custom' ? normalizedValue.value : '16px'
  );
  const [customUnit, setCustomUnit] = useState<'px' | 'rem' | 'em'>('px');

  // Extract font sizes from theme
  const themeFontSizes = theme?.theme_data?.typography?.fontSize || {};
  const fontSizeOptions = Object.entries(themeFontSizes).map(([key, value]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    token: `typography.fontSize.${key}`,
    value: value as string,
  }));

  const handleThemeSizeSelect = (token: string) => {
    onChange({ type: 'theme', value: token });
  };

  const handleCustomSizeChange = (size: string, unit: 'px' | 'rem' | 'em') => {
    setCustomSize(size);
    setCustomUnit(unit);
    onChange({ type: 'custom', value: `${size}${unit}` });
  };

  const content = (
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
            Theme Sizes
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

        {/* Theme Sizes Tab */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fontSizeOptions.map(({ label, token, value }) => {
              const resolvedValue = resolve(token) || value;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleThemeSizeSelect(token)}
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
                  <span style={{ fontSize: resolvedValue, color: '#6b7280' }}>
                    Aa
                  </span>
                </button>
              );
            })}

            {fontSizeOptions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                No theme font sizes available
              </div>
            )}
          </div>
        )}

        {/* Custom Size Tab */}
        {activeTab === 'custom' && showCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Value Input */}
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={customSize}
              onChange={(e) => handleCustomSizeChange(e.target.value, customUnit)}
              placeholder="16"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />

            {/* Unit Toggle Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['px', 'rem', 'em'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleCustomSizeChange(customSize, unit)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    border: customUnit === unit ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: customUnit === unit ? 600 : 400,
                    backgroundColor: customUnit === unit ? '#eff6ff' : 'white',
                    color: customUnit === unit ? '#2563eb' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {unit}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{
              padding: '16px',
              borderRadius: '6px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: `${customSize}${customUnit}`, color: '#374151' }}>
                Preview Text
              </div>
            </div>
          </div>
        )}

        {/* Selected size info */}
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
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}
