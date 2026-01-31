import { ComponentConfig, FieldLabel } from '@puckeditor/core';
import { useState } from 'react';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  type BorderValue,
  type BorderRadiusValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveWidthValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveMaxHeightValue,
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
  buildLayoutCSS,
  ResponsiveSpacingControl,
} from '../../fields';

// Responsive image sources for srcset
export interface ImageSrcSet {
  original: string;
  small?: string;   // 300px
  medium?: string;  // 800px
  large?: string;   // 1920px
  webp?: string;    // WebP format
}

export interface ImageProps {
  id?: string;
  src: string;
  srcSet?: ImageSrcSet; // Optional responsive sources
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
  srcSet,
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
  const isEditing = usePuckEditMode();
  const className = `image-${id}`;

  // Border radius from theme with fallbacks (for preset)
  const borderRadiusMap = {
    none: '0',
    sm: resolve('borderRadius.sm', '0.125rem'),
    md: resolve('borderRadius.md', '0.375rem'),
    lg: resolve('borderRadius.lg', '0.5rem'),
    full: resolve('borderRadius.full', '9999px'),
  };

  // Generate comprehensive CSS using buildLayoutCSS (only in edit mode)
  const css = isEditing ? (() => {
    const rules: string[] = [];

    // Layout CSS with all responsive properties
    const layoutCss = buildLayoutCSS({
      className,
      display,
      width,
      maxWidth,
      maxHeight,
      height: height as ResponsiveHeightValue, // ImageProps uses ResponsiveWidthValue for height, but buildLayoutCSS expects ResponsiveHeightValue
      margin,
      border,
      borderRadius,
      shadow,
      visibility,
      aspectRatio,
      aspectRatioCustom,
      objectFit,
    });
    if (layoutCss) rules.push(layoutCss);

    // Always include object-fit (buildLayoutCSS only adds it when not 'cover')
    rules.push(`
      .${className} {
        object-fit: ${objectFit};
      }
    `);

    // Preset border radius (if specified)
    if (borderRadiusPreset && borderRadiusPreset !== 'none') {
      rules.push(`
        .${className} {
          border-radius: ${borderRadiusMap[borderRadiusPreset]};
        }
      `);
    }

    return rules.join('\n');
  })() : '';

  // Derive responsive srcset from media library URL pattern
  // Pattern: /storage/.../medialibrary/X/Y/filename.ext
  // Converts to: /storage/.../medialibrary/X/Y/conversions/filename-{size}.jpg
  const deriveSrcSet = (url: string | undefined): string | undefined => {
    if (!url) return undefined;

    // Check if this is a media library URL (contains /medialibrary/)
    const mediaLibraryPattern = /^(.*\/medialibrary\/\d+\/\d+\/)([^/]+)\.(\w+)$/;
    const match = url.match(mediaLibraryPattern);

    if (!match) return undefined;

    const [, basePath, fileName, ] = match;
    const conversionsPath = `${basePath}conversions/`;

    // Build srcset with our standard conversion sizes
    // small: 300px, medium: 800px, large: 1920px (all converted to jpg)
    const srcSetParts = [
      `${conversionsPath}${fileName}-small.jpg 300w`,
      `${conversionsPath}${fileName}-medium.jpg 800w`,
      `${conversionsPath}${fileName}-large.jpg 1920w`,
    ];

    return srcSetParts.join(', ');
  };

  // Build srcset - prefer explicit srcSet prop, otherwise derive from URL
  const srcSetString = srcSet
    ? [
        srcSet.small && `${srcSet.small} 300w`,
        srcSet.medium && `${srcSet.medium} 800w`,
        srcSet.large && `${srcSet.large} 1920w`,
      ].filter(Boolean).join(', ')
    : deriveSrcSet(src);

  // Define sizes for browser to choose appropriate image
  // Mobile: full width, Tablet: 75% viewport, Desktop: 50% viewport
  const sizesString = srcSetString
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw'
    : undefined;

  return (
    <>
      {/* Only inject runtime CSS in edit mode - storefront uses pre-generated CSS from file */}
      {isEditing && css && <style>{css}</style>}
      <img
        ref={puck?.dragRef}
        className={className}
        src={src || 'https://placehold.co/800x600?text=Add+Image'}
        srcSet={srcSetString}
        sizes={sizesString}
        alt={alt || 'Image'}
      />
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Combined custom field component for image URL with responsive srcSet support
function ImageUrlField({
  field,
  value,
  onChange,
}: {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    // Store the original URL - the component will handle responsive variants
    // We prefer to store the original so we have the best quality source
    // and can derive conversion URLs from the pattern
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
    alt: 'Image',
    objectFit: 'cover',
    borderRadiusPreset: 'none',
    ...extractDefaults(
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
