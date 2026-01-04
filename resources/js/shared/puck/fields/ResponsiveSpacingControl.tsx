import { FieldLabel } from '@measured/puck';
import { SpacingControl, SpacingValue } from './SpacingControl';
import { ResponsiveWrapper, ResponsiveValue, generateResponsiveCSS } from './ResponsiveWrapper';

export type ResponsiveSpacingValue = ResponsiveValue<SpacingValue>;

interface ResponsiveSpacingControlProps {
  field: { label?: string };
  value: ResponsiveSpacingValue | undefined;
  onChange: (value: ResponsiveSpacingValue) => void;
  allowNegative?: boolean;
  useSliders?: boolean;
  maxValue?: number;
}

const defaultSpacingValue: SpacingValue = {
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
  unit: 'px',
  linked: true,
};

/**
 * Responsive-aware spacing control
 * Automatically detects current viewport and saves values per breakpoint
 */
export function ResponsiveSpacingControl({
  field,
  value,
  onChange,
  allowNegative = true,
  useSliders = false,
  maxValue = 200,
}: ResponsiveSpacingControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<SpacingValue>
        value={value}
        onChange={onChange}
        defaultValue={defaultSpacingValue}
        renderControl={(currentValue, onValueChange) => (
          <SpacingControl
            field={{ label: undefined }}
            value={currentValue || defaultSpacingValue}
            onChange={onValueChange}
            allowNegative={allowNegative}
            useSliders={useSliders}
            maxValue={maxValue}
          />
        )}
      />
    </div>
  );
}

/** Helper to format spacing value to CSS string */
const formatSpacingValue = (spacing: SpacingValue): string => {
  // Guard against undefined values
  if (!spacing || spacing.top === undefined || spacing.right === undefined ||
      spacing.bottom === undefined || spacing.left === undefined) {
    return '';
  }

  // Helper to format individual side value
  const formatSide = (value: string, unit: string): string => {
    // Don't append unit to 'auto' keyword
    if (value === 'auto' || value.toLowerCase() === 'auto') {
      return 'auto';
    }
    return `${value}${unit}`;
  };

  return `${formatSide(spacing.top, spacing.unit)} ${formatSide(spacing.right, spacing.unit)} ${formatSide(spacing.bottom, spacing.unit)} ${formatSide(spacing.left, spacing.unit)}`;
};

/**
 * Generate responsive CSS for padding
 */
export function generatePaddingCSS(
  className: string,
  value: ResponsiveSpacingValue | undefined
): string {
  if (!value) return '';
  return generateResponsiveCSS(className, 'padding', value, formatSpacingValue);
}

/**
 * Generate responsive CSS for margin
 */
export function generateMarginCSS(
  className: string,
  value: ResponsiveSpacingValue | undefined
): string {
  if (!value) return '';
  return generateResponsiveCSS(className, 'margin', value, formatSpacingValue);
}
