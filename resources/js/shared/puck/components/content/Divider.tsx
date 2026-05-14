import { ComponentConfig } from '@puckeditor/core';
import { usePuckEditMode, useTheme } from '@/shared/hooks';
import {
  type BorderRadiusValue,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveOpacityValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  displayField,
  layoutFields,
  layoutAdvancedFields,
  backgroundFields,
  advancedFields,
  effectsFields,
  spacingFields,
  extractDefaults,
  buildLayoutCSS,
} from '../../fields';

export interface DividerProps {
  id?: string;
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  maxWidth?: ResponsiveMaxWidthValue;
  margin?: ResponsiveSpacingValue;
  backgroundColor?: ColorValue;
  borderRadius?: BorderRadiusValue;
  opacity?: ResponsiveOpacityValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

function DividerComponent({
  id,
  display,
  width,
  height,
  maxWidth,
  margin,
  backgroundColor,
  borderRadius,
  opacity,
  visibility,
  customCss,
  puck,
}: DividerProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const isEditing = usePuckEditMode();
  const { resolve } = useTheme();
  const className = `divider-${id}`;

  const resolvedBackgroundColor = (() => {
    if (!backgroundColor) return 'var(--border, #e5e7eb)';
    if (backgroundColor.type === 'custom') return backgroundColor.value;
    return resolve(backgroundColor.value, 'var(--border, #e5e7eb)');
  })();

  const css = buildLayoutCSS({
    className,
    display,
    width,
    height,
    maxWidth,
    margin,
    backgroundColor: resolvedBackgroundColor,
    borderRadius,
    opacity,
    visibility,
  });

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      <div ref={puck?.dragRef} className={className} role="separator" aria-orientation="horizontal" />
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Divider: ComponentConfig<DividerProps> = {
  label: 'Divider',
  inline: true,

  fields: {
    ...displayField,
    width: layoutFields.width,
    height: {
      ...layoutFields.height,
      label: 'Thickness',
    },
    maxWidth: layoutFields.maxWidth,
    margin: spacingFields.margin,
    backgroundColor: {
      ...backgroundFields.backgroundColor,
      label: 'Color',
    },
    borderRadius: effectsFields.borderRadius,
    opacity: layoutAdvancedFields.opacity,
    visibility: layoutAdvancedFields.visibility,
    ...advancedFields,
  },

  defaultProps: {
    id: 'divider-default',
    ...extractDefaults(
      displayField,
      { width: layoutFields.width },
      {
        height: {
          ...layoutFields.height,
          defaultValue: { mobile: { value: '1', unit: 'px' as const } },
        },
      },
      { maxWidth: layoutFields.maxWidth },
      {
        margin: {
          ...spacingFields.margin,
          defaultValue: {
            mobile: { top: '16', right: '0', bottom: '16', left: '0', unit: 'px' as const, linked: false },
          },
        },
      },
      {
        backgroundColor: {
          ...backgroundFields.backgroundColor,
          defaultValue: { type: 'theme' as const, value: 'border' },
        },
      },
      effectsFields,
      {
        opacity: layoutAdvancedFields.opacity,
        visibility: layoutAdvancedFields.visibility,
      },
      advancedFields,
    ),
    display: { mobile: 'block' },
    width: { mobile: { value: '100', unit: '%' } },
    height: { mobile: { value: '1', unit: 'px' } },
    maxWidth: { mobile: { value: 'none', unit: 'none' } },
    margin: {
      mobile: { top: '16', right: '0', bottom: '16', left: '0', unit: 'px', linked: false },
    },
    backgroundColor: { type: 'theme', value: 'border' },
    borderRadius: {
      topLeft: '0',
      topRight: '0',
      bottomRight: '0',
      bottomLeft: '0',
      unit: 'px',
      linked: true,
    },
    opacity: { mobile: 1 },
    visibility: { mobile: 'visible' },
    customCss: '',
  },

  render: DividerComponent,
};
