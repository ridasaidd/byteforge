import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      };
      return colors[token] || fallback;
    },
  }),
}));

// Mock MediaPickerModal
vi.mock('@/shared/components/organisms/MediaPickerModal', () => ({
  MediaPickerModal: () => null,
}));

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Dynamic import to ensure mock is applied
const getBox = async () => {
  const module = await import('../components/layout/Box');
  return module;
};

describe('Box Component', () => {
  let BoxComponent: React.ComponentType<any>;
  let Box: any;

  beforeEach(async () => {
    const module = await getBox();
    BoxComponent = module.BoxComponent;
    Box = module.Box;
  });

  const defaultBorderSide = { width: '0', style: 'none' as const, color: '#000000' };

  const defaultProps = {
    display: { mobile: 'block' as const },
    width: { mobile: { value: '100', unit: '%' as const } },
    padding: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true } },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true } },
    border: {
      top: defaultBorderSide,
      right: defaultBorderSide,
      bottom: defaultBorderSide,
      left: defaultBorderSide,
      unit: 'px' as const,
      linked: true,
    },
    borderRadius: {
      topLeft: '0',
      topRight: '0',
      bottomRight: '0',
      bottomLeft: '0',
      unit: 'px' as const,
      linked: true,
    },
    shadow: { preset: 'none' as const },
    direction: 'row' as const,
    justify: 'start' as const,
    align: 'stretch' as const,
    wrap: 'nowrap' as const,
    flexGap: 16,
    numColumns: 2,
    gridGap: 16,
    alignItems: 'stretch' as const,
  };

  describe('Display Modes', () => {
    it('renders as block by default', () => {
      const { container } = render(<BoxComponent {...defaultProps} />);
      // Box now passes className to Items (like Flex), so we check CSS is generated
      const style = container.querySelector('style');
      expect(style).toBeInTheDocument();
      expect(style?.textContent).toContain('display: block');
    });

    it('renders with flex display', () => {
      const flexProps = {
        ...defaultProps,
        display: { mobile: 'flex' as const },
      };
      const { container } = render(<BoxComponent {...flexProps} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('flex-direction');
      expect(style?.textContent).toContain('justify-content');
      expect(style?.textContent).toContain('align-items');
    });

    it('renders with grid display', () => {
      const gridProps = {
        ...defaultProps,
        display: { mobile: 'grid' as const },
      };
      const { container } = render(<BoxComponent {...gridProps} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('grid-template-columns');
      expect(style?.textContent).toContain('repeat(2, 1fr)');
    });

    it('renders with inline-flex display', () => {
      const inlineFlexProps = {
        ...defaultProps,
        display: { mobile: 'inline-flex' as const },
      };
      const { container } = render(<BoxComponent {...inlineFlexProps} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('flex-direction');
    });

    it('renders with inline-grid display', () => {
      const inlineGridProps = {
        ...defaultProps,
        display: { mobile: 'inline-grid' as const },
      };
      const { container } = render(<BoxComponent {...inlineGridProps} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('grid-template-columns');
    });
  });

  describe('Flex Properties', () => {
    const flexProps = {
      ...defaultProps,
      display: { mobile: 'flex' as const },
    };

    it('applies flex direction', () => {
      const { container } = render(
        <BoxComponent {...flexProps} direction="column" />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('flex-direction: column');
    });

    it('applies justify content', () => {
      const { container } = render(
        <BoxComponent {...flexProps} justify="center" />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('justify-content: center');
    });

    it('applies align items', () => {
      const { container } = render(
        <BoxComponent {...flexProps} align="center" />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('align-items: center');
    });

    it('applies flex wrap', () => {
      const { container } = render(
        <BoxComponent {...flexProps} wrap="wrap" />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('flex-wrap: wrap');
    });

    it('applies flex gap', () => {
      const { container } = render(
        <BoxComponent {...flexProps} flexGap={24} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('gap: 24px');
    });
  });

  describe('Grid Properties', () => {
    const gridProps = {
      ...defaultProps,
      display: { mobile: 'grid' as const },
    };

    it('applies number of columns', () => {
      const { container } = render(
        <BoxComponent {...gridProps} numColumns={{ mobile: 3 }} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('repeat(3, 1fr)');
    });

    it('applies grid gap', () => {
      const { container } = render(
        <BoxComponent {...gridProps} gridGap={{ mobile: 20 }} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('gap: 20px');
    });

    it('applies grid align items', () => {
      const { container } = render(
        <BoxComponent {...gridProps} alignItems="center" />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('align-items: center');
    });
  });

  describe('Background Styling', () => {
    it('applies custom background color', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          backgroundColor={{ type: 'custom', value: '#ff0000' }}
        />
      );
      // Background color is now in CSS, not inline styles
      const styles = container.querySelectorAll('style');
      const allCss = Array.from(styles).map(s => s.textContent).join('\n');
      expect(allCss).toContain('background-color: #ff0000');
    });

    it('applies theme background color', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          backgroundColor={{ type: 'theme', value: 'primary' }}
        />
      );
      // Background color is now in CSS, not inline styles
      const styles = container.querySelectorAll('style');
      const allCss = Array.from(styles).map(s => s.textContent).join('\n');
      expect(allCss).toContain('background-color: #3b82f6');
    });

    it('applies background image', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          backgroundImage="https://example.com/image.jpg"
          backgroundSize="cover"
          backgroundPosition="center"
          backgroundRepeat="no-repeat"
        />
      );
      // Background image is now in CSS, not inline styles
      const styles = container.querySelectorAll('style');
      const allCss = Array.from(styles).map(s => s.textContent).join('\n');
      expect(allCss).toContain('background-image: url(https://example.com/image.jpg)');
      expect(allCss).toContain('background-size: cover');
      expect(allCss).toContain('background-position: center');
      expect(allCss).toContain('background-repeat: no-repeat');
    });
  });

  describe('Border and Shadow', () => {
    it('applies border', () => {
      const borderSide = { width: '2', style: 'solid' as const, color: '#000000' };
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          border={{
            top: borderSide,
            right: borderSide,
            bottom: borderSide,
            left: borderSide,
            unit: 'px',
            linked: true,
          }}
        />
      );
      const style = container.querySelector('style');
      // CSS builder generates shorthand for identical sides
      expect(style?.textContent).toContain('border: 2px solid #000000');
    });

    it('applies border radius separately', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          borderRadius={{
            topLeft: '8',
            topRight: '8',
            bottomRight: '8',
            bottomLeft: '8',
            unit: 'px',
            linked: true,
          }}
        />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('border-radius: 8px');
    });

    it('applies shadow preset', () => {
      const { container } = render(
        <BoxComponent {...defaultProps} shadow={{ preset: 'md' }} />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('box-shadow');
    });

    it('applies custom shadow', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          shadow={{
            preset: 'custom',
            custom: '0px 4px 6px 0px rgba(0,0,0,0.1)'
          }}
        />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('box-shadow');
      expect(style?.textContent).toContain('0px 4px 6px 0px rgba(0,0,0,0.1)');
    });
  });

  describe('Responsive Behavior', () => {
    it('applies responsive display values', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          display={{
            mobile: 'block' as const,
            tablet: 'flex' as const,
            desktop: 'grid' as const,
          }}
        />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('@media');
    });

    it('applies responsive width', () => {
      const { container } = render(
        <BoxComponent
          {...defaultProps}
          width={{
            mobile: { value: '100', unit: '%' as const },
            tablet: { value: '50', unit: '%' as const },
            desktop: { value: '33', unit: '%' as const },
          }}
        />
      );
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('@media');
    });
  });

  describe('Custom CSS', () => {
    it('applies custom CSS', () => {
      const customCss = '.custom-class { color: red; }';
      const { container } = render(
        <BoxComponent {...defaultProps} customCss={customCss} />
      );
      const styles = container.querySelectorAll('style');
      const hasCustomCss = Array.from(styles).some(
        (style) => style.textContent?.includes(customCss)
      );
      expect(hasCustomCss).toBe(true);
    });
  });

  describe('Children Rendering', () => {
    it('renders children via items slot', () => {
      const Items = () => <div data-testid="child">Child content</div>;
      render(<BoxComponent {...defaultProps} items={Items} />);
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders without items slot', () => {
      expect(() => {
        render(<BoxComponent {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('resolveFields', () => {
    it('returns flex fields when display is flex', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'flex' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      expect(resolvedFields).toHaveProperty('direction');
      expect(resolvedFields).toHaveProperty('justify');
      expect(resolvedFields).toHaveProperty('align');
      expect(resolvedFields).toHaveProperty('wrap');
      expect(resolvedFields).toHaveProperty('flexGap');
      expect(resolvedFields).not.toHaveProperty('numColumns');
      expect(resolvedFields).not.toHaveProperty('gridGap');
      expect(resolvedFields).not.toHaveProperty('alignItems');
    });

    it('returns grid fields when display is grid', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'grid' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      expect(resolvedFields).toHaveProperty('numColumns');
      expect(resolvedFields).toHaveProperty('gridGap');
      expect(resolvedFields).toHaveProperty('alignItems');
      expect(resolvedFields).not.toHaveProperty('direction');
      expect(resolvedFields).not.toHaveProperty('justify');
      expect(resolvedFields).not.toHaveProperty('align');
      expect(resolvedFields).not.toHaveProperty('wrap');
      expect(resolvedFields).not.toHaveProperty('flexGap');
    });

    it('returns only common fields when display is block', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'block' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      expect(resolvedFields).toHaveProperty('display');
      expect(resolvedFields).toHaveProperty('backgroundColor');
      expect(resolvedFields).toHaveProperty('width');
      expect(resolvedFields).not.toHaveProperty('direction');
      expect(resolvedFields).not.toHaveProperty('justify');
      expect(resolvedFields).not.toHaveProperty('numColumns');
      expect(resolvedFields).not.toHaveProperty('gridGap');
    });

    it('handles inline-flex display', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'inline-flex' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      expect(resolvedFields).toHaveProperty('direction');
      expect(resolvedFields).toHaveProperty('justify');
      expect(resolvedFields).toHaveProperty('align');
    });

    it('handles inline-grid display', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'inline-grid' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      expect(resolvedFields).toHaveProperty('numColumns');
      expect(resolvedFields).toHaveProperty('gridGap');
      expect(resolvedFields).toHaveProperty('alignItems');
    });

    it('shows flex controls when desktop is flex even if mobile is block', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'block', desktop: 'flex' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      // Should show flex controls because desktop uses flex
      expect(resolvedFields).toHaveProperty('direction');
      expect(resolvedFields).toHaveProperty('justify');
      expect(resolvedFields).toHaveProperty('align');
      expect(resolvedFields).toHaveProperty('wrap');
      expect(resolvedFields).toHaveProperty('flexGap');
      expect(resolvedFields).not.toHaveProperty('numColumns');
      expect(resolvedFields).not.toHaveProperty('gridGap');
    });

    it('shows grid controls when tablet is grid even if mobile is block', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'block', tablet: 'grid' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      // Should show grid controls because tablet uses grid
      expect(resolvedFields).toHaveProperty('numColumns');
      expect(resolvedFields).toHaveProperty('gridGap');
      expect(resolvedFields).toHaveProperty('alignItems');
      expect(resolvedFields).not.toHaveProperty('direction');
      expect(resolvedFields).not.toHaveProperty('justify');
    });

    it('shows both flex and grid controls when different breakpoints use flex and grid', () => {
      const fields = {
        items: {},
        display: {},
        direction: {},
        justify: {},
        align: {},
        wrap: {},
        flexGap: {},
        numColumns: {},
        gridGap: {},
        alignItems: {},
        backgroundColor: {},
        width: {},
        padding: {},
        margin: {},
        border: {},
        shadow: {},
        customCss: {},
      };

      const data = {
        props: {
          display: { mobile: 'flex', tablet: 'grid' },
        },
      };

      const resolvedFields = Box.resolveFields(data, { fields });

      // Should show BOTH flex and grid controls
      expect(resolvedFields).toHaveProperty('direction');
      expect(resolvedFields).toHaveProperty('justify');
      expect(resolvedFields).toHaveProperty('numColumns');
      expect(resolvedFields).toHaveProperty('gridGap');
    });
  });
});
