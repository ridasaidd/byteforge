import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingControl, AlignmentControl, BorderControl, ShadowControl,
  SpacingValue, AlignmentValue, BorderValue, ShadowValue
} from './fields';

export interface ContainerProps {
  content?: () => React.ReactElement;
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding: 'none' | 'sm' | 'md' | 'lg';
  alignment?: AlignmentValue;
  margin?: SpacingValue;
  customPadding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function ContainerComponent({ content: Content, maxWidth, padding, alignment, margin, customPadding, border, shadow, customCss }: ContainerProps) {
  const { resolve } = useTheme();

  // Get theme values
  const maxWidthValue = resolve(`components.container.maxWidths.${maxWidth}`);
  const paddingValue = resolve(`components.container.padding.${padding}`);

  // Helper to convert spacing value to CSS
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

  // Helper for border
  const borderToCss = (borderVal: BorderValue | undefined) => {
    if (!borderVal || borderVal.style === 'none') return {};
    return {
      border: `${borderVal.width}${borderVal.unit} ${borderVal.style} ${borderVal.color}`,
      borderRadius: `${borderVal.radius}${borderVal.unit}`,
    };
  };

  // Helper for shadow
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

  const styles: React.CSSProperties = {
    maxWidth: maxWidthValue,
    margin: '0 auto',
    // Default padding from theme (can be overridden)
    ...(customPadding ? paddingToCss(customPadding) : {
      padding: paddingValue,
    }),
    // Advanced controls
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
    // Alignment
    ...(alignment ? {
      display: 'flex',
      flexDirection: 'column',
      alignItems: alignment.horizontal === 'left' ? 'flex-start' :
                  alignment.horizontal === 'center' ? 'center' :
                  alignment.horizontal === 'right' ? 'flex-end' : 'flex-start',
      ...(alignment.vertical ? {
        justifyContent: alignment.vertical === 'top' ? 'flex-start' :
                       alignment.vertical === 'middle' ? 'center' :
                       alignment.vertical === 'bottom' ? 'flex-end' : 'flex-start',
      } : {}),
    } : {}),
  };

  return (
    <>
      <div style={styles}>
        {Content && <Content />}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Container: ComponentConfig<ContainerProps> = {
  label: 'Container',
  fields: {
    content: {
      type: 'slot',
      label: 'Content',
    },
    maxWidth: {
      type: 'select',
      label: 'Max Width',
      options: [
        { label: 'Small (640px)', value: 'sm' },
        { label: 'Medium (768px)', value: 'md' },
        { label: 'Large (1024px)', value: 'lg' },
        { label: 'Extra Large (1280px)', value: 'xl' },
        { label: 'Full Width', value: 'full' },
      ],
    },
    padding: {
      type: 'select',
      label: 'Padding',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    alignment: {
      type: 'custom',
      label: 'Alignment',
      render: (props) => {
        const { value = { horizontal: 'left' }, onChange } = props;
        return <AlignmentControl {...props} value={value} onChange={onChange} showVertical={true} />;
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
    customPadding: {
      type: 'custom',
      label: 'Custom Padding',
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
    maxWidth: 'lg',
    padding: 'md',
    alignment: { horizontal: 'left' },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    customPadding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <ContainerComponent {...props} />,
};
