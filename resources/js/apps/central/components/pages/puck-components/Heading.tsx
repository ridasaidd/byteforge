import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingValue, BorderValue, ShadowValue, WidthValue, DisplayValue,
  ColorValue, FontSizeValue, FontWeightValue
} from './fields';
import { typographyControls } from './controlPresets';

export interface HeadingProps {
  text: string;
  level: '1' | '2' | '3' | '4' | '5' | '6';
  align: 'left' | 'center' | 'right';
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontSize?: FontSizeValue;
  fontWeight?: FontWeightValue;
  width?: WidthValue;
  display?: DisplayValue;
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function HeadingComponent({ text, level, align, color, backgroundColor, fontSize, fontWeight, width, display = 'block', margin, padding, border, shadow, customCss }: HeadingProps) {
  const { resolve } = useTheme();
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  // Resolve color from theme or use custom (with legacy string support)
  const resolvedColor = typeof color === 'string'
    ? (color as string).startsWith('#') ? color : resolve(color)
    : color?.type === 'theme' && color.value
    ? (typeof color.value === 'string' && color.value.startsWith('#')) ? color.value : resolve(color.value)
    : color?.type === 'custom'
    ? color.value
    : resolve(`components.heading.colors.default`);

  // Resolve background color (with legacy string support)
  const resolvedBackgroundColor = typeof backgroundColor === 'string'
    ? (backgroundColor as string).startsWith('#') ? backgroundColor : resolve(backgroundColor)
    : backgroundColor?.type === 'theme' && backgroundColor.value
    ? (typeof backgroundColor.value === 'string' && backgroundColor.value.startsWith('#')) ? backgroundColor.value : resolve(backgroundColor.value)
    : backgroundColor?.type === 'custom'
    ? backgroundColor.value
    : 'transparent';

  // Resolve font size - use custom or theme, with fallback to level-based size
  const levelFontSizeMap = {
    '1': 'typography.fontSize.5xl',
    '2': 'typography.fontSize.4xl',
    '3': 'typography.fontSize.3xl',
    '4': 'typography.fontSize.2xl',
    '5': 'typography.fontSize.xl',
    '6': 'typography.fontSize.lg',
  };

  const resolvedFontSize = fontSize?.type === 'custom'
    ? fontSize.value
    : fontSize?.type === 'theme' && fontSize.value
    ? resolve(fontSize.value)
    : resolve(levelFontSizeMap[level]);

  // Resolve font weight - use custom or theme, with fallback to level-based weight
  const levelFontWeightMap = {
    '1': 'typography.fontWeight.bold',
    '2': 'typography.fontWeight.bold',
    '3': 'typography.fontWeight.semibold',
    '4': 'typography.fontWeight.semibold',
    '5': 'typography.fontWeight.medium',
    '6': 'typography.fontWeight.medium',
  };

  const resolvedFontWeight = fontWeight?.type === 'custom'
    ? fontWeight.value
    : fontWeight?.type === 'theme' && fontWeight.value
    ? resolve(fontWeight.value)
    : resolve(levelFontWeightMap[level]);

  // Helper functions
  const spacingToCss = (spacing: SpacingValue | undefined) => {
    if (!spacing) return {};
    return {
      marginTop: `${spacing.top}${spacing.unit}`,
      marginRight: `${spacing.right}${spacing.unit}`,
      marginBottom: `${spacing.bottom}${spacing.unit}`,
      marginLeft: `${spacing.left}${spacing.unit}`,
    };
  };

  const paddingToCss = (spacing: SpacingValue | undefined) => {
    if (!spacing) return {};
    return {
      paddingTop: `${spacing.top}${spacing.unit}`,
      paddingRight: `${spacing.right}${spacing.unit}`,
      paddingBottom: `${spacing.bottom}${spacing.unit}`,
      paddingLeft: `${spacing.left}${spacing.unit}`,
    };
  };

  const borderToCss = (borderVal: BorderValue | undefined) => {
    if (!borderVal || borderVal.style === 'none') return {};
    return {
      border: `${borderVal.width}${borderVal.unit} ${borderVal.style} ${borderVal.color}`,
      borderRadius: `${borderVal.radius}${borderVal.unit}`,
    };
  };

  const shadowToCss = (shadowVal: ShadowValue | undefined) => {
    if (!shadowVal || shadowVal.preset === 'none') return {};
    if (shadowVal.preset === 'custom') return { boxShadow: shadowVal.custom };
    const shadows: Record<string, string> = {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };
    return { boxShadow: shadows[shadowVal.preset] };
  };

  // Convert WidthValue to CSS value
  const widthToCss = (w: WidthValue | undefined) => {
    if (!w) return undefined; // No width set - use natural content width
    return w.value === 'auto' ? 'auto' : `${w.value}${w.unit}`;
  };

  const styles: React.CSSProperties = {
    color: resolvedColor,
    backgroundColor: resolvedBackgroundColor,
    fontSize: resolvedFontSize,
    fontWeight: resolvedFontWeight,
    textAlign: align,
    display: display || 'block',
    ...(widthToCss(width) ? { width: widthToCss(width) } : {}),
    margin: 0,
    ...spacingToCss(margin),
    ...paddingToCss(padding),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  return (
    <>
      <Tag style={styles}>{text}</Tag>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Heading: ComponentConfig<HeadingProps> = {
  label: 'Heading',
  fields: {
    text: {
      type: 'text',
      label: 'Heading Text',
      contentEditable: true,
    },
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
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    // Spread typography controls (color, fontSize, fontWeight, spacing, visual effects)
    ...typographyControls,
    customCss: {
      type: 'textarea',
      label: 'Custom CSS',
    },
  },
  defaultProps: {
    text: 'Heading',
    level: '2',
    align: 'left',
    color: { type: 'theme', value: 'components.heading.colors.default' },
    display: 'block',
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <HeadingComponent {...props} />,
};
