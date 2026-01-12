/**
 * Shared Puck Module
 *
 * Central export for all Puck-related code shared between apps.
 * Import from '@/shared/puck' to use these exports.
 */

// Components
export * from './components';

// Fields / Controls (exclude types that will be re-exported from types)
export {
  SpacingControl,
  AlignmentControl,
  BorderControl,
  ShadowControl,
  ColorPickerControl,
  ColorPickerControlColorful,
  ColorPickerControlColorful as ColorPicker,
  WidthControl,
  DisplayControl,
  FontSizeControl,
  FontWeightControl,
  ResponsiveWrapper,
  generateResponsiveCSS,
  getBreakpointFromWidth,
  getValueForBreakpoint,
  isResponsiveValue,
  BREAKPOINTS,
  ResponsiveSpacingControl,
  generatePaddingCSS,
  generateMarginCSS,
  ResponsiveFontSizeControl,
  generateFontSizeCSS,
  ResponsiveWidthControl,
  generateWidthCSS,
} from './fields';

// Config
export { puckConfig, default as config } from './config';

// Types from @measured/puck
export type { Config, Data, ComponentConfig } from '@measured/puck';

// Types from fields
export type {
  SpacingValue,
  ResponsiveSpacingValue,
  ColorValue,
  AlignmentValue,
  BorderValue,
  ShadowValue,
  DisplayValue,
  WidthValue,
  ResponsiveWidthValue,
  FontSizeValue,
  ResponsiveFontSizeValue,
  FontWeightValue,
  ResponsiveValue,
  Breakpoint,
} from './fields';

// Control Presets
export * from './controlPresets';
