import { useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { Link, Unlink } from 'lucide-react';

export interface SpacingValue {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: 'px' | 'em' | 'rem' | '%';
  linked: boolean;
}

interface SpacingControlProps {
  field: { label?: string };
  value: SpacingValue;
  onChange: (value: SpacingValue) => void;
  minValue?: number;
  maxValue?: number;
  allowNegative?: boolean;
  useSliders?: boolean;
}

export function SpacingControl({
  field,
  value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: false },
  onChange,
  minValue = 0,
  maxValue = 200,
  allowNegative = true,
  useSliders = false,
}: SpacingControlProps) {
  const [isLinked, setIsLinked] = useState(value.linked || false);

  const handleValueChange = (side: 'top' | 'right' | 'bottom' | 'left', newValue: string) => {
    const trimmedValue = newValue.trim();
    const finalValue = trimmedValue === '' ? '0' : trimmedValue;

    if (isLinked) {
      onChange({
        ...value,
        top: finalValue,
        right: finalValue,
        bottom: finalValue,
        left: finalValue,
        linked: isLinked,
      });
    } else {
      onChange({
        ...value,
        [side]: finalValue,
        linked: isLinked,
      });
    }
  };

  const toggleLinked = () => {
    const newLinked = !isLinked;
    setIsLinked(newLinked);

    if (newLinked) {
      onChange({
        top: value.top,
        right: value.top,
        bottom: value.top,
        left: value.top,
        unit: value.unit,
        linked: newLinked,
      });
    } else {
      onChange({ ...value, linked: newLinked });
    }
  };

  const setAutoValue = (checked: boolean) => {
    if (checked) {
      onChange({ ...value, top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' });
    } else {
      onChange({ ...value, top: '0', right: '0', bottom: '0', left: '0' });
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
    display: 'block' as const,
    fontSize: '12px',
    color: 'var(--puck-color-grey-05)',
    marginBottom: '4px',
  };

  const renderSideInput = (side: 'top' | 'right' | 'bottom' | 'left', label: string) => {
    const sideValue = value[side];
    const isAuto = sideValue === 'auto';

    return (
      <div key={side}>
        <label style={labelStyle}>{label}</label>
        {useSliders ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input
              type="range"
              value={parseFloat(sideValue) || 0}
              onChange={(e) => handleValueChange(side, e.target.value)}
              min={allowNegative ? -maxValue : minValue}
              max={maxValue}
              disabled={isAuto}
              style={{ width: '100%' }}
            />
            <input
              type="text"
              role="spinbutton"
              aria-valuenow={parseFloat(sideValue) || 0}
              aria-valuemin={allowNegative ? -maxValue : minValue}
              aria-valuemax={maxValue}
              value={sideValue}
              onChange={(e) => handleValueChange(side, e.target.value)}
              placeholder="0"
              disabled={isAuto}
              style={{
                ...inputStyle,
                backgroundColor: isAuto ? '#f9fafb' : 'var(--puck-color-white)',
              }}
            />
          </div>
        ) : (
          <input
            type="text"
            role="spinbutton"
            aria-valuenow={parseFloat(sideValue) || 0}
            aria-valuemin={allowNegative ? -maxValue : minValue}
            aria-valuemax={maxValue}
            value={sideValue}
            onChange={(e) => handleValueChange(side, e.target.value)}
            placeholder="0"
            disabled={isAuto}
            style={{
              ...inputStyle,
              backgroundColor: isAuto ? '#f9fafb' : 'var(--puck-color-white)',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <FieldLabel label={field.label || 'Spacing'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Unit Selector */}
        <div>
          <label style={labelStyle}>Unit</label>
          <select
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value as SpacingValue['unit'] })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: 'var(--puck-color-white)',
            }}
          >
            <option value="px">px</option>
            <option value="em">em</option>
            <option value="rem">rem</option>
            <option value="%">%</option>
          </select>
        </div>

        {/* Link Toggle */}
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
          title={isLinked ? 'Unlink values' : 'Link values'}
        >
          {isLinked ? <Link size={14} /> : <Unlink size={14} />}
          {isLinked ? 'Linked' : 'Unlinked'}
        </button>

        {/* Linked Mode - All Sides */}
        {isLinked && (
          renderSideInput('top', 'All Sides')
        )}

        {/* Individual Sides - Grid Layout */}
        {!isLinked && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {renderSideInput('top', 'Top')}
            {renderSideInput('right', 'Right')}
            {renderSideInput('bottom', 'Bottom')}
            {renderSideInput('left', 'Left')}
          </div>
        )}

        {/* Auto Checkbox (only for margin) */}
        {allowNegative && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--puck-color-grey-05)' }}>
            <input
              type="checkbox"
              checked={value.top === 'auto'}
              onChange={(e) => setAutoValue(e.target.checked)}
            />
            <span>Auto</span>
          </label>
        )}
      </div>
    </FieldLabel>
  );
}
