import { useState } from 'react';
import { FieldLabel } from '@measured/puck';
import { Link, Unlink } from 'lucide-react';

export interface BorderSideValue {
  width: string;
  style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
}

export interface BorderValue {
  top: BorderSideValue;
  right: BorderSideValue;
  bottom: BorderSideValue;
  left: BorderSideValue;
  unit: 'px' | 'em' | 'rem';
  linked: boolean;
}

const DEFAULT_SIDE: BorderSideValue = { width: '0', style: 'none', color: '#e5e7eb' };

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
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Width */}
        <input
          type="number"
          value={side.width}
          onChange={(e) => onChange({ ...side, width: e.target.value })}
          min="0"
          style={{ ...inputStyle, width: '50px' }}
          title={`Width (${unit})`}
        />
        {/* Style */}
        <select
          value={side.style}
          onChange={(e) => onChange({ ...side, style: e.target.value as BorderSideValue['style'] })}
          style={{ ...inputStyle, flex: 1 }}
        >
          {borderStyles.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {/* Color */}
        <input
          type="color"
          value={side.color}
          onChange={(e) => onChange({ ...side, color: e.target.value })}
          style={{
            width: '32px',
            height: '32px',
            padding: '2px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Border color"
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
        {/* Unit Selector and Link Toggle */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={value.unit}
            onChange={(e) => handleUnitChange(e.target.value as BorderValue['unit'])}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="px">px</option>
            <option value="em">em</option>
            <option value="rem">rem</option>
          </select>

          <button
            type="button"
            onClick={toggleLinked}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: isLinked ? '#2563eb' : 'white',
              color: isLinked ? 'white' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
