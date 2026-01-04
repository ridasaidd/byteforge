import { FieldLabel } from '@measured/puck';
import { DisplayControl, type DisplayValue } from './DisplayControl';
import { ResponsiveWrapper, type ResponsiveValue, generateResponsiveCSS, getBaseValue } from './ResponsiveWrapper';

export type ResponsiveDisplayValue = ResponsiveValue<DisplayValue>;

interface ResponsiveDisplayControlProps {
  field: { label?: string };
  value: ResponsiveDisplayValue | undefined;
  onChange: (value: ResponsiveDisplayValue) => void;
}

export function ResponsiveDisplayControl({ field, value, onChange }: ResponsiveDisplayControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<DisplayValue>
        value={value}
        onChange={onChange}
        renderControl={(currentValue, onValueChange) => (
          <DisplayControl field={{ label: undefined }} value={currentValue || 'block'} onChange={onValueChange} />
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for display property
 */
export function generateDisplayCSS(
  className: string,
  display: ResponsiveDisplayValue | undefined,
): string {
  if (!display) return '';
  return generateResponsiveCSS(className, 'display', display, (val) => val);
}

/**
 * Get the mobile (base) display value
 */
export function getDisplayBaseStyle(display: ResponsiveDisplayValue | undefined): DisplayValue | undefined {
  return getBaseValue(display);
}
