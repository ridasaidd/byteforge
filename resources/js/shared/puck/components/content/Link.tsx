import { ComponentConfig } from '@puckeditor/core';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import { toRelativePath } from '@/shared/utils/routerNavigation';
import {
  createLinkDestinationFields,
  createLinkDestinationResolver,
  createTargetField,
} from '../shared/linkDestinationFields';
import {
  getSharedLinkAnchorProps,
  resolveSharedLinkDestination,
  shouldRenderSharedSpaLink,
} from '../shared/linkRuntime';
import {
  ColorValue,
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  ResponsiveSpacingValue,
  ResponsiveFontSizeValue,
  ResponsiveWidthValue,
  ResponsiveDisplayValue,
  FontWeightValue,
  ResponsiveLineHeightValue,
  ResponsiveLetterSpacingValue,
  ResponsiveMaxWidthValue,
  ResponsiveMaxHeightValue,
  ResponsiveVisibilityValue,
  ColorPickerControlColorful as ColorPickerControl,
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  textColorField,
  fontSizeField,
  fontWeightField,
  typographyAdvancedFields,
  textAlignField,
  backgroundFields,
  spacingFields,
  effectsFields,
  advancedFields,
  customClassesFields,
  interactionFields,
  // Utilities
  extractDefaults,
  buildTypographyCSS,
  generateFontSizeCSS,
} from '../../fields';

export interface LinkProps {
  id?: string;

  // Custom styling
  customClassName?: string;
  customId?: string;

  // Link type and destination
  linkType: 'external' | 'internal';
  href?: string;  // For external links
  internalPage?: string;
  label: string;
  openInNewTab?: boolean;

  // Legacy interaction props kept for saved content migration
  to?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';

  // Typography
  align?: 'left' | 'center' | 'right';
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontSize?: ResponsiveFontSizeValue;
  fontWeight?: FontWeightValue;
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';

  // Layout
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;
  padding?: ResponsiveSpacingValue;
  visibility?: ResponsiveVisibilityValue;

  // Effects
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;

  // Interaction
  cursor?: 'default' | 'auto' | 'pointer' | 'text' | 'move' | 'not-allowed';
  transition?: {
    duration: string;
    easing: string;
    properties: string;
  };

  // Hover state
  hoverColor?: ColorValue;
  hoverBackgroundColor?: ColorValue;
  hoverTransform?: string;

  // Advanced
  customCss?: string;
}

function LinkComponent({
  id,
  customClassName = '',
  customId = '',
  linkType,
  href,
  internalPage,
  label,
  openInNewTab = false,
  align,
  color,
  backgroundColor,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textTransform,
  textDecoration = 'underline',
  width,
  maxWidth,
  maxHeight,
  display,
  margin,
  padding,
  border,
  borderRadius,
  shadow,
  visibility,
  cursor,
  transition,
  hoverColor,
  hoverBackgroundColor,
  hoverTransform,
  customCss,
  puck,
}: LinkProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const className = customClassName ? `link-${id} ${customClassName}` : `link-${id}`;
  const elementId = customId || undefined;

  // Resolve color helper
  const resolveColor = (colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
    return resolve(val, fallback);
  };

  // Resolve colors
  const resolvedColor = resolveColor(color, resolve('components.link.colors.default', '#0066cc'));
  const resolvedBgColor = resolveColor(backgroundColor, 'transparent');
  const resolvedHoverColor = resolveColor(hoverColor, resolve('components.link.colors.hover', '#0052a3'));
  const resolvedHoverBgColor = resolveColor(hoverBackgroundColor, 'transparent');
  const resolvedFontWeight =
    fontWeight?.type === 'custom'
      ? fontWeight.value
      : fontWeight?.type === 'theme' && fontWeight.value
        ? resolve(fontWeight.value, 'var(--font-weight-normal, 400)')
        : 'var(--font-weight-normal, 400)';

  // Generate CSS in edit mode for live preview
  const css = isEditing ? buildTypographyCSS({
    className,
    display,
    width,
    maxWidth,
    maxHeight,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    fontWeight: resolvedFontWeight,
    lineHeight,
    letterSpacing,
    textTransform,
    textAlign: align,
    color: resolvedColor,
    backgroundColor: resolvedBgColor,
    visibility,
    cursor,
    transition,
  }) : '';
  const fontSizeCss = isEditing && fontSize ? generateFontSizeCSS(className, fontSize, resolve) : '';

  // Generate hover state CSS in edit mode
  const hoverCss = isEditing && (hoverColor || hoverBackgroundColor || hoverTransform)
    ? `.${className}:hover {
        ${hoverColor ? `color: ${resolvedHoverColor} !important;` : ''}
        ${hoverBackgroundColor ? `background-color: ${resolvedHoverBgColor} !important;` : ''}
        ${hoverTransform ? `transform: ${hoverTransform};` : ''}
      }`
    : '';

  // Add text-decoration in edit mode
  const textDecorationCss = isEditing ? `.${className} {
    text-decoration: ${textDecoration};
  }` : '';

  // Link destination
  const destination = resolveSharedLinkDestination({ linkType, internalPage, href, openInNewTab }) || '#';
  const linkAnchorProps = getSharedLinkAnchorProps(openInNewTab);

  return (
    <>
      {isEditing && (css || fontSizeCss || hoverCss || textDecorationCss) && (
        <style>{css}{fontSizeCss}{hoverCss}{textDecorationCss}</style>
      )}
      {puck?.dragRef ? (
        // In editor: render as span to prevent all navigation
        <span
          ref={puck.dragRef}
          className={className}
          {...(elementId && { id: elementId })}
        >
          {label}
        </span>
      ) : linkType === 'external' ? (
        // Storefront: external link
        <a
          className={className}
          {...(elementId && { id: elementId })}
          href={destination}
          {...linkAnchorProps}
        >
          {label}
        </a>
      ) : shouldRenderSharedSpaLink({ linkType, internalPage, href, openInNewTab }) ? (
        // Storefront: internal link with React Router
        <RouterLink
          className={className}
          {...(elementId && { id: elementId })}
          to={toRelativePath(destination)}
        >
          {label}
        </RouterLink>
      ) : (
        <a
          className={className}
          {...(elementId && { id: elementId })}
          href={destination}
          {...linkAnchorProps}
        >
          {label}
        </a>
      )}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

const linkDestinationFields = {
  ...createLinkDestinationFields({
    linkTypeOptions: [
      { label: 'Internal (React Router)', value: 'internal' },
      { label: 'External (URL)', value: 'external' },
    ],
    defaultLinkType: 'internal',
    internalPageLabel: 'Page (Internal)',
    externalUrlLabel: 'URL (External)',
    externalUrlPlaceholder: 'https://example.com',
  }),
  target: createTargetField(),
};

// Component configuration
export const Link: ComponentConfig<LinkProps> = {
  label: 'Link',
  inline: true,

  resolveData: ({ props }) => {
    const nextProps = {
      ...props,
      internalPage: props.internalPage || props.to,
      openInNewTab: typeof props.openInNewTab === 'boolean'
        ? props.openInNewTab
        : props.target === '_blank',
    };

    delete nextProps.to;
    delete nextProps.target;

    return { props: nextProps };
  },

  fields: {
    // Custom styling
    ...customClassesFields,

    // Link configuration
    ...linkDestinationFields,
    label: {
      type: 'text',
      label: 'Link Text',
    },

    // Typography
    ...textAlignField,
    ...textColorField,
    ...fontSizeField,
    ...fontWeightField,
    ...typographyAdvancedFields,
    textDecoration: {
      type: 'select',
      label: 'Text Decoration',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Underline', value: 'underline' },
        { label: 'Line Through', value: 'line-through' },
      ],
    },

    // Layout
    ...displayField,
    ...layoutFields,
    visibility: layoutAdvancedFields.visibility,
    ...spacingFields,
    ...backgroundFields,
    ...effectsFields,

    // Interaction
    ...interactionFields,

    // Hover state
    hoverColor: {
      type: 'custom',
      label: 'Hover Text Color',
      render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
        return <ColorPickerControl field={field} value={value || { type: 'theme', value: '' }} onChange={onChange} />;
      },
    },
    hoverBackgroundColor: {
      type: 'custom',
      label: 'Hover Background Color',
      render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
        return <ColorPickerControl field={field} value={value || { type: 'theme', value: '' }} onChange={onChange} />;
      },
    },
    hoverTransform: {
      type: 'select',
      label: 'Hover Transform',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Scale Up (1.05)', value: 'scale(1.05)' },
        { label: 'Scale Up (1.1)', value: 'scale(1.1)' },
        { label: 'Translate Up', value: 'translateY(-2px)' },
      ],
    },

    // Advanced
    ...advancedFields,
  },

  resolveFields: createLinkDestinationResolver(
    [
      'customClassName',
      'customId',
      'linkType',
      'label',
      'align',
      'color',
      'backgroundColor',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'textTransform',
      'textDecoration',
      'display',
      'width',
      'maxWidth',
      'maxHeight',
      'visibility',
      'margin',
      'padding',
      'border',
      'borderRadius',
      'shadow',
      'cursor',
      'transition',
      'hoverColor',
      'hoverBackgroundColor',
      'hoverTransform',
      'customCss',
    ],
    { targetFieldKey: 'target' }
  ),

  defaultProps: {
    label: 'Click here',
    textDecoration: 'underline',
    ...extractDefaults(
      customClassesFields,
      linkDestinationFields as Record<string, { defaultValue?: string | number | boolean | object | undefined }>,
      textAlignField,
      textColorField,
      fontSizeField,
      fontWeightField,
      typographyAdvancedFields,
      displayField,
      layoutFields,
      layoutAdvancedFields,
      spacingFields,
      backgroundFields,
      effectsFields,
      interactionFields,
      advancedFields
    ),
    linkType: 'internal',
    internalPage: undefined,
    href: undefined,
    openInNewTab: false,
    hoverColor: { type: 'theme', value: '' },
    hoverBackgroundColor: { type: 'theme', value: '' },
    hoverTransform: 'none',
  },

  render: (props) => <LinkComponent {...props} />,
};
