/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { ComponentConfig } from '@measured/puck';
import { navigations, type Navigation as NavigationType, type MenuItem } from '@/shared/services/api/navigations';
import { Menu, ChevronDown, ExternalLink } from 'lucide-react';

export interface NavigationProps {
  navigationId?: number;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  showIcons?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  backgroundColor?: string;
  textColor?: string;
  hoverColor?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontSize?: 'sm' | 'base' | 'lg';
  padding?: string;
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
      type: 'text',
      label: 'Background Color',
    },
    textColor: {
      type: 'text',
      label: 'Text Color',
    },
    hoverColor: {
      type: 'text',
      label: 'Hover Color',
    },
    fontWeight: {
      type: 'select',
      label: 'Font Weight',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Medium', value: 'medium' },
        { label: 'Semibold', value: 'semibold' },
        { label: 'Bold', value: 'bold' },
      ],
    },
    fontSize: {
      type: 'select',
      label: 'Font Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Base', value: 'base' },
        { label: 'Large', value: 'lg' },
      ],
    },
    padding: {
      type: 'text',
      label: 'Padding',
    },
  },
  defaultProps: {
    layout: 'horizontal',
    align: 'left',
    showIcons: false,
    mobileBreakpoint: 'md',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    hoverColor: '#3b82f6',
    fontWeight: 'medium',
    fontSize: 'base',
    padding: '1rem',
  },
  render: (props) => <NavigationRenderer {...props} />,
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
}: NavigationProps) {
  const [navigation, setNavigation] = useState<NavigationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  function isNavObj(val: unknown): val is { value: number } {
    if (typeof val !== 'object' || val === null) return false;
    const rec = val as Record<string, unknown>;
    return typeof rec.value === 'number';
  }

  // Extract the actual ID from navigationId (could be object from Puck external field)
  const actualId = isNavObj(navigationId) ? navigationId.value : navigationId;

  useEffect(() => {
    if (actualId) {
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
    } else {
      setIsLoading(false);
    }
  }, [actualId]);

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

      const fontWeightClass = {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      }[fontWeight || 'medium'];

      const fontSizeClass = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
      }[fontSize || 'base'];

      const itemClasses = `
        ${fontWeightClass}
        ${fontSizeClass}
        flex items-center gap-2
        transition-colors duration-200
        ${layout === 'horizontal' ? 'px-4 py-2' : 'px-2 py-1.5'}
      `;

      // Helper: check if URL is external
      // Treat items with page_id as internal (SPA), and items without page_id (custom links) as external (full reload)
      const isCustomLink = !item.page_id;
      const linkProps = {
        className: itemClasses,
        style: { color: textColor },
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          e.currentTarget.style.color = hoverColor || '#3b82f6';
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          e.currentTarget.style.color = textColor || '#1f2937';
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
          style={{ backgroundColor, color: textColor }}
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
          backgroundColor,
          padding,
        }}
        className="relative"
      >
        {/* Mobile Menu Toggle - only visible below breakpoint */}
        <button
          className={`block ${breakpointClass.replace(':flex', ':hidden')} p-2`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" style={{ color: textColor }} />
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
