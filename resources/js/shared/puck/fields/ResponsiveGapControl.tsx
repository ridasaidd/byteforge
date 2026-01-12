import { useState } from 'react';
import { FieldLabel } from '@measured/puck';

export interface ResponsiveGapValue {
  mobile: { value: string; unit: 'px' | 'rem' | 'em' };
  tablet?: { value: string; unit: 'px' | 'rem' | 'em' };
  desktop?: { value: string; unit: 'px' | 'rem' | 'em' };
}

interface ResponsiveGapControlProps {
  field: { label?: string };
  value: ResponsiveGapValue | number | undefined; // Support legacy number values
  onChange: (value: ResponsiveGapValue) => void;
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function ResponsiveGapControl({
  field,
  value,
  onChange,
}: ResponsiveGapControlProps) {
  // Normalize value to ResponsiveGapValue format
  const normalizedValue: ResponsiveGapValue = typeof value === 'number'
    ? { mobile: { value: value.toString(), unit: 'px' } }
    : value || { mobile: { value: '16', unit: 'px' } };

  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('mobile');

  const currentValue = normalizedValue[activeBreakpoint] || { value: '16', unit: 'px' };

  const handleValueChange = (newValue: string) => {
    onChange({
      ...normalizedValue,
      [activeBreakpoint]: { ...currentValue, value: newValue },
    });
  };

  const handleUnitChange = (newUnit: 'px' | 'rem' | 'em') => {
    onChange({
      ...normalizedValue,
      [activeBreakpoint]: { ...currentValue, unit: newUnit },
    });
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Breakpoint Switcher */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['mobile', 'tablet', 'desktop'] as const).map((bp) => (
          <button
            key={bp}
            type="button"
            onClick={() => setActiveBreakpoint(bp)}
            style={{
              flex: 1,
              padding: '6px',
              border: activeBreakpoint === bp ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: activeBreakpoint === bp ? 600 : 400,
              backgroundColor: activeBreakpoint === bp ? '#eff6ff' : 'var(--puck-color-white)',
              color: activeBreakpoint === bp ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-05)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {bp}
          </button>
        ))}
      </div>

      {/* Value Input */}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={currentValue.value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="16"
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid var(--puck-color-grey-04)',
          borderRadius: '4px',
          fontSize: '13px',
          backgroundColor: 'var(--puck-color-white)',
        }}
      />

      {/* Unit Toggle Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['px', 'rem', 'em'] as const).map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => handleUnitChange(unit)}
            style={{
              flex: 1,
              padding: '6px',
              border: currentValue.unit === unit ? '2px solid var(--puck-color-azure-04)' : '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: currentValue.unit === unit ? 600 : 400,
              backgroundColor: currentValue.unit === unit ? '#eff6ff' : 'var(--puck-color-white)',
              color: currentValue.unit === unit ? 'var(--puck-color-azure-04)' : 'var(--puck-color-grey-05)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {unit}
          </button>
        ))}
      </div>
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}

/**
 * Generate CSS for responsive gap
 */
export function generateResponsiveGapCSS(className: string, value: ResponsiveGapValue | number | undefined): string {
  if (!value) return '';

  // Handle legacy number values
  if (typeof value === 'number') {
    return `.${className} { gap: ${value}px; }\n`;
  }

  let css = '';

  // Mobile (base)
  if (value.mobile) {
    css += `.${className} { gap: ${value.mobile.value}${value.mobile.unit}; }\n`;
  }

  // Tablet
  if (value.tablet) {
    css += `@media (min-width: 768px) {\n  .${className} { gap: ${value.tablet.value}${value.tablet.unit}; }\n}\n`;
  }

  // Desktop
  if (value.desktop) {
    css += `@media (min-width: 1024px) {\n  .${className} { gap: ${value.desktop.value}${value.desktop.unit}; }\n}\n`;
  }

  return css;
}
