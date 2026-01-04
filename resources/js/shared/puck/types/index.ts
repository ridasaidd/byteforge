/**
 * Shared Puck Types
 *
 * Common types used across all Puck components in both tenant and central apps.
 */

export type { Config, Data, ComponentConfig } from '@measured/puck';

// Re-export Puck render context types
export type { PuckRenderContext, WithPuckProps } from './puck';

// Re-export field types from fields
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
} from '../fields';
