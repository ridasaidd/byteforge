import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        foreground: '#000000',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colorMap: Record<string, string> = {
        'colors.primary': '#3b82f6',
        'colors.secondary': '#8b5cf6',
        'colors.foreground': '#000000',
      };
      return colorMap[token] || fallback;
    },
  }),
  usePuckEditMode: () => true,
}));

// Dynamic import to ensure mocks are applied
const getIcon = async () => {
  const module = await import('../components/media/Icon');
  return module.Icon;
};

describe('Icon Component', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let IconConfig: any;

  beforeEach(async () => {
    IconConfig = await getIcon();
  });

  const getBaseProps = () => ({
    ...(IconConfig?.defaultProps || {}),
    id: 'icon-test-1',
    name: 'Star',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    size: 24,
    strokeWidth: 2,
    color: { type: 'theme' as const, value: 'colors.primary' },
  });

  const renderIcon = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = render(IconConfig.render(resolvedProps as any));

    // Find the span element (might be after style tag in edit mode)
    const span = result.container.querySelector('span[role="img"]');

    return { ...result, span };
  };

  describe('Rendering', () => {
    it('should render inline SVG in edit mode', () => {
      const { container } = renderIcon();
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('should render SVG with correct dimensions', () => {
      const { container } = renderIcon({ size: 32 });
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '32');
      expect(svgElement).toHaveAttribute('height', '32');
    });

    it('should apply color via CSS', () => {
      const { span } = renderIcon({
        color: { type: 'custom', value: '#ff0000' },
      });
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ color: '#ff0000' });
    });

    it('should resolve theme colors', () => {
      const { span } = renderIcon({
        color: { type: 'theme', value: 'colors.primary' },
      });
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ color: '#3b82f6' });
    });

    it('should apply display inline-block', () => {
      const { span } = renderIcon();
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ display: 'inline-block' });
    });

    it('should have className based on icon name and id', () => {
      const { span } = renderIcon({ name: 'Heart' });
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveClass('icon-heart-icon-test-1');
    });
  });

  describe('SVG Extraction', () => {
    it('should use Lucide component in editor mode (not stored SVG)', () => {
      // In editor mode, we want live preview with Lucide React component
      const customSvg = '<svg data-testid="custom-svg" width="24" height="24"></svg>';
      const { container } = renderIcon({ svg: customSvg });

      // Should render Lucide component, not custom SVG (editor mode)
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();

      // Should not contain the custom data-testid (using live Lucide component instead)
      expect(container.innerHTML).not.toContain('data-testid="custom-svg"');
    });

    it('should handle missing SVG gracefully', () => {
      const { container } = renderIcon({ svg: undefined });

      // Should still render wrapper with Lucide component in editor mode
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="img"', () => {
      const { span } = renderIcon();
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveAttribute('role', 'img');
    });

    it('should have aria-label based on icon name', () => {
      const { span } = renderIcon({ name: 'Star' });
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-label', 'Star icon');
    });

    it('should allow custom aria-label', () => {
      const { span } = renderIcon({
        name: 'Star',
        ariaLabel: 'Favorite item'
      });
      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-label', 'Favorite item');
    });
  });

  describe('Sizing', () => {
    it('should use default size of 24', () => {
      const { container } = renderIcon({ size: undefined });
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '24');
      expect(svgElement).toHaveAttribute('height', '24');
    });

    it('should support custom sizes', () => {
      const sizes = [16, 24, 32, 48, 64];

      sizes.forEach(size => {
        const { container } = renderIcon({ size });
        const svgElement = container.querySelector('svg');
        expect(svgElement).toHaveAttribute('width', size.toString());
        expect(svgElement).toHaveAttribute('height', size.toString());
      });
    });
  });

  describe('Puck Configuration', () => {
    it('should export render function', () => {
      expect(IconConfig.render).toBeDefined();
      expect(typeof IconConfig.render).toBe('function');
    });

    it('should have fields defined', () => {
      expect(IconConfig.fields).toBeDefined();
      expect(IconConfig.fields.name).toBeDefined();
      expect(IconConfig.fields.size).toBeDefined();
      expect(IconConfig.fields.color).toBeDefined();
    });

    it('should have default props', () => {
      expect(IconConfig.defaultProps).toBeDefined();
      expect(IconConfig.defaultProps.size).toBe(24);
      expect(IconConfig.defaultProps.strokeWidth).toBe(2);
    });

    it('should have label defined', () => {
      expect(IconConfig.label).toBe('Icon');
    });
  });

  describe('Layout Integration', () => {
    it('should support padding', () => {
      const { span } = renderIcon({
        padding: {
          mobile: { top: '10', right: '10', bottom: '10', left: '10', unit: 'px', linked: true }
        }
      });

      const wrapper = span as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      // Padding should be applied via CSS
    });

    it('should support margin', () => {
      const { span } = renderIcon({
        margin: {
          mobile: { top: '10', right: '10', bottom: '10', left: '10', unit: 'px', linked: true }
        }
      });

      const wrapper = span as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      // Margin should be applied via CSS
    });

    it('should support display modes', () => {
      const displays = ['inline-block', 'block', 'flex'] as const;

      displays.forEach(display => {
        const { span } = renderIcon({
          display: { mobile: display }
        });

        const wrapper = span as HTMLElement;
        expect(wrapper).toBeInTheDocument();
      });
    });
  });

  describe('Color Handling', () => {
    it('should handle theme colors', () => {
      const { span } = renderIcon({
        color: { type: 'theme', value: 'colors.primary' }
      });

      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ color: '#3b82f6' });
    });

    it('should handle custom hex colors', () => {
      const { span } = renderIcon({
        color: { type: 'custom', value: '#ff5722' }
      });

      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ color: '#ff5722' });
    });

    it('should handle custom RGB colors', () => {
      const { span } = renderIcon({
        color: { type: 'custom', value: 'rgb(255, 87, 34)' }
      });

      const wrapper = span as HTMLElement;
      expect(wrapper).toHaveStyle({ color: 'rgb(255, 87, 34)' });
    });

    it('should fallback to default color when undefined', () => {
      const { span } = renderIcon({
        color: undefined
      });

      const wrapper = span as HTMLElement;
      // Should have some color applied
      expect(wrapper).toBeInTheDocument();
    });
  });
});
