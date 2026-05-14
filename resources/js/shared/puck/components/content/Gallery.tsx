/* eslint-disable react-refresh/only-export-components */
import { ComponentConfig } from '@puckeditor/core';
import { usePuckEditMode } from '@/shared/hooks';
import {
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveGridColumnsValue,
  type ResponsiveGridGapValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveOverflowValue,
  type ResponsivePositionOffsetValue,
  type ResponsivePositionValue,
  type ResponsiveSpacingValue,
  type ResponsiveTransformValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  type ResponsiveZIndexValue,
  displayField,
  layoutFields,
  layoutAdvancedFields,
  gridLayoutFields,
  spacingFields,
  backgroundFields,
  effectsFields,
  advancedFields,
  extractDefaults,
  createConditionalResolver,
  createMediaUrlField,
  hasGridInAnyBreakpoint,
  hasNonStaticPositionInAnyBreakpoint,
  buildLayoutCSS,
} from '../../fields';

interface GalleryImageItem {
  src: string;
  alt?: string;
  caption?: string;
}

export interface GalleryProps {
  id?: string;
  images: GalleryImageItem[];
  showCaptions?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  imageAspectRatio?: 'auto' | '1 / 1' | '4 / 3' | '3 / 2' | '16 / 9';
  imageBorderRadius?: BorderRadiusValue;
  captionColor?: ColorValue;
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  numColumns?: ResponsiveGridColumnsValue;
  gridGap?: ResponsiveGridGapValue;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  backgroundColor?: ColorValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  positionOffset?: ResponsivePositionOffsetValue;
  transform?: ResponsiveTransformValue;
  zIndex?: ResponsiveZIndexValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

const GalleryComponent = ({
  id,
  images,
  showCaptions = true,
  objectFit = 'cover',
  imageAspectRatio = '4 / 3',
  imageBorderRadius,
  captionColor,
  display,
  width,
  height,
  maxWidth,
  maxHeight,
  numColumns,
  gridGap,
  alignItems,
  padding,
  margin,
  backgroundColor,
  border,
  borderRadius,
  shadow,
  position,
  positionOffset,
  transform,
  zIndex,
  overflow,
  visibility,
  customCss,
  puck,
}: GalleryProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) => {
  const isEditing = usePuckEditMode();
  const className = `gallery-${id}`;
  const resolvedBackgroundColor = backgroundColor?.type === 'custom' ? backgroundColor.value : undefined;

  const layoutCss = buildLayoutCSS({
    className,
    display,
    width,
    height,
    maxWidth,
    maxHeight,
    numColumns,
    gridGap,
    alignItems,
    padding,
    margin,
    backgroundColor: resolvedBackgroundColor,
    border,
    borderRadius,
    shadow,
    position,
    positionOffset,
    transform,
    zIndex,
    overflow,
    visibility,
  });

  const imageRadiusCss = imageBorderRadius
    ? `${imageBorderRadius.topLeft}${imageBorderRadius.unit} ${imageBorderRadius.topRight}${imageBorderRadius.unit} ${imageBorderRadius.bottomRight}${imageBorderRadius.unit} ${imageBorderRadius.bottomLeft}${imageBorderRadius.unit}`
    : '0';

  const galleryItemCss = [
    `.${className} {}`,
    `.${className}-item { display: flex; flex-direction: column; min-width: 0; }`,
    `.${className}-image { inline-size: 100%; aspect-ratio: ${imageAspectRatio}; object-fit: ${objectFit}; border-radius: ${imageRadiusCss}; display: block; }`,
    `.${className}-caption { margin-top: 8px; font-size: 14px; line-height: 1.4; color: ${captionColor?.type === 'custom' ? captionColor.value : 'inherit'}; }`,
  ].join('\n');

  const imageItems = images && images.length > 0
    ? images
    : [
      { src: 'https://placehold.co/800x600?text=Gallery+Image+1', alt: 'Gallery image 1', caption: 'Gallery image 1' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+2', alt: 'Gallery image 2', caption: 'Gallery image 2' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+3', alt: 'Gallery image 3', caption: 'Gallery image 3' },
    ];

  return (
    <>
      {isEditing && <style>{layoutCss}\n{galleryItemCss}</style>}
      <div ref={puck?.dragRef} className={className}>
        {imageItems.map((item, index) => (
          <div key={`${item.src}-${index}`} className={`${className}-item`}>
            <img
              className={`${className}-image`}
              src={item.src}
              alt={item.alt || `Gallery image ${index + 1}`}
            />
            {showCaptions && item.caption ? (
              <p className={`${className}-caption`}>{item.caption}</p>
            ) : null}
          </div>
        ))}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
};

const galleryContentFields = {
  images: {
    type: 'array' as const,
    label: 'Images',
    getItemSummary: (item: GalleryImageItem) => item.caption || item.alt || item.src || 'Gallery Image',
    defaultValue: [
      { src: 'https://placehold.co/800x600?text=Gallery+Image+1', alt: 'Gallery image 1', caption: 'Gallery image 1' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+2', alt: 'Gallery image 2', caption: 'Gallery image 2' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+3', alt: 'Gallery image 3', caption: 'Gallery image 3' },
    ],
    arrayFields: {
      src: createMediaUrlField({
        label: 'Image',
        modalTitle: 'Select Gallery Image',
        previewAlt: 'Gallery image preview',
        previewMaxHeight: '120px',
        previewObjectFit: 'cover',
      }),
      alt: { type: 'text' as const, label: 'Alt Text' },
      caption: { type: 'text' as const, label: 'Caption' },
    },
  },
  showCaptions: {
    type: 'radio' as const,
    label: 'Show Captions',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: true,
  },
  objectFit: {
    type: 'select' as const,
    label: 'Object Fit',
    options: [
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
    ],
    defaultValue: 'cover',
  },
  imageAspectRatio: {
    type: 'select' as const,
    label: 'Image Aspect Ratio',
    options: [
      { label: 'Auto', value: 'auto' },
      { label: '1:1', value: '1 / 1' },
      { label: '4:3', value: '4 / 3' },
      { label: '3:2', value: '3 / 2' },
      { label: '16:9', value: '16 / 9' },
    ],
    defaultValue: '4 / 3',
  },
  imageBorderRadius: effectsFields.borderRadius,
  captionColor: backgroundFields.backgroundColor,
};

export const Gallery: ComponentConfig<GalleryProps> = {
  label: 'Gallery',
  inline: true,

  resolveFields: createConditionalResolver(
    [
      'images',
      'showCaptions',
      'objectFit',
      'imageAspectRatio',
      'imageBorderRadius',
      'captionColor',
      'display',
      'width',
      'height',
      'maxWidth',
      'maxHeight',
      'padding',
      'margin',
      'backgroundColor',
      'border',
      'borderRadius',
      'shadow',
      'position',
      'transform',
      'zIndex',
      'overflow',
      'visibility',
      'customCss',
    ],
    [
      {
        condition: (props) => hasGridInAnyBreakpoint(props.display),
        fieldKeys: ['numColumns', 'gridGap', 'alignItems'],
      },
      {
        condition: (props) => hasNonStaticPositionInAnyBreakpoint(props.position),
        fieldKeys: ['positionOffset'],
      },
      {
        condition: (props) => props.showCaptions === true,
        fieldKeys: ['captionColor'],
      },
    ]
  ),

  fields: {
    ...galleryContentFields,
    ...displayField,
    width: layoutFields.width,
    height: layoutFields.height,
    maxWidth: layoutFields.maxWidth,
    maxHeight: layoutFields.maxHeight,
    ...gridLayoutFields,
    ...spacingFields,
    ...backgroundFields,
    ...effectsFields,
    ...layoutAdvancedFields,
    ...advancedFields,
  },

  defaultProps: {
    ...extractDefaults(
      galleryContentFields,
      displayField,
      { width: layoutFields.width },
      { height: layoutFields.height },
      { maxWidth: layoutFields.maxWidth },
      { maxHeight: layoutFields.maxHeight },
      gridLayoutFields,
      spacingFields,
      backgroundFields,
      effectsFields,
      layoutAdvancedFields,
      advancedFields
    ),
    images: [
      { src: 'https://placehold.co/800x600?text=Gallery+Image+1', alt: 'Gallery image 1', caption: 'Gallery image 1' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+2', alt: 'Gallery image 2', caption: 'Gallery image 2' },
      { src: 'https://placehold.co/800x600?text=Gallery+Image+3', alt: 'Gallery image 3', caption: 'Gallery image 3' },
    ],
    display: { mobile: 'grid' as const },
    width: { mobile: { value: '100', unit: '%' as const } },
    numColumns: { mobile: 1, tablet: 2, desktop: 3 },
    gridGap: { mobile: { value: '16', unit: 'px' as const } },
  },

  render: GalleryComponent,
};
