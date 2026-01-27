import { useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { Link, Unlink } from 'lucide-react';
import { ColorPickerControlColorful } from './ColorPickerControlColorful';
import type { ColorPickerValue } from './ColorPickerControl';

export interface BorderSideValue {
  width: string;
  style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  color: ColorPickerValue | string;
}

export interface BorderValue {
  top: BorderSideValue;
  right: BorderSideValue;
  bottom: BorderSideValue;
  left: BorderSideValue;
  unit: 'px' | 'em' | 'rem';
  linked: boolean;
}

const DEFAULT_SIDE: BorderSideValue = { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } };

interface BorderControlProps {
  field: { label?: string };
  value: BorderValue;
  onChange: (value: BorderValue) => void;
}

const borderStyles = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  fontSize: '13px',
};

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '4px',
};

function BorderSideInput({
  label,
  side,
  unit,
  onChange,
}: {
  label: string;
  side: BorderSideValue;
  unit: string;
  onChange: (side: BorderSideValue) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={labelStyle}>{label}</label>

      {/* Width Input */}
      <input
        type="text"
        role="spinbutton"
        aria-valuenow={parseFloat(side.width) || 0}
        aria-valuemin={0}
        aria-valuemax={999}
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={side.width}
        onChange={(e) => onChange({ ...side, width: e.target.value })}
        placeholder="0"
        style={{ ...inputStyle }}
        title={`Width (${unit})`}
      />

      {/* Style Toggle Buttons */}
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {borderStyles.map(({ value: styleValue, label: styleLabel }) => (
          <button
            key={styleValue}
            type="button"
            onClick={() => onChange({ ...side, style: styleValue as BorderSideValue['style'] })}
            title={styleLabel}
            style={{
              flex: '1 1 calc(33.333% - 2px)',
              minWidth: '40px',
              padding: '4px 6px',
              fontSize: '11px',
              fontWeight: side.style === styleValue ? 600 : 400,
              border: side.style === styleValue ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '3px',
              backgroundColor: side.style === styleValue ? '#eff6ff' : 'var(--puck-color-white)',
              color: side.style === styleValue ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {styleLabel}
          </button>
        ))}
      </div>

      {/* Color Picker */}
      <div style={{ marginTop: '4px' }}>
        <ColorPickerControlColorful
          field={{ label: 'Color' }}
          value={side.color}
          onChange={(color) => onChange({ ...side, color })}
          showCustom={true}
        />
      </div>
    </div>
  );
}

export function BorderControl({
  field,
  value = {
    top: DEFAULT_SIDE,
    right: DEFAULT_SIDE,
    bottom: DEFAULT_SIDE,
    left: DEFAULT_SIDE,
    unit: 'px',
    linked: true,
  },
  onChange,
}: BorderControlProps) {
  const [isLinked, setIsLinked] = useState(value.linked ?? true);

  const handleSideChange = (sideName: 'top' | 'right' | 'bottom' | 'left', newSide: BorderSideValue) => {
    if (isLinked) {
      onChange({
        ...value,
        top: newSide,
        right: newSide,
        bottom: newSide,
        left: newSide,
        linked: isLinked,
      });
    } else {
      onChange({
        ...value,
        [sideName]: newSide,
        linked: isLinked,
      });
    }
  };

  const handleUnitChange = (unit: BorderValue['unit']) => {
    onChange({ ...value, unit, linked: isLinked });
  };

  const toggleLinked = () => {
    const newLinked = !isLinked;
    setIsLinked(newLinked);

    if (newLinked) {
      // When linking, use top value for all sides
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

  return (
    <FieldLabel label={field.label || 'Border'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Unit and Link Toggle */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Unit Toggle Buttons */}
        <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
          {['px', 'em', 'rem'].map((unitValue) => (
            <button
              key={unitValue}
              type="button"
              onClick={() => handleUnitChange(unitValue as BorderValue['unit'])}
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

        {/* Link Toggle Button */}
        <button
          type="button"
          onClick={toggleLinked}
          style={{
            padding: '4px 8px',
            border: isLinked ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
            borderRadius: '3px',
            background: isLinked ? '#eff6ff' : 'var(--puck-color-white)',
            color: isLinked ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            minWidth: '32px',
          }}
          title={isLinked ? 'Unlink sides' : 'Link sides'}
        >
          {isLinked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
        </button>
        </div>

        {/* Border Inputs */}
        {isLinked ? (
          <BorderSideInput
            label="All Sides"
            side={value.top}
            unit={value.unit}
            onChange={(side) => handleSideChange('top', side)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <BorderSideInput
              label="Top"
              side={value.top}
              unit={value.unit}
              onChange={(side) => handleSideChange('top', side)}
            />
            <BorderSideInput
              label="Right"
              side={value.right}
              unit={value.unit}
              onChange={(side) => handleSideChange('right', side)}
            />
            <BorderSideInput
              label="Bottom"
              side={value.bottom}
              unit={value.unit}
              onChange={(side) => handleSideChange('bottom', side)}
            />
            <BorderSideInput
              label="Left"
              side={value.left}
              unit={value.unit}
              onChange={(side) => handleSideChange('left', side)}
            />
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
