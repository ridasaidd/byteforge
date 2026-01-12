import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  ColorValue,
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  ResponsiveSpacingValue,
  ResponsiveFontSizeValue,
  ResponsiveWidthValue,
  ResponsiveMaxWidthValue,
  ResponsiveMaxHeightValue,
  ResponsiveDisplayValue,
  FontWeightValue,
  ResponsiveLineHeightValue,
  ResponsiveLetterSpacingValue,
  ResponsiveVisibilityValue,
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  textColorField,
  fontSizeField,
  fontWeightField,
  typographyAdvancedFields,
  backgroundFields,
  spacingFields,
  effectsFields,
  advancedFields,
  // Utilities
  extractDefaults,
  buildTypographyCSS,
  generateFontSizeCSS,
} from '../../fields';

export interface TextProps {
  id?: string;
  content: string;
  align: 'left' | 'center' | 'right' | 'justify';
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontSize?: ResponsiveFontSizeValue;
  fontWeight?: FontWeightValue;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;
  padding?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

function TextComponent({
  id,
  content,
  align,
  color,
  backgroundColor,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textTransform,
  textDecoration,
  textDecorationStyle,
  width,
  maxWidth,
  maxHeight,
  display,
  margin,
  padding,
  border,
  borderRadius,
  shadow,
  visibility,
  customCss,
  puck,
}: TextProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const className = `text-${id}`;

  // Resolve color helper
  const resolveColor = (colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
    return resolve(val, fallback);
  };

  // Resolve font weight
  const resolvedFontWeight =
    fontWeight?.type === 'custom'
      ? fontWeight.value
      : fontWeight?.type === 'theme' && fontWeight.value
        ? resolve(fontWeight.value)
        : resolve('typography.fontWeight.normal', '400');

  // Resolve colors
  const resolvedColor = resolveColor(color, resolve('components.text.colors.default', 'inherit'));
  const resolvedBgColor = resolveColor(backgroundColor, 'transparent');

  // Generate CSS using centralized builder
  const css = buildTypographyCSS({
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
    textAlign: align,
    color: resolvedColor,
    backgroundColor: resolvedBgColor,
    fontWeight: resolvedFontWeight,
    lineHeight,
    letterSpacing,
    textTransform,
    textDecoration,
    textDecorationStyle,
    visibility,
  });

  // Responsive font size (handled separately)
  const fontSizeCss = fontSize ? generateFontSizeCSS(className, fontSize) : '';

  return (
    <>
      <style>{css}</style>
      {fontSizeCss && <style>{fontSizeCss}</style>}
      <p ref={puck?.dragRef} className={className}>
        {content}
      </p>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Text alignment with justify option
const textAlignWithJustify = {
  align: {
    type: 'radio' as const,
    label: 'Alignment',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
      { label: 'Justify', value: 'justify' },
    ],
    defaultValue: 'left',
  },
};

// Component configuration using organized field groups
export const Text: ComponentConfig<TextProps> = {
  label: 'Text',
  inline: true,

  fields: {
    // Content
    content: { type: 'textarea', label: 'Text Content', contentEditable: true },
    // Layout
    ...textAlignWithJustify,
    ...displayField,
    ...layoutFields,
    ...layoutAdvancedFields,
    // Typography
    ...textColorField,
    ...fontSizeField,
    ...fontWeightField,
    ...typographyAdvancedFields,
    // Spacing
    ...spacingFields,
    // Background
    ...backgroundFields,
    // Effects
    ...effectsFields,
    // Advanced
    ...advancedFields,
  },

  defaultProps: {
    id: 'text-default',
    content: 'Enter your text here...',
    align: 'left',
    ...extractDefaults(
      textAlignWithJustify,
      displayField,
      layoutFields,
      textColorField,
      fontSizeField,
      fontWeightField,
      typographyAdvancedFields,
      layoutAdvancedFields,
      spacingFields,
      backgroundFields,
      effectsFields,
      advancedFields
    ),
    // Override specific defaults for Text
    color: { type: 'theme', value: 'components.text.colors.default' },
  },

  render: (props) => <TextComponent {...props} />,
};
