import type { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  type BorderValue,
  type BorderRadiusValue,
  type ShadowValue,
  type ColorValue,
  type ResponsiveWidthValue,
  type ResponsiveSpacingValue,
  type ResponsiveDisplayValue,
  type ResponsivePositionValue,
  type ResponsiveZIndexValue,
  type ResponsiveOpacityValue,
  type ResponsiveOverflowValue,
  // Field groups
  displayField,
  layoutFields,
  textAlignField,
  backgroundFields,
  spacingFields,
  layoutAdvancedFields,
  interactionFields,
  effectsFields,
  advancedFields,
  // Utilities
  extractDefaults,
  buildTypographyCSS,
  ColorPickerControl,
} from '../../fields';
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
  id?: string;
  title: string;
  description: string;
  icon?: string;
  mode: 'flat' | 'card';
  iconColor?: ColorValue;
  titleColor?: ColorValue;
  descriptionColor?: ColorValue;
  backgroundColor?: ColorValue;
  textAlign?: 'left' | 'center' | 'right';
  width?: ResponsiveWidthValue;
  display?: ResponsiveDisplayValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;
  customCss?: string;
  cursor?: 'auto' | 'pointer' | 'default' | 'text' | 'move' | 'not-allowed';
  transition?: { duration?: string; easing?: string; properties?: string };
};

// eslint-disable-next-line react-refresh/only-export-components
function CardComponent({
  id,
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
  display = { mobile: 'block' },
  padding,
  margin,
  border,
  borderRadius,
  shadow,
  position,
  zIndex,
  opacity,
  overflow,
  cursor,
  transition,
  customCss,
  puck,
}: CardProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const className = `card-${id}`;

  // Resolve color helper
  const resolveColor = (colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (typeof colorVal === 'string') {
      return (colorVal as string).startsWith('#') ? (colorVal as string) : resolve(colorVal as string, fallback);
    }
    if (colorVal && typeof colorVal === 'object' && 'type' in colorVal) {
      if (colorVal.type === 'custom' && 'value' in colorVal) {
        return (colorVal.value as string) || fallback;
      }
      if (colorVal.type === 'theme' && 'value' in colorVal && colorVal.value) {
        const val = colorVal.value as string;
        return val.startsWith('#') ? val : resolve(val, fallback);
      }
    }
    return fallback;
  };

  // Resolve colors
  const resolvedBackgroundColor = resolveColor(backgroundColor, mode === 'card' ? '#FFFFFF' : 'transparent');
  const resolvedIconColor = resolveColor(iconColor, resolve('colors.primary.500', '#3B82F6'));
  const resolvedTitleColor = resolveColor(titleColor, resolve('colors.foreground', '#111827'));
  const resolvedDescriptionColor = resolveColor(descriptionColor, resolve('colors.muted', '#6B7280'));

  // Generate CSS using centralized builder
  const css = buildTypographyCSS({
    className,
    display,
    width,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    position,
    zIndex,
    opacity,
    overflow,
    textAlign: textAlign || 'left',
    backgroundColor: resolvedBackgroundColor,
    cursor,
    transition,
  });

  const IconComponent = icon && iconMap[icon] ? iconMap[icon] : null;

  return (
    <>
      <style>{css}</style>
      <div ref={puck?.dragRef} className={className}>
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
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Card-specific color fields
const cardColorFields = {
  iconColor: {
    type: 'custom' as const,
    label: 'Icon Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'theme' as const, value: 'colors.primary.500' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'colors.primary.500' },
  },
  titleColor: {
    type: 'custom' as const,
    label: 'Title Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'theme' as const, value: 'colors.foreground' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'colors.foreground' },
  },
  descriptionColor: {
    type: 'custom' as const,
    label: 'Description Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'theme' as const, value: 'colors.muted' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'colors.muted' },
  },
};

// Card content fields
const cardContentFields = {
  title: { type: 'text' as const, label: 'Title', defaultValue: 'Feature Title' },
  description: { type: 'textarea' as const, label: 'Description', defaultValue: 'Describe your feature or service here with engaging and clear text.' },
  icon: {
    type: 'select' as const,
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
    defaultValue: 'feather',
  },
  mode: {
    type: 'radio' as const,
    label: 'Style Mode',
    options: [
      { label: 'Flat', value: 'flat' },
      { label: 'Card', value: 'card' },
    ],
    defaultValue: 'card',
  },
};

// Component configuration using organized field groups
export const Card: ComponentConfig<CardProps> = {
  inline: true,
  label: 'Card',

  fields: {
    // Content
    ...cardContentFields,
    // Layout
    ...textAlignField,
    ...displayField,
    ...layoutFields,
    // Colors
    ...cardColorFields,
    // Background
    ...backgroundFields,
    // Spacing
    ...spacingFields,
    // Layout Advanced
    ...layoutAdvancedFields,
    // Interaction
    ...interactionFields,
    // Effects
    ...effectsFields,
    // Advanced
    ...advancedFields,
  },

  defaultProps: {
    ...extractDefaults(
      cardContentFields,
      textAlignField,
      displayField,
      layoutFields,
      cardColorFields,
      backgroundFields,
      spacingFields,
      layoutAdvancedFields,
      interactionFields,
      effectsFields,
      advancedFields
    ),
    title: 'Card Title',
    description: 'Card description goes here',
    mode: 'card',
  },

  render: CardComponent,
};
