import {
  ResponsiveDisplayValue,
  ResponsiveWidthValue,
  ResponsiveHeightValue,
  ResponsiveMinWidthValue,
  ResponsiveMaxWidthValue,
  ResponsiveMinHeightValue,
  ResponsiveMaxHeightValue,
  ResponsiveSpacingValue,
  ResponsivePositionValue,
  ResponsiveZIndexValue,
  ResponsiveOpacityValue,
  ResponsiveOverflowValue,
  ResponsiveGridColumnsValue,
  ResponsiveGridGapValue,
  ResponsiveGapValue,
  ResponsiveVisibilityValue,
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  GapValue,
  generateDisplayCSS,
  generateWidthCSS,
  generateHeightCSS,
  generateMinWidthCSS,
  generateMaxWidthCSS,
  generateMinHeightCSS,
  generateMaxHeightCSS,
  generatePaddingCSS,
  generateMarginCSS,
  generatePositionCSS,
  generateZIndexCSS,
  generateOpacityCSS,
  generateOverflowCSS,
  ResponsiveLineHeightValue,
  ResponsiveLetterSpacingValue,
  generateGridColumnsCSS,
  generateGridGapCSS,
  generateResponsiveGapCSS,
  generateVisibilityCSS,
} from './index';
import { hasFlexInAnyBreakpoint, hasGridInAnyBreakpoint } from './conditionalFields';
import { generateLineHeightCSS } from './ResponsiveLineHeightControl';
import { generateLetterSpacingCSS } from './ResponsiveLetterSpacingControl';
import type { ColorPickerValue } from './ColorPickerControl';

// Theme resolver type used to resolve tokens like "colors.primary.500"
type ThemeResolver = (path: string, defaultValue?: string) => string;

/**
 * Convert ColorPickerValue or string to a CSS color value
 */
function resolveColorValue(color: ColorPickerValue | string | undefined, resolver?: ThemeResolver): string {
  if (!color) return 'transparent';

  // If it's a string, return as-is (legacy format)
  if (typeof color === 'string') {
    // If it's an actual value (hex/rgba), use directly
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    // Otherwise, attempt to resolve via theme if available
    return resolver ? (resolver(color) || color) : color;
  }

  // If it's a ColorPickerValue object, extract the actual color value
  if (typeof color === 'object' && 'value' in color) {
    const val = color.value || 'transparent';
    // Custom values pass through; theme tokens should be resolved when possible
    if (color.type === 'custom') return val;
    if (color.type === 'theme') {
      if (val.startsWith('#') || val.startsWith('rgb')) return val;
      return resolver ? (resolver(val) || val) : val;
    }
    return val;
  }

  return 'transparent';
}

export interface LayoutCSSOptions {
  className: string;
  display?: ResponsiveDisplayValue;

  // Flex properties
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGap?: ResponsiveGapValue;

  // Grid properties
  numColumns?: ResponsiveGridColumnsValue;
  gridGap?: ResponsiveGridGapValue;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';

  // Layout advanced
  position?: ResponsivePositionValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;
  aspectRatio?: string;
  aspectRatioCustom?: string;
  visibility?: ResponsiveVisibilityValue;

  // Common styling
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  minWidth?: ResponsiveMinWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  minHeight?: ResponsiveMinHeightValue;
  maxHeight?: ResponsiveMaxHeightValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;

  // Background
  backgroundColor?: string; // Already resolved color value
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

  // Image-specific
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

/**
 * Generates all CSS for a layout component (Box, Flex, Columns, etc.)
 * Centralizes CSS generation logic to avoid duplication
 */
export function buildLayoutCSS(options: LayoutCSSOptions & { resolveToken?: ThemeResolver }): string {
  const {
    className,
    display,
    direction,
    justify,
    align,
    wrap,
    flexGap,
    numColumns,
    gridGap,
    alignItems,
    position,
    zIndex,
    opacity,
    overflow,
    aspectRatio,
    aspectRatioCustom,
    visibility,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    backgroundColor,
    backgroundImage,
    backgroundSize = 'cover',
    backgroundPosition = 'center',
    backgroundRepeat = 'no-repeat',
    objectFit,
    objectPosition,
    resolveToken,
  } = options;

  let css = '';

  // Display CSS
  if (display) {
    css += generateDisplayCSS(className, display);
  }

  // Layout-specific CSS - check ALL breakpoints, not just base
  const isFlex = hasFlexInAnyBreakpoint(display);
  const isGrid = hasGridInAnyBreakpoint(display);

  if (isFlex) {
    css += buildFlexCSS(className, { direction, justify, align, wrap, flexGap });
  }

  if (isGrid) {
    css += buildGridCSS(className, { numColumns, gridGap, alignItems });
  }

  // Layout advanced CSS
  if (position) {
    css += generatePositionCSS(className, position);
  }
  if (zIndex) {
    css += generateZIndexCSS(className, zIndex);
  }
  if (opacity) {
    css += generateOpacityCSS(className, opacity);
  }
  if (overflow) {
    css += generateOverflowCSS(className, overflow);
  }

  // Aspect Ratio CSS
  if (aspectRatio && aspectRatio !== 'auto') {
    const ratio = aspectRatio === 'custom' ? aspectRatioCustom : aspectRatio;
    if (ratio) {
      css += `.${className} { aspect-ratio: ${ratio}; }\n`;
    }
  }

  // Visibility CSS
  if (visibility) {
    css += generateVisibilityCSS(className, visibility);
  }

  // Spacing CSS
  if (width) {
    css += generateWidthCSS(className, width);
  }
  if (height) {
    css += generateHeightCSS(className, height);
  }
  if (minWidth) {
    css += generateMinWidthCSS(className, minWidth);
  }
  if (maxWidth) {
    css += generateMaxWidthCSS(className, maxWidth);
  }
  if (minHeight) {
    css += generateMinHeightCSS(className, minHeight);
  }
  if (maxHeight) {
    css += generateMaxHeightCSS(className, maxHeight);
  }
  if (padding) {
    css += generatePaddingCSS(className, padding);
  }
  if (margin) {
    css += generateMarginCSS(className, margin);
  }

  // Object Fit/Position (for images)
  if (objectFit && objectFit !== 'cover') {
    css += `.${className} { object-fit: ${objectFit}; }\n`;
  }
  if (objectPosition && objectPosition !== 'center') {
    css += `.${className} { object-position: ${objectPosition}; }\n`;
  }

  // Border CSS
  if (border) {
    css += buildBorderCSS(className, border, resolveToken);
  }

  // Border Radius CSS (separate from border)
  if (borderRadius) {
    css += buildBorderRadiusCSS(className, borderRadius);
  }

  // Shadow CSS
  if (shadow) {
    css += buildShadowCSS(className, shadow);
  }

  // Background CSS
  if (backgroundColor || backgroundImage) {
    css += buildBackgroundCSS(className, {
      backgroundColor,
      backgroundImage,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
    });
  }

  return css;
}

/**
 * Generate flex layout CSS
 */
function buildFlexCSS(
  className: string,
  options: {
    direction?: string;
    justify?: string;
    align?: string;
    wrap?: string;
    flexGap?: ResponsiveGapValue;
  }
): string {
  const { direction = 'row', justify = 'start', align = 'stretch', wrap = 'nowrap', flexGap } = options;

  const justifyMap: Record<string, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  const alignMap: Record<string, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  };

  let css = `
    .${className} {
      flex-direction: ${direction};
      justify-content: ${justifyMap[justify] || justify};
      align-items: ${alignMap[align] || align};
      flex-wrap: ${wrap};
    }
  `;

  // Add responsive gap CSS if provided
  if (flexGap) {
    css += generateResponsiveGapCSS(className, flexGap);
  }

  return css;
}

/**
 * Generate grid layout CSS
 */
function buildGridCSS(
  className: string,
  options: {
    numColumns?: ResponsiveGridColumnsValue;
    gridGap?: ResponsiveGridGapValue;
    alignItems?: string;
  }
): string {
  const { numColumns, gridGap, alignItems = 'stretch' } = options;

  const alignMap: Record<string, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    stretch: 'stretch',
  };

  let rules = '';

  if (numColumns) {
    rules += generateGridColumnsCSS(className, numColumns);
  }

  if (gridGap) {
    rules += generateGridGapCSS(className, gridGap);
  }

  // align-items is not responsive today; keep simple rule
  if (alignItems) {
    rules += `.${className} { align-items: ${alignMap[alignItems] || alignItems}; }\n`;
  }

  return rules;
}

/**
 * Generate border CSS (per-side support)
 */
function buildBorderCSS(className: string, border: BorderValue, resolver?: ThemeResolver): string {
  const { top, right, bottom, left, unit = 'px' } = border;

  // Helper to build border shorthand for a side
  const buildSide = (side: { width: string; style: string; color: ColorPickerValue | string } | undefined) => {
    if (!side || side.style === 'none' || side.width === '0') return 'none';
    const colorValue = resolveColorValue(side.color, resolver);
    return `${side.width}${unit} ${side.style} ${colorValue}`;
  };

  const topBorder = buildSide(top);
  const rightBorder = buildSide(right);
  const bottomBorder = buildSide(bottom);
  const leftBorder = buildSide(left);

  // If all sides are the same, use shorthand
  if (topBorder === rightBorder && rightBorder === bottomBorder && bottomBorder === leftBorder) {
    if (topBorder === 'none') return '';
    return `
    .${className} {
      border: ${topBorder};
    }
  `;
  }

  // Otherwise, set each side individually
  const rules: string[] = [];
  if (topBorder !== 'none') rules.push(`border-top: ${topBorder};`);
  if (rightBorder !== 'none') rules.push(`border-right: ${rightBorder};`);
  if (bottomBorder !== 'none') rules.push(`border-bottom: ${bottomBorder};`);
  if (leftBorder !== 'none') rules.push(`border-left: ${leftBorder};`);

  if (rules.length === 0) return '';

  return `
    .${className} {
      ${rules.join('\n      ')}
    }
  `;
}

/**
 * Generate border-radius CSS (per-corner support)
 */
function buildBorderRadiusCSS(className: string, radius: BorderRadiusValue): string {
  const { topLeft, topRight, bottomRight, bottomLeft, unit = 'px' } = radius;

  // Skip if all are 0
  if (topLeft === '0' && topRight === '0' && bottomRight === '0' && bottomLeft === '0') {
    return '';
  }

  // If all corners are the same, use shorthand
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return `
    .${className} {
      border-radius: ${topLeft}${unit};
    }
  `;
  }

  // Otherwise, use full border-radius (clockwise: TL TR BR BL)
  return `
    .${className} {
      border-radius: ${topLeft}${unit} ${topRight}${unit} ${bottomRight}${unit} ${bottomLeft}${unit};
    }
  `;
}

/**
 * Generate box-shadow CSS
    resolveToken,
 */
function buildShadowCSS(className: string, shadow: ShadowValue): string {
  if (!shadow || shadow.preset === 'none') return '';

  let shadowValue: string | undefined;

  if (shadow.preset === 'custom' && shadow.custom) {
    shadowValue = shadow.custom;
  } else {
    const presets: Record<string, string> = {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };
    shadowValue = presets[shadow.preset];
  }

  return shadowValue
    ? `
    .${className} {
      box-shadow: ${shadowValue};
    }
  `
    : '';
}

/**
 * Generate background CSS (color and image)
 */
function buildBackgroundCSS(
  className: string,
  options: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
  }
): string {
  const { backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat } = options;

  const rules: string[] = [];

  if (backgroundColor && backgroundColor !== '') {
    rules.push(`background-color: ${backgroundColor};`);
  }

  if (backgroundImage) {
    rules.push(`background-image: url(${backgroundImage});`);
    rules.push(`background-size: ${backgroundSize || 'cover'};`);
    rules.push(`background-position: ${backgroundPosition || 'center'};`);
    rules.push(`background-repeat: ${backgroundRepeat || 'no-repeat'};`);
  }

  return rules.length > 0
    ? `
    .${className} {
      ${rules.join('\n      ')}
    }
  `
    : '';
}

// ============================================================================
// Typography CSS Builder
// ============================================================================

export interface TypographyCSSOptions {
  className: string;
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;

  // Layout advanced
  position?: ResponsivePositionValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;

  // Typography specific
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string; // Already resolved color value
  backgroundColor?: string; // Already resolved color value
  fontWeight?: string;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
  // Interaction
  cursor?: 'auto' | 'pointer' | 'default' | 'text' | 'move' | 'not-allowed';
  transition?: { duration?: string; easing?: string; properties?: string };
}

/**
 * Generates all CSS for a typography component (Heading, Text)
 */
export function buildTypographyCSS(options: TypographyCSSOptions & { resolveToken?: ThemeResolver }): string {
  const {
    className,
    display,
    width,
    maxWidth,
    maxHeight,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    position,
    zIndex,
    opacity,
    overflow,
    visibility,
    textAlign = 'left',
    color,
    backgroundColor,
    fontWeight,
    lineHeight,
    letterSpacing,
    textTransform,
    textDecoration,
    textDecorationStyle,
    cursor,
    transition,
    resolveToken,
  } = options;

  let css = '';

  // Display CSS
  if (display) {
    css += generateDisplayCSS(className, display);
  }

  // Width CSS
  if (width) {
    css += generateWidthCSS(className, width);
  }

  // Max Width CSS
  if (maxWidth) {
    css += generateMaxWidthCSS(className, maxWidth);
  }

  // Max Height CSS
  if (maxHeight) {
    css += generateMaxHeightCSS(className, maxHeight);
  }

  // Spacing CSS
  if (padding) {
    css += generatePaddingCSS(className, padding);
  }
  if (margin) {
    css += generateMarginCSS(className, margin);
  }

  // Border CSS
  if (border) {
    css += buildBorderCSS(className, border, resolveToken);
  }

  // Border Radius CSS
  if (borderRadius) {
    css += buildBorderRadiusCSS(className, borderRadius);
  }

  // Shadow CSS
  if (shadow) {
    css += buildShadowCSS(className, shadow);
  }

  // Layout advanced CSS
  if (position) {
    css += generatePositionCSS(className, position);
  }
  if (zIndex) {
    css += generateZIndexCSS(className, zIndex);
  }
  if (opacity) {
    css += generateOpacityCSS(className, opacity);
  }
  if (overflow) {
    css += generateOverflowCSS(className, overflow);
  }
  if (visibility) {
    css += generateVisibilityCSS(className, visibility);
  }

  // Responsive typography properties (line-height, letter-spacing)
  if (lineHeight) {
    css += generateLineHeightCSS(className, lineHeight);
  }

  if (letterSpacing) {
    css += generateLetterSpacingCSS(className, letterSpacing);
  }

  // Typography-specific CSS (non-responsive)
  const textRules: string[] = [`text-align: ${textAlign};`];

  if (color) {
    textRules.push(`color: ${color};`);
  }
  if (backgroundColor) {
    textRules.push(`background-color: ${backgroundColor};`);
  }
  if (fontWeight) {
    textRules.push(`font-weight: ${fontWeight};`);
  }
  if (textTransform && textTransform !== 'none') {
    textRules.push(`text-transform: ${textTransform};`);
  }
  if (textDecoration && textDecoration !== 'none') {
    textRules.push(`text-decoration: ${textDecoration};`);
    if (textDecorationStyle) {
      textRules.push(`text-decoration-style: ${textDecorationStyle};`);
    }
  }
  if (cursor) {
    textRules.push(`cursor: ${cursor};`);
  }
  if (transition) {
    const props = transition.properties || 'all';
    const dur = transition.duration || '300ms';
    const ease = transition.easing || 'ease';
    textRules.push(`transition: ${props} ${dur} ${ease};`);
  }

  css += `
    .${className} {
      ${textRules.join('\n      ')}
    }
  `;

  // Ensure text-decoration appears in the Puck editor overlay span as well
  // The inline text editor renders content within a span using a portal
  // which can prevent decorations from visually propagating. Target common
  // descendants (including the overlay span) to reflect the decoration.
  if (textDecoration && textDecoration !== 'none') {
    css += `
      .${className} *, .${className} [data-puck-overlay-portal="true"] {
        text-decoration: ${textDecoration} !important;
        ${textDecorationStyle ? `text-decoration-style: ${textDecorationStyle} !important;` : ''}
      }
    `;
  }

  return css;
}
