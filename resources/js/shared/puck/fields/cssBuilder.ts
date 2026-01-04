import {
  ResponsiveDisplayValue,
  ResponsiveWidthValue,
  ResponsiveSpacingValue,
  ResponsivePositionValue,
  ResponsiveZIndexValue,
  ResponsiveOpacityValue,
  ResponsiveOverflowValue,
  ResponsiveGridColumnsValue,
  ResponsiveGridGapValue,
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  generateDisplayCSS,
  generateWidthCSS,
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
} from './index';
import { hasFlexInAnyBreakpoint, hasGridInAnyBreakpoint } from './conditionalFields';
import { generateLineHeightCSS } from './ResponsiveLineHeightControl';
import { generateLetterSpacingCSS } from './ResponsiveLetterSpacingControl';

export interface LayoutCSSOptions {
  className: string;
  display?: ResponsiveDisplayValue;

  // Flex properties
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGap?: number;

  // Grid properties
  numColumns?: ResponsiveGridColumnsValue;
  gridGap?: ResponsiveGridGapValue;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';

  // Layout advanced
  position?: ResponsivePositionValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;

  // Common styling
  width?: ResponsiveWidthValue;
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
}

/**
 * Generates all CSS for a layout component (Box, Flex, Columns, etc.)
 * Centralizes CSS generation logic to avoid duplication
 */
export function buildLayoutCSS(options: LayoutCSSOptions): string {
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
    width,
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

  // Spacing CSS
  if (width) {
    css += generateWidthCSS(className, width);
  }
  if (padding) {
    css += generatePaddingCSS(className, padding);
  }
  if (margin) {
    css += generateMarginCSS(className, margin);
  }

  // Border CSS
  if (border) {
    css += buildBorderCSS(className, border);
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
    flexGap?: number;
  }
): string {
  const { direction = 'row', justify = 'start', align = 'stretch', wrap = 'nowrap', flexGap = 16 } = options;

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

  return `
    .${className} {
      flex-direction: ${direction};
      justify-content: ${justifyMap[justify] || justify};
      align-items: ${alignMap[align] || align};
      flex-wrap: ${wrap};
      gap: ${flexGap}px;
    }
  `;
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
function buildBorderCSS(className: string, border: BorderValue): string {
  const { top, right, bottom, left, unit = 'px' } = border;

  // Helper to build border shorthand for a side
  const buildSide = (side: { width: string; style: string; color: string } | undefined) => {
    if (!side || side.style === 'none' || side.width === '0') return 'none';
    return `${side.width}${unit} ${side.style} ${side.color}`;
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

  if (backgroundColor) {
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

  // Typography specific
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string; // Already resolved color value
  backgroundColor?: string; // Already resolved color value
  fontWeight?: string;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Interaction
  cursor?: 'auto' | 'pointer' | 'default' | 'text' | 'move' | 'not-allowed';
  transition?: { duration?: string; easing?: string; properties?: string };
}

/**
 * Generates all CSS for a typography component (Heading, Text)
 */
export function buildTypographyCSS(options: TypographyCSSOptions): string {
  const {
    className,
    display,
    width,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    position,
    zIndex,
    opacity,
    overflow,
    textAlign = 'left',
    color,
    backgroundColor,
    fontWeight,
    lineHeight,
    letterSpacing,
    textTransform,
    cursor,
    transition,
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

  // Spacing CSS
  if (padding) {
    css += generatePaddingCSS(className, padding);
  }
  if (margin) {
    css += generateMarginCSS(className, margin);
  }

  // Border CSS
  if (border) {
    css += buildBorderCSS(className, border);
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

  return css;
}
