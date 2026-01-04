/**
 * ResponsiveGridColumnsControl
 * Responsive control for grid-template-columns (repeat N columns)
 */
import { FieldLabel } from '@measured/puck';
import { ResponsiveWrapper, type ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveGridColumnsValue = ResponsiveValue<number>;

interface ResponsiveGridColumnsControlProps {
  field: { label?: string };
  value: ResponsiveGridColumnsValue | undefined;
  onChange: (value: ResponsiveGridColumnsValue) => void;
}

export function ResponsiveGridColumnsControl({ field, value, onChange }: ResponsiveGridColumnsControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<number>
        value={value}
        onChange={onChange}
        defaultValue={2}
        renderControl={(currentValue, onValueChange) => (
          <input
            type="number"
            min={1}
            max={12}
            value={currentValue ?? 2}
            onChange={(e) => onValueChange(Math.max(1, Math.min(12, parseInt(e.target.value || '1', 10))))}
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

export function generateGridColumnsCSS(className: string, value: ResponsiveGridColumnsValue | undefined): string {
  if (!value) return '';
  return generateResponsiveCSS(className, 'grid-template-columns', value, (val) => `repeat(${val}, 1fr)`);
}
