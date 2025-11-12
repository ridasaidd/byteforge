import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';
import {
  SpacingControl, AlignmentControl, BorderControl, ShadowControl,
  SpacingValue, AlignmentValue, BorderValue, ShadowValue
} from './fields';

export interface ColumnsProps {
  column1?: () => React.ReactElement;
  column2?: () => React.ReactElement;
  column3?: () => React.ReactElement;
  column4?: () => React.ReactElement;
  columns: 1 | 2 | 3 | 4;
  gap: 'none' | 'sm' | 'md' | 'lg';
  distribution: 'equal' | '1-2' | '2-1' | '1-3' | '3-1';
  alignment?: AlignmentValue;
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function ColumnsComponent({ column1: Column1, column2: Column2, column3: Column3, column4: Column4, columns, gap, distribution, alignment, margin, padding, border, shadow, customCss }: ColumnsProps) {
  const { resolve } = useTheme();

  // Get theme gap value
  const gapValue = resolve(`components.columns.gap.${gap}`);

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

  // Grid template columns based on distribution
  const getGridTemplate = () => {
    if (columns === 2) {
      switch (distribution) {
        case '1-2': return '1fr 2fr';
        case '2-1': return '2fr 1fr';
        case '1-3': return '1fr 3fr';
        case '3-1': return '3fr 1fr';
        default: return `repeat(${columns}, 1fr)`;
      }
    }
    return `repeat(${columns}, 1fr)`;
  };

  const styles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridTemplate(),
    gap: gapValue,
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

  const columnComponents = [Column1, Column2, Column3, Column4].slice(0, columns);

  return (
    <>
      <div style={styles}>
        {columnComponents.map((Column, idx) => (
          <div key={idx}>
            {Column && <Column />}
          </div>
        ))}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Columns: ComponentConfig<ColumnsProps> = {
  label: 'Columns',
  fields: {
    columns: {
      type: 'select',
      label: 'Number of Columns',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
      ],
    },
    gap: {
      type: 'select',
      label: 'Gap Between Columns',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    distribution: {
      type: 'select',
      label: 'Column Distribution',
      options: [
        { label: 'Equal Width', value: 'equal' },
        { label: '1/3 - 2/3', value: '1-2' },
        { label: '2/3 - 1/3', value: '2-1' },
        { label: '1/4 - 3/4', value: '1-3' },
        { label: '3/4 - 1/4', value: '3-1' },
      ],
    },
    column1: {
      type: 'slot',
      label: 'Column 1',
    },
    column2: {
      type: 'slot',
      label: 'Column 2',
    },
    column3: {
      type: 'slot',
      label: 'Column 3',
    },
    column4: {
      type: 'slot',
      label: 'Column 4',
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
    columns: 2,
    gap: 'md',
    distribution: 'equal',
    alignment: { horizontal: 'left' },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <ColumnsComponent {...props} />,
};
