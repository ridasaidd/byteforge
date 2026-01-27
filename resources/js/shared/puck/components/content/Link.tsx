import { ComponentConfig } from '@puckeditor/core';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import { PagesSelector } from './PagesSelector';
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
} from '../../fields';

export interface LinkProps {
  id?: string;

  // Custom styling
  customClassName?: string;
  customId?: string;

  // Link type and destination
  linkType: 'external' | 'internal';
  href?: string;  // For external links
  to?: string;    // For internal links (react-router)
  label: string;
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
  to,
  label,
  target = '_self',
  align,
  color,
  backgroundColor,
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
    fontWeight: fontWeight?.type === 'custom' ? fontWeight.value : fontWeight?.value,
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
  const destination = linkType === 'external' ? (href || '#') : (to || '/');

  return (
    <>
      {isEditing && (css || hoverCss || textDecorationCss) && (
        <style>{css}{hoverCss}{textDecorationCss}</style>
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
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        >
          {label}
        </a>
      ) : (
        // Storefront: internal link with React Router
        <RouterLink
          className={className}
          {...(elementId && { id: elementId })}
          to={destination}
        >
          {label}
        </RouterLink>
      )}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Component configuration
export const Link: ComponentConfig<LinkProps> = {
  label: 'Link',
  inline: true,

  fields: {
    // Custom styling
    ...customClassesFields,

    // Link configuration
    linkType: {
      type: 'radio',
      label: 'Link Type',
      options: [
        { label: 'Internal (React Router)', value: 'internal' },
        { label: 'External (URL)', value: 'external' },
      ],
    },
    label: {
      type: 'text',
      label: 'Link Text',
    },

    // Destination fields
    href: {
      type: 'text',
      label: 'URL (External)',
      placeholder: 'https://example.com',
    },
    to: {
      type: 'custom',
      label: 'Page (Internal)',
      render: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
        <PagesSelector value={value} onChange={onChange} />
      ),
    },
    target: {
      type: 'select',
      label: 'Target',
      options: [
        { label: 'Same Window (_self)', value: '_self' },
        { label: 'New Window (_blank)', value: '_blank' },
        { label: 'Parent Frame (_parent)', value: '_parent' },
        { label: 'Top Frame (_top)', value: '_top' },
      ],
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

  // Conditional field resolution - show/hide fields based on linkType
  resolveFields: (data, { fields }) => {
    // Hide 'href' and 'target' for internal links
    // Hide 'to' for external links
    if (data.props.linkType === 'external') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { to, ...rest } = fields;
      return rest;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { href, target, ...rest } = fields;
      return rest;
    }
  },

  defaultProps: {
    linkType: 'internal',
    label: 'Click here',
    target: '_self',
    textDecoration: 'underline',
    ...extractDefaults(
      customClassesFields,
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
  },

  render: (props) => <LinkComponent {...props} />,
};
