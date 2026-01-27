import { ComponentConfig } from '@puckeditor/core';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
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

  // Resolve color helper - now uses CSS variables for theme values
  const resolveColor = (colorVal: ColorValue | undefined, cssVarFallback: string, defaultValue: string): string => {
    // No color specified - use CSS variable fallback
    if (!colorVal) return cssVarFallback;

    // Custom color (user selected) - use the value directly
    if (colorVal.type === 'custom') return colorVal.value;

    // Direct hex/rgb value - use it
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;

    // Theme path - try to map to CSS variable, fallback to resolve
    if (val) {
      // Check if it's a component default that we have as CSS variable
      if (val === 'components.heading.colors.default') {
        return 'var(--component-heading-color-default, ' + defaultValue + ')';
      }
      // Otherwise resolve from theme
      return resolve(val, defaultValue);
    }

    return defaultValue;
  };

  // Level-based font weight defaults - using CSS variables
  const levelFontWeightCssVarMap: Record<string, string> = {
    '1': 'var(--font-weight-bold, 700)',
    '2': 'var(--font-weight-bold, 700)',
    '3': 'var(--font-weight-semibold, 600)',
    '4': 'var(--font-weight-semibold, 600)',
    '5': 'var(--font-weight-medium, 500)',
    '6': 'var(--font-weight-medium, 500)',
  };

  const levelFontWeightResolveMap: Record<string, string> = {
    '1': 'typography.fontWeight.bold',
    '2': 'typography.fontWeight.bold',
    '3': 'typography.fontWeight.semibold',
    '4': 'typography.fontWeight.semibold',
    '5': 'typography.fontWeight.medium',
    '6': 'typography.fontWeight.medium',
  };

  // Resolve font weight - prefer CSS variables for theme defaults
  const resolvedFontWeight =
    fontWeight?.type === 'custom'
      ? fontWeight.value
      : fontWeight?.type === 'theme' && fontWeight.value
        ? resolve(fontWeight.value) // User selected from theme - resolve
        : levelFontWeightCssVarMap[level]; // Default - use CSS variable

  // Resolve colors - use CSS variables for defaults
  const resolvedColor = resolveColor(
    color,
    'var(--component-heading-color-default, inherit)',
    'inherit'
  );
  const resolvedBgColor = resolveColor(backgroundColor, 'transparent', 'transparent');

  // Detect if we're in edit mode
  const isEditing = usePuckEditMode();

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
      {/* Only inject runtime CSS in edit mode - storefront uses pre-generated CSS from file */}
      {isEditing && <style>{css}</style>}
      {isEditing && fontSizeCss && <style>{fontSizeCss}</style>}
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
