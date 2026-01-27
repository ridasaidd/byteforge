import type { Data } from '@puckeditor/core';
import {
  buildLayoutCSS,
  buildTypographyCSS,
  generateFontSizeCSS,
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveFontSizeValue,
  type ResponsiveLetterSpacingValue,
  type ResponsiveLineHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveOpacityValue,
  type ResponsiveOverflowValue,
  type ResponsivePositionValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  type ResponsiveZIndexValue,
  type ShadowValue,
} from '../fields';

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

  if (variables.length === 0) {
    return ':root {}';
  }

  return `:root {\n  ${variables.join(';\n  ')};\n}`;
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

function isLayoutComponent(type?: string): boolean {
  if (!type) return false;
  return [
    'box',
    'card',
    'button',
    'image',
    'navigation',
    'form',
    'textinput',
    'textarea',
    'select',
    'radiogroup',
    'checkbox',
    'submitbutton',
  ].includes(type.toLowerCase());
}

function isTypographyComponent(type?: string): boolean {
  if (!type) return false;
  return ['heading', 'text', 'link', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type.toLowerCase());
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
  const className = `card-Card-${(props.id as string) || component.props?.id || 'unknown'}`;

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver);
  const titleColor = resolveColorValue(props.titleColor as ColorValue | string | undefined, resolver);
  const descriptionColor = resolveColorValue(props.descriptionColor as ColorValue | string | undefined, resolver);
  const iconColor = resolveColorValue(props.iconColor as ColorValue | string | undefined, resolver);

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

function buildButtonCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const className = `button-Button-${(props.id as string) || component.props?.id || 'unknown'}`;

  const backgroundColor = resolveColorValue(props.backgroundColor as ColorValue | string | undefined, resolver);
  const textColor = resolveColorValue(props.textColor as ColorValue | string | undefined, resolver);
  const hoverBackgroundColor = resolveColorValue(props.hoverBackgroundColor as ColorValue | string | undefined, resolver);
  const hoverTextColor = resolveColorValue(props.hoverTextColor as ColorValue | string | undefined, resolver);

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  const baseCss = buildLayoutCSS({
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
    backgroundColor,
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });

  // Add text color if specified
  let textColorCss = '';
  if (textColor) {
    textColorCss = `.${className} { color: ${textColor}; }`;
  }

  // Add hover states if specified
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

  return [baseCss, textColorCss, hoverCss].filter(Boolean).join('\n');
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

  const fontWeight = resolveHeadingFontWeight(props.fontWeight, level);
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

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize) : '';

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

  const fontWeight = (() => {
    const value = props.fontWeight;
    if (!value) return 'var(--font-weight-normal, 400)';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object' && 'type' in (value as Record<string, unknown>) && (value as Record<string, unknown>).type === 'custom') {
      return (value as Record<string, unknown>).value as string;
    }
    return 'var(--font-weight-normal, 400)';
  })();

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

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize) : '';

  return [css, fontSizeCss].filter(Boolean).join('\n');
}

function buildImageCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const id = props.id ?? component.id ?? 'image';
  const className = `image-${id}`;

  const padding = normalizeResponsiveSpacing(props.padding);
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

  const fontWeight = (() => {
    const value = props.fontWeight;
    if (!value) return 'var(--font-weight-normal, 400)';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object' && 'type' in (value as Record<string, unknown>) && (value as Record<string, unknown>).type === 'custom') {
      return (value as Record<string, unknown>).value as string;
    }
    return 'var(--font-weight-normal, 400)';
  })();

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

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize) : '';

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

function buildNavigationCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const id = props.id ?? component.id ?? 'navigation';
  const className = `navigation-${id}`;

  const backgroundColor = resolveColorValue(
    props.backgroundColor as ColorValue | string | undefined,
    resolver,
    'transparent',
    'transparent'
  );

  const textColor = resolveColorValue(
    props.textColor as ColorValue | string | undefined,
    resolver,
    'inherit',
    'inherit'
  );

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const fontSize = normalizeFontSize(props.fontSize);

  const baseCss = buildLayoutCSS({
    className,
    padding,
    margin,
    backgroundColor,
    resolveToken: resolver,
  });

  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize) : '';
  const colorCss = textColor ? `.${className} { color: ${textColor}; }` : '';

  return [baseCss, fontSizeCss, colorCss].filter(Boolean).join('\n');
}

function buildFormComponentCss(component: PuckComponent, resolver: ThemeResolver): string {
  const props = (component.props || {}) as Record<string, unknown>;
  const type = (component.type || '').toLowerCase();
  const id = props.id ?? component.id ?? type;
  const className = `${type}-${id}`;

  const padding = normalizeResponsiveSpacing(props.padding);
  const margin = normalizeResponsiveSpacing(props.margin);
  const borderRadius = normalizeBorderRadius(props.borderRadius);

  return buildLayoutCSS({
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
    visibility: props.visibility as ResponsiveVisibilityValue,
    resolveToken: resolver,
  });
}

export function extractLayoutComponentsCss(puckData: Data, themeData?: ThemeData): string {
  const resolver = createThemeResolver(themeData);
  const cssRules: string[] = [];

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
      case 'button':
        cssRules.push(buildButtonCss(component, resolver));
        break;
      case 'image':
        cssRules.push(buildImageCss(component, resolver));
        break;
      case 'navigation':
        cssRules.push(buildNavigationCss(component, resolver));
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
      case 'link':
        cssRules.push(buildLinkCss(component, resolver));
        break;
      default:
        break;
    }
  });

  return cssRules.filter(Boolean).join('\n');
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
