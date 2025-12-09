import { useState } from 'react';
import { FieldLabel } from '@measured/puck';
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
  allowNegative?: boolean;
}

export function SpacingControl({
  field,
  value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: false },
  onChange,
  minValue = 0,
  allowNegative = true,
}: SpacingControlProps) {
  const [isLinked, setIsLinked] = useState(value.linked || false);

  const handleValueChange = (side: 'top' | 'right' | 'bottom' | 'left', newValue: string) => {
    // Allow "auto" as a valid value
    if (newValue === 'auto' || newValue === '') {
      const finalValue = newValue === '' ? '0' : 'auto';

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
      return;
    }

    const numValue = parseFloat(newValue) || 0;
    const clampedValue = allowNegative ? numValue : Math.max(minValue, numValue);
    const finalValue = clampedValue.toString();

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

  const handleUnitChange = (unit: SpacingValue['unit']) => {
    onChange({ ...value, unit, linked: isLinked });
  };

  const toggleLinked = () => {
    const newLinked = !isLinked;
    setIsLinked(newLinked);

    if (newLinked) {
      // When linking, use the top value for all sides
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
    <FieldLabel label={field.label || 'Spacing'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Unit Selector and Link Toggle */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={value.unit}
            onChange={(e) => handleUnitChange(e.target.value as SpacingValue['unit'])}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <option value="px">px</option>
            <option value="em">em</option>
            <option value="rem">rem</option>
            <option value="%">%</option>
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
            title={isLinked ? 'Unlink values' : 'Link values'}
          >
            {isLinked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
          </button>
        </div>

        {/* Spacing Inputs */}
        {isLinked ? (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              All Sides
            </label>
            <input
              type="text"
              value={value.top}
              onChange={(e) => handleValueChange('top', e.target.value)}
              placeholder="0 or auto"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Top
              </label>
              <input
                type="text"
                value={value.top}
                onChange={(e) => handleValueChange('top', e.target.value)}
                placeholder="0 or auto"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Right
              </label>
              <input
                type="text"
                value={value.right}
                onChange={(e) => handleValueChange('right', e.target.value)}
                placeholder="0 or auto"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Bottom
              </label>
              <input
                type="text"
                value={value.bottom}
                onChange={(e) => handleValueChange('bottom', e.target.value)}
                placeholder="0 or auto"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Left
              </label>
              <input
                type="text"
                value={value.left}
                onChange={(e) => handleValueChange('left', e.target.value)}
                placeholder="0 or auto"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
