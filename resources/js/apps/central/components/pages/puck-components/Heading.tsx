import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingControl, BorderControl, ShadowControl,
  SpacingValue, BorderValue, ShadowValue
} from './fields';

export interface HeadingProps {
  text: string;
  level: '1' | '2' | '3' | '4' | '5' | '6';
  align: 'left' | 'center' | 'right';
  color: 'default' | 'primary' | 'secondary' | 'muted';
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function HeadingComponent({ text, level, align, color, margin, padding, border, shadow, customCss }: HeadingProps) {
  const { resolve } = useTheme();
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  // Get theme color for the heading
  const themeColor = resolve(`components.heading.colors.${color}`);

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

  // Get font size based on level
  const fontSizeMap = {
    '1': resolve('typography.fontSize.5xl'),
    '2': resolve('typography.fontSize.4xl'),
    '3': resolve('typography.fontSize.3xl'),
    '4': resolve('typography.fontSize.2xl'),
    '5': resolve('typography.fontSize.xl'),
    '6': resolve('typography.fontSize.lg'),
  };

  // Get font weight based on level
  const fontWeightMap = {
    '1': resolve('typography.fontWeight.bold'),
    '2': resolve('typography.fontWeight.bold'),
    '3': resolve('typography.fontWeight.semibold'),
    '4': resolve('typography.fontWeight.semibold'),
    '5': resolve('typography.fontWeight.medium'),
    '6': resolve('typography.fontWeight.medium'),
  };

  const styles: React.CSSProperties = {
    color: themeColor,
    fontSize: fontSizeMap[level],
    fontWeight: fontWeightMap[level],
    textAlign: align,
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
    color: {
      type: 'select',
      label: 'Color',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Muted', value: 'muted' },
      ],
    },
    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => {
        const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} />;
      },
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => {
        const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} allowNegative={false} />;
      },
    },
    border: {
      type: 'custom',
      label: 'Border',
      render: (props) => {
        const { value = { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' }, onChange } = props;
        return <BorderControl {...props} value={value} onChange={onChange} />;
      },
    },
    shadow: {
      type: 'custom',
      label: 'Shadow',
      render: (props) => {
        const { value = { preset: 'none' }, onChange } = props;
        return <ShadowControl {...props} value={value} onChange={onChange} />;
      },
    },
    customCss: {
      type: 'textarea',
      label: 'Custom CSS',
    },
  },
  defaultProps: {
    text: 'Heading',
    level: '2',
    align: 'left',
    color: 'default',
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <HeadingComponent {...props} />,
};
