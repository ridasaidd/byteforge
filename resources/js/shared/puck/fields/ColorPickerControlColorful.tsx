import { FieldLabel } from '@measured/puck';
import { RgbaColorPicker } from 'react-colorful';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '@/shared/hooks';
import type { ColorPickerValue } from './ColorPickerControl';
import type { RgbaColor } from 'react-colorful';

interface ColorPickerControlColorfulProps {
  field: { label?: string };
  value: ColorPickerValue | string;
  onChange: (value: ColorPickerValue) => void;
  showCustom?: boolean;
}

export function ColorPickerControlColorful({
  field,
  value,
  onChange,
  showCustom = true,
}: ColorPickerControlColorfulProps) {
  const { theme } = useTheme();

  // Track if user is actively dragging/interacting with the picker
  const isInteractingRef = useRef(false);
  // Track the last value we set ourselves to detect external changes
  const lastSetValueRef = useRef<string | null>(null);

  // Normalize incoming value
  const normalizedValue: ColorPickerValue = typeof value === 'string'
    ? { type: value.startsWith('#') ? 'custom' : 'theme', value }
    : value || { type: 'custom', value: '#000000' };

  const themeColorValue = normalizedValue.type === 'theme' && normalizedValue.value
    ? resolveThemeColor(theme?.theme_data, normalizedValue.value)
    : undefined;

  const initialColor = normalizedValue.type === 'custom' && normalizedValue.value
    ? normalizedValue.value
    : themeColorValue || '#000000';

  const [customColor, setCustomColor] = useState(initialColor);
  const [rgbaColor, setRgbaColor] = useState(() => toRgba(initialColor));

  // Sync state when value prop changes from EXTERNAL source only
  // Skip sync when:
  // 1. User is actively interacting with the picker
  // 2. The incoming value matches what we last set (our own update coming back)
  useEffect(() => {
    if (isInteractingRef.current) return;

    const currentColor = normalizedValue.type === 'custom' && normalizedValue.value
      ? normalizedValue.value
      : themeColorValue || '#000000';

    // Skip if this is our own value coming back from parent
    if (lastSetValueRef.current === currentColor) return;

    setCustomColor(currentColor);
    setRgbaColor(toRgba(currentColor));
  }, [normalizedValue.type, normalizedValue.value, themeColorValue]);

  const colorPalette = useMemo(() => {
    if (!theme?.theme_data?.colors) return [];
    const colors: Array<{ label: string; token: string; value: string }> = [];

    const processColorObject = (obj: Record<string, unknown>, prefix: string = 'colors') => {
      Object.entries(obj).forEach(([key, val]) => {
        const token = `${prefix}.${key}`;

        if (typeof val === 'string') {
          colors.push({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            token,
            value: val,
          });
        } else if (typeof val === 'object' && val !== null) {
          Object.entries(val as Record<string, unknown>).forEach(([shade, color]) => {
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

  const handleThemeColorSelect = (token: string, swatchValue: string) => {
    lastSetValueRef.current = swatchValue;
    setCustomColor(swatchValue);
    setRgbaColor(toRgba(swatchValue));
    onChange({ type: 'theme', value: token });
  };

  const handleCustomColorChange = (color: string) => {
    lastSetValueRef.current = color;
    setCustomColor(color);
    setRgbaColor(toRgba(color));
    onChange({ type: 'custom', value: color });
  };

  const handleCustomRgbaChange = (rgba: RgbaColor) => {
    isInteractingRef.current = true;
    setRgbaColor(rgba);
    const rgbaString = toRgbaString(rgba);
    lastSetValueRef.current = rgbaString;
    setCustomColor(rgbaString);
    onChange({ type: 'custom', value: rgbaString });
  };

  // Clear interaction flag when pointer/mouse is released
  const handleInteractionEnd = () => {
    // Small delay to let the final onChange propagate before re-enabling sync
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 50);
  };

  return (
    <FieldLabel label={field.label || 'Color'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Custom color picker FIRST - most commonly used */}
        {showCustom && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            onPointerUp={handleInteractionEnd}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
          >
            <RgbaColorPicker
              color={rgbaColor}
              onChange={handleCustomRgbaChange}
              style={{ width: '100%', height: '100%', minHeight: '200px' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#000000"
                style={{
                  width: '120px',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', fontSize: '12px' }}>
                {customColor}
              </div>
            </div>
          </div>
        )}

        {/* Theme color swatches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeColorSelect(token, value);
                    }}
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
                Theme Colors
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px' }}>
                {colorPalette.map(({ label, token, value }) => (
                  <button
                    key={token}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeColorSelect(token, value);
                    }}
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

function resolveThemeColor(themeData: unknown, token: string): string | undefined {
  if (!themeData || typeof themeData !== 'object') return undefined;
  const parts = token.split('.');
  let current: unknown = (themeData as Record<string, unknown>);

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function toRgba(value: string): RgbaColor {
  const hexMatch = value && value.startsWith('#');
  if (hexMatch) {
    const hex = value.replace('#', '');
    const hexLength = hex.length === 3 ? 1 : 2;
    const parse = (start: number) => parseInt(hex.slice(start, start + hexLength).padEnd(2, hex[start] ?? ''), 16);
    const r = parse(0);
    const g = parse(hexLength);
    const b = parse(hexLength * 2);
    return { r, g, b, a: 1 };
  }

  const rgbaRegex = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\)/i;
  const match = value?.match(rgbaRegex);
  if (match) {
    const [, r, g, b, a] = match;
    return {
      r: clampChannel(Number(r)),
      g: clampChannel(Number(g)),
      b: clampChannel(Number(b)),
      a: typeof a === 'string' ? clampAlpha(Number(a)) : 1,
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

function toRgbaString({ r, g, b, a }: RgbaColor): string {
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${clampAlpha(a)})`;
}

function clampChannel(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}
