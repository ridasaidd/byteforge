import { ComponentConfig, FieldLabel } from '@measured/puck';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/shared/hooks';
import { pages } from '@/shared/services/api/pages';
import { SpacingControl, AlignmentControl, BorderControl, ShadowControl, type SpacingValue, type AlignmentValue, type BorderValue, type ShadowValue } from './fields';

export interface ButtonProps {
  text: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  linkType: 'none' | 'internal' | 'external';
  internalPage?: string;
  href?: string;
  openInNewTab?: boolean;

  // Advanced Styling
  alignment?: AlignmentValue;
  margin?: SpacingValue;
  padding?: SpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  customCss?: string;
}

// Custom field for page selection
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

function ButtonComponent({ text, variant, size, linkType, internalPage, href, openInNewTab, alignment, margin, padding, border, shadow, customCss }: ButtonProps) {
  const { resolve } = useTheme();

  // Get theme values for the selected variant and size
  const backgroundColor = resolve(`components.button.variants.${variant}.backgroundColor`);
  const color = resolve(`components.button.variants.${variant}.color`);
  const hoverBackgroundColor = resolve(`components.button.variants.${variant}.hoverBackgroundColor`);
  const borderColor = resolve(`components.button.variants.${variant}.borderColor`);
  const borderWidth = resolve(`components.button.variants.${variant}.borderWidth`);
  const focusRing = resolve(`components.button.variants.${variant}.focusRing`);

  const paddingX = resolve(`components.button.sizes.${size}.paddingX`);
  const paddingY = resolve(`components.button.sizes.${size}.paddingY`);
  const fontSize = resolve(`components.button.sizes.${size}.fontSize`);
  const borderRadius = resolve(`components.button.sizes.${size}.borderRadius`);

  // Helper to convert spacing value to CSS
  const spacingToCss = (spacing: SpacingValue | undefined) => {
    if (!spacing) return {};
    return {
      marginTop: `${spacing.top}${spacing.unit}`,
      marginRight: `${spacing.right}${spacing.unit}`,
      marginBottom: `${spacing.bottom}${spacing.unit}`,
      marginLeft: `${spacing.left}${spacing.unit}`,
    };
  };

  const paddingToCss = (spacing: SpacingValue | undefined) => {
    if (!spacing) return {};
    return {
      paddingTop: `${spacing.top}${spacing.unit}`,
      paddingRight: `${spacing.right}${spacing.unit}`,
      paddingBottom: `${spacing.bottom}${spacing.unit}`,
      paddingLeft: `${spacing.left}${spacing.unit}`,
    };
  };

  // Helper for border
  const borderToCss = (borderVal: BorderValue | undefined) => {
    if (!borderVal || borderVal.style === 'none') return {};
    return {
      border: `${borderVal.width}${borderVal.unit} ${borderVal.style} ${borderVal.color}`,
      borderRadius: `${borderVal.radius}${borderVal.unit}`,
    };
  };

  // Helper for shadow
  const shadowToCss = (shadowVal: ShadowValue | undefined) => {
    if (!shadowVal || shadowVal.preset === 'none') return {};
    if (shadowVal.preset === 'custom') return { boxShadow: shadowVal.custom };

    const shadows: Record<string, string> = {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };
    return { boxShadow: shadows[shadowVal.preset] };
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    transition: 'all 0.2s',
    cursor: 'pointer',
    textDecoration: 'none',
    // Theme styles
    backgroundColor,
    color,
    fontSize,
    ...(borderColor && borderWidth ? {
      border: `${borderWidth} solid ${borderColor}`,
    } : {}),
    // Default padding from theme (can be overridden)
    ...(padding ? paddingToCss(padding) : {
      paddingLeft: paddingX,
      paddingRight: paddingX,
      paddingTop: paddingY,
      paddingBottom: paddingY,
    }),
    borderRadius,
    // Advanced controls
    ...spacingToCss(margin),
    ...borderToCss(border),
    ...shadowToCss(shadow),
  };

  // Container for alignment
  const containerStyles: React.CSSProperties = alignment ? {
    display: 'flex',
    justifyContent: alignment.horizontal === 'left' ? 'flex-start' :
                    alignment.horizontal === 'center' ? 'center' :
                    alignment.horizontal === 'right' ? 'flex-end' : 'flex-start',
    width: '100%',
  } : {};

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (hoverBackgroundColor) {
      e.currentTarget.style.backgroundColor = hoverBackgroundColor;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (backgroundColor) {
      e.currentTarget.style.backgroundColor = backgroundColor;
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (focusRing) {
      e.currentTarget.style.outline = `2px solid ${focusRing}`;
      e.currentTarget.style.outlineOffset = '2px';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.outline = 'none';
  };

  // Determine the actual link based on linkType
  const finalHref = linkType === 'internal' ? internalPage : (linkType === 'external' ? href : undefined);

  const buttonElement = finalHref ? (
    <a
      href={finalHref}
      style={baseStyles}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {text}
    </a>
  ) : (
    <button
      style={baseStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {text}
    </button>
  );

  return (
    <>
      {alignment ? (
        <div style={containerStyles}>
          {buttonElement}
        </div>
      ) : buttonElement}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

export const Button: ComponentConfig<ButtonProps> = {
  label: 'Button',
  fields: {
    text: {
      type: 'text',
      label: 'Button Text',
    },
    variant: {
      type: 'select',
      label: 'Variant',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Ghost', value: 'ghost' },
      ],
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    linkType: {
      type: 'radio',
      label: 'Link Type',
      options: [
        { label: 'No Link', value: 'none' },
        { label: 'Internal Page', value: 'internal' },
        { label: 'External URL', value: 'external' },
      ],
    },
    internalPage: {
      type: 'custom',
      label: 'Select Page',
      render: PageSelectorField,
    },
    href: {
      type: 'text',
      label: 'External URL',
    },
    openInNewTab: {
      type: 'radio',
      label: 'Open in new tab',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    alignment: {
      type: 'custom',
      label: 'Alignment',
      render: (props) => {
        const { value = { horizontal: 'left' }, onChange } = props;
        return <AlignmentControl {...props} value={value} onChange={onChange} />;
      },
    },
    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => {
        const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} />;
      },
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => {
        const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
        return <SpacingControl {...props} value={value} onChange={onChange} allowNegative={false} />;
      },
    },
    border: {
      type: 'custom',
      label: 'Border',
      render: (props) => {
        const { value = { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' }, onChange } = props;
        return <BorderControl {...props} value={value} onChange={onChange} />;
      },
    },
    shadow: {
      type: 'custom',
      label: 'Shadow',
      render: (props) => {
        const { value = { preset: 'none' }, onChange } = props;
        return <ShadowControl {...props} value={value} onChange={onChange} />;
      },
    },
    customCss: {
      type: 'textarea',
      label: 'Custom CSS',
    },
  },
  defaultProps: {
    text: 'Click me',
    variant: 'primary',
    size: 'md',
    linkType: 'none',
    openInNewTab: false,
    alignment: { horizontal: 'left' },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    border: { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' },
    shadow: { preset: 'none' },
  },
  render: (props) => <ButtonComponent {...props} />,
};
