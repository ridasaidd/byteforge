import { ComponentConfig, FieldLabel } from '@puckeditor/core';
import { useQuery } from '@tanstack/react-query';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import { pages } from '@/shared/services/api/pages';
import {
  type BorderValue,
  type BorderRadiusValue,
  type ShadowValue,
  type ColorValue,
  type ResponsiveWidthValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveSpacingValue,
  type ResponsiveDisplayValue,
  type ResponsiveLineHeightValue,
  type ResponsiveLetterSpacingValue,
  type ResponsiveVisibilityValue,
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  spacingFields,
  typographyAdvancedFields,
  effectsFields,
  interactionFields,
  hoverStateFields,
  advancedFields,
  // Utilities
  extractDefaults,
  ColorPickerControlColorful as ColorPickerControl,
  buildLayoutCSS,
} from '../../fields';

export interface ButtonProps {
  id?: string;
  text: string;
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  size: 'sm' | 'md' | 'lg';
  linkType: 'none' | 'internal' | 'external';
  internalPage?: string;
  href?: string;
  openInNewTab?: boolean;

  // Typography Advanced
  lineHeight?: ResponsiveLineHeightValue;
  letterSpacing?: ResponsiveLetterSpacingValue;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';

  // Advanced Styling
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;
  padding?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;

  // Interaction
  cursor?: 'auto' | 'pointer' | 'default' | 'text' | 'move' | 'not-allowed';
  transition?: { duration?: string; easing?: string; properties?: string };

  // Hover State
  hoverOpacity?: number;
  hoverBackgroundColor?: ColorValue;
  hoverTextColor?: ColorValue;
  hoverTransform?: string;
}

// Custom field for page selection
// eslint-disable-next-line react-refresh/only-export-components
function PageSelectorField({ field, value, onChange }: { field: { label?: string }; value: string | undefined; onChange: (value: string | undefined) => void }) {
  const { data: pagesResponse } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: async () => {
      const response = await pages.list();
      return response;
    },
  });

  const publishedPages = pagesResponse?.data?.filter((p: { status: string }) => p.status === 'published') || [];

  return (
    <FieldLabel label={field.label || 'Select Page'}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        <option value="">-- Select a page --</option>
        {publishedPages.map((page: { id: number; title: string; slug: string }) => (
          <option key={page.id} value={`/${page.slug}`}>
            {page.title} (/{page.slug})
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function ButtonComponent(props: ButtonProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id, text, backgroundColor, textColor, size, linkType, internalPage, href, openInNewTab,
    // Layout & Spacing
    width, maxWidth, maxHeight, display, margin, padding, visibility,
    // Effects
    border, borderRadius, shadow,
    // Typography
    lineHeight, letterSpacing, textTransform, textDecoration, textDecorationStyle,
    // Interaction & Hover
    cursor, transition, hoverOpacity, hoverBackgroundColor, hoverTextColor, hoverTransform,
    // Advanced
    customCss,
    puck
  } = props;

  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const className = `button-${id}`;

  // Resolve colors from theme if using theme color, otherwise use custom value
  // Always provide fallback to ensure colors are rendered
  // Handle case where "theme" type has a hex/rgb value instead of a theme path
  // NOW: Use CSS variables for defaults, resolve for user-selected theme values
  const resolvedBackgroundColor = (() => {
    if (!backgroundColor) {
      // No color specified - use CSS variable
      return 'var(--component-button-variant-primary-background-color, var(--color-primary-500, #3b82f6))';
    }

    const value = backgroundColor.value;

    // If value is already a color (starts with # or rgb), use it directly
    if (value && (value.startsWith('#') || value.startsWith('rgb'))) {
      return value;
    }

    // If type is theme and value is a theme path, resolve it
    if (backgroundColor.type === 'theme' && value) {
      return resolve(value, '#3b82f6');
    }

    // If type is custom, use the value
    if (backgroundColor.type === 'custom' && value) {
      return value;
    }

    return 'var(--component-button-variant-primary-background-color, var(--color-primary-500, #3b82f6))';
  })();

  const resolvedTextColor = (() => {
    if (!textColor) {
      // No color specified - use CSS variable
      return 'var(--component-button-variant-primary-color, #ffffff)';
    }

    const value = textColor.value;

    // If value is already a color (starts with # or rgb), use it directly
    if (value && (value.startsWith('#') || value.startsWith('rgb'))) {
      return value;
    }

    // If type is theme and value is a theme path, resolve it
    if (textColor.type === 'theme' && value) {
      return resolve(value, '#ffffff');
    }

    // If type is custom, use the value
    if (textColor.type === 'custom' && value) {
      return value;
    }

    return 'var(--component-button-variant-primary-color, #ffffff)';
  })();

  const paddingX = resolve(`components.button.sizes.${size}.paddingX`, size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px');
  const paddingY = resolve(`components.button.sizes.${size}.paddingY`, size === 'sm' ? '6px' : size === 'md' ? '10px' : '12px');
  const fontSize = resolve(`components.button.sizes.${size}.fontSize`, size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px');

  // Resolve hover colors for CSS generation
  const resolvedHoverBg = (() => {
    if (!hoverBackgroundColor) return '';
    if (typeof hoverBackgroundColor === 'string') return hoverBackgroundColor;
    if (hoverBackgroundColor.type === 'custom' && hoverBackgroundColor.value) return hoverBackgroundColor.value;
    if (hoverBackgroundColor.type === 'theme' && hoverBackgroundColor.value) {
      const val = hoverBackgroundColor.value;
      return val.startsWith('#') || val.startsWith('rgb') ? val : resolve(val, '');
    }
    return '';
  })();

  const resolvedHoverText = (() => {
    if (!hoverTextColor) return '';
    if (typeof hoverTextColor === 'string') return hoverTextColor;
    if (hoverTextColor.type === 'custom' && hoverTextColor.value) return hoverTextColor.value;
    if (hoverTextColor.type === 'theme' && hoverTextColor.value) {
      const val = hoverTextColor.value;
      return val.startsWith('#') || val.startsWith('rgb') ? val : resolve(val, '');
    }
    return '';
  })();

  // Determine the actual link based on linkType
  const finalHref = linkType === 'internal' ? internalPage : (linkType === 'external' ? href : undefined);

  // Generate comprehensive CSS using builder utilities
  const buttonCss = isEditing ? (() => {
    const rules: string[] = [];

    // Layout CSS (handles display, width, maxWidth, maxHeight, margin, padding, visibility, border, borderRadius, shadow)
    const layoutCss = buildLayoutCSS({
      className,
      display,
      width,
      maxWidth,
      maxHeight,
      margin,
      padding,
      visibility,
      border,
      borderRadius,
      shadow,
    });
    if (layoutCss) rules.push(layoutCss);

    // Determine which padding to use: custom if provided, otherwise size-based
    const hasCustomPadding = padding && typeof padding === 'object' && (
      'mobile' in padding || 'tablet' in padding || 'desktop' in padding
    );
    const buttonPadding = hasCustomPadding ? '' : `padding: ${paddingY} ${paddingX};`;

    // Base button styles (background, color, size-specific, typography)
    rules.push(`
.${className} {
  background-color: ${resolvedBackgroundColor};
  color: ${resolvedTextColor};
  ${buttonPadding}
  font-size: ${fontSize};
  cursor: ${cursor || 'pointer'};
  transition: ${transition || 'all 0.2s ease'};
  text-decoration: none;
  ${lineHeight ? `line-height: ${typeof lineHeight === 'object' && 'mobile' in lineHeight ? lineHeight.mobile || 'normal' : lineHeight};` : ''}
  ${letterSpacing ? `letter-spacing: ${typeof letterSpacing === 'object' && 'mobile' in letterSpacing ? letterSpacing.mobile || 'normal' : letterSpacing};` : ''}
  ${textTransform ? `text-transform: ${textTransform};` : ''}
  ${textDecoration && textDecoration !== 'none' ? `text-decoration: ${textDecoration};` : ''}
  ${textDecorationStyle ? `text-decoration-style: ${textDecorationStyle};` : ''}
}
    `.trim());

    // Hover state
    if (hoverBackgroundColor || hoverTextColor || hoverOpacity !== undefined || hoverTransform) {
      rules.push(`
.${className}:hover {
  ${resolvedHoverBg ? `background-color: ${resolvedHoverBg} !important;` : ''}
  ${resolvedHoverText ? `color: ${resolvedHoverText} !important;` : ''}
  ${hoverOpacity !== undefined ? `opacity: ${hoverOpacity} !important;` : ''}
  ${hoverTransform ? `transform: ${hoverTransform};` : ''}
}
      `.trim());
    }

    return rules.join('\n');
  })() : '';

  return (
    <>
      {isEditing && buttonCss && <style>{buttonCss}</style>}
      {finalHref ? (
        <a
          ref={puck?.dragRef}
          className={className}
          href={finalHref}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
        >
          {text}
        </a>
      ) : (
        <button
          ref={puck?.dragRef}
          className={className}
        >
          {text}
        </button>
      )}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Button-specific fields
const buttonContentFields = {
  text: {
    type: 'text' as const,
    label: 'Button Text',
  },
  backgroundColor: {
    type: 'custom' as const,
    label: 'Background Color',
    render: (props: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const { value = { type: 'theme', value: 'components.button.variants.primary.backgroundColor' }, onChange } = props;
      return <ColorPickerControl field={props.field} value={value} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'components.button.variants.primary.backgroundColor' },
  },
  textColor: {
    type: 'custom' as const,
    label: 'Text Color',
    render: (props: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
      const { value = { type: 'theme', value: 'components.button.variants.primary.color' }, onChange } = props;
      return <ColorPickerControl field={props.field} value={value} onChange={onChange} />;
    },
    defaultValue: { type: 'theme' as const, value: 'components.button.variants.primary.color' },
  },
  size: {
    type: 'select' as const,
    label: 'Size',
    options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
    defaultValue: 'md',
  },
};

const buttonLinkFields = {
  linkType: {
    type: 'radio' as const,
    label: 'Link Type',
    options: [
      { label: 'No Link', value: 'none' },
      { label: 'Internal Page', value: 'internal' },
      { label: 'External URL', value: 'external' },
    ],
    defaultValue: 'none',
  },
  internalPage: {
    type: 'custom' as const,
    label: 'Select Page',
    render: PageSelectorField,
  },
  href: {
    type: 'text' as const,
    label: 'External URL',
  },
  openInNewTab: {
    type: 'radio' as const,
    label: 'Open in new tab',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: false,
  },
};

// Component configuration using organized field groups
export const Button: ComponentConfig<ButtonProps> = {
  inline: true,
  label: 'Button',

  fields: {
    // Content & Appearance
    ...buttonContentFields,
    // Link Settings
    ...buttonLinkFields,
    // Layout
    ...displayField,
    ...layoutFields,
    visibility: layoutAdvancedFields.visibility,
    // Spacing
    ...spacingFields,
    // Typography Advanced
    ...typographyAdvancedFields,
    // Interaction
    ...interactionFields,
    // Hover State
    ...hoverStateFields,
    // Effects
    ...effectsFields,
    // Advanced
    ...advancedFields,
  },

  defaultProps: {
    ...extractDefaults(
      buttonContentFields as Record<string, { defaultValue?: string | number | boolean | object | undefined }>,
      buttonLinkFields as Record<string, { defaultValue?: string | number | boolean | object | undefined }>,
      displayField,
      layoutFields,
      layoutAdvancedFields,
      spacingFields,
      typographyAdvancedFields,
      interactionFields,
      effectsFields,
      advancedFields,
      hoverStateFields
    ),
    // Override defaults from field groups
    text: 'Click me',
    size: 'md',
    linkType: 'none',
    display: { mobile: 'inline-flex' as const },
    internalPage: undefined,
    href: undefined,
  },

  render: (props) => <ButtonComponent {...props} />,
};
