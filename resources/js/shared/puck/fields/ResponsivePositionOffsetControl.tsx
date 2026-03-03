import { FieldLabel } from '@puckeditor/core';
import { PositionOffsetControl, PositionOffsetValue } from './PositionOffsetControl';
import {
  ResponsiveWrapper,
  ResponsiveValue,
  Breakpoint,
  BREAKPOINTS,
  isResponsiveValue,
  ResponsiveObject,
} from './ResponsiveWrapper';

export type ResponsivePositionOffsetValue = ResponsiveValue<PositionOffsetValue>;

interface ResponsivePositionOffsetControlProps {
  field: { label?: string };
  value: ResponsivePositionOffsetValue | undefined;
  onChange: (value: ResponsivePositionOffsetValue) => void;
}

const defaultPositionOffsetValue: PositionOffsetValue = {
  top: '',
  right: '',
  bottom: '',
  left: '',
  unit: 'px',
  linked: false,
};

/**
 * Responsive-aware position offset control
 */
export function ResponsivePositionOffsetControl({
  field,
  value,
  onChange,
}: ResponsivePositionOffsetControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<PositionOffsetValue>
        value={value}
        onChange={onChange}
        defaultValue={defaultPositionOffsetValue}
        renderControl={(currentValue, onValueChange) => (
          <PositionOffsetControl
            field={{ label: undefined }}
            value={currentValue || defaultPositionOffsetValue}
            onChange={onValueChange}
          />
        )}
      />
    </div>
  );
}


/**
 * Generate responsive CSS for position offsets
 */
export function generatePositionOffsetCSS(
  className: string,
  value: ResponsivePositionOffsetValue | undefined
): string {
  if (!value) return '';

  const responsiveValue: ResponsiveObject<PositionOffsetValue> = isResponsiveValue<PositionOffsetValue>(value)
    ? value
    : { mobile: value };

  const breakpoints: Breakpoint[] = ['mobile', 'tablet', 'desktop'];
  const mediaQueries: Record<Breakpoint, string> = {
    mobile: '',
    tablet: `@media (min-width: ${BREAKPOINTS.tablet}px)`,
    desktop: `@media (min-width: ${BREAKPOINTS.desktop}px)`,
  };

  let css = '';

  breakpoints.forEach((bp) => {
    const data = responsiveValue[bp];
    if (!data) return;

    const topRaw = data.top?.trim() || '';
    const rightRaw = data.right?.trim() || '';
    const bottomRaw = data.bottom?.trim() || '';
    const leftRaw = data.left?.trim() || '';

    const isNoOpOffset =
      data.unit === 'auto'
      || (topRaw === '' || topRaw === 'auto')
      && (rightRaw === '' || rightRaw === 'auto')
      && (bottomRaw === '' || bottomRaw === 'auto')
      && (leftRaw === '' || leftRaw === 'auto');

    if (isNoOpOffset) {
      return;
    }

    // Helper to format value
    const fmt = (val: string | undefined, unit: string) => {
      if (val === undefined || val === '') return null;
      if (unit === 'auto' || val === 'auto') return 'auto';
      return `${val}${unit}`;
    };

    let rules = '';
    // If unit is auto, all set sides are auto? Or unit selector applies to entered numbers.
    // If unit is 'auto', we treat it as value 'auto' for all sides?
    // In the control, if unit is auto, we disabled inputs. So yes.

    if (data.unit === 'auto') {
        // If linked, all auto? If specific side set?
        // Adapting behavior: if unit is auto, emit auto for linked sides?
        // Simpler: Just rely on fmt.
        // Wait, if input is disabled and empty, fmt returns null.
        // Let's assume if unit='auto', we want 'auto' for sides that are relevant.
        // But preventing 'explicit unset' vs 'set to auto' is hard if input is empty.
        // Let's assume user enters nothing -> unset. User enters 'auto' -> auto?
        // The unit selector having 'auto' implies setting the unit.
        // Let's check typical usage: "width: auto".
        // Here we have 4 props.
        // If unit='auto', maybe we treat it as "auto" for any non-empty side?
        // Or if inputs are disabled, maybe we assume ALL sides are auto?
        // No, that overrides unsets.

        // REVISIT CONTROL: If unit is 'auto', inputs are disabled.
        // Either we set value to 'auto' in onChange, or handle it here.
        // Let's assume if unit is 'auto', we output 'auto' for sides that were previously set?
        // Actually, 'auto' as a unit usually means the value is 'auto'.

        if (topRaw) rules += `top: auto; `;
        if (rightRaw) rules += `right: auto; `;
        if (bottomRaw) rules += `bottom: auto; `;
        if (leftRaw) rules += `left: auto; `;
    } else {
        const top = fmt(topRaw, data.unit);
        const right = fmt(rightRaw, data.unit);
        const bottom = fmt(bottomRaw, data.unit);
        const left = fmt(leftRaw, data.unit);

        if (top) rules += `top: ${top}; `;
        if (right) rules += `right: ${right}; `;
        if (bottom) rules += `bottom: ${bottom}; `;
        if (left) rules += `left: ${left}; `;
    }

    if (rules) {
      if (bp === 'mobile') {
        css += `.${className} { ${rules} } `;
      } else {
        css += `${mediaQueries[bp]} { .${className} { ${rules} } } `;
      }
    }
  });

  return css;
}
