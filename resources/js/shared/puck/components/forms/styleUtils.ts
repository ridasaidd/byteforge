import { createElement } from 'react';
import {
  BorderRadiusControl,
  type BorderRadiusValue,
  type BorderSideValue,
  type BorderValue,
  type ColorValue,
} from '../../fields';

function cloneBorderSide(side: BorderSideValue): BorderSideValue {
  return {
    width: side.width,
    style: side.style,
    color: typeof side.color === 'string' ? side.color : { ...side.color },
  };
}

export function createUniformBorder(
  color: ColorValue,
  width = '1',
  style: BorderSideValue['style'] = 'solid',
  unit: BorderValue['unit'] = 'px'
): BorderValue {
  const side: BorderSideValue = { width, style, color };

  return {
    top: cloneBorderSide(side),
    right: cloneBorderSide(side),
    bottom: cloneBorderSide(side),
    left: cloneBorderSide(side),
    unit,
    linked: true,
  };
}

export function normalizeLegacyBorderValue(
  border: BorderValue | undefined,
  legacyColor: ColorValue | string | undefined,
  fallbackColor: ColorValue,
  width = '1',
  style: BorderSideValue['style'] = 'solid'
): BorderValue {
  if (border) {
    return {
      ...border,
      top: cloneBorderSide(border.top),
      right: cloneBorderSide(border.right),
      bottom: cloneBorderSide(border.bottom),
      left: cloneBorderSide(border.left),
    };
  }

  const normalizedColor = typeof legacyColor === 'string'
    ? { type: 'custom' as const, value: legacyColor }
    : legacyColor;

  return createUniformBorder(normalizedColor ?? fallbackColor, width, style);
}

export function createUniformBorderRadius(
  value: string,
  unit: BorderRadiusValue['unit'] = 'px'
): BorderRadiusValue {
  return {
    topLeft: value,
    topRight: value,
    bottomRight: value,
    bottomLeft: value,
    unit,
    linked: true,
  };
}

export function normalizeLegacyBorderRadiusValue(
  borderRadius: BorderRadiusValue | string | undefined,
  fallbackValue = '0',
  unit: BorderRadiusValue['unit'] = 'px'
): BorderRadiusValue {
  if (borderRadius && typeof borderRadius !== 'string') {
    return { ...borderRadius };
  }

  const normalizedValue = String(borderRadius ?? fallbackValue).replace(/[a-z%]+$/i, '') || fallbackValue;
  return createUniformBorderRadius(normalizedValue, unit);
}

export function createLegacyBorderRadiusField(label: string, fallback: BorderRadiusValue) {
  return {
    type: 'custom' as const,
    label,
    render: ({
      field,
      value,
      onChange,
    }: {
      field: { label?: string };
      value?: BorderRadiusValue | string;
      onChange: (value: BorderRadiusValue | string | undefined) => void;
    }) => createElement(BorderRadiusControl, {
      field,
      value: normalizeLegacyBorderRadiusValue(value, fallback.topLeft, fallback.unit),
      onChange,
    }),
    defaultValue: fallback,
  };
}
