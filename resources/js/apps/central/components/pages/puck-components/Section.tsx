import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useState } from 'react';
import { useTheme } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  SpacingControl, AlignmentControl, BorderControl, ShadowControl,
  SpacingValue, AlignmentValue, BorderValue, ShadowValue
} from './fields';

export interface SectionProps {
  content?: () => React.ReactElement;
  backgroundColor: 'white' | 'gray' | 'blue' | 'transparent';
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  paddingY: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  alignment?: AlignmentValue;
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function SectionComponent({ content: Content, backgroundColor, backgroundImage, backgroundSize = 'cover', backgroundPosition = 'center', backgroundRepeat = 'no-repeat', paddingY, alignment, margin, padding, border, shadow, customCss }: SectionProps) {
  const { resolve } = useTheme();

  // Get theme values
  const bgColor = resolve(`components.section.backgrounds.${backgroundColor}`);
  const themePadding = resolve(`components.section.paddingY.${paddingY}`);

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
    width: '100%',
    backgroundColor: bgColor,
    ...(backgroundImage && {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
    }),
    // Default padding from theme (can be overridden)
    ...(padding ? paddingToCss(padding) : {
      paddingTop: themePadding,
      paddingBottom: themePadding,
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
      <section style={styles}>
        {Content && <Content />}
      </section>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Custom field component for background image with Media Library integration
function BackgroundImageField(props: { field: { label?: string }; value?: string; onChange: (value: string) => void }) {
  const { field, value = '', onChange } = props;
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    onChange(media.url);
  };

  return (
    <FieldLabel label={field.label || 'Background Image'}>
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
        title="Select Background Image"
      />
    </FieldLabel>
  );
}

export const Section: ComponentConfig<SectionProps> = {
  label: 'Section',
  fields: {
    content: {
      type: 'slot',
      label: 'Content',
    },
    backgroundColor: {
      type: 'select',
      label: 'Background Color',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Gray', value: 'gray' },
        { label: 'Blue', value: 'blue' },
        { label: 'Transparent', value: 'transparent' },
      ],
    },
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
    paddingY: {
      type: 'select',
      label: 'Vertical Padding',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' },
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
    backgroundColor: 'white',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    paddingY: 'md',
    alignment: { horizontal: 'left' },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <SectionComponent {...props} />,
};
