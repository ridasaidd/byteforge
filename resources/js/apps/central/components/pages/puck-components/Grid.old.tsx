import { ComponentConfig } from '@measured/puck';
import React from 'react';
import {
  SpacingControl, BorderControl, ShadowControl, WidthControl,
  SpacingValue, BorderValue, ShadowValue, WidthValue
} from './fields';

export interface GridProps {
  items: React.ComponentType;
  numColumns: number;
  gap: number;
  width?: WidthValue;
  display?: 'grid' | 'inline-grid';
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function GridComponent({ items: Items, numColumns, gap, width, display = 'grid', margin, padding, border, shadow, customCss, puck }: GridProps & { puck: { dragRef: any } }) {
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
    if (!w) return '100%'; // Default to full width for layout components
    return w.value === 'auto' ? 'auto' : `${w.value}${w.unit}`;
  };

  const styles: React.CSSProperties = {
    display: display || 'grid',
    gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
    gap: `${gap}px`,
    width: widthToCss(width),
    ...spacingToCss(margin),
    ...paddingToCss(padding),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  return (
    <>
      <div ref={puck.dragRef} style={styles}>
        <Items />
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Grid: ComponentConfig<GridProps> = {
  label: 'Grid',
  inline: true,
  fields: {
    numColumns: {
      type: 'number',
      label: 'Number of Columns',
      min: 1,
      max: 12,
    },
    gap: {
      label: 'Gap (px)',
      type: 'number',
      min: 0,
      max: 100,
    },
    items: {
      type: 'slot',
      label: 'Grid Items',
    },
    width: {
      type: 'custom',
      label: 'Width',
      render: (props) => <WidthControl {...props} />,
    },
    display: {
      type: 'select',
      label: 'Display',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Inline Grid', value: 'inline-grid' },
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
    items: [] as never,
    numColumns: 2,
    gap: 16,
    width: { value: '100', unit: '%' },
    display: 'grid',
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <GridComponent {...props} />,
};
