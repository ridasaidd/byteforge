import {
  buildLayoutCSS,
  generateFontSizeCSS,
  generateLetterSpacingCSS,
  generateLineHeightCSS,
  generateMarginCSS,
  generatePaddingCSS,
  generateResponsiveCSS,
  generateWidthCSS,
  isResponsiveValue,
  type BorderRadiusValue,
  type ColorValue,
  type FontWeightValue,
  type PositionOffsetValue,
  type ResponsiveFontSizeValue,
  type ResponsiveSpacingValue,
  type ResponsiveValue,
  type WidthValue,
} from '../../../fields';
import { findFont } from '@/shared/constants/fonts';
import { MOBILE_BREAKPOINTS, type MobileBreakpoint, type NavCssOptions, type TransitionValue } from './navTypes';

type PuckComponent = {
  id?: string;
  props?: Record<string, unknown>;
};

type ThemeResolver = (path: string, fallback?: string) => string;

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

function normalizeCssLength(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^-?\d*\.?\d+$/.test(trimmed) ? `${trimmed}px` : trimmed;
}

function resolveResponsiveFontSize(value: unknown, resolver: ThemeResolver): ResponsiveFontSizeValue | undefined {
  const normalized = normalizeFontSize(value);
  if (!normalized || typeof normalized !== 'object') {
    return normalized;
  }

  const breakpoints: Array<'mobile' | 'tablet' | 'desktop'> = ['mobile', 'tablet', 'desktop'];
  const resolved: Record<string, unknown> = {};

  breakpoints.forEach((breakpoint) => {
    const entry = (normalized as Record<string, unknown>)[breakpoint];
    if (!entry) return;

    if (typeof entry === 'string') {
      const maybeResolved = entry.startsWith('typography.') ? resolver(entry, entry) : entry;
      resolved[breakpoint] = normalizeCssLength(maybeResolved || entry);
      return;
    }

    if (typeof entry === 'object' && entry !== null && 'type' in (entry as Record<string, unknown>) && 'value' in (entry as Record<string, unknown>)) {
      const fontSizeValue = entry as { type?: string; value?: string };
      const rawValue = fontSizeValue.value || '';
      const resolvedValue = fontSizeValue.type === 'theme' ? resolver(rawValue, rawValue) : rawValue;
      resolved[breakpoint] = {
        type: 'custom',
        value: normalizeCssLength(resolvedValue || rawValue),
      };
      return;
    }

    resolved[breakpoint] = entry;
  });

  return resolved as ResponsiveFontSizeValue;
}

function resolveColorValue(value: ColorValue | string | undefined, resolver: ThemeResolver): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('var(')) {
      return value;
    }

    return resolver(value, '');
  }

  if (value.type === 'custom') {
    return value.value || undefined;
  }

  if (value.type === 'theme') {
    const val = value.value;
    if (!val) return undefined;
    if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('var(')) {
      return val;
    }

    return resolver(val, '');
  }

  return value.value || undefined;
}

function isResponsiveColorValue(value: unknown): value is { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } {
  return typeof value === 'object' && value !== null && 'mobile' in value;
}

function resolveResponsiveColorValue(
  value: { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
  resolver: ThemeResolver
): ResponsiveValue<string> | string | undefined {
  if (!value) return undefined;

  if (isResponsiveColorValue(value)) {
    const resolved: { mobile: string; tablet?: string; desktop?: string } = {
      mobile: resolveColorValue(value.mobile, resolver) || '',
    };

    if (value.tablet !== undefined) {
      resolved.tablet = resolveColorValue(value.tablet, resolver) || '';
    }

    if (value.desktop !== undefined) {
      resolved.desktop = resolveColorValue(value.desktop, resolver) || '';
    }

    return resolved;
  }

  return resolveColorValue(value as ColorValue | string | undefined, resolver);
}

function resolveFontWeight(value: FontWeightValue | string | undefined, resolver: ThemeResolver): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && 'value' in value) {
    if (!value.value) return undefined;
    if (value.type === 'theme') {
      return resolver(value.value, '');
    }

    return value.value;
  }

  return undefined;
}

function transitionToCss(transition: TransitionValue | undefined): string {
  if (!transition) return 'color 0.2s ease';

  const properties = transition.properties || 'all';
  const duration = transition.duration || '300ms';
  const easing = transition.easing || 'ease';
  return `${properties} ${duration} ${easing}`;
}

function borderRadiusToCss(value: BorderRadiusValue | undefined): string | undefined {
  if (!value) return undefined;

  const unit = value.unit || 'px';
  const topLeft = value.topLeft || '0';
  const topRight = value.topRight || '0';
  const bottomRight = value.bottomRight || '0';
  const bottomLeft = value.bottomLeft || '0';

  return `${topLeft}${unit} ${topRight}${unit} ${bottomRight}${unit} ${bottomLeft}${unit}`;
}

function widthValueToCss(value: WidthValue | string | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;

  if (value.unit === 'auto') {
    return 'auto';
  }

  if (!value.value) return undefined;
  return `${value.value}${value.unit}`;
}

function positionOffsetSideToCss(
  value: PositionOffsetValue | undefined,
  side: 'top' | 'right',
  fallback: string
): string {
  if (!value) return fallback;

  const raw = value[side]?.trim();
  if (!raw) return fallback;
  if (raw === 'auto' || value.unit === 'auto') return 'auto';

  const unit = value.unit || 'px';
  return /^-?\d*\.?\d+$/.test(raw) ? `${raw}${unit}` : raw;
}

function breakpointToWidth(value: MobileBreakpoint | undefined): number {
  if (!value) return MOBILE_BREAKPOINTS.md;
  return MOBILE_BREAKPOINTS[value] ?? MOBILE_BREAKPOINTS.md;
}

function appendRule(parts: string[], selector: string, entries: Array<[string, string | undefined]>): void {
  const declarations = entries
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `  ${key}: ${value};`);

  if (declarations.length === 0) return;

  parts.push(`${selector} {\n${declarations.join('\n')}\n}`);
}

function appendResponsiveProperty(
  parts: string[],
  selector: string,
  property: string,
  value: ResponsiveValue<string> | string | undefined
): void {
  if (!value) return;

  if (typeof value === 'string') {
    appendRule(parts, selector, [[property, value]]);
    return;
  }

  if (isResponsiveValue<string>(value)) {
    const classNameForGenerator = selector.startsWith('.') ? selector.slice(1) : selector;
    const css = generateResponsiveCSS(classNameForGenerator, property, value, (val) => val || '');
    if (css) {
      parts.push(css);
    }
  }
}

function resolveFontFamilyCss(fontName: string | undefined): string {
  if (!fontName) {
    return 'var(--font-family-sans, system-ui, sans-serif)';
  }

  const font = findFont(fontName);
  if (!font) {
    return fontName;
  }

  if (font.file) {
    return `"${font.name}", ${font.fallback}`;
  }

  return font.fallback;
}

function buildFontFaceDeclaration(fontName: string | undefined): string | undefined {
  if (!fontName) return undefined;

  const font = findFont(fontName);
  if (!font || !font.file) return undefined;

  const [minWeight, maxWeight] = font.weights as [number, number];

  return `@font-face {\n  font-family: '${font.name}';\n  src: url('/fonts/${font.category}/${font.file}') format('woff2');\n  font-weight: ${minWeight} ${maxWeight};\n  font-style: normal;\n  font-display: swap;\n}`;
}

export function buildNavCss(options: NavCssOptions): string {
  const parts: string[] = [];
  const className = options.className;
  const responsiveBackgroundColor =
    typeof options.backgroundColor === 'object' && options.backgroundColor !== null && 'mobile' in options.backgroundColor
      ? options.backgroundColor as ResponsiveValue<string>
      : undefined;
  const baseBackgroundColor = typeof options.backgroundColor === 'string' ? options.backgroundColor : undefined;

  const fontFaceDeclarations = new Set<string>();
  const itemFontFace = buildFontFaceDeclaration(options.fontFamily);
  if (itemFontFace) fontFaceDeclarations.add(itemFontFace);
  const subItemFontFace = buildFontFaceDeclaration(options.subFontFamily);
  if (subItemFontFace) fontFaceDeclarations.add(subItemFontFace);
  if (fontFaceDeclarations.size > 0) {
    parts.push([...fontFaceDeclarations].join('\n\n'));
  }

  const itemFontFamilyCss = resolveFontFamilyCss(options.fontFamily);
  const subItemFontFamilyCss = resolveFontFamilyCss(options.subFontFamily || options.fontFamily);

  const layoutCss = buildLayoutCSS({
    className,
    display: options.display,
    direction: options.direction,
    justify: options.justify,
    align: options.align,
    wrap: options.wrap,
    flexGap: options.flexGap,
    position: options.position,
    positionOffset: options.positionOffset,
    transform: options.transform,
    zIndex: options.zIndex,
    opacity: options.opacity,
    overflow: options.overflow,
    width: options.width,
    maxWidth: options.maxWidth,
    padding: options.padding,
    margin: options.margin,
    border: options.border,
    borderRadius: options.borderRadius,
    shadow: options.shadow,
    visibility: options.visibility,
    backgroundColor: baseBackgroundColor,
  });
  if (layoutCss) parts.push(layoutCss);

  if (responsiveBackgroundColor) {
    const responsiveBackgroundCss = generateResponsiveCSS(className, 'background-color', responsiveBackgroundColor, (val) => val || '');
    if (responsiveBackgroundCss) {
      parts.push(responsiveBackgroundCss);
    }
  }

  parts.push(`.${className} .nav-items { list-style: none; margin: 0; padding: 0; display: contents; }`);
  parts.push(`.${className} .nav-item { position: relative; }`);
  parts.push(`.${className} .nav-item-row { display: flex; align-items: center; gap: 0.25rem; }`);
  parts.push(`.${className} .nav-submenu { display: none; position: absolute; top: 100%; left: 0; z-index: 100; list-style: none; margin: 0; padding: 0; }`);
  parts.push(`.${className} .nav-submenu.is-open { display: flex; flex-direction: column; }`);
  parts.push(`.${className} .nav-chevron { flex-shrink: 0; border: none; background: transparent; cursor: pointer; padding: 0; display: inline-flex; align-items: center; transition: transform 0.2s ease; }`);
  parts.push(`.${className} .nav-item.is-expanded > .nav-item-row .nav-chevron { transform: rotate(180deg); }`);
  parts.push(`.${className} .nav-toggle { display: none; border: none; background: transparent; cursor: pointer; align-items: center; justify-content: center; padding: 0.25rem; line-height: 1; }`);
  parts.push(`.${className} .nav-backdrop { display: none; }`);

  const itemBorderRadius = borderRadiusToCss(options.itemBorderRadius);

  appendRule(parts, `.${className} .nav-link`, [
    ['display', 'flex'],
    ['align-items', 'center'],
    ['flex', '1'],
    ['text-decoration', options.textDecoration],
    ['text-transform', options.textTransform && options.textTransform !== 'none' ? options.textTransform : undefined],
    ['font-family', itemFontFamilyCss],
    ['font-weight', options.fontWeight],
    ['border-radius', itemBorderRadius],
    ['cursor', options.cursor],
    ['transition', transitionToCss(options.transition)],
  ]);

  appendResponsiveProperty(parts, `.${className} .nav-link`, 'color', options.itemColor);
  appendResponsiveProperty(parts, `.${className} .nav-link`, 'background-color', options.itemBackgroundColor);

  if (options.itemPadding) {
    const paddingCss = generatePaddingCSS(`${className} .nav-link`, options.itemPadding);
    if (paddingCss) parts.push(paddingCss);
  }

  if (options.fontSize) {
    const fontSizeCss = generateFontSizeCSS(`${className} .nav-link`, options.fontSize);
    if (fontSizeCss) parts.push(fontSizeCss);
  }

  if (options.lineHeight) {
    const lineHeightCss = generateLineHeightCSS(`${className} .nav-link`, options.lineHeight);
    if (lineHeightCss) parts.push(lineHeightCss);
  }

  if (options.letterSpacing) {
    const letterSpacingCss = generateLetterSpacingCSS(`${className} .nav-link`, options.letterSpacing);
    if (letterSpacingCss) parts.push(letterSpacingCss);
  }

  appendResponsiveProperty(parts, `.${className} .nav-link:hover`, 'color', options.itemHoverColor);
  appendResponsiveProperty(parts, `.${className} .nav-link:hover`, 'background-color', options.itemHoverBackgroundColor);

  appendResponsiveProperty(parts, `.${className} .nav-link.is-active`, 'color', options.itemActiveColor);
  appendResponsiveProperty(parts, `.${className} .nav-link.is-active`, 'background-color', options.itemActiveBackgroundColor);

  appendRule(parts, `.${className} .nav-submenu`, [
    ['min-width', widthValueToCss(options.dropdownMinWidth)],
  ]);
  appendResponsiveProperty(parts, `.${className} .nav-submenu`, 'background-color', options.dropdownBackgroundColor);

  if (options.dropdownBorderRadius) {
    appendRule(parts, `.${className} .nav-submenu`, [
      ['border-radius', borderRadiusToCss(options.dropdownBorderRadius)],
    ]);
  }

  if (options.dropdownShadow) {
    const submenuShadowCss = buildLayoutCSS({
      className: `${className} .nav-submenu`,
      shadow: options.dropdownShadow,
    });

    if (submenuShadowCss) {
      parts.push(submenuShadowCss);
    }
  }

  appendRule(parts, `.${className} .nav-submenu .nav-link`, [
    ['font-family', subItemFontFamilyCss],
    ['font-weight', options.subFontWeight],
  ]);
  appendResponsiveProperty(parts, `.${className} .nav-submenu .nav-link`, 'color', options.subItemColor);
  appendResponsiveProperty(parts, `.${className} .nav-submenu .nav-link`, 'background-color', options.subItemBackgroundColor);

  if (options.subItemPadding) {
    const subPaddingCss = generatePaddingCSS(`${className} .nav-submenu .nav-link`, options.subItemPadding);
    if (subPaddingCss) parts.push(subPaddingCss);
  }

  if (options.subFontSize) {
    const subFontSizeCss = generateFontSizeCSS(`${className} .nav-submenu .nav-link`, options.subFontSize);
    if (subFontSizeCss) parts.push(subFontSizeCss);
  }

  appendResponsiveProperty(parts, `.${className} .nav-submenu .nav-link:hover`, 'color', options.subItemHoverColor);
  appendResponsiveProperty(parts, `.${className} .nav-submenu .nav-link:hover`, 'background-color', options.subItemHoverBackgroundColor);

  const breakpoint = breakpointToWidth(options.mobileBreakpoint);
  const maxBreakpoint = breakpoint - 0.02;
  const mobileVariant = options.mobileVariant || 'dropdown';

  const mobileCssParts: string[] = [];
  mobileCssParts.push(`.${className} .nav-toggle { display: inline-flex; color: currentColor; background-color: transparent; }`);
  mobileCssParts.push(`.${className} > .nav-items { display: none !important; }`);

  const closeButtonSize = widthValueToCss(options.closeButtonSize) || '36px';
  const closeButtonTop = positionOffsetSideToCss(options.closeButtonOffset, 'top', '12px');
  const closeButtonRight = positionOffsetSideToCss(options.closeButtonOffset, 'right', '12px');
  const closeButtonClearance = `calc(${closeButtonTop} + ${closeButtonSize} + 8px)`;

  if (mobileVariant === 'drawer') {
    mobileCssParts.push(`.${className} .nav-mobile-drawer { position: fixed; top: 0; left: 0; height: 100dvh; width: ${widthValueToCss(options.drawerWidth) || '280px'}; box-sizing: border-box; transform: translate3d(calc(-100% - 2px), 0, 0); transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.34s; z-index: 1001; overflow-y: auto; background-color: inherit; visibility: hidden; pointer-events: none; will-change: transform; backface-visibility: hidden; contain: layout paint; }`);
    mobileCssParts.push(`.${className} .nav-mobile-drawer.is-open { transform: translate3d(0, 0, 0); visibility: visible; pointer-events: auto; }`);
    mobileCssParts.push(`.${className} .nav-mobile-drawer .nav-items { display: flex; flex-direction: column; padding-top: ${closeButtonClearance}; box-sizing: border-box; }`);
    mobileCssParts.push(`.${className} .nav-mobile-drawer .nav-item { width: 100%; }`);
    mobileCssParts.push(`.${className} .nav-mobile-drawer .nav-close { position: absolute; top: ${closeButtonTop}; right: ${closeButtonRight}; width: ${closeButtonSize}; height: ${closeButtonSize}; border: none; background: transparent; color: inherit; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }`);
    mobileCssParts.push(`.${className} .nav-backdrop { position: fixed; inset: 0; z-index: 998; display: none; background-color: rgb(0 0 0); opacity: ${options.drawerOverlayOpacity ?? 0.5}; }`);
    mobileCssParts.push(`.${className} .nav-backdrop.is-open { display: block; }`);
    mobileCssParts.push(`.${className} .nav-mobile-drawer .nav-submenu { position: static; }`);
  } else if (mobileVariant === 'fullscreen') {
    mobileCssParts.push(`.${className} .nav-mobile-fullscreen { display: none; position: fixed; top: 0; right: 0; bottom: 0; left: 0; width: 100vw; height: 100dvh; z-index: 1001; overflow-y: auto; background-color: inherit; }`);
    mobileCssParts.push(`.${className} .nav-mobile-fullscreen.is-open { display: flex; flex-direction: column; }`);
    mobileCssParts.push(`.${className} .nav-mobile-fullscreen .nav-items { display: flex; flex-direction: column; padding-top: ${closeButtonClearance}; box-sizing: border-box; }`);
    mobileCssParts.push(`.${className} .nav-mobile-fullscreen .nav-close { position: absolute; top: ${closeButtonTop}; right: ${closeButtonRight}; width: ${closeButtonSize}; height: ${closeButtonSize}; border: none; background: transparent; color: inherit; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }`);
    mobileCssParts.push(`.${className} .nav-backdrop { position: fixed; inset: 0; z-index: 998; display: none; background-color: rgb(0 0 0); opacity: ${options.drawerOverlayOpacity ?? 0.5}; }`);
    mobileCssParts.push(`.${className} .nav-backdrop.is-open { display: block; }`);
    mobileCssParts.push(`.${className} .nav-mobile-fullscreen .nav-submenu { position: static; }`);
  } else {
    mobileCssParts.push(`.${className} .nav-mobile-dropdown { display: none; position: absolute; top: calc(100% + 0.25rem); left: calc(50% - 50vw); z-index: 1000; box-sizing: border-box; background-color: inherit; }`);
    mobileCssParts.push(`.${className} .nav-mobile-dropdown.is-open { display: block; }`);
    mobileCssParts.push(`.${className} .nav-mobile-dropdown .nav-items { display: flex; flex-direction: column; box-sizing: border-box; }`);
    mobileCssParts.push(`.${className} .nav-mobile-dropdown .nav-submenu { position: static; }`);

    appendRule(parts, `.${className} .nav-mobile-dropdown`, [
      ['min-width', widthValueToCss(options.dropdownMinWidth)],
    ]);
  }

  if (options.navItemsPadding) {
    const drawerPaddingCss = generatePaddingCSS(`${className} .nav-mobile-drawer .nav-items`, options.navItemsPadding);
    if (drawerPaddingCss) parts.push(drawerPaddingCss);

    const fullscreenPaddingCss = generatePaddingCSS(`${className} .nav-mobile-fullscreen .nav-items`, options.navItemsPadding);
    if (fullscreenPaddingCss) parts.push(fullscreenPaddingCss);

    const dropdownPaddingCss = generatePaddingCSS(`${className} .nav-mobile-dropdown .nav-items`, options.navItemsPadding);
    if (dropdownPaddingCss) parts.push(dropdownPaddingCss);
  }

  if (options.navItemsMargin) {
    const drawerMarginCss = generateMarginCSS(`${className} .nav-mobile-drawer .nav-items`, options.navItemsMargin);
    if (drawerMarginCss) parts.push(drawerMarginCss);

    const fullscreenMarginCss = generateMarginCSS(`${className} .nav-mobile-fullscreen .nav-items`, options.navItemsMargin);
    if (fullscreenMarginCss) parts.push(fullscreenMarginCss);

    const dropdownMarginCss = generateMarginCSS(`${className} .nav-mobile-dropdown .nav-items`, options.navItemsMargin);
    if (dropdownMarginCss) parts.push(dropdownMarginCss);
  }

  if (options.width) {
    const drawerWidthCss = generateWidthCSS(`${className} .nav-mobile-drawer .nav-items`, options.width);
    if (drawerWidthCss) parts.push(drawerWidthCss);

    const fullscreenWidthCss = generateWidthCSS(`${className} .nav-mobile-fullscreen .nav-items`, options.width);
    if (fullscreenWidthCss) parts.push(fullscreenWidthCss);

    const dropdownWidthCss = generateWidthCSS(`${className} .nav-mobile-dropdown .nav-items`, options.width);
    if (dropdownWidthCss) parts.push(dropdownWidthCss);

    const dropdownContainerWidthCss = generateWidthCSS(`${className} .nav-mobile-dropdown`, options.width);
    if (dropdownContainerWidthCss) parts.push(dropdownContainerWidthCss);
  }

  parts.push(`@media (max-width: ${maxBreakpoint}px) {\n${mobileCssParts.map((rule) => `  ${rule}`).join('\n')}\n}`);
  parts.push(`@media (min-width: ${breakpoint}px) { .${className} .nav-toggle { display: none !important; } .${className} .nav-mobile-drawer, .${className} .nav-mobile-fullscreen, .${className} .nav-mobile-dropdown, .${className} .nav-backdrop { display: none !important; } }`);

  appendResponsiveProperty(parts, `.${className} .nav-toggle`, 'color', options.toggleColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-drawer`, 'background-color', options.drawerBackgroundColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-fullscreen`, 'background-color', options.drawerBackgroundColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-dropdown`, 'background-color', options.drawerBackgroundColor);
  appendResponsiveProperty(parts, `.${className} .nav-backdrop`, 'background-color', options.drawerOverlayColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-drawer .nav-close`, 'color', options.closeButtonColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-fullscreen .nav-close`, 'color', options.closeButtonColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-drawer .nav-close`, 'background', options.closeButtonBackgroundColor);
  appendResponsiveProperty(parts, `.${className} .nav-mobile-fullscreen .nav-close`, 'background', options.closeButtonBackgroundColor);

  if (options.customCss) {
    parts.push(options.customCss.replace(/&/g, `.${className}`));
  }

  return parts.filter(Boolean).join('\n');
}

function extractNavCssOptions(props: Record<string, unknown>, resolver: ThemeResolver): NavCssOptions {
  const id = props.id ?? 'default';

  return {
    className: `nav-menu-${id}`,

    display: props.display as NavCssOptions['display'],
    direction: props.direction as NavCssOptions['direction'],
    justify: props.justify as NavCssOptions['justify'],
    align: props.align as NavCssOptions['align'],
    wrap: props.wrap as NavCssOptions['wrap'],
    flexGap: props.flexGap as NavCssOptions['flexGap'],
    width: props.width as NavCssOptions['width'],
    maxWidth: props.maxWidth as NavCssOptions['maxWidth'],
    padding: normalizeResponsiveSpacing(props.padding),
    margin: normalizeResponsiveSpacing(props.margin),
    border: props.border as NavCssOptions['border'],
    borderRadius: normalizeBorderRadius(props.borderRadius),
    shadow: props.shadow as NavCssOptions['shadow'],
    position: props.position as NavCssOptions['position'],
    positionOffset: props.positionOffset as NavCssOptions['positionOffset'],
    transform: props.transform as NavCssOptions['transform'],
    zIndex: props.zIndex as NavCssOptions['zIndex'],
    opacity: props.opacity as NavCssOptions['opacity'],
    overflow: props.overflow as NavCssOptions['overflow'],
    visibility: props.visibility as NavCssOptions['visibility'],
    backgroundColor: resolveResponsiveColorValue(
      props.backgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),

    itemColor: resolveResponsiveColorValue(
      props.itemColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemHoverColor: resolveResponsiveColorValue(
      props.itemHoverColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemActiveColor: resolveResponsiveColorValue(
      props.itemActiveColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemBackgroundColor: resolveResponsiveColorValue(
      props.itemBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemHoverBackgroundColor: resolveResponsiveColorValue(
      props.itemHoverBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemActiveBackgroundColor: resolveResponsiveColorValue(
      props.itemActiveBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    itemPadding: normalizeResponsiveSpacing(props.itemPadding),
    fontFamily: props.fontFamily as string | undefined,
    fontSize: resolveResponsiveFontSize(props.fontSize, resolver),
    fontWeight: resolveFontWeight(props.fontWeight as FontWeightValue | string | undefined, resolver),
    lineHeight: props.lineHeight as NavCssOptions['lineHeight'],
    letterSpacing: props.letterSpacing as NavCssOptions['letterSpacing'],
    textTransform: props.textTransform as NavCssOptions['textTransform'],
    textDecoration: props.textDecoration as NavCssOptions['textDecoration'],
    itemBorderRadius: normalizeBorderRadius(props.itemBorderRadius),
    cursor: props.cursor as NavCssOptions['cursor'],
    transition: props.transition as NavCssOptions['transition'],

    subItemColor: resolveResponsiveColorValue(
      props.subItemColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    subItemHoverColor: resolveResponsiveColorValue(
      props.subItemHoverColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    subItemBackgroundColor: resolveResponsiveColorValue(
      props.subItemBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    subItemHoverBackgroundColor: resolveResponsiveColorValue(
      props.subItemHoverBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    subItemPadding: normalizeResponsiveSpacing(props.subItemPadding),
    subFontFamily: props.subFontFamily as string | undefined,
    subFontSize: resolveResponsiveFontSize(props.subFontSize, resolver),
    subFontWeight: resolveFontWeight(props.subFontWeight as FontWeightValue | string | undefined, resolver),
    dropdownBackgroundColor: resolveResponsiveColorValue(
      props.dropdownBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    dropdownBorderRadius: normalizeBorderRadius(props.dropdownBorderRadius),
    dropdownShadow: props.dropdownShadow as NavCssOptions['dropdownShadow'],
    dropdownMinWidth: props.dropdownMinWidth as WidthValue | undefined,

    mobileBreakpoint: props.mobileBreakpoint as MobileBreakpoint | undefined,
    mobileVariant: props.mobileVariant as NavCssOptions['mobileVariant'],
    drawerWidth: props.drawerWidth as WidthValue | undefined,
    drawerBackgroundColor: resolveResponsiveColorValue(
      props.drawerBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    drawerOverlayColor: resolveResponsiveColorValue(
      props.drawerOverlayColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    drawerOverlayOpacity: props.drawerOverlayOpacity as number | undefined,
    closeButtonColor: resolveResponsiveColorValue(
      props.closeButtonColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    closeButtonBackgroundColor: resolveResponsiveColorValue(
      props.closeButtonBackgroundColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    closeButtonSize: props.closeButtonSize as WidthValue | undefined,
    closeButtonIconSize: props.closeButtonIconSize as number | undefined,
    closeButtonOffset: props.closeButtonOffset as PositionOffsetValue | undefined,
    navItemsPadding: normalizeResponsiveSpacing(props.navItemsPadding),
    navItemsMargin: normalizeResponsiveSpacing(props.navItemsMargin),
    toggleColor: resolveResponsiveColorValue(
      props.toggleColor as { mobile: ColorValue | string; tablet?: ColorValue | string; desktop?: ColorValue | string } | ColorValue | string | undefined,
      resolver
    ),
    toggleIconSize: props.toggleIconSize as number | undefined,

    customCss: props.customCss as string | undefined,
  };
}

export function buildNavigationMenuCss(component: PuckComponent, resolver: ThemeResolver): string {
  const options = extractNavCssOptions(component.props || {}, resolver);
  return buildNavCss(options);
}
