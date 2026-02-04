import type { ComponentConfig } from '@puckeditor/core';
import { createElement } from 'react';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import { extractIconSvg, getAllIconNames } from '@/shared/utils/extractIconSvg';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  type ColorValue,
  type ResponsiveSpacingValue,
  type ResponsiveDisplayValue,
  displayField,
  spacingFields,
  buildLayoutCSS,
  ColorPickerControlColorful as ColorPickerControl,
} from '../../fields';

export type IconProps = {
  id?: string;
  name: string;
  svg?: string;
  size?: number;
  strokeWidth?: number;
  color?: ColorValue;
  ariaLabel?: string;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  display?: ResponsiveDisplayValue;
};

/**
 * Icon Component
 *
 * Renders icons using SVG extraction strategy:
 * - Editor: Uses Lucide React components for live preview
 * - Storefront: Renders inline SVG from database (zero bundle impact)
 */
function IconComponent({
  id,
  name,
  svg,
  size = 24,
  strokeWidth = 2,
  color,
  ariaLabel,
  padding,
  margin,
  display,
  puck,
}: IconProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const isEditor = usePuckEditMode();

  // Resolve color
  const resolveColor = (colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;

    // ColorValue is never a plain string in the current type definition
    // It's always an object with type and value

    if (colorVal && typeof colorVal === 'object' && 'type' in colorVal) {
      if (colorVal.type === 'custom' && 'value' in colorVal) {
        return (colorVal.value as string) || fallback;
      }
      if (colorVal.type === 'theme' && 'value' in colorVal && colorVal.value) {
        const val = colorVal.value as string;
        return val.startsWith('#') ? val : resolve(val, fallback);
      }
    }

    return fallback;
  };

  const resolvedColor = resolveColor(color, resolve('colors.foreground', '#000000'));
  const className = `icon-${name.toLowerCase()}-${id || 'default'}`;
  const iconLabel = ariaLabel || `${name} icon`;

  // Generate CSS using centralized builder (always, for both editor and storefront)
  const iconCss = buildLayoutCSS({
    className,
    display,
    padding,
    margin,
  });

  const renderContent = () => {
    // In editor: Use live Lucide React component
    if (isEditor) {
      const IconComponentLucide = (LucideIcons as unknown as Record<string, LucideIcon>)[name];

      if (IconComponentLucide) {
        return (
          <span
            ref={puck?.dragRef}
            className={className}
            role="img"
            aria-label={iconLabel}
            style={{
              color: resolvedColor,
            }}
          >
            {createElement(IconComponentLucide, { size, strokeWidth })}
          </span>
        );
      }
    }

    // On storefront: Use stored SVG
    if (svg) {
      // Inject size into SVG if different from stored size
      const sizedSvg = svg
        .replace(/width="\d+"/, `width="${size}"`)
        .replace(/height="\d+"/, `height="${size}"`)
        .replace(/stroke-width="\d+"/, `stroke-width="${strokeWidth}"`);

      return (
        <span
          ref={puck?.dragRef}
          className={className}
          role="img"
          aria-label={iconLabel}
          style={{
            color: resolvedColor,
          }}
          dangerouslySetInnerHTML={{ __html: sizedSvg }}
        />
      );
    }

    // Fallback: No icon
    return (
      <span
        ref={puck?.dragRef}
        className={className}
        role="img"
        aria-label={iconLabel}
        style={{
          width: size,
          height: size,
        }}
      />
    );
  };

  return (
    <>
      {iconCss && <style>{iconCss}</style>}
      {renderContent()}
    </>
  );
}

/**
 * Puck Component Configuration
 */
export const Icon: ComponentConfig<IconProps> = {
  label: 'Icon',

  fields: {
    name: {
      type: 'select',
      label: 'Icon',
      options: getAllIconNames().map(name => ({
        label: name,
        value: name,
      })),
    },
    size: {
      type: 'number',
      label: 'Size (px)',
      min: 12,
      max: 128,
    },
    strokeWidth: {
      type: 'number',
      label: 'Stroke Width',
      min: 1,
      max: 4,
      step: 0.5,
    },
    color: {
      type: 'custom',
      label: 'Color',
      render: ({ field, value, onChange }: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => {
        const safeValue = value ?? { type: 'theme' as const, value: 'colors.foreground' };
        return <ColorPickerControl field={field} value={safeValue} onChange={onChange} />;
      },
    },
    ariaLabel: {
      type: 'text',
      label: 'Accessibility Label (optional)',
    },
    ...displayField,
    ...spacingFields,
  },

  defaultProps: {
    name: 'Star',
    size: 24,
    strokeWidth: 2,
    color: { type: 'theme', value: 'colors.foreground' },
    display: { mobile: 'inline-block' },
    padding: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    },
    margin: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    },
  },

  render: (props) => <IconComponent {...props} />,

  /**
   * Extract and store SVG on save
   * This hook is called when the component data is being saved
   */
  resolveData: async (data) => {
    const { name, size, strokeWidth, ...rest } = data.props as IconProps;

    try {
      // Extract SVG from Lucide icon
      const svg = extractIconSvg(name, size, strokeWidth);

      return {
        props: {
          ...rest,
          name,
          size,
          strokeWidth,
          svg, // Store extracted SVG
        },
      };
    } catch (error) {
      console.error('Failed to extract SVG:', error);
      return { props: data.props as IconProps };
    }
  },
};
