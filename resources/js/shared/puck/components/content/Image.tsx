import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useState } from 'react';
import { useTheme } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  type BorderValue,
  type BorderRadiusValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveWidthValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  effectsFields,
  advancedFields,
  // Utilities
  extractDefaults,
  generateWidthCSS,
  generateMaxWidthCSS,
  generateMaxHeightCSS,
  generateMarginCSS,
  generateDisplayCSS,
  generateVisibilityCSS,
  ResponsiveSpacingControl,
  DEFAULT_BORDER,
  DEFAULT_BORDER_RADIUS,
} from '../../fields';

export interface ImageProps {
  id?: string;
  src: string;
  alt: string;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  height?: ResponsiveWidthValue;
  display?: ResponsiveDisplayValue;
  aspectRatio?: string;
  aspectRatioCustom?: string;
  visibility?: ResponsiveVisibilityValue;
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
  borderRadiusPreset: 'none' | 'sm' | 'md' | 'lg' | 'full';
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  customCss?: string;
}

function ImageComponent({
  id,
  src,
  alt,
  width,
  maxWidth,
  maxHeight,
  height,
  display = { mobile: 'inline-block' },
  aspectRatio,
  aspectRatioCustom,
  visibility,
  objectFit,
  borderRadiusPreset,
  margin,
  border,
  borderRadius,
  shadow,
  customCss,
  puck,
}: ImageProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const className = `image-${id}`;

  // Generate responsive CSS
  const widthCss = width ? generateWidthCSS(className, width) : '';
  const maxWidthCss = maxWidth ? generateMaxWidthCSS(className, maxWidth) : '';
  const maxHeightCss = maxHeight ? generateMaxHeightCSS(className, maxHeight) : '';
  const heightCss = height ? generateWidthCSS(className, height, 'height') : '';
  const marginCss = margin ? generateMarginCSS(className, margin) : '';
  const displayCss = display ? generateDisplayCSS(className, display) : '';
  const visibilityCss = visibility ? generateVisibilityCSS(className, visibility) : '';

  const aspectRatioCss = (() => {
    if (!aspectRatio || aspectRatio === 'auto') return '';
    const ratio = aspectRatio === 'custom' ? aspectRatioCustom : aspectRatio;
    return ratio ? `
      .${className} {
        aspect-ratio: ${ratio};
      }
    ` : '';
  })();

  // Border radius from theme with fallbacks (for preset)
  const borderRadiusMap = {
    none: '0',
    sm: resolve('borderRadius.sm', '0.125rem'),
    md: resolve('borderRadius.md', '0.375rem'),
    lg: resolve('borderRadius.lg', '0.5rem'),
    full: resolve('borderRadius.full', '9999px'),
  };

  // Build CSS
  const imgCss = `
    .${className} {
      object-fit: ${objectFit};
      border-radius: ${borderRadiusMap[borderRadiusPreset || 'none']};
    }
  `;

  // Build border CSS from new per-side border format
  const borderCss = (() => {
    if (!border) return '';
    const { top, unit = 'px' } = border;
    if (!top || top.style === 'none' || top.width === '0') return '';
    return `
      .${className} {
        border: ${top.width}${unit} ${top.style} ${top.color};
      }
    `;
  })();

  // Build border radius CSS from per-corner format
  const borderRadiusCss = (() => {
    if (!borderRadius) return '';
    const { topLeft, topRight, bottomRight, bottomLeft, unit = 'px' } = borderRadius;
    if (topLeft === '0' && topRight === '0' && bottomRight === '0' && bottomLeft === '0') return '';
    return `
      .${className} {
        border-radius: ${topLeft}${unit} ${topRight}${unit} ${bottomRight}${unit} ${bottomLeft}${unit};
      }
    `;
  })();

  const shadowCss = (() => {
    if (!shadow || shadow.preset === 'none') return '';
    const shadowPresets: Record<string, string> = {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };
    const shadowValue = shadow.preset === 'custom' ? shadow.custom : shadowPresets[shadow.preset];
    return shadowValue ? `
      .${className} {
        box-shadow: ${shadowValue};
      }
    ` : '';
  })();

  return (
    <>
      <style>
        {imgCss}
        {borderCss}
        {borderRadiusCss}
        {shadowCss}
        {aspectRatioCss}
        {widthCss}
        {maxWidthCss}
        {maxHeightCss}
        {heightCss}
        {marginCss}
        {displayCss}
        {visibilityCss}
      </style>
      <img
        ref={puck?.dragRef}
        className={className}
        src={src || 'https://placehold.co/800x600?text=Add+Image'}
        alt={alt || 'Image'}
      />
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL or browse media library"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid var(--puck-color-grey-04)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--puck-color-white)',
          }}
        />
        <button
          type="button"
          onClick={() => setIsMediaPickerOpen(true)}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: 'var(--puck-color-azure-04)',
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
              border: '1px solid var(--puck-color-grey-04)',
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

// Image-specific fields
const imageContentFields = {
  src: {
    type: 'custom' as const,
    label: 'Image',
    render: ImageUrlField,
  },
  alt: {
    type: 'text' as const,
    label: 'Alt Text',
    defaultValue: 'Image',
  },
};

const imageStyleFields = {
  objectFit: {
    type: 'radio' as const,
    label: 'Object Fit',
    options: [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
    ],
    defaultValue: 'cover',
  },
  borderRadiusPreset: {
    type: 'select' as const,
    label: 'Border Radius Preset',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Full (Circle)', value: 'full' },
    ],
    defaultValue: 'none',
  },
};

// Margin-only spacing for images (no padding)
const imageMarginField = {
  margin: {
    type: 'custom' as const,
    label: 'Margin',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveSpacingValue; onChange: (value: ResponsiveSpacingValue) => void }) => (
      <ResponsiveSpacingControl field={field} value={value} onChange={onChange} allowNegative={true} useSliders={false} />
    ),
    defaultValue: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true },
    },
  },
};

// Component configuration using organized field groups
export const Image: ComponentConfig<ImageProps> = {
  inline: true,
  label: 'Image',

  fields: {
    // Content
    ...imageContentFields,
    // Style
    ...imageStyleFields,
    // Layout
    ...displayField,
    ...layoutFields,
    height: {
      ...layoutFields.width,
      label: 'Height',
    },
    aspectRatio: layoutAdvancedFields.aspectRatio,
    aspectRatioCustom: layoutAdvancedFields.aspectRatioCustom,
    visibility: layoutAdvancedFields.visibility,
    // Spacing (margin only for images)
    ...imageMarginField,
    // Effects
    ...effectsFields,
    // Advanced
    ...advancedFields,
  },

  defaultProps: {
    src: '',
    ...extractDefaults(
      imageContentFields,
      imageStyleFields,
      displayField,
      layoutFields,
      layoutAdvancedFields,
      imageMarginField,
      effectsFields,
      advancedFields
    ),
    // Override display for image
    display: { mobile: 'inline-block' as const },
    height: undefined,
  },

  render: (props) => <ImageComponent {...props} />,
};
