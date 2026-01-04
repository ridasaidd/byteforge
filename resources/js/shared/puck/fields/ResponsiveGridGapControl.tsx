/**
 * ResponsiveGridGapControl
 * Responsive control for CSS grid gap (px)
 */
import { FieldLabel } from '@measured/puck';
import { ResponsiveWrapper, type ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveGridGapValue = ResponsiveValue<number>;

interface ResponsiveGridGapControlProps {
  field: { label?: string };
  value: ResponsiveGridGapValue | undefined;
  onChange: (value: ResponsiveGridGapValue) => void;
}

export function ResponsiveGridGapControl({ field, value, onChange }: ResponsiveGridGapControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<number>
        value={value}
        onChange={onChange}
        defaultValue={16}
        renderControl={(currentValue, onValueChange) => (
          <input
            type="number"
            min={0}
            max={200}
            value={currentValue ?? 16}
            onChange={(e) => onValueChange(Math.max(0, Math.min(200, parseInt(e.target.value || '0', 10))))}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: 'var(--puck-color-white)',
            }}
          />
        )}
      />
    </div>
  );
}

export function generateGridGapCSS(className: string, value: ResponsiveGridGapValue | undefined): string {
  if (!value) return '';
  return generateResponsiveCSS(className, 'gap', value, (val) => `${val}px`);
}
