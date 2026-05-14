import { ComponentConfig } from '@puckeditor/core';
import { Link as RouterLink } from 'react-router-dom';
import { usePuckEditMode } from '@/shared/hooks';
import { toRelativePath } from '@/shared/utils/routerNavigation';
import {
  createLinkDestinationFields,
  createOpenInNewTabField,
  createLinkDestinationResolver,
} from '../shared/linkDestinationFields';
import {
  getSharedLinkAnchorProps,
  resolveSharedLinkDestination,
  shouldRenderSharedSpaLink,
} from '../shared/linkRuntime';
import {
  type BorderRadiusValue,
  type BorderValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  displayField,
  layoutFields,
  layoutAdvancedFields,
  spacingFields,
  effectsFields,
  advancedFields,
  extractDefaults,
  buildLayoutCSS,
  createMediaUrlField,
} from '../../fields';

export interface LogoProps {
  id?: string;
  src: string;
  alt: string;
  linkType?: 'none' | 'internal' | 'external';
  internalPage?: string;
  href?: string;
  openInNewTab?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  margin?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

function LogoComponent({
  id,
  src,
  alt,
  linkType = 'none',
  internalPage,
  href,
  openInNewTab = false,
  objectFit = 'contain',
  display,
  width,
  height,
  maxWidth,
  maxHeight,
  margin,
  border,
  borderRadius,
  shadow,
  visibility,
  customCss,
  puck,
}: LogoProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const isEditing = usePuckEditMode();
  const className = `logo-${id}`;

  const css = isEditing ? (() => {
    const layoutCss = buildLayoutCSS({
      className,
      display,
      width,
      height,
      maxWidth,
      maxHeight,
      margin,
      border,
      borderRadius,
      shadow,
      visibility,
      objectFit,
    });

    return [
      layoutCss,
      `.${className} { object-fit: ${objectFit}; }`,
    ].filter(Boolean).join('\n');
  })() : '';

  const destination = resolveSharedLinkDestination({ linkType, internalPage, href, openInNewTab });
  const linkAnchorProps = getSharedLinkAnchorProps(openInNewTab);

  const imageNode = (
    <img
      ref={puck?.dragRef}
      className={className}
      src={src || 'https://placehold.co/320x120?text=Logo'}
      alt={alt || 'Logo'}
    />
  );

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      {isEditing || !destination ? imageNode : shouldRenderSharedSpaLink({ linkType, internalPage, href, openInNewTab }) ? (
        <RouterLink to={toRelativePath(destination)}>
          {imageNode}
        </RouterLink>
      ) : (
        <a href={destination} {...linkAnchorProps}>
          {imageNode}
        </a>
      )}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

const logoContentFields = {
  src: createMediaUrlField({
    label: 'Logo',
    modalTitle: 'Select Logo',
    previewAlt: 'Logo preview',
    previewMaxHeight: '120px',
    previewObjectFit: 'contain',
  }),
  alt: { type: 'text' as const, label: 'Alt Text' },
};

const logoLinkFields = {
  ...createLinkDestinationFields({
    linkTypeOptions: [
      { label: 'No Link', value: 'none' },
      { label: 'Internal Page', value: 'internal' },
      { label: 'External URL', value: 'external' },
    ],
    defaultLinkType: 'none',
  }),
  openInNewTab: createOpenInNewTabField(),
};

const logoStyleFields = {
  objectFit: {
    type: 'select' as const,
    label: 'Object Fit',
    options: [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
    ],
    defaultValue: 'contain',
  },
};

export const Logo: ComponentConfig<LogoProps> = {
  label: 'Logo',
  inline: true,

  resolveFields: createLinkDestinationResolver(
    [
      'src',
      'alt',
      'linkType',
      'objectFit',
      'display',
      'width',
      'height',
      'maxWidth',
      'maxHeight',
      'margin',
      'border',
      'borderRadius',
      'shadow',
      'visibility',
      'customCss',
    ]
  ),

  fields: {
    ...logoContentFields,
    ...logoLinkFields,
    ...logoStyleFields,
    ...displayField,
    width: layoutFields.width,
    height: layoutFields.height,
    maxWidth: layoutFields.maxWidth,
    maxHeight: layoutFields.maxHeight,
    margin: spacingFields.margin,
    border: effectsFields.border,
    borderRadius: effectsFields.borderRadius,
    shadow: effectsFields.shadow,
    visibility: layoutAdvancedFields.visibility,
    ...advancedFields,
  },

  defaultProps: {
    src: '',
    alt: 'Logo',
    linkType: 'none',
    internalPage: undefined,
    href: undefined,
    openInNewTab: false,
    objectFit: 'contain',
    ...extractDefaults(
      logoLinkFields as Record<string, { defaultValue?: string | number | boolean | object | undefined }>,
      displayField,
      { width: layoutFields.width },
      {
        height: {
          ...layoutFields.height,
          defaultValue: { mobile: { value: '60', unit: 'px' as const } },
        },
      },
      { maxWidth: layoutFields.maxWidth },
      { maxHeight: layoutFields.maxHeight },
      { margin: spacingFields.margin },
      effectsFields,
      { visibility: layoutAdvancedFields.visibility },
      advancedFields
    ),
    display: { mobile: 'inline-block' as const },
    width: { mobile: { value: '220', unit: 'px' as const } },
    height: { mobile: { value: '60', unit: 'px' as const } },
    maxWidth: { mobile: { value: '100', unit: '%' as const } },
    maxHeight: { mobile: { value: 'none', unit: 'none' as const } },
  },

  render: (props) => <LogoComponent {...props} />,
};
