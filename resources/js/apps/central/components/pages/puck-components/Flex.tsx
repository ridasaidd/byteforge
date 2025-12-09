import { ComponentConfig, FieldLabel } from '@measured/puck';
import React, { useState } from 'react';
import { useTheme } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  SpacingValue, BorderValue, ShadowValue, WidthValue, ColorValue
} from './fields';
import { layoutContainerControls } from './controlPresets';

export interface FlexProps {
  items?: () => React.ReactElement;
  backgroundColor?: ColorValue;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  direction: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justify: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap: number;
  width?: WidthValue;
  display?: 'flex' | 'inline-flex';
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function FlexComponent({
  items: Items,
  backgroundColor,
  backgroundImage,
  backgroundSize = 'cover',
  backgroundPosition = 'center',
  backgroundRepeat = 'no-repeat',
  direction,
  justify,
  align,
  wrap,
  gap,
  width,
  display = 'flex',
  margin,
  padding,
  border,
  shadow,
  customCss,
}: FlexProps) {
  const { resolve } = useTheme();

  // Resolve background color from theme or use custom (with legacy string support)
  const resolvedBackgroundColor = typeof backgroundColor === 'string'
    ? (backgroundColor as string).startsWith('#') ? backgroundColor : resolve(backgroundColor)
    : backgroundColor?.type === 'theme' && backgroundColor.value
    ? (typeof backgroundColor.value === 'string' && backgroundColor.value.startsWith('#') ? backgroundColor.value : resolve(backgroundColor.value))
    : backgroundColor?.type === 'custom'
    ? backgroundColor.value
    : 'transparent';
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

  // Convert justify/align values to CSS
  const justifyMap = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  const alignMap = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  };

  // Convert WidthValue to CSS value
  const widthToCss = (w: WidthValue | undefined) => {
    if (!w) return '100%'; // Default to full width for layout components
    return w.value === 'auto' ? 'auto' : `${w.value}${w.unit}`;
  };

  const styles: React.CSSProperties = {
    display: display || 'flex',
    flexDirection: direction,
    justifyContent: justifyMap[justify],
    alignItems: alignMap[align],
    flexWrap: wrap,
    gap: `${gap}px`,
    width: widthToCss(width),
    backgroundColor: resolvedBackgroundColor,
    ...(backgroundImage && {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
    }),
    ...spacingToCss(margin),
    ...paddingToCss(padding),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  const SlotComponent = Items as unknown as React.ComponentType<{ style: React.CSSProperties }>;

  return (
    <>
      {Items && <SlotComponent style={styles} />}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// BackgroundImageField component for Flex
function BackgroundImageField(props: { field: { label?: string }; value?: string; onChange: (value: string) => void }) {
  const { field, value = '', onChange } = props;
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    onChange(media.url);
    setIsMediaPickerOpen(false);
  };

  return (
    <FieldLabel label={field.label || 'Background Image'}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL or browse media"
          style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          type="button"
          onClick={() => setIsMediaPickerOpen(true)}
          style={{ padding: '6px 12px', background: '#0969da', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Browse
        </button>
      </div>
      {value && (
        <div style={{ marginTop: '8px' }}>
          <img
            src={value}
            alt="Background preview"
            style={{ maxWidth: '200px', maxHeight: '150px', border: '1px solid #e1e4e8', borderRadius: '4px' }}
          />
        </div>
      )}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </FieldLabel>
  );
}

export const Flex: ComponentConfig<FlexProps> = {
  label: 'Flex',
  fields: {
    direction: {
      type: 'select',
      label: 'Direction',
      options: [
        { label: 'Row', value: 'row' },
        { label: 'Row Reverse', value: 'row-reverse' },
        { label: 'Column', value: 'column' },
        { label: 'Column Reverse', value: 'column-reverse' },
      ],
    },
    items: {
      type: 'slot',
      label: 'Items',
    },
    // Spread layout container controls (background, spacing, visual effects)
    ...layoutContainerControls,
    // Flex-specific controls
    backgroundImage: {
      type: 'custom',
      label: 'Background Image',
      render: BackgroundImageField,
    },
    backgroundSize: {
      type: 'radio',
      label: 'Background Size',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Auto', value: 'auto' },
      ],
    },
    backgroundPosition: {
      type: 'select',
      label: 'Background Position',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Top', value: 'top' },
        { label: 'Bottom', value: 'bottom' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
    backgroundRepeat: {
      type: 'radio',
      label: 'Background Repeat',
      options: [
        { label: 'No Repeat', value: 'no-repeat' },
        { label: 'Repeat', value: 'repeat' },
        { label: 'Repeat X', value: 'repeat-x' },
        { label: 'Repeat Y', value: 'repeat-y' },
      ],
    },
    justify: {
      type: 'select',
      label: 'Justify Content',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
        { label: 'Center', value: 'center' },
        { label: 'Space Between', value: 'between' },
        { label: 'Space Around', value: 'around' },
        { label: 'Space Evenly', value: 'evenly' },
      ],
    },
    align: {
      type: 'select',
      label: 'Align Items',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
        { label: 'Center', value: 'center' },
        { label: 'Stretch', value: 'stretch' },
        { label: 'Baseline', value: 'baseline' },
      ],
    },
    wrap: {
      type: 'select',
      label: 'Wrap',
      options: [
        { label: 'No Wrap', value: 'nowrap' },
        { label: 'Wrap', value: 'wrap' },
        { label: 'Wrap Reverse', value: 'wrap-reverse' },
      ],
    },
    gap: {
      label: 'Gap (px)',
      type: 'number',
      min: 0,
      max: 100,
    },
    display: {
      type: 'select',
      label: 'Display',
      options: [
        { label: 'Flex', value: 'flex' },
        { label: 'Inline Flex', value: 'inline-flex' },
      ],
    },
    customCss: {
      type: 'textarea',
      label: 'Custom CSS',
    },
  },
  defaultProps: {
    direction: 'row',
    justify: 'start',
    align: 'stretch',
    wrap: 'nowrap',
    gap: 16,
    width: { value: '100', unit: '%' },
    display: 'flex',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <FlexComponent {...props} />,
};
