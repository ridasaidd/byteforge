import type { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingControl, BorderControl, ShadowControl,
  type SpacingValue, type BorderValue, type ShadowValue
} from './fields';
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
  iconColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
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

  const cardStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || (mode === 'card' ? '#FFFFFF' : 'transparent'),
    textAlign: textAlign || 'left',
    ...paddingToCss(padding),
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  const IconComponent = icon && iconMap[icon] ? iconMap[icon] : null;

  return (
    <div style={cardStyle} className={customCss}>
      {IconComponent && (
        <div style={{ marginBottom: '1rem', color: iconColor || resolve('colors.primary.500', '#3B82F6') }}>
          <IconComponent size={40} strokeWidth={1.5} />
        </div>
      )}
      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem', color: titleColor || resolve('colors.foreground', '#111827') }}>
        {title}
      </h3>
      <p style={{ fontSize: '1rem', lineHeight: '1.625', color: descriptionColor || resolve('colors.muted', '#6B7280'), margin: 0 }}>
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
    iconColor: { type: 'text', label: 'Icon Color' },
    titleColor: { type: 'text', label: 'Title Color' },
    descriptionColor: { type: 'text', label: 'Description Color' },
    backgroundColor: { type: 'text', label: 'Background Color' },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => {
        const { value = { top: '32', right: '24', bottom: '32', left: '24', unit: 'px', linked: false }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} />;
      },
    },
    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => {
        const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} />;
      },
    },
    border: {
      type: 'custom',
      label: 'Border',
      render: (props) => {
        const { value = { width: '1', style: 'solid', color: '#E5E7EB', radius: '8', unit: 'px' }, onChange } = props;
        return <BorderControl {...props} value={value} onChange={onChange} />;
      },
    },
    shadow: {
      type: 'custom',
      label: 'Shadow',
      render: (props) => {
        const { value = { preset: 'md' }, onChange } = props;
        return <ShadowControl {...props} value={value} onChange={onChange} />;
      },
    },
    customCss: { type: 'text', label: 'Custom CSS Class' },
  },
  defaultProps: {
    title: 'Feature Title',
    description: 'Describe your feature or service here with engaging and clear text.',
    icon: 'feather',
    mode: 'card',
    textAlign: 'left',
  },
  render: CardComponent,
};
