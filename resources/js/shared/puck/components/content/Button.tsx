import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/shared/hooks';
import { pages } from '@/shared/services/api/pages';
import {
  type BorderValue,
  type BorderRadiusValue,
  type ShadowValue,
  type ColorValue,
  type ResponsiveWidthValue,
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
  generateWidthCSS,
  generateMaxWidthCSS,
  generateMaxHeightCSS,
  generatePaddingCSS,
  generateMarginCSS,
  generateDisplayCSS,
  generateVisibilityCSS,
  ColorPickerControlColorful as ColorPickerControl,
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
function ButtonComponent({ id, text, backgroundColor, textColor, size, linkType, internalPage, href, openInNewTab, width, maxWidth, maxHeight, display, margin, padding, border, shadow, visibility, customCss, lineHeight, letterSpacing, textTransform, textDecoration, textDecorationStyle, cursor, transition, hoverOpacity, hoverBackgroundColor, hoverTextColor, hoverTransform, puck }: ButtonProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const className = `button-${id}`;

  // Generate responsive CSS - all applied directly to button element
  const widthCss = width ? generateWidthCSS(className, width) : '';
  const maxWidthCss = maxWidth ? generateMaxWidthCSS(className, maxWidth) : '';
  const maxHeightCss = maxHeight ? generateMaxHeightCSS(className, maxHeight) : '';
  const marginCss = margin ? generateMarginCSS(className, margin) : '';
  const displayCss = display ? generateDisplayCSS(className, display) : '';
  const paddingCss = padding ? generatePaddingCSS(className, padding) : '';
  const visibilityCss = visibility ? generateVisibilityCSS(className, visibility) : '';

  // Resolve colors from theme if using theme color, otherwise use custom value
  // Always provide fallback to ensure colors are rendered
  // Handle case where "theme" type has a hex/rgb value instead of a theme path
  const resolvedBackgroundColor = (() => {
    if (!backgroundColor) return resolve('components.button.variants.primary.backgroundColor', '#3b82f6');

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

    return resolve('components.button.variants.primary.backgroundColor', '#3b82f6');
  })();

  const resolvedTextColor = (() => {
    if (!textColor) return resolve('components.button.variants.primary.color', '#ffffff');

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

    return resolve('components.button.variants.primary.color', '#ffffff');
  })();

  const paddingX = resolve(`components.button.sizes.${size}.paddingX`, size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px');
  const paddingY = resolve(`components.button.sizes.${size}.paddingY`, size === 'sm' ? '6px' : size === 'md' ? '10px' : '12px');
  const fontSize = resolve(`components.button.sizes.${size}.fontSize`, size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px');
  const borderRadius = resolve(`components.button.sizes.${size}.borderRadius`, '6px');

  // Generate CSS for button (includes colors and layout)
  const buttonCss = `
    .${className} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: ${resolve('typography.fontWeight.medium', '500')};
      text-decoration: ${textDecoration && textDecoration !== 'none' ? textDecoration : 'none'};
      ${textDecorationStyle && textDecoration !== 'none' ? `text-decoration-style: ${textDecorationStyle};` : ''}
      background-color: ${resolvedBackgroundColor};
      color: ${resolvedTextColor};
      font-size: ${fontSize};
      border-radius: ${borderRadius};
      ${textTransform && textTransform !== 'none' ? `text-transform: ${textTransform};` : ''}
      ${!padding ? `
        padding: ${paddingY} ${paddingX};
      ` : ''}
    }
  `;
  const cursorCss = cursor ? `.${className} { cursor: ${cursor}; }\n` : '';
  const transitionCss = transition ? `.${className} { transition: ${transition.properties || 'all'} ${transition.duration || '300ms'} ${transition.easing || 'ease'}; }\n` : '';

  // Generate hover state CSS
  const hoverCss = (() => {
    const hoverRules: string[] = [];

    if (hoverOpacity !== undefined && hoverOpacity !== 100) {
      hoverRules.push(`opacity: ${hoverOpacity / 100};`);
    }

    if (hoverBackgroundColor) {
      const resolvedHoverBg = (() => {
        if (typeof hoverBackgroundColor === 'string') return hoverBackgroundColor;
        if (hoverBackgroundColor.type === 'custom' && hoverBackgroundColor.value) return hoverBackgroundColor.value;
        if (hoverBackgroundColor.type === 'theme' && hoverBackgroundColor.value) {
          const val = hoverBackgroundColor.value;
          return val.startsWith('#') || val.startsWith('rgb') ? val : resolve(val, '');
        }
        return '';
      })();
      if (resolvedHoverBg) hoverRules.push(`background-color: ${resolvedHoverBg};`);
    }

    if (hoverTextColor) {
      const resolvedHoverText = (() => {
        if (typeof hoverTextColor === 'string') return hoverTextColor;
        if (hoverTextColor.type === 'custom' && hoverTextColor.value) return hoverTextColor.value;
        if (hoverTextColor.type === 'theme' && hoverTextColor.value) {
          const val = hoverTextColor.value;
          return val.startsWith('#') || val.startsWith('rgb') ? val : resolve(val, '');
        }
        return '';
      })();
      if (resolvedHoverText) hoverRules.push(`color: ${resolvedHoverText};`);
    }

    if (hoverTransform && hoverTransform !== 'none') {
      hoverRules.push(`transform: ${hoverTransform};`);
    }

    return hoverRules.length > 0
      ? `.${className}:hover {\n      ${hoverRules.join('\n      ')}\n    }\n`
      : '';
  })();

  const borderCss = border && border.top?.style !== 'none' ? `
    .${className} {
      border-top: ${border.top?.width || '0'}${border.unit || 'px'} ${border.top?.style || 'solid'} ${border.top?.color || 'currentColor'};
      border-right: ${border.right?.width || '0'}${border.unit || 'px'} ${border.right?.style || 'solid'} ${border.right?.color || 'currentColor'};
      border-bottom: ${border.bottom?.width || '0'}${border.unit || 'px'} ${border.bottom?.style || 'solid'} ${border.bottom?.color || 'currentColor'};
      border-left: ${border.left?.width || '0'}${border.unit || 'px'} ${border.left?.style || 'solid'} ${border.left?.color || 'currentColor'};
    }
  ` : '';

  // Generate line-height and letter-spacing CSS
  let typographyCss = '';
  if (lineHeight && typeof lineHeight === 'object' && 'mobile' in lineHeight) {
    const lh = lineHeight as Record<string, { value: string; unit?: string }>;
    const mobileValue = lh.mobile?.value || '1.5';
    const mobileUnit = lh.mobile?.unit || 'unitless';
    typographyCss += `.${className} { line-height: ${mobileValue}${mobileUnit === 'unitless' ? '' : mobileUnit}; }\n`;
    if (lh.tablet) {
      typographyCss += `@media (min-width: 768px) { .${className} { line-height: ${lh.tablet.value}${lh.tablet.unit === 'unitless' ? '' : lh.tablet.unit}; } }\n`;
    }
    if (lh.desktop) {
      typographyCss += `@media (min-width: 1024px) { .${className} { line-height: ${lh.desktop.value}${lh.desktop.unit === 'unitless' ? '' : lh.desktop.unit}; } }\n`;
    }
  }
  if (letterSpacing && typeof letterSpacing === 'object' && 'mobile' in letterSpacing) {
    const ls = letterSpacing as Record<string, { value: string; unit?: string }>;
    const mobileValue = ls.mobile?.value || '0';
    const mobileUnit = ls.mobile?.unit || 'em';
    typographyCss += `.${className} { letter-spacing: ${mobileValue}${mobileUnit}; }\n`;
    if (ls.tablet) {
      typographyCss += `@media (min-width: 768px) { .${className} { letter-spacing: ${ls.tablet.value}${ls.tablet.unit}; } }\n`;
    }
    if (ls.desktop) {
      typographyCss += `@media (min-width: 1024px) { .${className} { letter-spacing: ${ls.desktop.value}${ls.desktop.unit}; } }\n`;
    }
  }

  const shadowCss = (() => {
    if (!shadow || shadow.preset === 'none') return '';

    const shadowValue = shadow.preset === 'custom' ? shadow.custom : {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }[shadow.preset];

    return shadowValue ? `
      .${className} {
        box-shadow: ${shadowValue};
      }
    ` : '';
  })();

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    // Darken the background color on hover
    const currentBg = resolvedBackgroundColor;
    if (currentBg && currentBg.startsWith('#')) {
      // Simple darkening for hex colors
      e.currentTarget.style.opacity = resolve('components.button.hoverOpacity', '0.9');
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleFocus = () => {
    // Could add focus ring styling here if needed
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.outline = 'none';
  };

  // Determine the actual link based on linkType
  const finalHref = linkType === 'internal' ? internalPage : (linkType === 'external' ? href : undefined);

  // Render button/link directly - no wrapper needed
  // Parent components (Flex, Columns) handle alignment
  return (
    <>
      <style>
        {buttonCss}
        {displayCss}
        {visibilityCss}
        {widthCss}
        {maxWidthCss}
        {maxHeightCss}
        {marginCss}
        {paddingCss}
        {typographyCss}
        {borderCss}
        {shadowCss}
        {cursorCss}
        {transitionCss}
        {hoverCss}
      </style>
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
