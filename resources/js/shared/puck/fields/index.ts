export { SpacingControl, type SpacingValue } from './SpacingControl';
export { AlignmentControl, type AlignmentValue } from './AlignmentControl';
export { BorderControl, type BorderValue, type BorderSideValue } from './BorderControl';
export { BorderRadiusControl, type BorderRadiusValue } from './BorderRadiusControl';
export { ShadowControl, type ShadowValue } from './ShadowControl';
export { ColorPickerControl, type ColorPickerValue as ColorValue } from './ColorPickerControl';
export { WidthControl, type WidthValue } from './WidthControl';
export { DisplayControl, type DisplayValue } from './DisplayControl';
export { ZIndexControl, type ZIndexValue } from './ZIndexControl';
export { OpacityControl } from './OpacityControl';
export {
  ResponsiveDisplayControl,
  generateDisplayCSS,
  getDisplayBaseStyle,
  type ResponsiveDisplayValue,
} from './ResponsiveDisplayControl';
export {
  ResponsivePositionControl,
  generatePositionCSS,
  type ResponsivePositionValue,
  type PositionValue,
} from './ResponsivePositionControl';
export {
  ResponsiveOverflowControl,
  generateOverflowCSS,
  type ResponsiveOverflowValue,
  type OverflowValue,
} from './ResponsiveOverflowControl';
export {
  ResponsiveZIndexControl,
  generateZIndexCSS,
  type ResponsiveZIndexValue,
} from './ResponsiveZIndexControl';
export {
  ResponsiveOpacityControl,
  generateOpacityCSS,
  type ResponsiveOpacityValue,
} from './ResponsiveOpacityControl';
export {
  ResponsiveGridColumnsControl,
  generateGridColumnsCSS,
  type ResponsiveGridColumnsValue,
} from './ResponsiveGridColumnsControl';
export {
  ResponsiveGridGapControl,
  generateGridGapCSS,
  type ResponsiveGridGapValue,
} from './ResponsiveGridGapControl';
export { FontSizeControl, type FontSizeValue } from './FontSizeControl';
export { FontWeightControl, type FontWeightValue } from './FontWeightControl';

export {
  ResponsiveLineHeightControl,
  generateLineHeightCSS,
  type ResponsiveLineHeightValue,
  type LineHeightValue,
} from './ResponsiveLineHeightControl';

export {
  ResponsiveLetterSpacingControl,
  generateLetterSpacingCSS,
  type ResponsiveLetterSpacingValue,
  type LetterSpacingValue,
} from './ResponsiveLetterSpacingControl';

// Responsive system
export {
  ResponsiveWrapper,
  generateResponsiveCSS,
  getBaseValue,
  getBreakpointFromWidth,
  getValueForBreakpoint,
  isResponsiveValue,
  BREAKPOINTS,
  type ResponsiveObject,
  type ResponsiveValue,
  type Breakpoint,
} from './ResponsiveWrapper';

export {
  ResponsiveSpacingControl,
  generatePaddingCSS,
  generateMarginCSS,
  type ResponsiveSpacingValue,
} from './ResponsiveSpacingControl';

export {
  ResponsiveFontSizeControl,
  generateFontSizeCSS,
  type ResponsiveFontSizeValue,
} from './ResponsiveFontSizeControl';

export {
  ResponsiveWidthControl,
  generateWidthCSS,
  type ResponsiveWidthValue,
} from './ResponsiveWidthControl';

// Field groups - reusable field compositions (organized by usage frequency)
export {
  // Layout
  displayField,
  layoutFields,
  // Typography
  textColorField,
  fontSizeField,
  fontWeightField,
  typographyFields,
  typographyAdvancedFields,
  textAlignField,
  // Flex/Grid
  flexLayoutFields,
  gridLayoutFields,
  // Spacing
  spacingFields,
  // Background
  backgroundFields,
  backgroundImageFields,
  // Layout Advanced
  layoutAdvancedFields,
  // Effects
  effectsFields,
  // Interaction
  interactionFields,
  hoverStateFields,
  // Advanced
  advancedFields,
  // Custom styling
  customClassesFields,
  // Slot
  slotField,
  // Defaults
  DEFAULT_BORDER,
  DEFAULT_BORDER_RADIUS,
  // Legacy compatibility
  commonLayoutFields,
} from './fieldGroups';

// Conditional field helpers
export {
  hasDisplayModeInAnyBreakpoint,
  hasFlexInAnyBreakpoint,
  hasGridInAnyBreakpoint,
  createConditionalResolver,
  extractDefaults,
} from './conditionalFields';

// CSS builder
export { buildLayoutCSS, buildTypographyCSS } from './cssBuilder';
export type { LayoutCSSOptions, TypographyCSSOptions } from './cssBuilder';
