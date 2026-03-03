import type { MenuItem } from '@/shared/services/api/navigations';
import type {
  BorderRadiusValue,
  BorderValue,
  ColorValue,
  FontWeightValue,
  ResponsiveDisplayValue,
  ResponsiveFlexDirectionValue,
  ResponsiveFontSizeValue,
  ResponsiveGapValue,
  ResponsiveLetterSpacingValue,
  ResponsiveLineHeightValue,
  ResponsiveOpacityValue,
  ResponsiveOverflowValue,
  ResponsiveMaxWidthValue,
  PositionOffsetValue,
  ResponsivePositionOffsetValue,
  ResponsivePositionValue,
  ResponsiveSpacingValue,
  ResponsiveTransformValue,
  ResponsiveValue,
  ResponsiveVisibilityValue,
  ResponsiveWidthValue,
  ResponsiveZIndexValue,
  ShadowValue,
  WidthValue,
} from '../../../fields';

export type MobileVariant = 'drawer' | 'fullscreen' | 'dropdown';
export type MobileBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

export const MOBILE_BREAKPOINTS: Record<MobileBreakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export interface TransitionValue {
  duration: string;
  easing: string;
  properties: string;
}

export interface NavigationMenuProps {
  id?: string;

  navigationId?: number;
  placeholderItems?: MenuItem[];

  customClassName?: string;
  customId?: string;
  customCss?: string;

  display?: ResponsiveDisplayValue;
  direction?: ResponsiveFlexDirectionValue;
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGap?: ResponsiveGapValue;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  backgroundColor?: ResponsiveValue<ColorValue>;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  positionOffset?: ResponsivePositionOffsetValue;
  transform?: ResponsiveTransformValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;

  itemColor?: ResponsiveValue<ColorValue>;
  itemHoverColor?: ResponsiveValue<ColorValue>;
  itemActiveColor?: ResponsiveValue<ColorValue>;
  itemBackgroundColor?: ResponsiveValue<ColorValue>;
  itemHoverBackgroundColor?: ResponsiveValue<ColorValue>;
  itemActiveBackgroundColor?: ResponsiveValue<ColorValue>;
  itemPadding?: ResponsiveSpacingValue;
  fontFamily?: string;
  fontSize?: ResponsiveFontSizeValue;
  fontWeight?: FontWeightValue;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  itemBorderRadius?: BorderRadiusValue;
  cursor?: 'default' | 'auto' | 'pointer' | 'text' | 'move' | 'not-allowed';
  transition?: TransitionValue;

  subItemColor?: ResponsiveValue<ColorValue>;
  subItemHoverColor?: ResponsiveValue<ColorValue>;
  subItemBackgroundColor?: ResponsiveValue<ColorValue>;
  subItemHoverBackgroundColor?: ResponsiveValue<ColorValue>;
  subItemPadding?: ResponsiveSpacingValue;
  subFontFamily?: string;
  subFontSize?: ResponsiveFontSizeValue;
  subFontWeight?: FontWeightValue;
  dropdownBackgroundColor?: ResponsiveValue<ColorValue>;
  dropdownBorderRadius?: BorderRadiusValue;
  dropdownShadow?: ShadowValue;
  dropdownMinWidth?: WidthValue;

  mobileBreakpoint?: MobileBreakpoint;
  mobileVariant?: MobileVariant;
  drawerWidth?: WidthValue;
  drawerBackgroundColor?: ResponsiveValue<ColorValue>;
  drawerOverlayColor?: ResponsiveValue<ColorValue>;
  drawerOverlayOpacity?: number;
  closeButtonColor?: ResponsiveValue<ColorValue>;
  closeButtonBackgroundColor?: ResponsiveValue<ColorValue>;
  closeButtonSize?: WidthValue;
  closeButtonIconSize?: number;
  closeButtonOffset?: PositionOffsetValue;
  navItemsPadding?: ResponsiveSpacingValue;
  navItemsMargin?: ResponsiveSpacingValue;
  toggleColor?: ResponsiveValue<ColorValue>;
  toggleIconSize?: number;
}

export interface NavCssOptions {
  className: string;

  display?: ResponsiveDisplayValue;
  direction?: ResponsiveFlexDirectionValue;
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGap?: ResponsiveGapValue;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  positionOffset?: ResponsivePositionOffsetValue;
  transform?: ResponsiveTransformValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;
  backgroundColor?: ResponsiveValue<string> | string;

  itemColor?: ResponsiveValue<string> | string;
  itemHoverColor?: ResponsiveValue<string> | string;
  itemActiveColor?: ResponsiveValue<string> | string;
  itemBackgroundColor?: ResponsiveValue<string> | string;
  itemHoverBackgroundColor?: ResponsiveValue<string> | string;
  itemActiveBackgroundColor?: ResponsiveValue<string> | string;
  itemPadding?: ResponsiveSpacingValue;
  fontFamily?: string;
  fontSize?: ResponsiveFontSizeValue;
  fontWeight?: string;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  itemBorderRadius?: BorderRadiusValue;
  cursor?: 'default' | 'auto' | 'pointer' | 'text' | 'move' | 'not-allowed';
  transition?: TransitionValue;

  subItemColor?: ResponsiveValue<string> | string;
  subItemHoverColor?: ResponsiveValue<string> | string;
  subItemBackgroundColor?: ResponsiveValue<string> | string;
  subItemHoverBackgroundColor?: ResponsiveValue<string> | string;
  subItemPadding?: ResponsiveSpacingValue;
  subFontFamily?: string;
  subFontSize?: ResponsiveFontSizeValue;
  subFontWeight?: string;
  dropdownBackgroundColor?: ResponsiveValue<string> | string;
  dropdownBorderRadius?: BorderRadiusValue;
  dropdownShadow?: ShadowValue;
  dropdownMinWidth?: WidthValue;

  mobileBreakpoint?: MobileBreakpoint;
  mobileVariant?: MobileVariant;
  drawerWidth?: WidthValue;
  drawerBackgroundColor?: ResponsiveValue<string> | string;
  drawerOverlayColor?: ResponsiveValue<string> | string;
  drawerOverlayOpacity?: number;
  closeButtonColor?: ResponsiveValue<string> | string;
  closeButtonBackgroundColor?: ResponsiveValue<string> | string;
  closeButtonSize?: WidthValue;
  closeButtonIconSize?: number;
  closeButtonOffset?: PositionOffsetValue;
  navItemsPadding?: ResponsiveSpacingValue;
  navItemsMargin?: ResponsiveSpacingValue;
  toggleColor?: ResponsiveValue<string> | string;
  toggleIconSize?: number;

  customCss?: string;
}
