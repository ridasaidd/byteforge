/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { ComponentConfig } from '@measured/puck';
import { navigations, type Navigation as NavigationType, type MenuItem } from '@/shared/services/api/navigations';
import { Menu, ChevronDown, ExternalLink } from 'lucide-react';
import { useTheme } from '@/shared/hooks';
import {
  SpacingControl,
  ColorPickerControl,
  FontSizeControl,
  FontWeightControl,
  type SpacingValue,
  type ColorValue,
  type FontSizeValue,
  type FontWeightValue
} from './fields';

export interface NavigationProps {
  navigationId?: number;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  showIcons?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  hoverColor?: ColorValue;
  activeColor?: ColorValue;
  fontWeight?: FontWeightValue;
  fontSize?: FontSizeValue;
  padding?: SpacingValue;
  margin?: SpacingValue;
  itemSpacing?: string;
  borderRadius?: string;
}

export const Navigation: ComponentConfig<NavigationProps> = {
  label: 'Navigation Menu',
  fields: {
    navigationId: {
      type: 'external',
      label: 'Select Navigation',
      placeholder: 'Choose a navigation menu...',
      fetchList: async () => {
        try {
          const response = await navigations.list({ status: 'published' });
          return response.data.map((nav: NavigationType) => ({
            title: nav.name,
            value: nav.id,
          }));
        } catch (error) {
          console.error('Failed to fetch navigations:', error);
          return [];
        }
      },
    },
    layout: {
      type: 'radio',
      label: 'Layout',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    showIcons: {
      type: 'radio',
      label: 'Show Icons',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    mobileBreakpoint: {
      type: 'select',
      label: 'Mobile Breakpoint',
      options: [
        { label: 'Small (640px)', value: 'sm' },
        { label: 'Medium (768px)', value: 'md' },
        { label: 'Large (1024px)', value: 'lg' },
      ],
    },
    backgroundColor: {
      type: 'custom',
      label: 'Background Color',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Background Color' }}
          value={props.value || { type: 'theme', value: '' }}
        />
      ),
    },
    textColor: {
      type: 'custom',
      label: 'Text Color',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Text Color' }}
          value={props.value || { type: 'theme', value: 'colors.gray.700' }}
        />
      ),
    },
    hoverColor: {
      type: 'custom',
      label: 'Hover Color',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Hover Color' }}
          value={props.value || { type: 'theme', value: 'colors.primary.500' }}
        />
      ),
    },
    activeColor: {
      type: 'custom',
      label: 'Active Color',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Active Color' }}
          value={props.value || { type: 'theme', value: 'colors.primary.600' }}
        />
      ),
    },
    fontWeight: {
      type: 'custom',
      label: 'Font Weight',
      render: (props) => (
        <FontWeightControl
          {...props}
          field={{ label: 'Font Weight' }}
          value={props.value || { type: 'theme', value: 'typography.fontWeight.medium' }}
        />
      ),
    },
    fontSize: {
      type: 'custom',
      label: 'Font Size',
      render: (props) => (
        <FontSizeControl
          {...props}
          field={{ label: 'Font Size' }}
          value={props.value || { type: 'theme', value: 'typography.fontSize.base' }}
        />
      ),
    },
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => (
        <SpacingControl
          {...props}
          field={{ label: 'Padding' }}
          value={props.value || { top: '16', right: '16', bottom: '16', left: '16', unit: 'px', linked: true }}
        />
      ),
    },
    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => (
        <SpacingControl
          {...props}
          field={{ label: 'Margin' }}
          value={props.value || { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }}
        />
      ),
    },
    itemSpacing: {
      type: 'text',
      label: 'Item Spacing (px)',
    },
    borderRadius: {
      type: 'text',
      label: 'Border Radius (px)',
    },
  },
  defaultProps: {
    layout: 'horizontal',
    align: 'left',
    showIcons: false,
    mobileBreakpoint: 'md',
    backgroundColor: { type: 'theme', value: '' },
    textColor: { type: 'theme', value: 'colors.gray.700' },
    hoverColor: { type: 'theme', value: 'colors.primary.500' },
    activeColor: { type: 'theme', value: 'colors.primary.600' },
    fontWeight: { type: 'theme', value: 'typography.fontWeight.medium' },
    fontSize: { type: 'theme', value: 'typography.fontSize.base' },
    padding: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px' as const, linked: true },
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true },
    itemSpacing: '8',
    borderRadius: '0',
  },
  render: ({ puck, ...props }) => <NavigationRenderer puck={puck} {...props} />,
};

// Separate component to use hooks
function NavigationRenderer({
  navigationId,
  layout,
  align,
  showIcons,
  mobileBreakpoint,
  backgroundColor,
  textColor,
  hoverColor,
  fontWeight,
  fontSize,
  padding,
  margin,
  itemSpacing,
  borderRadius,
  puck,
}: NavigationProps & { puck?: { metadata?: { navigations?: NavigationType[] } } }) {
  const { resolve } = useTheme();

  // Helper function to resolve ColorValue
  const resolveColor = (color: ColorValue | undefined, fallback: string = 'transparent'): string => {
    if (!color) return fallback;
    if (typeof color === 'string') {
      return (color as string).startsWith('#') ? color : resolve(color) || fallback;
    }
    if (color.type === 'theme' && color.value) {
      return typeof color.value === 'string' && color.value.startsWith('#')
        ? color.value
        : resolve(color.value) || fallback;
    }
    if (color.type === 'custom') {
      return color.value || fallback;
    }
    return fallback;
  };

  // Helper function to resolve FontSizeValue
  const resolveFontSize = (size: FontSizeValue | undefined): string => {
    if (!size) return '1rem';
    if (typeof size === 'string') {
      return (size as string).includes('px') || (size as string).includes('rem') ? size : resolve(size) || size;
    }
    if (size.type === 'theme' && size.value) {
      return resolve(size.value) || '1rem';
    }
    if (size.type === 'custom') {
      return size.value || '1rem';
    }
    return '1rem';
  };

  // Helper function to resolve FontWeightValue
  const resolveFontWeight = (weight: FontWeightValue | undefined): string => {
    if (!weight) return '500';
    if (typeof weight === 'string' || typeof weight === 'number') {
      return String(weight);
    }
    if (weight.type === 'theme' && weight.value) {
      return resolve(weight.value) || '500';
    }
    if (weight.type === 'custom') {
      return weight.value || '500';
    }
    return '500';
  };

  // Helper to convert SpacingValue to CSS
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

  // Resolve all theme values
  const resolvedBackgroundColor = resolveColor(backgroundColor, 'transparent');
  const resolvedTextColor = resolveColor(textColor, '#1f2937');
  const resolvedHoverColor = resolveColor(hoverColor, '#3b82f6');
  const resolvedFontSize = resolveFontSize(fontSize);
  const resolvedFontWeight = resolveFontWeight(fontWeight);

  function isNavObj(val: unknown): val is { value: number } {
    if (typeof val !== 'object' || val === null) return false;
    const rec = val as Record<string, unknown>;
    return typeof rec.value === 'number';
  }

  // Extract the actual ID from navigationId (could be object from Puck external field)
  const actualId = isNavObj(navigationId) ? navigationId.value : navigationId;

  // Try to get navigation from metadata immediately (zero delay!)
  const metadataNav = actualId
    ? (puck?.metadata?.navigations as NavigationType[])?.find(nav => nav.id === actualId)
    : null;

  // Initialize state with metadata if available (prevents spinner flash!)
  const [navigation, setNavigation] = useState<NavigationType | null>(metadataNav || null);
  const [isLoading, setIsLoading] = useState(!metadataNav && !!actualId);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only fetch from API if metadata not available (editor/draft mode)
    if (actualId && !metadataNav) {
      const fetchNavigation = async () => {
        try {
          setIsLoading(true);
          const response = await navigations.get(actualId);
          setNavigation(response.data);
        } catch (error) {
          console.error('Failed to load navigation:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchNavigation();
    }
  }, [actualId, metadataNav]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    const itemClasses = `
      flex items-center gap-2
      transition-colors duration-200
      ${layout === 'horizontal' ? `px-${itemSpacing || '2'} py-2` : 'px-2 py-1.5'}
    `;

    const itemStyle: React.CSSProperties = {
      color: resolvedTextColor,
      fontSize: resolvedFontSize,
      fontWeight: resolvedFontWeight,
      borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    };

    // Helper: check if URL is external
    // Treat items with page_id as internal (SPA), and items without page_id (custom links) as external (full reload)
    const isCustomLink = !item.page_id;
    const linkProps = {
      className: itemClasses,
      style: itemStyle,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.color = resolvedHoverColor;
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.color = resolvedTextColor;
      },
    };

    return (
      <li key={item.id} className={depth > 0 ? 'ml-4' : ''}>
        {isCustomLink ? (
          <a
            href={item.url || '#'}
            target={item.target || '_self'}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            {...linkProps}
          >
            {showIcons && item.target === '_blank' && (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>{item.label}</span>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpand(item.id);
                }}
                className="ml-1"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </a>
        ) : (
          <Link
            to={item.url || '#'}
            {...linkProps}
          >
            <span>{item.label}</span>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpand(item.id);
                }}
                className="ml-1"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </Link>
        )}

        {hasChildren && (isExpanded || layout === 'horizontal') && (
          <ul
            className={`
              ${layout === 'horizontal' ? 'absolute bg-white shadow-lg rounded-md py-2 mt-1 min-w-[200px]' : 'ml-4 mt-1'}
            `}
            style={{
              backgroundColor: resolvedBackgroundColor || '#ffffff',
            }}
          >
            {item.children?.map((child) => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // Build hierarchical structure from flat menu items
  const buildHierarchy = (items: MenuItem[]): MenuItem[] => {
    const map = new Map<string, MenuItem>();
    const roots: MenuItem[] = [];

    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!navigationId || !navigation) {
    return (
      <div
        className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg"
        style={{
          backgroundColor: resolvedBackgroundColor,
          color: resolvedTextColor,
          ...spacingToCss(margin),
        }}
      >
        <div className="text-center">
          <Menu className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">No navigation selected</p>
          <p className="text-sm text-gray-500 mt-1">
            Select a navigation from the sidebar
          </p>
        </div>
      </div>
    );
  }

  const menuItems = buildHierarchy(navigation.structure);

  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align || 'left'];

  const breakpointClass = {
    sm: 'sm:flex',
    md: 'md:flex',
    lg: 'lg:flex',
  }[mobileBreakpoint || 'md'];

  return (
    <nav
      style={{
        backgroundColor: resolvedBackgroundColor,
        ...paddingToCss(padding),
        ...spacingToCss(margin),
      }}
      className="relative"
    >
      {/* Mobile Menu Toggle - only visible below breakpoint */}
      <button
        className={`block ${breakpointClass.replace(':flex', ':hidden')} p-2`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" style={{ color: resolvedTextColor }} />
      </button>

      {/* Menu */}
      <ul
        className={`
          ${layout === 'horizontal' ? `flex flex-wrap ${alignClass}` : 'flex flex-col space-y-1'}
          ${breakpointClass}
          ${isMobileMenuOpen ? 'flex' : 'hidden'}
        `}
      >
        {menuItems.map((item) => renderMenuItem(item))}
      </ul>
    </nav>
  );
}
