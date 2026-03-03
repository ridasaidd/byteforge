import { useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { Link, Unlink } from 'lucide-react';

export interface PositionOffsetValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  unit: 'px' | 'rem' | 'em' | '%' | 'auto';
  linked: boolean;
}

interface PositionOffsetControlProps {
  field: { label?: string };
  value: PositionOffsetValue;
  onChange: (value: PositionOffsetValue) => void;
}

export function PositionOffsetControl({
  field,
  value = { top: '', right: '', bottom: '', left: '', unit: 'px', linked: false },
  onChange,
}: PositionOffsetControlProps) {
  const [isLinked, setIsLinked] = useState(value.linked || false);

  const handleValueChange = (side: 'top' | 'right' | 'bottom' | 'left', newValue: string) => {
    // Preserve empty string as unset
    const finalValue = newValue;

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
      // Sync all to top value when linking
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
    const sideValue = value[side] || '';
    const isAuto = value.unit === 'auto';

    // For 'auto' unit, inputs are disabled or hidden?
    // Usually 'auto' is a value, not just a unit.
    // If unit is 'auto', value is irrelevant or implicitly 'auto'.
    // Let's assume if unit is 'auto', we disable input.

    return (
      <div key={side}>
        <label style={labelStyle}>{label}</label>
        <input
          type="text"
          value={sideValue}
          onChange={(e) => handleValueChange(side, e.target.value)}
          placeholder="auto"
          disabled={isAuto}
          style={{
            ...inputStyle,
            backgroundColor: isAuto ? '#f9fafb' : 'var(--puck-color-white)',
          }}
        />
      </div>
    );
  };

  return (
    <FieldLabel label={field.label || 'Position Offsets'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Unit Selector */}
        <div>
          <label style={labelStyle}>Unit</label>
          <select
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value as PositionOffsetValue['unit'] })}
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
            <option value="rem">rem</option>
            <option value="em">em</option>
            <option value="%">%</option>
            <option value="auto">auto</option>
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

        {/* Input Fields */}
        {value.unit !== 'auto' && (
          isLinked ? (
            renderSideInput('top', 'All Sides')
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {renderSideInput('top', 'Top')}
              {renderSideInput('right', 'Right')}
              {renderSideInput('bottom', 'Bottom')}
              {renderSideInput('left', 'Left')}
            </div>
          )
        )}
      </div>
    </FieldLabel>
  );
}
