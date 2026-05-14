import type { Data } from '@puckeditor/core';
import { generateFontCSSFromThemeData } from '@/shared/services/fonts/generateFontCss';
import {
  generateFontSizeCSS,
  generateLineHeightCSS,
  generateLetterSpacingCSS,
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveFontSizeValue,
  type ResponsiveGapValue,
  type ResponsiveHeightValue,
  type ResponsiveLetterSpacingValue,
  type ResponsiveLineHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type SpacingValue,
  type ResponsiveOpacityValue,
  isResponsiveValue,
  type ObjectFitValue,
  type ResponsiveOverflowValue,
  type ResponsivePositionValue,
  type ResponsivePositionOffsetValue,
  type ResponsiveTransformValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  type ResponsiveZIndexValue,
  type ShadowValue,
} from '../fields';
import { buildLayoutCSS, buildTypographyCSS } from '../fields/cssBuilder';
import { buildNavigationMenuCss as buildNavMenuCss } from '../components/navigation_v2/shared/navCssBuilder';
import {
  BOOKING_WIDGET_STATIC_CSS,
  buildBookingWidgetCssVars,
  getBookingWidgetInstanceClassName,
} from '../components/booking/styles';
import {
  createUniformBorder,
  normalizeLegacyBorderRadiusValue,
  normalizeLegacyBorderValue,
} from '../components/forms/styleUtils';

export type ThemeData = Record<string, unknown>;

type PuckComponent = {
  type?: string;
  id?: string;
  props?: Record<string, unknown>;
  zones?: Record<string, unknown>;
};

type ThemeResolver = (path: string, fallback?: string) => string;

/**
 * Generates CSS variables from theme data
 * Converts nested theme structure into CSS custom properties
 */
export function generateVariablesCss(themeData: ThemeData): string {
  const cssParts: string[] = [];

  // Generate @font-face rules for selected fonts
  const fontCss = generateFontCSSFromThemeData(themeData);
  if (fontCss) {
    cssParts.push(fontCss);
  }

  // Generate CSS variables from theme data
  const variables: string[] = [];

  function flattenObject(obj: Record<string, unknown>, prefix = ''): void {
    Object.entries(obj).forEach(([key, value]) => {
      const variableName = prefix ? `${prefix}-${key}` : key;

      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        flattenObject(value as Record<string, unknown>, variableName);
      } else {
        variables.push(`--${variableName}: ${value}`);
      }
    });
  }

  flattenObject(themeData);

  if (variables.length > 0) {
    cssParts.push(`:root {\n  ${variables.join(';\n  ')};\n}`);
  }

  return cssParts.join('\n\n');
}

function resolveThemeValue(themeData: ThemeData | undefined, path: string | undefined, fallback?: string): string {
  if (!themeData || !path) return fallback ?? '';

  const segments = path.split('.');
  let current: Record<string, unknown> = themeData;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment] as Record<string, unknown>;
    } else {
      return fallback ?? '';
    }
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return String(current);
  }

  return fallback ?? '';
}

function createThemeResolver(themeData?: ThemeData): ThemeResolver {
  return (path: string, fallback?: string) => resolveThemeValue(themeData, path, fallback);
}

function resolveColorValue(
  value: ColorValue | string | undefined,
  resolver?: ThemeResolver,
  cssVarFallback?: string,
  defaultValue?: string
): string {
  if (!value) return cssVarFallback ?? defaultValue ?? 'transparent';

  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('var(')) {
      return value;
    }

    const resolved = resolver?.(value, defaultValue);
    return resolved ?? cssVarFallback ?? defaultValue ?? 'transparent';
  }

  const val = value.value;

  if (value.type === 'custom') {
    return val ?? defaultValue ?? cssVarFallback ?? 'transparent';
  }

  if (value.type === 'theme') {
    if (val?.startsWith('#') || val?.startsWith('rgb') || val?.startsWith('var(')) {
      return val;
    }

    const resolved = val ? resolver?.(val, defaultValue) : undefined;
    return resolved ?? cssVarFallback ?? defaultValue ?? 'transparent';
  }

  return val ?? cssVarFallback ?? defaultValue ?? 'transparent';
}

function resolveFontWeightValue(
  value: unknown,
  resolver: ThemeResolver,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
    const typedValue = value as Record<string, unknown>;
    const rawValue = typeof typedValue.value === 'string' ? typedValue.value : '';

    if (typedValue.type === 'custom') {
      return rawValue || fallback;
    }

    if (typedValue.type === 'theme') {
      return rawValue ? resolver(rawValue, fallback) : fallback;
    }
  }

  return fallback;
}

function isLayoutComponent(type?: string): boolean {
  if (!type) return false;
  return [
    'box',
    'card',
    'button',
    'divider',
    'logo',
    'gallery',
    'table',
    'accordion',
    'bookingwidget',
    'image',
    'navigationmenu',
    'form',
    'textinput',
    'textarea',
    'select',
    'radiogroup',
    'checkbox',
    'submitbutton',
  ].includes(type.toLowerCase());
}

function buildBookingWidgetCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const instanceClassName = getBookingWidgetInstanceClassName((props.id as string) || component.id || 'unknown');

  return buildBookingWidgetCssVars(`.${instanceClassName}`, props, resolver);
}

function isTypographyComponent(type?: string): boolean {
  if (!type) return false;
  return ['heading', 'text', 'richtext', 'link', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type.toLowerCase());
}

function isComponentLike(value: unknown): value is PuckComponent {
  return Boolean(value && typeof value === 'object' && 'type' in (value as Record<string, unknown>));
}

function collectComponents(puckData: Data): PuckComponent[] {
  const collected: PuckComponent[] = [];

  const visit = (component: PuckComponent | undefined) => {
    if (!component || typeof component !== 'object') return;
    collected.push(component);

    const { props, zones } = component;

    if (zones && typeof zones === 'object') {
      Object.values(zones).forEach((zoneValue) => {
        if (Array.isArray(zoneValue)) {
          zoneValue.forEach((child) => visit(child as PuckComponent));
        } else if (isComponentLike(zoneValue)) {
          visit(zoneValue);
        }
      });
    }

    if (props && typeof props === 'object') {
      // Visit items slot (Box container)
      if (Array.isArray(props.items)) {
        props.items.forEach((child) => visit(child as PuckComponent));
      }

      // Visit other prop values that might contain components (excluding items to avoid duplication)
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'items') return; // Already processed above

        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (isComponentLike(entry)) {
              visit(entry);
            }
          });
        } else if (isComponentLike(value)) {
          visit(value);
        }
      });
    }
  };

  if (Array.isArray(puckData.content)) {
    puckData.content.forEach((component) => visit(component as PuckComponent));
  }

  const rootZones = (puckData as Record<string, unknown>).root as Record<string, unknown> | undefined;
  if (rootZones?.zones && typeof rootZones.zones === 'object') {
    Object.values(rootZones.zones).forEach((zoneValue) => {
      if (Array.isArray(zoneValue)) {
        zoneValue.forEach((child) => visit(child as PuckComponent));
      }
    });
  }

  return collected;
}

function normalizeResponsiveSpacing(value: unknown): ResponsiveSpacingValue | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && ('mobile' in (value as Record<string, unknown>) || 'tablet' in (value as Record<string, unknown>) || 'desktop' in (value as Record<string, unknown>))) {
    return value as ResponsiveSpacingValue;
  }

  if (typeof value === 'object' && ('top' in (value as Record<string, unknown>) || 'right' in (value as Record<string, unknown>) || 'bottom' in (value as Record<string, unknown>) || 'left' in (value as Record<string, unknown>))) {
    const v = value as Record<string, unknown>;
    const { top = 0, right = 0, bottom = 0, left = 0, unit = 'px', linked = false } = v;
    return {
      mobile: {
        top: String(top),
        right: String(right),
        bottom: String(bottom),
        left: String(left),
        unit: unit as string,
        linked: linked as boolean,
      },
    } as ResponsiveSpacingValue;
  }

  return undefined;
}

function getResponsiveSpacingCssValue(
  value: Record<string, unknown> | SpacingValue | undefined,
  fallback = '12px 12px 12px 12px'
): string {
  if (!value) return fallback;

  const unit = typeof value.unit === 'string' ? value.unit : 'px';
  const top = typeof value.top === 'string' ? value.top : '12';
  const right = typeof value.right === 'string' ? value.right : top;
  const bottom = typeof value.bottom === 'string' ? value.bottom : top;
  const left = typeof value.left === 'string' ? value.left : right;

  return `${top}${unit} ${right}${unit} ${bottom}${unit} ${left}${unit}`;
}

function buildResponsiveInsetCss(
  selector: string,
  property: string,
  value: ResponsiveSpacingValue | undefined,
  fallback = '12px 12px 12px 12px'
): string {
  if (!value) {
    return `${selector} { ${property}: ${fallback}; }`;
  }

  const mobileValue = isResponsiveValue(value) ? value.mobile : value;
  const tabletValue = isResponsiveValue(value) ? value.tablet : undefined;
  const desktopValue = isResponsiveValue(value) ? value.desktop : undefined;

  const cssParts = [
    `${selector} { ${property}: ${getResponsiveSpacingCssValue(mobileValue, fallback)}; }`,
  ];

  if (tabletValue) {
    cssParts.push(`@media (min-width: 768px) { ${selector} { ${property}: ${getResponsiveSpacingCssValue(tabletValue, fallback)}; } }`);
  }

  if (desktopValue) {
    cssParts.push(`@media (min-width: 1024px) { ${selector} { ${property}: ${getResponsiveSpacingCssValue(desktopValue, fallback)}; } }`);
  }

  return cssParts.join('\n');
}

function normalizeBorderRadius(value: unknown): BorderRadiusValue | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && 'topLeft' in (value as Record<string, unknown>)) {
    return value as BorderRadiusValue;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const radius = String(value);
    return {
      topLeft: radius,
      topRight: radius,
      bottomRight: radius,
      bottomLeft: radius,
      unit: 'px',
      linked: true,
    };
  }

  return undefined;
}

function normalizeFontSize(value: unknown): ResponsiveFontSizeValue | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && ('mobile' in (value as Record<string, unknown>) || 'tablet' in (value as Record<string, unknown>) || 'desktop' in (value as Record<string, unknown>))) {
    return value as ResponsiveFontSizeValue;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const val = typeof value === 'number' ? `${value}px` : value;
    return { mobile: { type: 'custom', value: val } } as ResponsiveFontSizeValue;
  }

  return undefined;
}

function getFormComponentClassName(component: PuckComponent): string {
  const props = component.props || {};
  const type = (component.type || '').toLowerCase();
  const id = (props.id as string) || component.id || type || 'unknown';

  return `${type}-${id}`;
}

function getFieldSizeStyles(size: unknown): { padding: string; fontSize: string; labelSize: string } {
  switch (size) {
    case 'sm':
      return { padding: '8px 12px', fontSize: '14px', labelSize: '13px' };
    case 'lg':
      return { padding: '14px 18px', fontSize: '18px', labelSize: '16px' };
    default:
      return { padding: '10px 14px', fontSize: '16px', labelSize: '14px' };
  }
}

function getSubmitButtonSizeStyles(size: unknown): { padding: string; fontSize: string } {
  switch (size) {
    case 'sm':
      return { padding: '8px 16px', fontSize: '14px' };
    case 'lg':
      return { padding: '12px 24px', fontSize: '18px' };
    default:
      return { padding: '10px 20px', fontSize: '16px' };
  }
}

function getCheckboxSizeStyles(size: unknown): { box: number; fontSize: string; gap: number } {
  switch (size) {
    case 'sm':
      return { box: 16, fontSize: '14px', gap: 8 };
    case 'lg':
      return { box: 24, fontSize: '18px', gap: 12 };
    default:
      return { box: 20, fontSize: '16px', gap: 10 };
  }
}

function getRadioSizeStyles(size: unknown): { circle: number; fontSize: string; labelSize: string; gap: number } {
  switch (size) {
    case 'sm':
      return { circle: 16, fontSize: '14px', labelSize: '13px', gap: 8 };
    case 'lg':
      return { circle: 24, fontSize: '18px', labelSize: '16px', gap: 12 };
    default:
      return { circle: 20, fontSize: '16px', labelSize: '14px', gap: 10 };
  }
}

function getBoxClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'box';
  const base = `box-${id}`;
  const customClass = props.customClassName?.toString().trim();
  return customClass ? `${base} ${customClass}` : base;
}

function getHeadingClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'heading';
  return `heading-${id}`;
}

function getTextClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'text';
  return `text-${id}`;
}

function getDividerClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'divider';
  return `divider-${id}`;
}

function getLogoClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'logo';
  return `logo-${id}`;
}

function getGalleryClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'gallery';
  return `gallery-${id}`;
}

function getTableClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'table';
  return `table-${id}`;
}

function getAccordionClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'accordion';
  return `accordion-${id}`;
}

function getRichTextClassName(component: PuckComponent): string {
  const props = component.props || {};
  const id = props.id ?? component.id ?? 'richtext';
  return `richtext-${id}`;
}

function buildBoxCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getBoxClassName(component);

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver);

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    direction: props.direction,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    justify: props.justify,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    align: props.align,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    wrap: props.wrap,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    flexGap: props.flexGap,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    numColumns: props.numColumns,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    gridGap: props.gridGap,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    alignItems: props.alignItems,
    position: props.position as ResponsivePositionValue,
    positionOffset: props.positionOffset as ResponsivePositionOffsetValue,
    transform: props.transform as ResponsiveTransformValue,
    zIndex: props.zIndex as ResponsiveZIndexValue,
    opacity: props.opacity as ResponsiveOpacityValue,
    overflow: props.overflow as ResponsiveOverflowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    backgroundColor,
    backgroundImage: props.backgroundImage as string | undefined,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    backgroundSize: props.backgroundSize,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    backgroundPosition: props.backgroundPosition,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    backgroundRepeat: props.backgroundRepeat,
    resolveToken: resolver,
  });
}

function buildCardCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = `card-${(props.id as string) || component.id || 'unknown'}`;

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver);
  //const titleColor = resolveColorValue(props.titleColor as ColorValue | string | undefined, resolver);
  //const descriptionColor = resolveColorValue(props.descriptionColor as ColorValue | string | undefined, resolver);
  //const iconColor = resolveColorValue(props.iconColor as ColorValue | string | undefined, resolver);

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    position: props.position as ResponsivePositionValue,
    zIndex: props.zIndex as ResponsiveZIndexValue,
    opacity: props.opacity as ResponsiveOpacityValue,
    overflow: props.overflow as ResponsiveOverflowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    backgroundColor,
    resolveToken: resolver,
  });
}

function buildDividerCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getDividerClassName(component);

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    height: props.height as ResponsiveHeightValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    margin: normalizeResponsiveSpacing(props.margin),
    backgroundColor: resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver, 'var(--border, #e5e7eb)', '#e5e7eb'),
    borderRadius: normalizeBorderRadius(props.borderRadius),
    opacity: props.opacity as ResponsiveOpacityValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });
}

function buildLogoCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getLogoClassName(component);

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    height: props.height as ResponsiveHeightValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    margin: normalizeResponsiveSpacing(props.margin),
    border: props.border as BorderValue,
    borderRadius: normalizeBorderRadius(props.borderRadius),
    shadow: props.shadow as ShadowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    objectFit: (props.objectFit as ObjectFitValue) || 'contain',
    resolveToken: resolver,
  });
}

function buildGalleryCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getGalleryClassName(component);

  const baseCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    height: props.height as ResponsiveHeightValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    // @ts-expect-error runtime data is dynamic
    numColumns: props.numColumns,
    // @ts-expect-error runtime data is dynamic
    gridGap: props.gridGap,
    // @ts-expect-error runtime data is dynamic
    alignItems: props.alignItems,
    padding: normalizeResponsiveSpacing(props.padding),
    margin: normalizeResponsiveSpacing(props.margin),
    backgroundColor: resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver),
    border: props.border as BorderValue,
    borderRadius: normalizeBorderRadius(props.borderRadius),
    shadow: props.shadow as ShadowValue,
    position: props.position as ResponsivePositionValue,
    positionOffset: props.positionOffset as ResponsivePositionOffsetValue,
    transform: props.transform as ResponsiveTransformValue,
    zIndex: props.zIndex as ResponsiveZIndexValue,
    overflow: props.overflow as ResponsiveOverflowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const imageBorderRadius = normalizeBorderRadius(props.imageBorderRadius);
  const imageRadiusCss = imageBorderRadius
    ? `${imageBorderRadius.topLeft}${imageBorderRadius.unit} ${imageBorderRadius.topRight}${imageBorderRadius.unit} ${imageBorderRadius.bottomRight}${imageBorderRadius.unit} ${imageBorderRadius.bottomLeft}${imageBorderRadius.unit}`
    : '0';

  const captionColor = resolveColorValue(
    props.captionColor as ColorValue | string | undefined,
    resolver,
    undefined,
    'inherit'
  );

  return [
    baseCss,
    `.${className}-item { display: flex; flex-direction: column; min-width: 0; }`,
    `.${className}-image { width: 100%; aspect-ratio: ${(props.imageAspectRatio as string) || '4 / 3'}; object-fit: ${(props.objectFit as string) || 'cover'}; border-radius: ${imageRadiusCss}; display: block; }`,
    `.${className}-caption { margin-top: 8px; font-size: 14px; line-height: 1.4; color: ${captionColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildTableCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getTableClassName(component);
  const tableElementClassName = `${className}-table`;

  const baseCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    height: props.height as ResponsiveHeightValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding: normalizeResponsiveSpacing(props.padding),
    margin: normalizeResponsiveSpacing(props.margin),
    backgroundColor: resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver),
    border: props.border as BorderValue,
    borderRadius: normalizeBorderRadius(props.borderRadius),
    shadow: props.shadow as ShadowValue,
    position: props.position as ResponsivePositionValue,
    overflow: props.overflow as ResponsiveOverflowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const headerBgColor = resolveColorValue(props.headerBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#f3f4f6');
  const headerTxtColor = resolveColorValue(props.headerTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const stripedBgColor = resolveColorValue(props.stripedRowBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#f9fafb');
  const cellPadding = normalizeResponsiveSpacing(props.cellPadding);
  const bordered = (props.bordered as boolean) !== false;
  const striped = (props.striped as boolean) === true;

  const borderStyle = bordered ? '1px solid #e5e7eb' : 'none';

  return [
    baseCss,
    `.${className} { overflow-x: auto; }`,
    `.${tableElementClassName} { border-collapse: collapse; width: 100%; min-width: 100%; }`,
    `.${tableElementClassName} th { background-color: ${headerBgColor}; color: ${headerTxtColor}; border: ${borderStyle}; text-align: left; font-weight: 600; }`,
    `.${tableElementClassName} td { border: ${borderStyle}; }`,
    buildResponsiveInsetCss(`.${tableElementClassName} th`, 'padding', cellPadding),
    buildResponsiveInsetCss(`.${tableElementClassName} td`, 'padding', cellPadding),
    striped ? `.${tableElementClassName} tbody tr:nth-child(odd) { background-color: ${stripedBgColor}; }` : '',
  ].filter(Boolean).join('\n');
}

function buildAccordionCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getAccordionClassName(component);

  const baseCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    height: props.height as ResponsiveHeightValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding: normalizeResponsiveSpacing(props.padding),
    margin: normalizeResponsiveSpacing(props.margin),
    backgroundColor: resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver),
    border: props.border as BorderValue,
    borderRadius: normalizeBorderRadius(props.borderRadius),
    shadow: props.shadow as ShadowValue,
    position: props.position as ResponsivePositionValue,
    overflow: props.overflow as ResponsiveOverflowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const titleBgColor = resolveColorValue(props.titleBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#f3f4f6');
  const titleTxtColor = resolveColorValue(props.titleTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const contentBgColor = resolveColorValue(props.contentBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const contentTxtColor = resolveColorValue(props.contentTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const borderColorValue = resolveColorValue(props.borderColor as ColorValue | string | undefined, resolver, undefined, '#e5e7eb');
  const hoverBgColor = resolveColorValue(props.hoverBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#e5e7eb');

  return [
    baseCss,
    `.${className} { border: 1px solid ${borderColorValue}; border-radius: 6px; overflow: hidden; }`,
    `.${className}-item { border-bottom: 1px solid ${borderColorValue}; }`,
    `.${className}-item:last-child { border-bottom: none; }`,
    `.${className}-title { background-color: ${titleBgColor}; color: ${titleTxtColor}; padding: 12px 16px; cursor: pointer; user-select: none; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s ease; }`,
    `.${className}-title:hover { background-color: ${hoverBgColor}; }`,
    `.${className}-content { background-color: ${contentBgColor}; color: ${contentTxtColor}; padding: 16px; display: none; }`,
    `.${className}-item.expanded .${className}-content { display: block; }`,
    `.${className}-icon { display: inline-block; transition: transform 0.2s ease; width: 20px; height: 20px; }`,
    `.${className}-item.expanded .${className}-icon { transform: rotate(180deg); }`,
  ].filter(Boolean).join('\n');
}

function buildButtonCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = `button-${(props.id as string) || component.id || 'unknown'}`;

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver,
    'var(--component-button-variant-primary-background-color, var(--color-primary-500, #3b82f6))',
    '#3b82f6'
  );
  const textColor = resolveColorValue(props.textColor as ColorValue | string | undefined, resolver,
    'var(--component-button-variant-primary-color, #ffffff)',
    '#ffffff'
  );
  const hoverBackgroundColor = resolveColorValue(props.hoverBackgroundColor as ColorValue | string | undefined, resolver);
  const hoverTextColor = resolveColorValue(props.hoverTextColor as ColorValue | string | undefined, resolver);

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  // Resolve size-based properties (sm/md/lg)
  const size = (props.size as string) || 'md';
  const paddingX = resolver(`components.button.sizes.${size}.paddingX`, size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px');
  const paddingYVal = resolver(`components.button.sizes.${size}.paddingY`, size === 'sm' ? '6px' : size === 'md' ? '10px' : '12px');
  const fontSize = resolver(`components.button.sizes.${size}.fontSize`, size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px');

  // Check if user has set custom padding via spacing control
  const hasCustomPadding = padding && typeof padding === 'object' && (
    'mobile' in padding || 'tablet' in padding || 'desktop' in padding
  );

  const baseCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding: hasCustomPadding ? padding : undefined,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    backgroundColor,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  // Button base styles: color, size, cursor, transition, typography
  const baseRules: string[] = [
    `color: ${textColor};`,
    `font-size: ${fontSize};`,
    `cursor: ${(props.cursor as string) || 'pointer'};`,
    `text-decoration: none;`,
  ];

  // Size-based padding (only if no custom padding override)
  if (!hasCustomPadding) {
    baseRules.push(`padding: ${paddingYVal} ${paddingX};`);
  }

  // Transition
  const transition = props.transition as { duration?: string; easing?: string; properties?: string } | undefined;
  if (transition) {
    const tProps = transition.properties || 'all';
    const tDur = transition.duration || '300ms';
    const tEase = transition.easing || 'ease';
    baseRules.push(`transition: ${tProps} ${tDur} ${tEase};`);
  } else {
    baseRules.push(`transition: all 0.2s ease;`);
  }

  // Typography advanced
  if (props.textTransform && props.textTransform !== 'none') {
    baseRules.push(`text-transform: ${props.textTransform};`);
  }
  if (props.textDecoration && props.textDecoration !== 'none') {
    baseRules.push(`text-decoration: ${props.textDecoration};`);
    if (props.textDecorationStyle) {
      baseRules.push(`text-decoration-style: ${props.textDecorationStyle};`);
    }
  }

  const buttonBaseCss = `.${className} { ${baseRules.join(' ')} }`;

  // Responsive line-height
  let lineHeightCss = '';
  if (props.lineHeight) {
    lineHeightCss = generateLineHeightCSS(className, props.lineHeight as ResponsiveLineHeightValue);
  }

  // Responsive letter-spacing
  let letterSpacingCss = '';
  if (props.letterSpacing) {
    letterSpacingCss = generateLetterSpacingCSS(className, props.letterSpacing as ResponsiveLetterSpacingValue);
  }

  // Hover states
  let hoverCss = '';
  if (hoverBackgroundColor || hoverTextColor || props.hoverOpacity || props.hoverTransform) {
    const hoverRules: string[] = [];
    if (hoverBackgroundColor) hoverRules.push(`background-color: ${hoverBackgroundColor} !important;`);
    if (hoverTextColor) hoverRules.push(`color: ${hoverTextColor} !important;`);
    if (props.hoverOpacity) hoverRules.push(`opacity: ${props.hoverOpacity} !important;`);
    if (props.hoverTransform) hoverRules.push(`transform: ${props.hoverTransform};`);

    if (hoverRules.length > 0) {
      hoverCss = `.${className}:hover { ${hoverRules.join(' ')} }`;
    }
  }

  return [baseCss, buttonBaseCss, lineHeightCss, letterSpacingCss, hoverCss].filter(Boolean).join('\n');
}

function resolveHeadingFontWeight(fontWeight: unknown, level: string): string {
  const levelFontWeightCssVarMap: Record<string, string> = {
    '1': 'var(--font-weight-bold, 700)',
    '2': 'var(--font-weight-bold, 700)',
    '3': 'var(--font-weight-semibold, 600)',
    '4': 'var(--font-weight-semibold, 600)',
    '5': 'var(--font-weight-medium, 500)',
    '6': 'var(--font-weight-medium, 500)',
  };

  // Always use level-based font weight - ensures h1/h2 are bold, h3/h4 semibold, h5/h6 medium
  // Unless the user explicitly set a custom font weight value
  if (!fontWeight) {
    return levelFontWeightCssVarMap[level] || 'var(--font-weight-bold, 700)';
  }

  // If it's just a theme reference without explicit value, use level defaults
  if (typeof fontWeight === 'object' && 'type' in (fontWeight as Record<string, unknown>) && (fontWeight as Record<string, unknown>).type !== 'custom') {
    return levelFontWeightCssVarMap[level] || 'var(--font-weight-bold, 700)';
  }

  // Only use custom font weight if explicitly set
  if (typeof fontWeight === 'string' || typeof fontWeight === 'number') {
    return String(fontWeight);
  }

  if (typeof fontWeight === 'object' && 'type' in (fontWeight as Record<string, unknown>) && (fontWeight as Record<string, unknown>).type === 'custom') {
    const val = (fontWeight as Record<string, unknown>).value;
    return val ? String(val) : (levelFontWeightCssVarMap[level] || 'var(--font-weight-bold, 700)');
  }

  return levelFontWeightCssVarMap[level] || 'var(--font-weight-bold, 700)';
}

function buildHeadingCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getHeadingClassName(component);
  const level = (props.level ?? '2') as string;

  const resolvedColor = resolveColorValue(
    props.color as ColorValue | string | undefined,
    resolver,
    'var(--component-heading-color-default, inherit)',
    'inherit'
  );

  const resolvedBackground = resolveColorValue(
    props.backgroundColor as ColorValue | string | undefined,
    resolver,
    'transparent',
    'transparent'
  );

  const fontWeight = resolveFontWeightValue(props.fontWeight, resolver, resolveHeadingFontWeight(undefined, level));
  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);
  const fontSize = normalizeFontSize(props.fontSize);

  const css = buildTypographyCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    textAlign: ((props.align || props.textAlign || 'left') as string) as 'left' | 'center' | 'right' | 'justify',
    color: resolvedColor,
    backgroundColor: resolvedBackground,
    fontWeight,
    lineHeight: props.lineHeight as ResponsiveLineHeightValue,
    letterSpacing: props.letterSpacing as ResponsiveLetterSpacingValue,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textTransform: props.textTransform,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textDecoration: props.textDecoration,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textDecorationStyle: props.textDecorationStyle,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize, resolver) : '';

  return [css, fontSizeCss].filter(Boolean).join('\n');
}

function buildTextCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getTextClassName(component);

  const resolvedColor = resolveColorValue(
    props.color as ColorValue | string | undefined,
    resolver,
    'var(--component-text-color-default, inherit)',
    'inherit'
  );

  const resolvedBackground = resolveColorValue(
    props.backgroundColor as ColorValue | string | undefined,
    resolver,
    'transparent',
    'transparent'
  );

  const fontWeight = resolveFontWeightValue(props.fontWeight, resolver, 'var(--font-weight-normal, 400)');

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);
  const fontSize = normalizeFontSize(props.fontSize);

  const css = buildTypographyCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    textAlign: ((props.align || 'left') as string) as 'left' | 'center' | 'right' | 'justify',
    color: resolvedColor,
    backgroundColor: resolvedBackground,
    fontWeight,
    lineHeight: props.lineHeight as ResponsiveLineHeightValue,
    letterSpacing: props.letterSpacing as ResponsiveLetterSpacingValue,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textTransform: props.textTransform,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textDecoration: props.textDecoration,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textDecorationStyle: props.textDecorationStyle,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize, resolver) : '';

  return [css, fontSizeCss].filter(Boolean).join('\n');
}

function buildRichTextCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getRichTextClassName(component);

  const resolvedColor = resolveColorValue(
    props.color as ColorValue | string | undefined,
    resolver,
    'var(--component-richtext-color-default, inherit)',
    'inherit'
  );

  const resolvedBackground = resolveColorValue(
    props.backgroundColor as ColorValue | string | undefined,
    resolver,
    'transparent',
    'transparent'
  );

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  // Base layout CSS
  const css = buildTypographyCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    color: resolvedColor,
    backgroundColor: resolvedBackground,
    fontFamily: props.fontFamily as string | undefined,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  // RichText typography CSS - explicit styles for storefront (no Tailwind)
  const richTextTypographyCSS = `
    .${className} h2 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
    .${className} h3 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; line-height: 1.4; }
    .${className} h4 { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; }
    .${className} p { margin: 0 0 1rem; line-height: 1.7; }
    .${className} ul { list-style-type: disc; padding-left: 1.5rem; margin: 0 0 1rem; }
    .${className} ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0 0 1rem; }
    .${className} li { margin: 0.25rem 0; line-height: 1.7; }
    .${className} li > ul, .${className} li > ol { margin: 0.5rem 0; }
    .${className} strong { font-weight: 700; }
    .${className} em { font-style: italic; }
    .${className} u { text-decoration: underline; }
    .${className} s { text-decoration: line-through; }
    .${className} a { color: var(--color-primary-500, #3b82f6); text-decoration: underline; }
    .${className} a:hover { text-decoration: none; }
    .${className} blockquote { border-left: 4px solid var(--color-gray-300, #d1d5db); padding-left: 1rem; margin: 1rem 0; font-style: italic; }
    .${className} code { background: var(--color-gray-100, #f3f4f6); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: var(--font-family-mono, monospace); font-size: 0.875em; }
    .${className} pre { background: var(--color-gray-100, #f3f4f6); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
    .${className} pre code { background: none; padding: 0; }
  `.trim();

  return [css, richTextTypographyCSS].filter(Boolean).join('\n');
}

function buildImageCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const id = props.id ?? component.id ?? 'image';
  const className = `image-${id}`;

  //const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    visibility: props.visibility as ResponsiveVisibilityValue,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    objectFit: props.objectFit,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    objectPosition: props.objectPosition,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    aspectRatio: props.aspectRatio,
    resolveToken: resolver,
  });
}

function buildLinkCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const id = props.id ?? component.id ?? 'link';
  const className = `link-${id}`;

  const resolvedColor = resolveColorValue(
    props.color as ColorValue | string | undefined,
    resolver,
    'var(--component-link-color-default, inherit)',
    'inherit'
  );

  const resolvedBackground = resolveColorValue(
    props.backgroundColor as ColorValue | string | undefined,
    resolver,
    'transparent',
    'transparent'
  );

  const hoverColor = resolveColorValue(
    props.hoverColor as ColorValue | string | undefined,
    resolver
  );

  const hoverBackgroundColor = resolveColorValue(
    props.hoverBackgroundColor as ColorValue | string | undefined,
    resolver
  );

  const fontWeight = resolveFontWeightValue(props.fontWeight, resolver, 'var(--font-weight-normal, 400)');

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);
  const fontSize = normalizeFontSize(props.fontSize);

  const baseCss = buildTypographyCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    width: props.width as ResponsiveWidthValue,
    maxWidth: props.maxWidth as ResponsiveMaxWidthValue,
    maxHeight: props.maxHeight as ResponsiveMaxHeightValue,
    padding,
    margin,
    border: props.border as BorderValue,
    borderRadius,
    shadow: props.shadow as ShadowValue,
    textAlign: ((props.align || 'left') as string) as 'left' | 'center' | 'right' | 'justify',
    color: resolvedColor,
    backgroundColor: resolvedBackground,
    fontWeight,
    lineHeight: props.lineHeight as ResponsiveLineHeightValue,
    letterSpacing: props.letterSpacing as ResponsiveLetterSpacingValue,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textTransform: props.textTransform,
    // @ts-expect-error Puck runtime data is dynamically typed from editor
    textDecoration: props.textDecoration,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize, resolver) : '';

  let hoverCss = '';
  if (hoverColor || hoverBackgroundColor || props.hoverTransform) {
    const hoverRules: string[] = [];
    if (hoverColor) hoverRules.push(`color: ${hoverColor} !important;`);
    if (hoverBackgroundColor) hoverRules.push(`background-color: ${hoverBackgroundColor} !important;`);
    if (props.hoverTransform) hoverRules.push(`transform: ${props.hoverTransform};`);

    if (hoverRules.length > 0) {
      hoverCss = `.${className}:hover { ${hoverRules.join(' ')} }`;
    }
  }

  return [baseCss, fontSizeCss, hoverCss].filter(Boolean).join('\n');
}

function buildFormCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const legacyGap = props.gap ? { mobile: { value: String(props.gap), unit: 'px' } } as ResponsiveGapValue : undefined;

  return buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    direction: props.direction as string | undefined,
    justify: props.justify as 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | undefined,
    align: props.align as 'start' | 'end' | 'center' | 'stretch' | 'baseline' | undefined,
    flexGap: (props.flexGap as ResponsiveGapValue | undefined) ?? legacyGap,
    width: props.width as ResponsiveWidthValue,
    padding: normalizeResponsiveSpacing(props.padding),
    margin: normalizeResponsiveSpacing(props.margin),
    border: props.border as BorderValue,
    borderRadius: props.borderRadius as BorderRadiusValue,
    shadow: props.shadow as ShadowValue,
    backgroundColor: resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver),
    resolveToken: resolver,
  });
}

function buildTextInputCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getFieldSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
  });

  const labelColor = resolveColorValue(props.labelColor as ColorValue | string | undefined, resolver, undefined, 'inherit');
  const inputBackgroundColor = resolveColorValue(props.inputBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const inputTextColor = resolveColorValue(props.inputTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const focusBorderColor = resolveColorValue(props.focusBorderColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const errorColor = resolveColorValue(props.errorColor as ColorValue | string | undefined, resolver, undefined, '#ef4444');
  const inputBorderCss = buildLayoutCSS({
    className: `${className}-input`,
    border: normalizeLegacyBorderValue(
      props.border as BorderValue | undefined,
      props.inputBorderColor as ColorValue | undefined,
      { type: 'theme', value: 'border' }
    ),
    borderRadius: normalizeLegacyBorderRadiusValue(props.borderRadius as BorderRadiusValue | string | undefined, '6'),
    resolveToken: resolver,
  });
  const labelWeight = resolver('typography.fontWeight.medium', '500');
  const mutedColor = resolver('colors.muted', '#6b7280');

  return [
    layoutCss,
    inputBorderCss,
    `.${className} { width: ${props.fullWidth === false ? 'auto' : '100%'}; }`,
    `.${className}-label { display: block; margin-bottom: 6px; font-size: ${sizeStyles.labelSize}; font-weight: ${labelWeight}; color: ${labelColor}; }`,
    `.${className}-input { width: 100%; padding: ${sizeStyles.padding}; font-size: ${sizeStyles.fontSize}; outline: none; transition: border-color 0.2s, box-shadow 0.2s; background-color: ${inputBackgroundColor}; color: ${inputTextColor}; }`,
    `.${className}-input:focus { border-color: ${focusBorderColor}; box-shadow: 0 0 0 3px ${focusBorderColor}20; }`,
    `.${className}-input.error { border-color: ${errorColor}; }`,
    `.${className}-error { margin-top: 4px; font-size: 13px; color: ${errorColor}; }`,
    `.${className}-help { margin-top: 4px; font-size: 13px; color: ${mutedColor}; }`,
    `.${className}-required { margin-left: 4px; color: ${errorColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildTextareaCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getFieldSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
  });

  const labelColor = resolveColorValue(props.labelColor as ColorValue | string | undefined, resolver, undefined, 'inherit');
  const inputBackgroundColor = resolveColorValue(props.inputBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const inputTextColor = resolveColorValue(props.inputTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const focusBorderColor = resolveColorValue(props.focusBorderColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const errorColor = resolveColorValue(props.errorColor as ColorValue | string | undefined, resolver, undefined, '#ef4444');
  const textareaBorderCss = buildLayoutCSS({
    className: `${className}-textarea`,
    border: normalizeLegacyBorderValue(
      props.border as BorderValue | undefined,
      props.inputBorderColor as ColorValue | undefined,
      { type: 'theme', value: 'border' }
    ),
    borderRadius: normalizeLegacyBorderRadiusValue(props.borderRadius as BorderRadiusValue | string | undefined, '6'),
    resolveToken: resolver,
  });
  const labelWeight = resolver('typography.fontWeight.medium', '500');
  const mutedColor = resolver('colors.muted', '#6b7280');
  const resize = (props.resize as string) || 'vertical';

  return [
    layoutCss,
    textareaBorderCss,
    `.${className} { width: ${props.fullWidth === false ? 'auto' : '100%'}; }`,
    `.${className}-label { display: block; margin-bottom: 6px; font-size: ${sizeStyles.labelSize}; font-weight: ${labelWeight}; color: ${labelColor}; }`,
    `.${className}-textarea { width: 100%; padding: ${sizeStyles.padding}; font-size: ${sizeStyles.fontSize}; outline: none; resize: ${resize}; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; background-color: ${inputBackgroundColor}; color: ${inputTextColor}; }`,
    `.${className}-textarea:focus { border-color: ${focusBorderColor}; box-shadow: 0 0 0 3px ${focusBorderColor}20; }`,
    `.${className}-textarea.error { border-color: ${errorColor}; }`,
    `.${className}-footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 4px; }`,
    `.${className}-footer-content { flex: 1; }`,
    `.${className}-error { font-size: 13px; color: ${errorColor}; margin: 0; }`,
    `.${className}-help { font-size: 13px; color: ${mutedColor}; margin: 0; }`,
    `.${className}-char-count { margin-left: 8px; font-size: 12px; white-space: nowrap; margin: 0; color: ${mutedColor}; }`,
    `.${className}-required { margin-left: 4px; color: ${errorColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildSelectCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getFieldSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
  });

  const labelColor = resolveColorValue(props.labelColor as ColorValue | string | undefined, resolver, undefined, 'inherit');
  const inputBackgroundColor = resolveColorValue(props.inputBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const inputTextColor = resolveColorValue(props.inputTextColor as ColorValue | string | undefined, resolver, undefined, '#000000');
  const focusBorderColor = resolveColorValue(props.focusBorderColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const errorColor = resolveColorValue(props.errorColor as ColorValue | string | undefined, resolver, undefined, '#ef4444');
  const selectBorder = normalizeLegacyBorderValue(
    props.border as BorderValue | undefined,
    props.inputBorderColor as ColorValue | undefined,
    { type: 'theme', value: 'border' }
  );
  const selectBorderRadius = normalizeLegacyBorderRadiusValue(props.borderRadius as BorderRadiusValue | string | undefined, '6');
  const buttonBorderCss = buildLayoutCSS({
    className: `${className}-button`,
    border: selectBorder,
    borderRadius: selectBorderRadius,
    resolveToken: resolver,
  });
  const dropdownBorderCss = buildLayoutCSS({
    className: `${className}-dropdown`,
    border: selectBorder,
    borderRadius: selectBorderRadius,
    resolveToken: resolver,
  });
  const labelWeight = resolver('typography.fontWeight.medium', '500');
  const mutedColor = resolver('colors.muted', '#9ca3af');
  const helpColor = resolver('colors.muted', '#6b7280');

  return [
    layoutCss,
    buttonBorderCss,
    dropdownBorderCss,
    `.${className} { width: ${props.fullWidth === false ? 'auto' : '100%'}; position: relative; }`,
    `.${className}-label { display: block; margin-bottom: 6px; font-size: ${sizeStyles.labelSize}; font-weight: ${labelWeight}; color: ${labelColor}; }`,
    `.${className}-required { margin-left: 4px; color: ${errorColor}; }`,
    `.${className}-button { width: 100%; padding: ${sizeStyles.padding}; font-size: ${sizeStyles.fontSize}; outline: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left; transition: border-color 0.2s, box-shadow 0.2s; background-color: ${inputBackgroundColor}; color: ${inputTextColor}; }`,
    `.${className}-button.open { border-color: ${focusBorderColor}; box-shadow: 0 0 0 3px ${focusBorderColor}20; }`,
    `.${className}-button.error { border-color: ${errorColor}; }`,
    `.${className}-button svg { transition: transform 0.2s; }`,
    `.${className}-button.open svg { transform: rotate(180deg); }`,
    `.${className}-placeholder { color: ${mutedColor}; }`,
    `.${className}-dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); z-index: 999; max-height: 200px; overflow-y: auto; background-color: ${inputBackgroundColor}; }`,
    `.${className}-option { padding: ${sizeStyles.padding}; font-size: ${sizeStyles.fontSize}; cursor: pointer; background-color: transparent; color: ${inputTextColor}; }`,
    `.${className}-option:hover { background-color: ${focusBorderColor}10; }`,
    `.${className}-option.selected { background-color: ${focusBorderColor}10; }`,
    `.${className}-error { margin-top: 4px; font-size: 13px; color: ${errorColor}; }`,
    `.${className}-help { margin-top: 4px; font-size: 13px; color: ${helpColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildCheckboxCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getCheckboxSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
  });

  const labelColor = resolveColorValue(props.labelColor as ColorValue | string | undefined, resolver, undefined, 'inherit');
  const checkboxColor = resolveColorValue(props.checkboxColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const checkmarkColor = resolveColorValue(props.checkmarkColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const errorColor = resolveColorValue(props.errorColor as ColorValue | string | undefined, resolver, undefined, '#ef4444');
  const mutedColor = resolver('colors.muted', '#6b7280');
  const checkboxBorderCss = buildLayoutCSS({
    className: `${className}-box`,
    border: normalizeLegacyBorderValue(
      props.border as BorderValue | undefined,
      props.checkboxBorderColor as ColorValue | undefined,
      { type: 'theme', value: 'border' },
      '2'
    ),
    borderRadius: normalizeLegacyBorderRadiusValue(props.borderRadius as BorderRadiusValue | string | undefined, '4'),
    resolveToken: resolver,
  });

  return [
    layoutCss,
    checkboxBorderCss,
    `.${className} { display: block; }`,
    `.${className}-label { display: flex; align-items: flex-start; gap: ${sizeStyles.gap}px; cursor: pointer; font-size: ${sizeStyles.fontSize}; color: ${labelColor}; }`,
    `.${className}-box { width: ${sizeStyles.box}px; height: ${sizeStyles.box}px; min-width: ${sizeStyles.box}px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-top: 2px; background-color: transparent; }`,
    `.${className}-box.checked { border-color: ${checkboxColor}; background-color: ${checkboxColor}; }`,
    `.${className}-input { position: absolute; opacity: 0; width: 0; height: 0; }`,
    `.${className}-error { margin-top: 4px; margin-left: ${sizeStyles.box + sizeStyles.gap}px; font-size: 13px; color: ${errorColor}; }`,
    `.${className}-help { margin: 4px 0 0 0; font-size: 13px; font-weight: normal; color: ${mutedColor}; }`,
    `.${className}-required { margin-left: 4px; color: ${errorColor}; }`,
    `.${className}-box svg { stroke: ${checkmarkColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildRadioGroupCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getRadioSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
  });

  const labelColor = resolveColorValue(props.labelColor as ColorValue | string | undefined, resolver, undefined, 'inherit');
  const radioColor = resolveColorValue(props.radioColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const errorColor = resolveColorValue(props.errorColor as ColorValue | string | undefined, resolver, undefined, '#ef4444');
  const mutedColor = resolver('colors.muted', '#6b7280');
  const direction = (props.direction as string) || 'column';
  const radioBorderCss = buildLayoutCSS({
    className: `${className}-radio`,
    border: normalizeLegacyBorderValue(
      props.border as BorderValue | undefined,
      props.radioBorderColor as ColorValue | string | undefined,
      { type: 'theme', value: 'border' },
      '2'
    ),
    resolveToken: resolver,
  });

  return [
    layoutCss,
    radioBorderCss,
    `.${className} { display: block; }`,
    `.${className}-grouplabel { display: block; margin-bottom: 10px; font-size: ${sizeStyles.labelSize}; font-weight: ${resolver('typography.fontWeight.medium', '500')}; color: ${labelColor}; }`,
    `.${className}-required { margin-left: 4px; color: ${errorColor}; }`,
    `.${className}-options { display: flex; flex-direction: ${direction}; gap: ${direction === 'row' ? '20px' : '12px'}; flex-wrap: wrap; }`,
    `.${className}-option { display: flex; align-items: center; gap: ${sizeStyles.gap}px; cursor: pointer; font-size: ${sizeStyles.fontSize}; color: ${labelColor}; }`,
    `.${className}-radio { width: ${sizeStyles.circle}px; height: ${sizeStyles.circle}px; border-radius: 50%; background-color: transparent; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }`,
    `.${className}-radio.selected { border-color: ${radioColor}; }`,
    `.${className}-radio-inner { width: ${sizeStyles.circle * 0.5}px; height: ${sizeStyles.circle * 0.5}px; border-radius: 50%; background-color: ${radioColor}; }`,
    `.${className}-input { position: absolute; opacity: 0; width: 0; height: 0; }`,
    `.${className}-error { margin-top: 4px; font-size: 13px; color: ${errorColor}; }`,
    `.${className}-help { margin-top: 4px; font-size: 13px; color: ${mutedColor}; }`,
  ].filter(Boolean).join('\n');
}

function buildSubmitButtonCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = getFormComponentClassName(component);
  const sizeStyles = getSubmitButtonSizeStyles(props.size);

  const layoutCss = buildLayoutCSS({
    className,
    display: props.display as ResponsiveDisplayValue,
    margin: normalizeResponsiveSpacing(props.margin),
    border: (props.border as BorderValue | undefined) ?? createUniformBorder({ type: 'theme', value: 'border' }, '0', 'none'),
    borderRadius: normalizeLegacyBorderRadiusValue(props.borderRadius as BorderRadiusValue | string | undefined, '6'),
    resolveToken: resolver,
  });

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver, undefined, '#3b82f6');
  const textColor = resolveColorValue(props.textColor as ColorValue | string | undefined, resolver, undefined, '#ffffff');
  const hoverBackgroundColor = resolveColorValue(props.hoverBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#2563eb');
  const disabledBackgroundColor = resolveColorValue(props.disabledBackgroundColor as ColorValue | string | undefined, resolver, undefined, '#9ca3af');
  const labelWeight = resolver('typography.fontWeight.medium', '500');

  return [
    layoutCss,
    `.${className} { ${props.fullWidth === true ? 'width: 100%;' : ''} padding: ${sizeStyles.padding}; font-size: ${sizeStyles.fontSize}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: ${labelWeight}; transition: all 0.2s; color: ${textColor}; background-color: ${backgroundColor}; }`,
    `.${className}:hover:not(:disabled) { background-color: ${hoverBackgroundColor}; }`,
    `.${className}:disabled { cursor: not-allowed; opacity: 0.6; background-color: ${disabledBackgroundColor}; }`,
    `.${className} svg { display: block; flex-shrink: 0; }`,
    `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
    `.${className}-spinner { animation: spin 1s linear infinite; }`,
  ].filter(Boolean).join('\n');
}

function buildFormComponentCss(component: PuckComponent, resolver: ThemeResolver): string {
  const type = (component.type || '').toLowerCase();

  switch (type) {
    case 'form':
      return buildFormCss(component, resolver);
    case 'textinput':
      return buildTextInputCss(component, resolver);
    case 'textarea':
      return buildTextareaCss(component, resolver);
    case 'select':
      return buildSelectCss(component, resolver);
    case 'checkbox':
      return buildCheckboxCss(component, resolver);
    case 'radiogroup':
      return buildRadioGroupCss(component, resolver);
    case 'submitbutton':
      return buildSubmitButtonCss(component, resolver);
    default:
      return '';
  }
}

export function extractLayoutComponentsCss(puckData: Data, themeData?: ThemeData): string {
  const resolver = createThemeResolver(themeData);
  const cssRules: string[] = [];
  let hasBookingWidget = false;

  collectComponents(puckData).forEach((component) => {
    if (!isLayoutComponent(component.type)) return;

    const type = (component.type || '').toLowerCase();
    switch (type) {
      case 'box':
        cssRules.push(buildBoxCss(component, resolver));
        break;
      case 'card':
        cssRules.push(buildCardCss(component, resolver));
        break;
      case 'divider':
        cssRules.push(buildDividerCss(component, resolver));
        break;
      case 'logo':
        cssRules.push(buildLogoCss(component, resolver));
        break;
      case 'gallery':
        cssRules.push(buildGalleryCss(component, resolver));
        break;
      case 'table':
        cssRules.push(buildTableCss(component, resolver));
        break;
      case 'accordion':
        cssRules.push(buildAccordionCss(component, resolver));
        break;
      case 'button':
        cssRules.push(buildButtonCss(component, resolver));
        break;
      case 'bookingwidget':
        hasBookingWidget = true;
        cssRules.push(buildBookingWidgetCss(component, resolver));
        break;
      case 'image':
        cssRules.push(buildImageCss(component, resolver));
        break;
      case 'navigationmenu':
        cssRules.push(buildNavMenuCss(component, resolver));
        break;
      case 'form':
      case 'textinput':
      case 'textarea':
      case 'select':
      case 'radiogroup':
      case 'checkbox':
      case 'submitbutton':
        cssRules.push(buildFormComponentCss(component, resolver));
        break;
      default:
        break;
    }
  });

  if (hasBookingWidget) {
    cssRules.unshift(BOOKING_WIDGET_STATIC_CSS);
  }

  return cssRules.filter(Boolean).join('\n');
}

export function extractTypographyComponentsCss(puckData: Data, themeData?: ThemeData): string {
  const resolver = createThemeResolver(themeData);
  const cssRules: string[] = [];

  collectComponents(puckData).forEach((component) => {
    if (!isTypographyComponent(component.type)) return;

    const type = (component.type || '').toLowerCase();
    switch (type) {
      case 'heading':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        cssRules.push(buildHeadingCss(component, resolver));
        break;
      case 'text':
        cssRules.push(buildTextCss(component, resolver));
        break;
      case 'richtext':
        cssRules.push(buildRichTextCss(component, resolver));
        break;
      case 'link':
        cssRules.push(buildLinkCss(component, resolver));
        break;
      default:
        break;
    }
  });

  return cssRules.filter(Boolean).join('\n');
}

/**
 * Generates CSS for the page root (outer background/color wrapper + inner layout wrapper).
 * Uses `_rootId` from root props to create page-scoped selectors (avoids conflicts
 * when CSS from multiple pages is merged into one stylesheet).
 */
function buildRootCss(puckData: Data, resolver: ThemeResolver): string {
  const rootProps = (puckData.root as Record<string, unknown>)?.props as Record<string, unknown> | undefined;
  if (!rootProps) return '';

  const rootId = rootProps._rootId as string;
  if (!rootId) return '';

  const outerClass = `puck-root-${rootId}`;
  const innerClass = `puck-root-${rootId}-inner`;

  // --- Outer div: background, color, font, minHeight ---
  const outerRules: string[] = [];

  const bgColor = resolveColorValue(
    rootProps.backgroundColor as ColorValue | string | undefined,
    resolver,
    undefined,
    '#ffffff'
  );
  outerRules.push(`background-color: ${bgColor}`);

  const bgImage = rootProps.backgroundImage as string;
  if (bgImage) {
    outerRules.push(`background-image: url(${bgImage})`);
    outerRules.push(`background-size: ${(rootProps.backgroundSize as string) || 'cover'}`);
    outerRules.push(`background-position: ${(rootProps.backgroundPosition as string) || 'center'}`);
    outerRules.push(`background-repeat: ${(rootProps.backgroundRepeat as string) || 'no-repeat'}`);
  }

  const txtColor = resolveColorValue(
    rootProps.color as ColorValue | string | undefined,
    resolver,
    undefined,
    'inherit'
  );
  if (txtColor && txtColor !== 'inherit') {
    outerRules.push(`color: ${txtColor}`);
  }

  const fontFamily = rootProps.fontFamily as string;
  outerRules.push(`font-family: ${fontFamily || 'var(--font-family-sans, system-ui, sans-serif)'}`);

  const minHeight = rootProps.minHeight as string;
  if (minHeight && minHeight !== 'auto') {
    outerRules.push(`min-height: ${minHeight}`);
  }

  let css = `.${outerClass} {\n  ${outerRules.join(';\n  ')};\n}\n`;

  // --- Inner div: maxWidth, responsive padding & margin ---
  const innerLayoutCss = buildLayoutCSS({
    className: innerClass,
    padding: rootProps.padding as ResponsiveSpacingValue,
    margin: rootProps.margin as ResponsiveSpacingValue,
  });
  if (innerLayoutCss) {
    css += innerLayoutCss;
  }

  const maxWidth = rootProps.maxWidth as string;
  if (maxWidth) {
    css += `.${innerClass} { max-width: ${maxWidth}; }\n`;
  }

  return css;
}

export function extractCssFromPuckData(
  puckData: Data,
  themeData?: ThemeData,
  includeVariables: boolean = true
): string {
  const cssParts: string[] = [];

  // Only include variables if requested (settings step) or if themeData exists and includeVariables is true
  if (includeVariables && themeData && Object.keys(themeData).length > 0) {
    cssParts.push(generateVariablesCss(themeData));
  }

  // Root (page-level) CSS
  const rootCss = buildRootCss(puckData, createThemeResolver(themeData));
  if (rootCss) {
    cssParts.push(rootCss);
  }

  const layoutCss = extractLayoutComponentsCss(puckData, themeData);
  if (layoutCss) {
    cssParts.push(layoutCss);
  }

  const typographyCss = extractTypographyComponentsCss(puckData, themeData);
  if (typographyCss) {
    cssParts.push(typographyCss);
  }

  return cssParts.filter((css) => css.trim().length > 0).join('\n\n');
}
