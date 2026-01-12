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
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  textColorField,
  fontSizeField,
  fontWeightField,
  typographyAdvancedFields,
  textAlignField,
  backgroundFields,
  spacingFields,
  effectsFields,
  advancedFields,
  // Utilities
  extractDefaults,
  buildTypographyCSS,
  generateFontSizeCSS,
  ResponsiveVisibilityValue,
} from '../../fields';

export interface HeadingProps {
  id?: string;
  text: string;
  level: '1' | '2' | '3' | '4' | '5' | '6';
  align?: 'left' | 'center' | 'right';
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

function HeadingComponent({
  id,
  text,
  level,
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
}: HeadingProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const className = `heading-${id}`;

  // Resolve color helper
  const resolveColor = (colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
    return resolve(val, fallback);
  };

  // Level-based font weight defaults
  const levelFontWeightMap: Record<string, string> = {
    '1': 'typography.fontWeight.bold',
    '2': 'typography.fontWeight.bold',
    '3': 'typography.fontWeight.semibold',
    '4': 'typography.fontWeight.semibold',
    '5': 'typography.fontWeight.medium',
    '6': 'typography.fontWeight.medium',
  };

  // Resolve font weight
  const resolvedFontWeight =
    fontWeight?.type === 'custom'
      ? fontWeight.value
      : fontWeight?.type === 'theme' && fontWeight.value
        ? resolve(fontWeight.value)
        : resolve(levelFontWeightMap[level], '700');

  // Resolve colors
  const resolvedColor = resolveColor(color, resolve('components.heading.colors.default', 'inherit'));
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
      <Tag ref={puck?.dragRef} className={className}>
        {text}
      </Tag>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Component configuration using organized field groups
export const Heading: ComponentConfig<HeadingProps> = {
  label: 'Heading',
  inline: true,

  fields: {
    // Content
    text: { type: 'text', label: 'Heading Text', contentEditable: true },
    level: {
      type: 'select',
      label: 'Heading Level',
      options: [
        { label: 'H1 (Largest)', value: '1' },
        { label: 'H2', value: '2' },
        { label: 'H3', value: '3' },
        { label: 'H4', value: '4' },
        { label: 'H5', value: '5' },
        { label: 'H6 (Smallest)', value: '6' },
      ],
    },
    // Layout
    ...textAlignField,
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
    text: 'Heading',
    level: '2',
    ...extractDefaults(
      textAlignField,
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
    // Override specific defaults for Heading
    fontSize: { mobile: { type: 'custom', value: '32px' } },
    color: { type: 'theme', value: 'components.heading.colors.default' },
  },

  render: (props) => <HeadingComponent {...props} />,
};
