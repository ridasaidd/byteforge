import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useState } from 'react';
import { useTheme } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  SpacingControl, BorderControl, ShadowControl,
  SpacingValue, BorderValue, ShadowValue
} from './fields';

export interface ImageProps {
  src: string;
  alt: string;
  width: 'auto' | 'full' | 'sm' | 'md' | 'lg' | 'xl';
  height: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  align: 'left' | 'center' | 'right';
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function ImageComponent({ src, alt, width, height, objectFit, borderRadius, align, margin, padding, border, shadow, customCss }: ImageProps) {
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

  // Width mapping
  const widthMap = {
    auto: 'auto',
    full: '100%',
    sm: '320px',
    md: '640px',
    lg: '1024px',
    xl: '1280px',
  };

  // Height mapping
  const heightMap = {
    auto: 'auto',
    sm: '200px',
    md: '400px',
    lg: '600px',
    xl: '800px',
  };

  // Border radius from theme
  const borderRadiusMap = {
    none: '0',
    sm: resolve('borderRadius.sm'),
    md: resolve('borderRadius.md'),
    lg: resolve('borderRadius.lg'),
    full: resolve('borderRadius.full'),
  };

  // Alignment
  const alignMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: alignMap[align],
    width: '100%',
    ...paddingToCss(padding),
  };

  const imageStyles: React.CSSProperties = {
    width: widthMap[width],
    height: heightMap[height],
    objectFit,
    borderRadius: borderRadiusMap[borderRadius],
    display: 'block',
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  return (
    <>
      <div style={containerStyles}>
        <img
          src={src || 'https://placehold.co/800x600?text=Add+Image'}
          alt={alt || 'Image'}
          style={imageStyles}
        />
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Custom field component for image URL with Media Library integration
function ImageUrlField({ field, value, onChange }: { field: { label?: string }; value: string; onChange: (value: string) => void }) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    onChange(media.url);
  };

  return (
    <FieldLabel label={field.label || 'Image'}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL or browse media library"
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <button
          type="button"
          onClick={() => setIsMediaPickerOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Browse
        </button>
      </div>
      {value && (
        <div style={{ marginTop: '8px' }}>
          <img
            src={value}
            alt="Preview"
            style={{
              maxWidth: '200px',
              maxHeight: '150px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          />
        </div>
      )}

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        title="Select Image"
      />
    </FieldLabel>
  );
}

export const Image: ComponentConfig<ImageProps> = {
  label: 'Image',
  fields: {
    src: {
      type: 'custom',
      label: 'Image',
      render: ImageUrlField,
    },
    alt: {
      type: 'text',
      label: 'Alt Text',
    },
    width: {
      type: 'select',
      label: 'Width',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Full Width', value: 'full' },
        { label: 'Small (320px)', value: 'sm' },
        { label: 'Medium (640px)', value: 'md' },
        { label: 'Large (1024px)', value: 'lg' },
        { label: 'Extra Large (1280px)', value: 'xl' },
      ],
    },
    height: {
      type: 'select',
      label: 'Height',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Small (200px)', value: 'sm' },
        { label: 'Medium (400px)', value: 'md' },
        { label: 'Large (600px)', value: 'lg' },
        { label: 'Extra Large (800px)', value: 'xl' },
      ],
    },
    objectFit: {
      type: 'radio',
      label: 'Object Fit',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
      ],
    },
    borderRadius: {
      type: 'select',
      label: 'Border Radius',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Full (Circle)', value: 'full' },
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
    src: '',
    alt: 'Image',
    width: 'full',
    height: 'auto',
    objectFit: 'cover',
    borderRadius: 'none',
    align: 'center',
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <ImageComponent {...props} />,
};
