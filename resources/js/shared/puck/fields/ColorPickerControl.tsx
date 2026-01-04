import { FieldLabel } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import { useState, useMemo } from 'react';

export interface ColorPickerValue {
  type: 'theme' | 'custom';
  value: string; // e.g., "colors.primary.500" or "#FF0000"
}

interface ColorPickerControlProps {
  field: { label?: string };
  value: ColorPickerValue | string; // Support legacy string values
  onChange: (value: ColorPickerValue) => void;
  showCustom?: boolean;
}

export function ColorPickerControl({
  field,
  value,
  onChange,
  showCustom = true,
}: ColorPickerControlProps) {
  const { theme } = useTheme();

  // Normalize value to ColorPickerValue format
  const normalizedValue: ColorPickerValue = typeof value === 'string'
    ? { type: value.startsWith('#') ? 'custom' : 'theme', value }
    : value || { type: 'theme', value: '' };

  const [activeTab, setActiveTab] = useState<'theme' | 'custom'>(normalizedValue.type);
  const [customColor, setCustomColor] = useState(
    normalizedValue.type === 'custom' && normalizedValue.value ? normalizedValue.value : '#000000'
  );

  // Extract color palette from theme_data
  const colorPalette = useMemo(() => {
    if (!theme?.theme_data?.colors) return [];

    const colors: Array<{ label: string; token: string; value: string }> = [];

    const processColorObject = (obj: Record<string, unknown>, prefix: string = 'colors') => {
      Object.entries(obj).forEach(([key, val]) => {
        const token = `${prefix}.${key}`;

        if (typeof val === 'string') {
          // Direct color value
          colors.push({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            token,
            value: val,
          });
        } else if (typeof val === 'object' && val !== null) {
          // Nested color object (e.g., primary.500, primary.600)
          Object.entries(val).forEach(([shade, color]) => {
            if (typeof color === 'string') {
              colors.push({
                label: `${key.charAt(0).toUpperCase() + key.slice(1)} ${shade}`,
                token: `${token}.${shade}`,
                value: color,
              });
            }
          });
        }
      });
    };

    processColorObject(theme.theme_data.colors);
    return colors;
  }, [theme]);

  // Add semantic colors if they exist
  const semanticColors = useMemo(() => {
    if (!theme?.theme_data?.colors?.semantic) return [];

    const colors: Array<{ label: string; token: string; value: string }> = [];
    try {
      Object.entries(theme.theme_data.colors.semantic).forEach(([key, val]) => {
        if (typeof val === 'string') {
          colors.push({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            token: `colors.semantic.${key}`,
            value: val,
          });
        }
      });
    } catch (error) {
      console.warn('Error processing semantic colors:', error);
    }
    return colors;
  }, [theme]);

  const handleThemeColorSelect = (token: string) => {
    onChange({ type: 'theme', value: token });
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange({ type: 'custom', value: color });
  };

  return (
    <FieldLabel label={field.label || 'Color'}>
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
            Theme Colors
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

        {/* Theme Colors Tab */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '300px', overflowY: 'auto' }}>
            {semanticColors.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
                  Semantic Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px' }}>
                  {semanticColors.map(({ label, token, value }) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleThemeColorSelect(token)}
                      title={`${label} (${value})`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px',
                        border: normalizedValue.value === token ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          backgroundColor: value,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                      <span style={{ fontSize: '10px', color: '#374151', textAlign: 'center', lineHeight: '1.2' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorPalette.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
                  Palette Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px' }}>
                  {colorPalette.map(({ label, token, value }) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleThemeColorSelect(token)}
                      title={`${label} (${value})`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px',
                        border: normalizedValue.value === token ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          backgroundColor: value,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                      <span style={{ fontSize: '10px', color: '#374151', textAlign: 'center', lineHeight: '1.2' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorPalette.length === 0 && semanticColors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                No theme colors available
              </div>
            )}
          </div>
        )}

        {/* Custom Color Tab */}
        {activeTab === 'custom' && showCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                style={{
                  width: '80px',
                  height: '50px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  placeholder="#000000"
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Enter hex color (e.g., #FF5733)
                </div>
              </div>
            </div>

            {/* Color preview */}
            <div style={{ padding: '16px', borderRadius: '6px', backgroundColor: customColor, border: '1px solid #e5e7eb' }}>
              <div style={{
                textAlign: 'center',
                color: getContrastColor(customColor),
                fontSize: '12px',
                fontWeight: 600,
              }}>
                Preview
              </div>
            </div>
          </div>
        )}

        {/* Selected color info */}
        {normalizedValue.value && (
          <div style={{
            padding: '8px 12px',
            background: '#f9fafb',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            <strong>Selected:</strong> {normalizedValue.type === 'theme' ? normalizedValue.value : `Custom ${normalizedValue.value}`}
          </div>
        )}
      </div>
    </FieldLabel>
  );
}

// Helper function to determine contrast color for text
function getContrastColor(hexColor: string | null | undefined): string {
  if (!hexColor || typeof hexColor !== 'string') return '#000000';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 3 && hex.length !== 6) return '#000000';
  
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substr(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substr(2, 2), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
