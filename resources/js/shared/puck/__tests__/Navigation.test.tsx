/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        gray: { 700: '#374151' },
      },
      typography: {
        fontWeight: { medium: '500' }
      }
    },
    resolve: (token: string, fallback: string) => {
      if (token === 'colors.primary.500') return '#3b82f6';
      if (token === 'colors.gray.700') return '#374151';
      return fallback;
    },
  }),
}));

// Mock API
const mockNavigationsList = vi.fn();
const mockNavigationsGet = vi.fn();

vi.mock('@/shared/services/api/navigations', () => ({
  navigations: {
    list: (...args: any[]) => mockNavigationsList(...args),
    get: (...args: any[]) => mockNavigationsGet(...args),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Import component dynamically
const getNavigation = async () => {
  const module = await import('../components/navigation/Navigation');
  return module.Navigation;
};

describe('Navigation Component', () => {
  let NavigationConfig: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    cleanup();
    NavigationConfig = await getNavigation();
  });

  const baseProps = {
    id: 'test-nav',
    layout: 'horizontal',
    align: 'left',
    mobileBreakpoint: 'md',
    itemSpacing: '8',
    mobileStyle: 'hamburger-dropdown',
  };

  const renderNavigation = (props: any = {}) => {
    const combinedProps = {
        ...baseProps,
        ...NavigationConfig.defaultProps,
        ...props
    };

    return render(
      <BrowserRouter>
        {NavigationConfig.render(combinedProps)}
      </BrowserRouter>
    );
  };

  describe('Placement Mode & CSS Generation', () => {
    it('should inject generated styles', () => {
        const { container } = renderNavigation({
            placeholderItems: [{ id: '1', label: 'Home', url: '/', order: 1 }]
        });

        // Check for style tag existence
        const styleTag = container.querySelector('style');
        expect(styleTag).toBeInTheDocument();
        
        // Check for class names in CSS
        expect(styleTag?.textContent).toContain('.navigation-test-nav');
        expect(styleTag?.textContent).toContain('.nav-menu');
        expect(styleTag?.textContent).toContain('(min-width: 768px)'); // md breakpoint
    });
    
    it('should use semantic class names', () => {
        const placeholderItems = [
          { id: 'p1', label: 'Home', url: '/', order: 1 },
        ];
  
        const { container } = renderNavigation({
          navigationId: null,
          placeholderItems
        });
  
        expect(container.querySelector('.navigation-root')).toBeInTheDocument();
        expect(container.querySelector('.nav-menu')).toBeInTheDocument();
        expect(container.querySelector('.nav-item')).toBeInTheDocument();
        expect(container.querySelector('.nav-link')).toBeInTheDocument();
    });
  });

  describe('Placeholder Features', () => {
    it('should render empty state when no navigation and no placeholders', () => {
      renderNavigation({ navigationId: null, placeholderItems: undefined });

      expect(screen.getByText('No navigation selected')).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should render placeholder items when provided without navigationId', () => {
      const placeholderItems = [
        { id: 'p1', label: 'Home', url: '/', type: 'internal', order: 1 },
        { id: 'p2', label: 'About', url: '/about', type: 'internal', order: 2 },
      ];

      renderNavigation({
        navigationId: null,
        placeholderItems
      });

      // Should not show empty state
      expect(screen.queryByText('No navigation selected')).not.toBeInTheDocument();

      // Should show navigation links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('should show nested placeholder items on interaction', async () => {
      const placeholderItems = [
        {
          id: 'p1',
          label: 'Services',
          url: '/services',
          type: 'internal',
          order: 1,
          children: [
            { id: 'p1-1', label: 'Web Design', url: '/services/web', type: 'internal', order: 1 },
          ]
        },
      ];

      const { container } = renderNavigation({
        navigationId: null,
        placeholderItems,
        layout: 'horizontal'
      });

      // Initially visible
      expect(screen.getByText('Services')).toBeInTheDocument();

      // Submenu should exists but might be hidden or technically present
      // In our CSS impl, horizontal dropdowns are hidden via css logic (display:none usually or absolute offscreen or similar)
      // HOWEVER, the `renderMenuItem` function logic for `showDropdown` relies on `isExpanded` state.
      // So initially `showDropdown` is false, so `<ul>` is not rendered.
      
      expect(screen.queryByText('Web Design')).not.toBeInTheDocument();

      // Trigger interaction
      const parentItem = container.querySelector('.nav-item');
      if (parentItem) {
          fireEvent.mouseEnter(parentItem);
      }

      expect(screen.getByText('Web Design')).toBeInTheDocument();
    });
  });

  describe('Real Data Mode', () => {
    it('should prioritize real navigation data over placeholders', async () => {
        const realNavItems = [
            { id: 'r1', label: 'Real Home', url: '/', order: 1 }
        ];

        const realNav = {
            id: 123,
            name: 'Main Menu',
            structure: realNavItems
        };

        const placeholderItems = [
            { id: 'p1', label: 'Fake Home', url: '/', order: 1 }
        ];

        renderNavigation({
            navigationId: 123,
            placeholderItems,
            puck: {
                metadata: {
                    navigations: [realNav]
                }
            }
        });

        expect(screen.getByText('Real Home')).toBeInTheDocument();
        expect(screen.queryByText('Fake Home')).not.toBeInTheDocument();
    });
  });
});
