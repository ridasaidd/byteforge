/**
 * Reusable field groups for Puck components
 * Each field includes co-located default values - single source of truth!
 *
 * Field Groups are organized by usage frequency:
 * 1. Layout (display, width) - most commonly used
 * 2. Flex Options - conditional on flex display
 * 3. Grid Options - conditional on grid display
 * 4. Spacing (padding, margin)
 * 5. Background (color, image)
 * 6. Effects (border, borderRadius, shadow)
 * 7. Advanced (customCss) - least commonly used
 */

import { useState } from 'react';
import { FieldLabel } from '@measured/puck';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import type { Media } from '@/shared/services/api';
import {
  ColorPickerControlColorful as ColorPickerControl,
  ColorValue,
  ResponsiveDisplayControl,
  ResponsiveDisplayValue,
  ResponsiveWidthControl,
  ResponsiveWidthValue,
  ResponsiveHeightControl,
  ResponsiveHeightValue,
  ResponsiveMinWidthControl,
  ResponsiveMinWidthValue,
  ResponsiveMaxWidthControl,
  ResponsiveMaxWidthValue,
  ResponsiveMinHeightControl,
  ResponsiveMinHeightValue,
  ResponsiveMaxHeightControl,
  ResponsiveMaxHeightValue,
  ResponsiveSpacingControl,
  ResponsiveSpacingValue,
  BorderControl,
  BorderValue,
  BorderRadiusControl,
  BorderRadiusValue,
  ShadowControl,
  ShadowValue,
  ResponsiveFontSizeControl,
  ResponsiveFontSizeValue,
  FontWeightControl,
  FontWeightValue,
  ResponsiveLineHeightControl,
  ResponsiveLineHeightValue,
  ResponsiveLetterSpacingControl,
  ResponsiveLetterSpacingValue,
  ResponsivePositionControl,
  ResponsivePositionValue,
  ResponsiveOverflowControl,
  ResponsiveOverflowValue,
  ResponsiveZIndexControl,
  ResponsiveZIndexValue,
  ResponsiveOpacityControl,
  ResponsiveOpacityValue,
  ResponsiveGridColumnsControl,
  ResponsiveGridColumnsValue,
  ResponsiveGridGapControl,
  ResponsiveGridGapValue,
  GapControl,
  GapValue,
  ResponsiveGapControl,
  ResponsiveGapValue,
  ResponsiveVisibilityControl,
  ResponsiveVisibilityValue,
  ObjectFitControl,
  ObjectFitValue,
  ObjectPositionControl,
  ObjectPositionValue,
} from './index';

// ============================================================================
// Default Values - Single source of truth
// ============================================================================

const DEFAULT_BORDER_SIDE = { width: '0', style: 'none' as const, color: 'var(--puck-color-grey-04)' };

export const DEFAULT_BORDER: BorderValue = {
  top: DEFAULT_BORDER_SIDE,
  right: DEFAULT_BORDER_SIDE,
  bottom: DEFAULT_BORDER_SIDE,
  left: DEFAULT_BORDER_SIDE,
  unit: 'px',
  linked: true,
};

export const DEFAULT_BORDER_RADIUS: BorderRadiusValue = {
  topLeft: '0',
  topRight: '0',
  bottomRight: '0',
  bottomLeft: '0',
  unit: 'px',
  linked: true,
};

// ============================================================================
// 1. Layout Fields (display, width) - Most commonly used
// ============================================================================

export const displayField = {
  display: {
    type: 'custom' as const,
    label: 'Display',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveDisplayValue; onChange: (value: ResponsiveDisplayValue) => void }) => (
      <ResponsiveDisplayControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 'block' as const },
  },
};

export const layoutFields = {
  width: {
    type: 'custom' as const,
    label: 'Width',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveWidthValue; onChange: (value: ResponsiveWidthValue) => void }) => (
      <ResponsiveWidthControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: '100', unit: '%' as const } },
  },
  height: {
    type: 'custom' as const,
    label: 'Height',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveHeightValue; onChange: (value: ResponsiveHeightValue) => void }) => (
      <ResponsiveHeightControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: 'auto', unit: 'auto' as const } },
  },
  minWidth: {
    type: 'custom' as const,
    label: 'Min Width',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveMinWidthValue; onChange: (value: ResponsiveMinWidthValue) => void }) => (
      <ResponsiveMinWidthControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: 'auto', unit: 'auto' as const } },
  },
  maxWidth: {
    type: 'custom' as const,
    label: 'Max Width',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveMaxWidthValue; onChange: (value: ResponsiveMaxWidthValue) => void }) => (
      <ResponsiveMaxWidthControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: 'none', unit: 'none' as const } },
  },
  minHeight: {
    type: 'custom' as const,
    label: 'Min Height',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveMinHeightValue; onChange: (value: ResponsiveMinHeightValue) => void }) => (
      <ResponsiveMinHeightControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: 'auto', unit: 'auto' as const } },
  },
  maxHeight: {
    type: 'custom' as const,
    label: 'Max Height',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveMaxHeightValue; onChange: (value: ResponsiveMaxHeightValue) => void }) => (
      <ResponsiveMaxHeightControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: 'none', unit: 'none' as const } },
  },
};

// ============================================================================
// Image Fields (for image-based components)
// ============================================================================

export const imageFields = {
  objectFit: {
    type: 'custom' as const,
    label: 'Object Fit',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ObjectFitValue; onChange: (value: ObjectFitValue) => void }) => (
      <ObjectFitControl field={field} value={value || 'cover'} onChange={onChange} />
    ),
    defaultValue: 'cover',
  },
  objectPosition: {
    type: 'custom' as const,
    label: 'Object Position',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ObjectPositionValue; onChange: (value: ObjectPositionValue) => void }) => (
      <ObjectPositionControl field={field} value={value || 'center'} onChange={onChange} />
    ),
    defaultValue: 'center',
  },
};

// ============================================================================
// Typography Fields (for text-based components)
// ============================================================================

export const textColorField = {
  color: {
    type: 'custom' as const,
    label: 'Text Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'theme' as const, value: 'colors.foreground' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'colors.foreground' },
  },
};

export const fontSizeField = {
  fontSize: {
    type: 'custom' as const,
    label: 'Font Size',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveFontSizeValue; onChange: (value: ResponsiveFontSizeValue) => void }) => (
      <ResponsiveFontSizeControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { type: 'custom' as const, value: '16px' } },
  },
};

export const fontWeightField = {
  fontWeight: {
    type: 'custom' as const,
    label: 'Font Weight',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: FontWeightValue; onChange: (value: FontWeightValue) => void }) => (
      <FontWeightControl field={field} value={value || ''} onChange={onChange} />
    ),
    defaultValue: { type: 'theme' as const, value: 'typography.fontWeight.normal' },
  },
};

export const typographyFields = {
  ...textColorField,
  ...fontSizeField,
  ...fontWeightField,
};

export const typographyAdvancedFields = {
  lineHeight: {
    type: 'custom' as const,
    label: 'Line Height',
    render: (props: { field: { label?: string }; value?: ResponsiveLineHeightValue; onChange: (value: ResponsiveLineHeightValue) => void }) => (
      <ResponsiveLineHeightControl {...props} />
    ),
    defaultValue: { mobile: { value: '1.5', unit: 'unitless' } },
  },

  letterSpacing: {
    type: 'custom' as const,
    label: 'Letter Spacing',
    render: (props: { field: { label?: string }; value?: ResponsiveLetterSpacingValue; onChange: (value: ResponsiveLetterSpacingValue) => void }) => (
      <ResponsiveLetterSpacingControl {...props} />
    ),
    defaultValue: { mobile: { value: '0', unit: 'em' } },
  },

  textTransform: {
    type: 'select' as const,
    label: 'Text Transform',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Uppercase', value: 'uppercase' },
      { label: 'Lowercase', value: 'lowercase' },
      { label: 'Capitalize', value: 'capitalize' },
    ],
    defaultValue: 'none',
  },

  textDecoration: {
    type: 'select' as const,
    label: 'Text Decoration',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Underline', value: 'underline' },
      { label: 'Line Through', value: 'line-through' },
      { label: 'Overline', value: 'overline' },
    ],
    defaultValue: 'none',
  },

  textDecorationStyle: {
    type: 'select' as const,
    label: 'Decoration Style',
    options: [
      { label: 'Solid', value: 'solid' },
      { label: 'Double', value: 'double' },
      { label: 'Dotted', value: 'dotted' },
      { label: 'Dashed', value: 'dashed' },
      { label: 'Wavy', value: 'wavy' },
    ],
    defaultValue: 'solid',
  },
};

export const textAlignField = {
  align: {
    type: 'radio' as const,
    label: 'Alignment',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
    defaultValue: 'left',
  },
};

// ============================================================================
// 2. Flex Layout Fields - Shown when display is flex/inline-flex
// ============================================================================

export const flexLayoutFields = {
  direction: {
    type: 'select' as const,
    label: 'Direction',
    options: [
      { label: 'Row', value: 'row' },
      { label: 'Row Reverse', value: 'row-reverse' },
      { label: 'Column', value: 'column' },
      { label: 'Column Reverse', value: 'column-reverse' },
    ],
    defaultValue: 'row',
  },

  justify: {
    type: 'select' as const,
    label: 'Justify Content',
    options: [
      { label: 'Start', value: 'start' },
      { label: 'End', value: 'end' },
      { label: 'Center', value: 'center' },
      { label: 'Space Between', value: 'between' },
      { label: 'Space Around', value: 'around' },
      { label: 'Space Evenly', value: 'evenly' },
    ],
    defaultValue: 'start',
  },

  align: {
    type: 'select' as const,
    label: 'Align Items',
    options: [
      { label: 'Start', value: 'start' },
      { label: 'End', value: 'end' },
      { label: 'Center', value: 'center' },
      { label: 'Stretch', value: 'stretch' },
      { label: 'Baseline', value: 'baseline' },
    ],
    defaultValue: 'stretch',
  },

  wrap: {
    type: 'select' as const,
    label: 'Wrap',
    options: [
      { label: 'No Wrap', value: 'nowrap' },
      { label: 'Wrap', value: 'wrap' },
      { label: 'Wrap Reverse', value: 'wrap-reverse' },
    ],
    defaultValue: 'nowrap',
  },

  flexGap: {
    type: 'custom' as const,
    label: 'Gap',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveGapValue; onChange: (value: ResponsiveGapValue) => void }) => (
      <ResponsiveGapControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: '16', unit: 'px' as const } },
  },
};

// ============================================================================
// 3. Grid Layout Fields - Shown when display is grid/inline-grid
// ============================================================================

export const gridLayoutFields = {
  numColumns: {
    type: 'custom' as const,
    label: 'Columns',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveGridColumnsValue; onChange: (value: ResponsiveGridColumnsValue) => void }) => (
      <ResponsiveGridColumnsControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 2 },
  },

  gridGap: {
    type: 'custom' as const,
    label: 'Gap',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveGridGapValue; onChange: (value: ResponsiveGridGapValue) => void }) => (
      <ResponsiveGridGapControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: { value: '16', unit: 'px' as const } },
  },

  alignItems: {
    type: 'select' as const,
    label: 'Align Items',
    options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Stretch', value: 'stretch' },
    ],
    defaultValue: 'stretch',
  },
};

// ============================================================================
// 4. Spacing Fields (padding, margin)
// ============================================================================

export const spacingFields = {
  padding: {
    type: 'custom' as const,
    label: 'Padding',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveSpacingValue; onChange: (value: ResponsiveSpacingValue) => void }) => (
      <ResponsiveSpacingControl field={field} value={value} onChange={onChange} allowNegative={false} useSliders={true} maxValue={100} />
    ),
    defaultValue: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true },
    },
  },

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

// ============================================================================
// 5. Background Fields (color, image)
// ============================================================================

export const backgroundFields = {
  backgroundColor: {
    type: 'custom' as const,
    label: 'Background Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'custom' as const, value: '' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'custom' as const, value: '' },
  },
};
// ============================================================================
// 5. Background Fields
// ============================================================================

// Background Image Field Component with Media Library integration
function BackgroundImageField({ field, value, onChange }: { field: { label?: string }; value: string | undefined; onChange: (value: string) => void }) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    onChange(media.url);
  };

  return (
    <FieldLabel label={field.label || 'Background Image'}>
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
              width: '100%',
              maxHeight: '120px',
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
        title="Select Background Image"
      />
    </FieldLabel>
  );
}
export const backgroundImageFields = {
  backgroundImage: {
    type: 'custom' as const,
    label: 'Background Image',
    render: BackgroundImageField,
    defaultValue: '',
  },

  backgroundSize: {
    type: 'radio' as const,
    label: 'Background Size',
    options: [
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
      { label: 'Auto', value: 'auto' },
    ],
    defaultValue: 'cover',
  },

  backgroundPosition: {
    type: 'select' as const,
    label: 'Background Position',
    options: [
      { label: 'Center', value: 'center' },
      { label: 'Top', value: 'top' },
      { label: 'Bottom', value: 'bottom' },
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
    defaultValue: 'center',
  },

  backgroundRepeat: {
    type: 'radio' as const,
    label: 'Background Repeat',
    options: [
      { label: 'No Repeat', value: 'no-repeat' },
      { label: 'Repeat', value: 'repeat' },
      { label: 'Repeat X', value: 'repeat-x' },
      { label: 'Repeat Y', value: 'repeat-y' },
    ],
    defaultValue: 'no-repeat',
  },
};

// ============================================================================
// 6. Layout Advanced Fields (z-index, opacity, overflow, position)
// ============================================================================

export const layoutAdvancedFields = {
  position: {
    type: 'custom' as const,
    label: 'Position',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsivePositionValue; onChange: (value: ResponsivePositionValue) => void }) => (
      <ResponsivePositionControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 'static' as const },
  },

  zIndex: {
    type: 'custom' as const,
    label: 'Z-Index',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveZIndexValue; onChange: (value: ResponsiveZIndexValue) => void }) => (
      <ResponsiveZIndexControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 'auto' as const },
  },

  opacity: {
    type: 'custom' as const,
    label: 'Opacity',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveOpacityValue; onChange: (value: ResponsiveOpacityValue) => void }) => (
      <ResponsiveOpacityControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 100 },
  },

  overflow: {
    type: 'custom' as const,
    label: 'Overflow',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveOverflowValue; onChange: (value: ResponsiveOverflowValue) => void }) => (
      <ResponsiveOverflowControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 'visible' as const },
  },

  aspectRatio: {
    type: 'select' as const,
    label: 'Aspect Ratio',
    options: [
      { label: 'Auto', value: 'auto' },
      { label: '16:9 (Widescreen)', value: '16/9' },
      { label: '4:3 (Standard)', value: '4/3' },
      { label: '1:1 (Square)', value: '1/1' },
      { label: '21:9 (Ultrawide)', value: '21/9' },
      { label: '3:2 (Photo)', value: '3/2' },
      { label: '2:3 (Portrait)', value: '2/3' },
      { label: 'Custom', value: 'custom' },
    ],
    defaultValue: 'auto',
  },

  aspectRatioCustom: {
    type: 'text' as const,
    label: 'Custom Ratio',
    placeholder: 'e.g., 5/4',
    defaultValue: '1/1',
  },

  visibility: {
    type: 'custom' as const,
    label: 'Visibility',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveVisibilityValue; onChange: (value: ResponsiveVisibilityValue) => void }) => (
      <ResponsiveVisibilityControl field={field} value={value} onChange={onChange} />
    ),
    defaultValue: { mobile: 'visible' as const, tablet: 'visible' as const, desktop: 'visible' as const },
  },
};

// ============================================================================
// 7. Effects Fields (border, borderRadius, shadow)
// ============================================================================

export const effectsFields = {
  border: {
    type: 'custom' as const,
    label: 'Border',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: BorderValue; onChange: (value: BorderValue) => void }) => {
      const safeValue = value ?? DEFAULT_BORDER;
      return <BorderControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: DEFAULT_BORDER,
  },

  borderRadius: {
    type: 'custom' as const,
    label: 'Border Radius',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: BorderRadiusValue; onChange: (value: BorderRadiusValue) => void }) => {
      const safeValue = value ?? DEFAULT_BORDER_RADIUS;
      return <BorderRadiusControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: DEFAULT_BORDER_RADIUS,
  },

  shadow: {
    type: 'custom' as const,
    label: 'Shadow',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ShadowValue; onChange: (value: ShadowValue) => void }) => {
      const safeValue = value ?? { preset: 'none' as const };
      return <ShadowControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { preset: 'none' as const },
  },
};

// ============================================================================
// 8. Advanced Fields (customCss)
// ============================================================================

export const advancedFields = {
  customCss: {
    type: 'custom' as const,
    label: 'Custom CSS',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: string | null; onChange: (value: string) => void }) => {
      const safeValue = value ?? '';
      return (
        <FieldLabel label={field.label || 'Custom CSS'}>
          <textarea
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter custom CSS..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px',
              border: '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              backgroundColor: 'var(--puck-color-white)',
            }}
          />
        </FieldLabel>
      );
    },
    defaultValue: '',
  },
};

// ============================================================================
// 9. Interaction Fields (cursor, transition)
// ============================================================================

function TransitionField({ field, value, onChange }: { field: { label?: string }; value?: { duration?: string; easing?: string; properties?: string }; onChange: (value: { duration: string; easing: string; properties: string }) => void }) {
  const v = value ?? { duration: '300ms', easing: 'ease', properties: 'all' };
  const ensureDefaults = { duration: '300ms', easing: 'ease', properties: 'all', ...v };
  return (
    <FieldLabel label={field.label || 'Transition'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--puck-color-grey-05)' }}>Duration</label>
          <select
            value={ensureDefaults.duration}
            onChange={(e) => onChange({ ...ensureDefaults, duration: e.target.value })}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--puck-color-grey-04)', borderRadius: 4, fontSize: 14 }}
          >
            <option value="150ms">150ms (Fast)</option>
            <option value="300ms">300ms (Normal)</option>
            <option value="500ms">500ms (Slow)</option>
            <option value="1000ms">1000ms (Very Slow)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--puck-color-grey-05)' }}>Easing</label>
          <select
            value={ensureDefaults.easing}
            onChange={(e) => onChange({ ...ensureDefaults, easing: e.target.value })}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--puck-color-grey-04)', borderRadius: 4, fontSize: 14 }}
          >
            <option value="ease">Ease (Default)</option>
            <option value="ease-in">Ease In (Slow start)</option>
            <option value="ease-out">Ease Out (Slow end)</option>
            <option value="ease-in-out">Ease In/Out (Both)</option>
            <option value="linear">Linear (Constant)</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--puck-color-grey-05)' }}>Animate Properties</label>
        <select
          value={ensureDefaults.properties}
          onChange={(e) => onChange({ ...ensureDefaults, properties: e.target.value })}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--puck-color-grey-04)', borderRadius: 4, fontSize: 14 }}
        >
          <option value="all">All Properties</option>
          <option value="opacity">Opacity</option>
          <option value="background-color">Background Color</option>
          <option value="color">Text Color</option>
          <option value="transform">Transform (scale, rotate, etc.)</option>
          <option value="opacity, transform">Opacity + Transform</option>
          <option value="background-color, color">Background + Text Color</option>
        </select>
        <p style={{ fontSize: 11, color: 'var(--puck-color-grey-05)', marginTop: 4, marginBottom: 0 }}>
          Smoothly animates property changes on hover/focus
        </p>
      </div>
    </FieldLabel>
  );
}

export const interactionFields = {
  cursor: {
    type: 'select' as const,
    label: 'Cursor',
    options: [
      { label: 'Auto', value: 'auto' },
      { label: 'Pointer', value: 'pointer' },
      { label: 'Default', value: 'default' },
      { label: 'Text', value: 'text' },
      { label: 'Move', value: 'move' },
      { label: 'Not Allowed', value: 'not-allowed' },
    ],
    defaultValue: 'auto',
  },

  transition: {
    type: 'custom' as const,
    label: 'Transition',
    render: TransitionField,
    defaultValue: { duration: '300ms', easing: 'ease', properties: 'all' },
  },
};

// ============================================================================
// 10. Hover State Fields (for interactive components)
// ============================================================================

export const hoverStateFields = {
  hoverOpacity: {
    type: 'number' as const,
    label: 'Hover Opacity (%)',
    min: 0,
    max: 100,
    defaultValue: 90,
  },

  hoverBackgroundColor: {
    type: 'custom' as const,
    label: 'Hover Background Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'custom' as const, value: '' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'custom' as const, value: '' },
  },

  hoverTextColor: {
    type: 'custom' as const,
    label: 'Hover Text Color',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const safeValue = value ?? { type: 'custom' as const, value: '' };
      return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
    },
    defaultValue: { type: 'custom' as const, value: '' },
  },

  hoverTransform: {
    type: 'select' as const,
    label: 'Hover Transform',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Scale Up (1.05)', value: 'scale(1.05)' },
      { label: 'Scale Up (1.1)', value: 'scale(1.1)' },
      { label: 'Scale Down (0.95)', value: 'scale(0.95)' },
      { label: 'Lift Up', value: 'translateY(-4px)' },
      { label: 'Lift Up More', value: 'translateY(-8px)' },
    ],
    defaultValue: 'none',
  },
};

// ============================================================================
// Custom Classes & ID (for CSS targeting and element identification)
// ============================================================================

export const customClassesFields = {
  customClassName: {
    type: 'text' as const,
    label: 'Custom Class',
    placeholder: 'e.g., "highlight-section my-custom-style"',
    defaultValue: '',
  },
  customId: {
    type: 'text' as const,
    label: 'Element ID',
    placeholder: 'e.g., "section-features" (for anchors)',
    defaultValue: '',
  },
};

// ============================================================================
// Slot Field (for container components)
// ============================================================================

export const slotField = {
  items: {
    type: 'slot' as const,
    label: 'Items',
  },
};

// ============================================================================
// Legacy Compatibility - commonLayoutFields
// (Combines spacing, background, effects, and advanced for backward compat)
// ============================================================================

export const commonLayoutFields = {
  ...layoutFields,
  ...spacingFields,
  ...backgroundFields,
  ...effectsFields,
  ...advancedFields,
};
