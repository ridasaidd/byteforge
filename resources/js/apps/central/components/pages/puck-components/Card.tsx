import type { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingValue, BorderValue, ShadowValue, WidthValue, DisplayValue, ColorValue
} from './fields';
import { compositeControls, textColorControl } from './controlPresets';
import {
  Feather, Heart, Star, Zap, Shield, CheckCircle,
  Users, TrendingUp, Award, Target, Box, Package,
  type LucideIcon,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  feather: Feather,
  heart: Heart,
  star: Star,
  zap: Zap,
  shield: Shield,
  checkCircle: CheckCircle,
  users: Users,
  trendingUp: TrendingUp,
  award: Award,
  target: Target,
  box: Box,
  package: Package,
};

export type CardProps = {
  title: string;
  description: string;
  icon?: string;
  mode: 'flat' | 'card';
  iconColor?: ColorValue;
  titleColor?: ColorValue;
  descriptionColor?: ColorValue;
  backgroundColor?: ColorValue;
  textAlign?: 'left' | 'center' | 'right';
  width?: WidthValue;
  display?: DisplayValue;
  padding?: SpacingValue;
  margin?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
};

function CardComponent({
  title,
  description,
  icon,
  mode,
  iconColor,
  titleColor,
  descriptionColor,
  backgroundColor,
  textAlign,
  width,
  display = 'block',
  padding,
  margin,
  border,
  shadow,
  customCss,
}: CardProps) {
  const { resolve } = useTheme();

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
    if (!w) return undefined;
    return w.value === 'auto' ? 'auto' : `${w.value}${w.unit}`;
  };

  // Resolve colors from theme or use custom
  const resolvedBackgroundColor = typeof backgroundColor === 'string'
    ? ((backgroundColor as string).startsWith('#') ? backgroundColor : resolve(backgroundColor))
    : backgroundColor?.type === 'theme' && backgroundColor.value
    ? resolve(backgroundColor.value)
    : backgroundColor?.type === 'custom'
    ? backgroundColor.value
    : (mode === 'card' ? '#FFFFFF' : 'transparent');

  const resolvedIconColor = typeof iconColor === 'string'
    ? ((iconColor as string).startsWith('#') ? iconColor : resolve(iconColor))
    : iconColor?.type === 'theme' && iconColor.value
    ? resolve(iconColor.value)
    : iconColor?.type === 'custom'
    ? iconColor.value
    : resolve('colors.primary.500', '#3B82F6');

  const resolvedTitleColor = typeof titleColor === 'string'
    ? ((titleColor as string).startsWith('#') ? titleColor : resolve(titleColor))
    : titleColor?.type === 'theme' && titleColor.value
    ? resolve(titleColor.value)
    : titleColor?.type === 'custom'
    ? titleColor.value
    : resolve('colors.foreground', '#111827');

  const resolvedDescriptionColor = typeof descriptionColor === 'string'
    ? ((descriptionColor as string).startsWith('#') ? descriptionColor : resolve(descriptionColor))
    : descriptionColor?.type === 'theme' && descriptionColor.value
    ? resolve(descriptionColor.value)
    : descriptionColor?.type === 'custom'
    ? descriptionColor.value
    : resolve('colors.muted', '#6B7280');

  const cardStyle: React.CSSProperties = {
    backgroundColor: resolvedBackgroundColor,
    textAlign: textAlign || 'left',
    display: display || 'block',
    ...(widthToCss(width) ? { width: widthToCss(width) } : {}),
    ...paddingToCss(padding),
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  const IconComponent = icon && iconMap[icon] ? iconMap[icon] : null;

  return (
    <div style={cardStyle} className={customCss}>
      {IconComponent && (
        <div style={{ marginBottom: '1rem', color: resolvedIconColor }}>
          <IconComponent size={40} strokeWidth={1.5} />
        </div>
      )}
      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem', color: resolvedTitleColor }}>
        {title}
      </h3>
      <p style={{ fontSize: '1rem', lineHeight: '1.625', color: resolvedDescriptionColor, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

export const Card: ComponentConfig<CardProps> = {
  label: 'Card',
  fields: {
    title: { type: 'text', label: 'Title' },
    description: { type: 'textarea', label: 'Description' },
    icon: {
      type: 'select',
      label: 'Icon',
      options: [
        { label: 'None', value: '' },
        { label: 'Feather', value: 'feather' },
        { label: 'Heart', value: 'heart' },
        { label: 'Star', value: 'star' },
        { label: 'Zap', value: 'zap' },
        { label: 'Shield', value: 'shield' },
        { label: 'Check Circle', value: 'checkCircle' },
        { label: 'Users', value: 'users' },
        { label: 'Trending Up', value: 'trendingUp' },
        { label: 'Award', value: 'award' },
        { label: 'Target', value: 'target' },
        { label: 'Box', value: 'box' },
        { label: 'Package', value: 'package' },
      ],
    },
    mode: {
      type: 'radio',
      label: 'Style Mode',
      options: [
        { label: 'Flat', value: 'flat' },
        { label: 'Card', value: 'card' },
      ],
    },
    textAlign: {
      type: 'radio',
      label: 'Text Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    // Color controls using ColorPickerControl for theme integration
    iconColor: {
      ...textColorControl,
      label: 'Icon Color',
    },
    titleColor: {
      ...textColorControl,
      label: 'Title Color',
    },
    descriptionColor: {
      ...textColorControl,
      label: 'Description Color',
    },
    // Spread composite controls (background, spacing, visual effects)
    ...compositeControls,
    customCss: { type: 'text', label: 'Custom CSS Class' },
  },
  defaultProps: {
    title: 'Feature Title',
    description: 'Describe your feature or service here with engaging and clear text.',
    icon: 'feather',
    mode: 'card',
    textAlign: 'left',
    display: 'block',
  },
  render: CardComponent,
};
