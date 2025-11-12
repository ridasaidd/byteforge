import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useState } from 'react';
import { useTheme } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  SpacingControl, BorderControl, ShadowControl,
  SpacingValue, BorderValue, ShadowValue
} from './fields';

export type HeroProps = {
  title: string;
  description: string;
  align: 'left' | 'center';
  buttons: Array<{
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
    openInNewTab?: boolean;
  }>;
  imageUrl?: string;
  imageMode: 'none' | 'inline' | 'background';
  backgroundColor?: string;
  textColor?: string;
  minHeight?: string;
  padding?: SpacingValue;
  margin?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
};

function HeroComponent({
  title,
  description,
  align,
  buttons,
  imageUrl,
  imageMode,
  backgroundColor,
  textColor,
  minHeight,
  padding,
  margin,
  border,
  shadow,
  customCss,
}: HeroProps) {
  const { resolve } = useTheme();

  // Helper functions (same as other components)
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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: backgroundColor || 'transparent',
    backgroundImage: imageMode === 'background' && imageUrl ? `url(${imageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: textColor || 'inherit',
    minHeight: minHeight || '500px',
    display: 'flex',
    alignItems: 'center',
    ...paddingToCss(padding),
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '0 32px',
    textAlign: align,
    display: 'flex',
    flexDirection: imageMode === 'inline' && align === 'left' ? 'row' : 'column',
    alignItems: align === 'center' ? 'center' : 'flex-start',
    gap: '2rem',
  };

  const getButtonStyle = (variant: 'primary' | 'secondary'): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '12px 24px',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: '600',
      textDecoration: 'none',
      display: 'inline-block',
      cursor: 'pointer',
      transition: 'all 0.2s',
    };

    if (variant === 'primary') {
      return {
        ...base,
        backgroundColor: resolve('colors.primary.500', '#3B82F6'),
        color: '#FFFFFF',
        border: 'none',
      };
    }

    return {
      ...base,
      backgroundColor: 'transparent',
      color: resolve('colors.primary.500', '#3B82F6'),
      border: `2px solid ${resolve('colors.primary.500', '#3B82F6')}`,
    };
  };

  return (
    <section style={containerStyle} className={customCss}>
      <div style={contentStyle}>
        {imageMode === 'inline' && align === 'left' && imageUrl && (
          <img src={imageUrl} alt={title} style={{ maxWidth: '45%', borderRadius: '8px' }} />
        )}

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem', lineHeight: '1.2' }}>
            {title}
          </h1>
          <p style={{ fontSize: '1.25rem', lineHeight: '1.75', marginBottom: '0', opacity: 0.9 }}>
            {description}
          </p>

          {buttons && buttons.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
              {buttons.map((button, index) => (
                <a
                  key={index}
                  href={button.href}
                  style={getButtonStyle(button.variant)}
                  target={button.openInNewTab ? '_blank' : undefined}
                  rel={button.openInNewTab ? 'noopener noreferrer' : undefined}
                >
                  {button.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {imageMode === 'inline' && align === 'center' && imageUrl && (
          <img src={imageUrl} alt={title} style={{ maxWidth: '100%', borderRadius: '8px' }} />
        )}
      </div>
    </section>
  );
}

// Custom field component for image URL with Media Library integration
function ImageUrlField(props: { field: { label?: string }; value?: string; onChange: (value: string) => void }) {
  const { field, value = '', onChange } = props;
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    onChange(media.url);
  };

  return (
    <FieldLabel label={field.label || 'Image'}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={value}
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

export const Hero: ComponentConfig<HeroProps> = {
  label: 'Hero',
  fields: {
    title: { type: 'text', label: 'Title' },
    description: { type: 'textarea', label: 'Description' },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    buttons: {
      type: 'array',
      label: 'Buttons',
      arrayFields: {
        label: { type: 'text', label: 'Button Label' },
        href: { type: 'text', label: 'Link URL' },
        variant: {
          type: 'select',
          label: 'Variant',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
          ],
        },
        openInNewTab: {
          type: 'radio',
          label: 'Open in New Tab',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      getItemSummary: (item) => item.label || 'Button',
      defaultItemProps: { label: 'Learn More', href: '#', variant: 'primary', openInNewTab: false },
    },
    imageUrl: {
      type: 'custom',
      label: 'Image URL',
      render: ImageUrlField,
    },
    imageMode: {
      type: 'radio',
      label: 'Image Display',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Inline', value: 'inline' },
        { label: 'Background', value: 'background' },
      ],
    },
    backgroundColor: { type: 'text', label: 'Background Color' },
    textColor: { type: 'text', label: 'Text Color' },
    minHeight: { type: 'text', label: 'Min Height' },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => {
        const { value = { top: '80', right: '32', bottom: '80', left: '32', unit: 'px', linked: false }, onChange } = props;
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
        const { value = { width: '0', style: 'none', color: '#e5e7eb', radius: '0', unit: 'px' }, onChange } = props;
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
    customCss: { type: 'text', label: 'Custom CSS Class' },
  },
  defaultProps: {
    title: 'Welcome to Our Platform',
    description: 'Build amazing experiences with our powerful tools and intuitive interface.',
    align: 'left',
    buttons: [
      { label: 'Get Started', href: '#', variant: 'primary', openInNewTab: false },
      { label: 'Learn More', href: '#', variant: 'secondary', openInNewTab: false },
    ],
    imageMode: 'none',
    minHeight: '500px',
    padding: { top: '80', right: '32', bottom: '80', left: '32', unit: 'px', linked: false },
  },
  render: HeroComponent,
};
