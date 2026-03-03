import { FieldLabel } from '@puckeditor/core';
import { TransformControl, TransformValue } from './TransformControl';
import {
  ResponsiveWrapper,
  ResponsiveValue,
  Breakpoint,
  BREAKPOINTS,
  isResponsiveValue,
  ResponsiveObject,
} from './ResponsiveWrapper';

export type ResponsiveTransformValue = ResponsiveValue<TransformValue>;

interface ResponsiveTransformControlProps {
  field: { label?: string };
  value: ResponsiveTransformValue | undefined;
  onChange: (value: ResponsiveTransformValue) => void;
}

const defaultTransformValue: TransformValue = {};

export function ResponsiveTransformControl({
  field,
  value,
  onChange,
}: ResponsiveTransformControlProps) {
  return (
    <div>
      {field.label && <FieldLabel label={field.label} />}
      <ResponsiveWrapper<TransformValue>
        value={value}
        onChange={onChange}
        defaultValue={defaultTransformValue}
        renderControl={(currentValue, onValueChange) => (
          <TransformControl
            field={{ label: undefined }}
            value={currentValue || defaultTransformValue}
            onChange={onValueChange}
          />
        )}
      />
    </div>
  );
}

/**
 * Generate responsive CSS for transform
 */
export function generateTransformCSS(
  className: string,
  value: ResponsiveTransformValue | undefined
): string {
  if (!value) return '';

  const responsiveValue: ResponsiveObject<TransformValue> = isResponsiveValue<TransformValue>(value)
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

    const translateX = data.translateX?.trim() || '';
    const translateY = data.translateY?.trim() || '';
    const scale = data.scale?.trim() || '';
    const rotate = data.rotate?.trim() || '';

    const isIdentityTransform =
      (translateX === '' || translateX === '0')
      && (translateY === '' || translateY === '0')
      && (scale === '' || scale === '1')
      && (rotate === '' || rotate === '0');

    if (isIdentityTransform) {
      return;
    }

    const parts = [];

    if (translateX && translateX !== '0') {
      parts.push(`translateX(${translateX}${data.translateXUnit || 'px'})`);
    }
    if (translateY && translateY !== '0') {
      parts.push(`translateY(${translateY}${data.translateYUnit || 'px'})`);
    }
    if (scale && scale !== '1') {
      parts.push(`scale(${scale})`);
    }
    if (rotate && rotate !== '0') {
      parts.push(`rotate(${rotate}deg)`);
    }

    if (parts.length > 0) {
      const rule = `transform: ${parts.join(' ')};`;
      if (bp === 'mobile') {
        css += `.${className} { ${rule} } `;
      } else {
        css += `${mediaQueries[bp]} { .${className} { ${rule} } } `;
      }
    }
  });

  return css;
}
