import { useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { Link, Unlink } from 'lucide-react';
import { useTheme } from '@/shared/hooks';

export interface BorderRadiusValue {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
  unit: 'px' | 'em' | 'rem' | '%';
  linked: boolean;
  useSliders?: boolean;
}

interface BorderRadiusControlProps {
  field: { label?: string };
  value: BorderRadiusValue;
  onChange: (value: BorderRadiusValue) => void;
}

const defaultValue: BorderRadiusValue = {
  topLeft: '0',
  topRight: '0',
  bottomRight: '0',
  bottomLeft: '0',
  unit: 'px',
  linked: true,
};

export function BorderRadiusControl({
  field,
  value = defaultValue,
  onChange,
}: BorderRadiusControlProps) {
  const [isLinked, setIsLinked] = useState(value.linked ?? true);
  const useSliders = value.useSliders ?? true;
  const { theme } = useTheme();

  // Get theme borderRadius presets
  const borderRadiusPresets = theme?.theme_data?.borderRadius || { base: '0.25rem', full: '9999px' };

  const handleValueChange = (corner: keyof Pick<BorderRadiusValue, 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'>, newValue: string) => {
    if (isLinked) {
      onChange({
        ...value,
        topLeft: newValue,
        topRight: newValue,
        bottomRight: newValue,
        bottomLeft: newValue,
        linked: isLinked,
        useSliders,
      });
    } else {
      onChange({
        ...value,
        [corner]: newValue,
        linked: isLinked,
        useSliders,
      });
    }
  };

  const handleSliderChange = (newValue: string) => {
    onChange({
      ...value,
      topLeft: newValue,
      topRight: newValue,
      bottomRight: newValue,
      bottomLeft: newValue,
      linked: isLinked,
      useSliders,
    });
  };

  const toggleLinked = () => {
    const newLinked = !isLinked;
    setIsLinked(newLinked);

    // When linking, set all corners to the topLeft value
    if (newLinked) {
      onChange({
        ...value,
        topRight: value.topLeft,
        bottomRight: value.topLeft,
        bottomLeft: value.topLeft,
        linked: newLinked,
        useSliders,
      });
    } else {
      onChange({ ...value, linked: newLinked, useSliders });
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid var(--puck-color-grey-04)',
    borderRadius: '4px',
    fontSize: '13px',
    backgroundColor: 'var(--puck-color-white)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--puck-color-grey-05)',
    marginBottom: '4px',
  };

  // Calculate the average for slider display when not linked
  const sliderValue = isLinked
    ? value.topLeft
    : Math.round(
        (parseFloat(value.topLeft || '0') +
          parseFloat(value.topRight || '0') +
          parseFloat(value.bottomRight || '0') +
          parseFloat(value.bottomLeft || '0')) /
          4
      ).toString();

  return (
    <FieldLabel label={field.label || 'Border Radius'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Linked mode - single control */}
        {isLinked && (
          <div>
            <label style={labelStyle}>All Corners</label>
            {useSliders ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="range"
                  value={parseFloat(value.topLeft) || 0}
                  onChange={(e) => handleSliderChange(e.target.value)}
                  min="0"
                  max="100"
                  style={{ width: '100%' }}
                />
                <input
                  type="text"
                  value={value.topLeft}
                  onChange={(e) => handleValueChange('topLeft', e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
            ) : (
              <input
                type="text"
                value={value.topLeft}
                onChange={(e) => handleValueChange('topLeft', e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            )}
          </div>
        )}

        {/* Link toggle button */}
        <button
          type="button"
          onClick={toggleLinked}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            backgroundColor: isLinked ? 'var(--puck-color-azure-04)' : 'var(--puck-color-white)',
            cursor: 'pointer',
            fontSize: '12px',
            color: isLinked ? 'var(--puck-color-white)' : 'var(--puck-color-grey-05)',
          }}
        >
          {isLinked ? <Link size={14} /> : <Unlink size={14} />}
          {isLinked ? 'Linked' : 'Unlinked'}
        </button>

        {/* Theme Border Radius Presets */}
        {borderRadiusPresets && Object.keys(borderRadiusPresets).length > 0 && (
          <div>
            <label style={{ ...labelStyle, marginBottom: '6px' }}>Theme Presets</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '6px' }}>
              {Object.entries(borderRadiusPresets).map(([key, presetValue]) => {
                const isActive = isLinked && value.topLeft === presetValue;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange({
                        ...value,
                        topLeft: presetValue as string,
                        topRight: presetValue as string,
                        bottomRight: presetValue as string,
                        bottomLeft: presetValue as string,
                        linked: isLinked,
                        useSliders,
                      });
                    }}
                    style={{
                      padding: '8px',
                      border: `2px solid ${isActive ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-04)'}`,
                      borderRadius: presetValue as string,
                      backgroundColor: isActive ? 'var(--puck-color-azure-01)' : 'var(--puck-color-white)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'center',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-05)',
                    }}
                    title={`${key}: ${presetValue}`}
                  >
                    <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'capitalize' }}>{key}</div>
                    <div style={{ fontSize: '9px', marginTop: '2px' }}>{presetValue}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual corners grid - only show when unlinked */}
        {!isLinked && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Top Left</label>
              {useSliders ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="range"
                    value={parseFloat(value.topLeft) || 0}
                    onChange={(e) => handleValueChange('topLeft', e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={value.topLeft}
                    onChange={(e) => handleValueChange('topLeft', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={value.topLeft}
                  onChange={(e) => handleValueChange('topLeft', e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Top Right</label>
              {useSliders ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="range"
                    value={parseFloat(value.topRight) || 0}
                    onChange={(e) => handleValueChange('topRight', e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={value.topRight}
                    onChange={(e) => handleValueChange('topRight', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={value.topRight}
                  onChange={(e) => handleValueChange('topRight', e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Bottom Left</label>
              {useSliders ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="range"
                    value={parseFloat(value.bottomLeft) || 0}
                    onChange={(e) => handleValueChange('bottomLeft', e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={value.bottomLeft}
                    onChange={(e) => handleValueChange('bottomLeft', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={value.bottomLeft}
                  onChange={(e) => handleValueChange('bottomLeft', e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Bottom Right</label>
              {useSliders ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="range"
                    value={parseFloat(value.bottomRight) || 0}
                    onChange={(e) => handleValueChange('bottomRight', e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={value.bottomRight}
                    onChange={(e) => handleValueChange('bottomRight', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={value.bottomRight}
                  onChange={(e) => handleValueChange('bottomRight', e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              )}
            </div>
          </div>
        )}

        {/* Unit Toggle Buttons */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {['px', 'em', 'rem', '%'].map((unitValue) => (
            <button
              key={unitValue}
              type="button"
              onClick={() => onChange({ ...value, unit: unitValue as BorderRadiusValue['unit'], useSliders })}
              aria-label={unitValue}
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '11px',
                fontWeight: value.unit === unitValue ? 600 : 400,
                border: value.unit === unitValue ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
                borderRadius: '3px',
                backgroundColor: value.unit === unitValue ? '#eff6ff' : 'var(--puck-color-white)',
                color: value.unit === unitValue ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {unitValue}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div
          style={{
            width: '100%',
            height: '60px',
            border: '2px solid var(--puck-color-grey-04)',
            borderRadius: `${value.topLeft}${value.unit} ${value.topRight}${value.unit} ${value.bottomRight}${value.unit} ${value.bottomLeft}${value.unit}`,
            backgroundColor: 'var(--puck-color-grey-02)',
          }}
        />
      </div>
    </FieldLabel>
  );
}
