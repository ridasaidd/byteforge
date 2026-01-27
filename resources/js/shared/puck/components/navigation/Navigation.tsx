/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { ComponentConfig } from '@puckeditor/core';
import { navigations, type Navigation as NavigationType, type MenuItem } from '@/shared/services/api/navigations';
import { Menu, ChevronDown, ExternalLink, X } from 'lucide-react';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import {
  ColorPickerControlColorful as ColorPickerControl,
  FontWeightControl,
  type ColorValue,
  type FontWeightValue,
  ResponsiveFontSizeControl,
  ResponsiveSpacingControl,
  type ResponsiveFontSizeValue,
  type ResponsiveSpacingValue,
  generateFontSizeCSS,
  buildLayoutCSS
} from '../../fields';

// =============================================================================
// Types
// =============================================================================

export interface NavigationProps {
  id?: string;
  navigationId?: number;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  showIcons?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  mobileStyle?: 'none' | 'hamburger-dropdown' | 'off-canvas' | 'full-width';
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  hoverColor?: ColorValue;
  activeColor?: ColorValue;
  fontWeight?: FontWeightValue;
  fontSize?: ResponsiveFontSizeValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  itemSpacing?: string;
  borderRadius?: string;
  // Item-level styling
  itemPadding?: ResponsiveSpacingValue;
  itemBackgroundColor?: ColorValue;
  itemHoverBackgroundColor?: ColorValue;
  itemBorderRadius?: string;
}

// =============================================================================
// Puck Component Configuration
// =============================================================================

export const Navigation: ComponentConfig<NavigationProps> = {
  label: 'Navigation Menu',
  fields: {
    // Most important - select which navigation to display
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
    mobileStyle: {
      type: 'select',
      label: 'Mobile Navigation Style',
      options: [
        { label: 'None (Always Visible)', value: 'none' },
        { label: 'Hamburger Dropdown', value: 'hamburger-dropdown' },
        { label: 'Off-Canvas Slide', value: 'off-canvas' },
        { label: 'Full Width Stack', value: 'full-width' },
      ],
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
    fontSize: {
      type: 'custom',
      label: 'Font Size',
      render: (props) => <ResponsiveFontSizeControl {...props} field={{ label: 'Font Size' }} />,
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
    padding: {
      type: 'custom',
      label: 'Padding',
      render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Padding' }} allowNegative={false} />,
    },
    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Margin' }} />,
    },
    itemSpacing: {
      type: 'text',
      label: 'Item Spacing (px)',
    },
    borderRadius: {
      type: 'text',
      label: 'Border Radius (px)',
    },
    // Item-level styling fields
    itemPadding: {
      type: 'custom',
      label: 'Item Padding',
      render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Item Padding' }} allowNegative={false} />,
    },
    itemBackgroundColor: {
      type: 'custom',
      label: 'Item Background',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Item Background' }}
          value={props.value || { type: 'theme', value: '' }}
        />
      ),
    },
    itemHoverBackgroundColor: {
      type: 'custom',
      label: 'Item Hover Background',
      render: (props) => (
        <ColorPickerControl
          {...props}
          field={{ label: 'Item Hover Background' }}
          value={props.value || { type: 'theme', value: 'colors.gray.100' }}
        />
      ),
    },
    itemBorderRadius: {
      type: 'text',
      label: 'Item Border Radius (px)',
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
  },
  defaultProps: {
    layout: 'horizontal',
    align: 'left',
    showIcons: false,
    mobileBreakpoint: 'md',
    mobileStyle: 'hamburger-dropdown',
    backgroundColor: { type: 'theme', value: '' },
    textColor: { type: 'theme', value: 'colors.gray.700' },
    hoverColor: { type: 'theme', value: 'colors.primary.500' },
    activeColor: { type: 'theme', value: 'colors.primary.600' },
    fontWeight: { type: 'theme', value: 'typography.fontWeight.medium' },
    fontSize: { mobile: { type: 'custom', value: '16px' } },
    padding: { mobile: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px' as const, linked: true } },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true } },
    itemSpacing: '8',
    borderRadius: '0',
    // Item-level defaults
    itemPadding: { mobile: { top: '8', right: '12', bottom: '8', left: '12', unit: 'px' as const, linked: false } },
    itemBackgroundColor: { type: 'theme', value: '' },
    itemHoverBackgroundColor: { type: 'theme', value: 'colors.gray.100' },
    itemBorderRadius: '4',
  },
  render: ({ puck, ...props }) => <NavigationRenderer puck={puck} {...props} />,
};

// =============================================================================
// Navigation Renderer Component
// =============================================================================

function NavigationRenderer({
  id,
  navigationId,
  layout = 'horizontal',
  align = 'left',
  showIcons = false,
  mobileBreakpoint = 'md',
  mobileStyle = 'hamburger-dropdown',
  backgroundColor,
  textColor,
  hoverColor,
  fontWeight,
  fontSize,
  padding,
  margin,
  itemSpacing = '8',
  borderRadius = '0',
  // Item-level props
  itemPadding,
  itemBackgroundColor,
  itemHoverBackgroundColor,
  itemBorderRadius = '4',
  puck,
}: NavigationProps & { puck?: { metadata?: { navigations?: NavigationType[] } } }) {
  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();

  // Detect if we're in editor mode by checking if we're on an edit route
  // puck prop exists in both editor and public view (for metadata), so we check the URL
  const isEditor = typeof window !== 'undefined' && window.location.pathname.includes('/edit');

  // CSS class for responsive styles
  const cssClassName = `navigation-${id}`;

  // Extract actual ID from navigationId (could be object from Puck external field)
  const actualId = (typeof navigationId === 'object' && navigationId !== null && 'value' in navigationId)
    ? (navigationId as { value: number }).value
    : navigationId;

  // Try to get navigation from metadata first (instant render for published pages)
  const metadataNav = actualId
    ? (puck?.metadata?.navigations as NavigationType[])?.find(nav => nav.id === actualId)
    : null;

  // ==========================================================================
  // State
  // ==========================================================================

  // Initialize with metadata navigation if available (no loading needed)
  const [navigation, setNavigation] = useState<NavigationType | null>(metadataNav ?? null);
  // Only show loading if we have an ID but no metadata navigation
  const [isLoading, setIsLoading] = useState(!!actualId && !metadataNav);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // ==========================================================================
  // Theme Resolution Helpers
  // ==========================================================================

  const resolveColor = useCallback((color: ColorValue | undefined, fallback: string): string => {
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
  }, [resolve]);

  const resolveFontWeight = useCallback((weight: FontWeightValue | undefined): string => {
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
  }, [resolve]);

  // Resolved theme values
  const resolvedBgColor = resolveColor(backgroundColor, 'transparent');
  const resolvedTextColor = resolveColor(textColor, '#1f2937');
  const resolvedHoverColor = resolveColor(hoverColor, '#3b82f6');
  const resolvedFontWeight = resolveFontWeight(fontWeight);
  // Item-level resolved values
  const resolvedItemBgColor = resolveColor(itemBackgroundColor, 'transparent');
  const resolvedItemHoverBgColor = resolveColor(itemHoverBackgroundColor, '#f3f4f6');

  // ==========================================================================
  // Navigation Data Loading (fallback API fetch only when metadata unavailable)
  // ==========================================================================

  useEffect(() => {
    // If we already have navigation from metadata, no need to fetch
    if (metadataNav) {
      // Update state if metadata changed (e.g., in editor)
      setNavigation(metadataNav);
      setIsLoading(false);
      return;
    }

    // Fallback: fetch from API only if no metadata and we have an ID
    if (actualId) {
      setIsLoading(true);
      navigations.get(actualId)
        .then((response) => setNavigation(response.data))
        .catch((error) => console.error('Failed to load navigation:', error))
        .finally(() => setIsLoading(false));
    }
  }, [actualId, metadataNav]);

  // ==========================================================================
  // Menu Hierarchy Builder
  // ==========================================================================

  const buildHierarchy = (items: MenuItem[]): MenuItem[] => {
    const map = new Map<string, MenuItem>();
    const roots: MenuItem[] = [];

    items.forEach((item) => map.set(item.id, { ...item, children: [] }));
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // ==========================================================================
  // CSS Classes
  // ==========================================================================

  const alignClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[align];
  const breakpointHide = { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden' }[mobileBreakpoint];
  const breakpointShow = { sm: 'sm:flex', md: 'md:flex', lg: 'lg:flex' }[mobileBreakpoint];

  const getMenuClasses = (): string => {
    const bp = mobileBreakpoint;

    // Base layout classes for desktop
    const baseLayout = layout === 'horizontal'
      ? `flex flex-wrap ${alignClass}`
      : 'flex flex-col space-y-1';

    switch (mobileStyle) {
      case 'none':
        // Always visible - no mobile menu behavior
        return `${baseLayout}`;

      case 'off-canvas': {
        // Mobile: fixed sidebar sliding from left
        // Desktop: normal inline menu
        const desktopClasses = {
          sm: 'sm:static sm:flex-row sm:flex-wrap sm:h-auto sm:w-auto sm:bg-transparent sm:shadow-none sm:p-0 sm:translate-x-0 sm:space-y-0',
          md: 'md:static md:flex-row md:flex-wrap md:h-auto md:w-auto md:bg-transparent md:shadow-none md:p-0 md:translate-x-0 md:space-y-0',
          lg: 'lg:static lg:flex-row lg:flex-wrap lg:h-auto lg:w-auto lg:bg-transparent lg:shadow-none lg:p-0 lg:translate-x-0 lg:space-y-0',
        }[bp];
        const desktopAlign = { sm: `sm:${alignClass}`, md: `md:${alignClass}`, lg: `lg:${alignClass}` }[bp];

        return `flex flex-col fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 p-4
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopClasses} ${desktopAlign}`;
      }

      case 'full-width': {
        // Mobile: full-screen overlay with centered vertical menu
        // Desktop: normal inline menu
        const desktopClasses = {
          sm: 'sm:static sm:flex-row sm:flex-wrap sm:h-auto sm:w-auto sm:bg-transparent sm:shadow-none sm:p-0 sm:inset-auto sm:items-stretch sm:justify-start sm:space-y-0',
          md: 'md:static md:flex-row md:flex-wrap md:h-auto md:w-auto md:bg-transparent md:shadow-none md:p-0 md:inset-auto md:items-stretch md:justify-start md:space-y-0',
          lg: 'lg:static lg:flex-row lg:flex-wrap lg:h-auto lg:w-auto lg:bg-transparent lg:shadow-none lg:p-0 lg:inset-auto md:items-stretch lg:justify-start lg:space-y-0',
        }[bp];
        const desktopAlign = { sm: `sm:${alignClass}`, md: `md:${alignClass}`, lg: `lg:${alignClass}` }[bp];

        return `flex flex-col items-center justify-center
          ${isMobileMenuOpen ? 'flex' : 'hidden'}
          fixed inset-0 w-full h-full bg-white z-50 p-8
          ${breakpointShow}
          ${desktopClasses} ${desktopAlign}`;
      }

      case 'hamburger-dropdown':
      default: {
        // Mobile: fixed full-width dropdown from top
        // Desktop: normal inline menu
        const desktopClasses = {
          sm: 'sm:static sm:flex-row sm:flex-wrap sm:w-auto sm:h-auto sm:bg-transparent sm:shadow-none sm:p-0 sm:space-y-0 sm:top-auto sm:left-auto sm:right-auto',
          md: 'md:static md:flex-row md:flex-wrap md:w-auto md:h-auto md:bg-transparent md:shadow-none md:p-0 md:space-y-0 md:top-auto md:left-auto md:right-auto',
          lg: 'lg:static lg:flex-row lg:flex-wrap lg:w-auto lg:h-auto lg:bg-transparent lg:shadow-none lg:p-0 lg:space-y-0 lg:top-auto lg:left-auto lg:right-auto',
        }[bp];
        const desktopAlign = { sm: `sm:${alignClass}`, md: `md:${alignClass}`, lg: `lg:${alignClass}` }[bp];

        return `flex flex-col space-y-1
          ${isMobileMenuOpen ? 'flex' : 'hidden'}
          fixed top-0 left-0 right-0 w-full bg-white shadow-lg p-4 pt-16 z-50
          ${breakpointShow}
          ${desktopClasses} ${desktopAlign}`;
      }
    }
  };

  // ==========================================================================
  // Responsive CSS Generation
  // ==========================================================================

  const css = isEditing ? (() => {
    const rules: string[] = [];

    // Font size (responsive, handled separately)
    const fontSizeCss = fontSize ? generateFontSizeCSS(cssClassName, fontSize) : '';
    if (fontSizeCss) rules.push(fontSizeCss);

    // Layout CSS for padding and margin
    const layoutCss = buildLayoutCSS({
      className: cssClassName,
      padding,
      margin,
    });
    if (layoutCss) rules.push(layoutCss);

    return rules.join('\n');
  })() : '';

  // ==========================================================================
  // Render Menu Item
  // ==========================================================================

  // Generate item padding styles
  const getItemPaddingStyle = (): React.CSSProperties => {
    if (!itemPadding) return { padding: '8px 12px' };

    // Check if it's a responsive value with 'base' property or a direct SpacingValue
    const spacingValue = typeof itemPadding === 'object' && 'base' in itemPadding
      ? itemPadding.base
      : itemPadding;

    if (!spacingValue || typeof spacingValue !== 'object') return { padding: '8px 12px' };

    const { top, right, bottom, left, unit } = spacingValue as { top: string; right: string; bottom: string; left: string; unit: string };
    return {
      paddingTop: `${top}${unit}`,
      paddingRight: `${right}${unit}`,
      paddingBottom: `${bottom}${unit}`,
      paddingLeft: `${left}${unit}`,
    };
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    const itemClasses = `flex items-center gap-2 transition-all duration-200`;
    const itemStyle: React.CSSProperties = {
      color: resolvedTextColor,
      fontWeight: resolvedFontWeight,
      borderRadius: itemBorderRadius ? `${itemBorderRadius}px` : undefined,
      backgroundColor: resolvedItemBgColor,
      ...getItemPaddingStyle(),
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = resolvedHoverColor;
      e.currentTarget.style.backgroundColor = resolvedItemHoverBgColor;
    };
    const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = resolvedTextColor;
      e.currentTarget.style.backgroundColor = resolvedItemBgColor;
    };
    const handleClick = (e: React.MouseEvent) => {
      // Only prevent navigation in editor mode
      if (isEditor) {
        e.preventDefault();
      }
      // Don't stop propagation - let the link navigate
    };
    const toggleChildren = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setExpandedItems((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    };

    // For horizontal layout, show dropdown on hover
    const handleParentMouseEnter = () => {
      if (layout === 'horizontal' && hasChildren) {
        setExpandedItems((prev) => new Set(prev).add(item.id));
      }
    };
    const handleParentMouseLeave = () => {
      if (layout === 'horizontal' && hasChildren) {
        setExpandedItems((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    };

    const isCustomLink = !item.page_id;

    const linkContent = (
      <>
        {showIcons && isCustomLink && item.target === '_blank' && <ExternalLink className="w-4 h-4" />}
        <span>{item.label}</span>
        {hasChildren && (
          <button
            onClick={toggleChildren}
            className="ml-1"
            type="button"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </>
    );

    // Show dropdown: always for vertical when expanded, on hover/click for horizontal
    const showDropdown = hasChildren && isExpanded;

    return (
      <li
        key={item.id}
        className={`${depth > 0 ? 'ml-4' : ''} ${layout === 'horizontal' && hasChildren ? 'relative' : ''}`}
        onMouseEnter={handleParentMouseEnter}
        onMouseLeave={handleParentMouseLeave}
      >
        {isCustomLink ? (
          <a
            href={item.url || '#'}
            target={item.target || '_self'}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            className={itemClasses}
            style={itemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            {linkContent}
          </a>
        ) : (
          <Link
            to={item.url || '#'}
            className={itemClasses}
            style={itemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            {linkContent}
          </Link>
        )}

        {showDropdown && (
          <ul
            className={layout === 'horizontal'
              ? 'absolute left-0 top-full bg-white shadow-lg rounded-md py-2 min-w-[200px] z-50'
              : 'ml-4 mt-1'
            }
            style={{ backgroundColor: layout === 'horizontal' ? '#ffffff' : (resolvedBgColor || '#ffffff') }}
          >
            {item.children?.map((child) => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // ==========================================================================
  // Loading State
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // ==========================================================================
  // Empty State
  // ==========================================================================

  if (!navigationId || !navigation) {
    return (
      <div
        className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg"
        style={{ backgroundColor: resolvedBgColor, color: resolvedTextColor }}
      >
        <div className="text-center">
          <Menu className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">No navigation selected</p>
          <p className="text-sm text-gray-500 mt-1">Select a navigation from the sidebar</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Main Render
  // ==========================================================================

  const menuItems = buildHierarchy(navigation.structure);
  const showHamburger = mobileStyle !== 'none';

  return (
    <>
      {/* Responsive CSS */}
      {isEditing && css && <style>{css}</style>}

      {/* Off-canvas backdrop overlay */}
      {mobileStyle === 'off-canvas' && (
        <div
          className={`fixed inset-0 bg-black z-40 transition-opacity duration-300
            ${isMobileMenuOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}
            ${breakpointHide}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <nav className={`${cssClassName} relative`} style={{ backgroundColor: resolvedBgColor, borderRadius: borderRadius ? `${borderRadius}px` : undefined }}>
        {/* Hamburger Toggle Button */}
        {showHamburger && (
          <button
            className={`block ${breakpointHide} p-2 relative z-[9999] pointer-events-auto`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            style={{ position: 'relative', zIndex: 9999 }}
          >
            <Menu className="w-6 h-6 pointer-events-none" style={{ color: resolvedTextColor }} />
          </button>
        )}

        {/* Menu List */}
        <ul
          className={getMenuClasses()}
          style={{ gap: layout === 'horizontal' ? `${itemSpacing}px` : undefined }}
        >
          {/* Close button for mobile styles with overlay */}
          {(mobileStyle === 'off-canvas' || mobileStyle === 'full-width' || mobileStyle === 'hamburger-dropdown') && (
            <li className={`absolute top-4 right-4 ${breakpointHide}`} style={{ zIndex: 9999 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 rounded pointer-events-auto"
                aria-label="Close menu"
                style={{ position: 'relative', zIndex: 9999 }}
              >
                <X className="w-6 h-6 pointer-events-none" style={{ color: resolvedTextColor }} />
              </button>
            </li>
          )}
          {menuItems.map((item) => renderMenuItem(item))}
        </ul>
      </nav>
    </>
  );
}
