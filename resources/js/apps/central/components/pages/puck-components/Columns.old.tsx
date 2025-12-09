import { ComponentConfig } from '@measured/puck';
import {
  SpacingControl, AlignmentControl, BorderControl, ShadowControl, DisplayControl,
  SpacingValue, AlignmentValue, BorderValue, ShadowValue, DisplayValue
} from './fields';

export interface ColumnsProps {
  items: React.ComponentType;
  numColumns: number;
  gap: string;
  display?: DisplayValue;
  alignment?: AlignmentValue;
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function ColumnsComponent({ items: Items, numColumns, gap, display, alignment, margin, padding, border, shadow, customCss }: ColumnsProps) {
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

  const styles: React.CSSProperties = {
    display: display || 'grid',
    gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
    gap: gap,
    ...spacingToCss(margin),
    ...paddingToCss(padding),
    ...borderToCss(border),
    ...shadowToCss(shadow),
    ...(alignment ? {
      alignItems: alignment.horizontal === 'left' ? 'flex-start' :
                   alignment.horizontal === 'center' ? 'center' :
                   alignment.horizontal === 'right' ? 'flex-end' : 'flex-start',
    } : {}),
  };

  return (
    <>
      <div style={styles}>
        <Items />
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Columns: ComponentConfig<ColumnsProps> = {
  label: 'Grid / Columns',
  fields: {
    numColumns: {
      type: 'number',
      label: 'Number of Columns',
      min: 1,
      max: 12,
    },
    gap: {
      type: 'text',
      label: 'Gap (px, rem, etc.)',
    },
    items: {
      type: 'slot',
      label: 'Grid Items',
    },
    display: {
      type: 'custom',
      label: 'Display',
      render: (props) => {
        const { value = 'grid', onChange } = props;
        return <DisplayControl {...props} value={value} onChange={onChange} />;
      },
    },
    alignment: {
      type: 'custom',
      label: 'Alignment',
      render: (props) => {
        const { value = { horizontal: 'left' }, onChange } = props;
        return <AlignmentControl {...props} value={value} onChange={onChange} />;
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
    numColumns: 2,
    gap: '1rem',
    items: [] as never,
    display: 'grid',
    alignment: { horizontal: 'left' },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <ColumnsComponent {...props} />,
};
