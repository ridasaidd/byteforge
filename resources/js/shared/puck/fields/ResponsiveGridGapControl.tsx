/**
 * ResponsiveGridGapControl
 * Responsive control for CSS grid gap with unit support (px, rem, em)
 */
import { FieldLabel } from '@measured/puck';
import { GapControl, GapValue } from './GapControl';
import { ResponsiveWrapper, type ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveGridGapValue = ResponsiveValue<GapValue>;

interface ResponsiveGridGapControlProps {
  field: { label?: string };
  value: ResponsiveGridGapValue | undefined;
  onChange: (value: ResponsiveGridGapValue) => void;
}

export function ResponsiveGridGapControl({ field, value, onChange }: ResponsiveGridGapControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<GapValue>
        value={value}
        onChange={onChange}
        defaultValue={{ value: '16', unit: 'px' }}
        renderControl={(currentValue, onValueChange) => (
          <GapControl
            field={{ label: undefined }}
            value={currentValue}
            onChange={onValueChange}
          />
        )}
      />
    </div>
  );
}

export function generateGridGapCSS(className: string, value: ResponsiveGridGapValue | undefined): string {
  if (!value) return '';
  return generateResponsiveCSS(className, 'gap', value, (val) => {
    if (!val || !val.value) return '16px';
    return `${val.value}${val.unit}`;
  });
}
