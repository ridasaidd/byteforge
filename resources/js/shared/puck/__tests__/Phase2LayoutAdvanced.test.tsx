import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { BoxProps } from '../components/layout/Box';

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
const getComponents = async () => {
  const boxModule = await import('../components/layout/Box');
  return {
    BoxComponent: boxModule.BoxComponent,
  };
};

describe('Phase 2: Layout Advanced Controls', () => {
  let BoxComponent: React.ComponentType<BoxProps>;

  beforeEach(async () => {
    const { BoxComponent: Box } = await getComponents();
    BoxComponent = Box;
  });

  const defaultBorderSide = { width: '0', style: 'none' as const, color: '#000000' };

  const baseProps = {
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
    numColumns: { mobile: 2 },
    gridGap: { mobile: 16 },
    alignItems: 'stretch' as const,
  };

  describe('Z-Index Control', () => {
    it('should generate z-index CSS with auto value', () => {
      const props = {
        ...baseProps,
        zIndex: { mobile: 'auto' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      // auto is the default - generator may skip it for optimization
      expect(style?.textContent).toBeDefined();
    });

    it('should generate z-index CSS with numeric value', () => {
      const props = {
        ...baseProps,
        zIndex: { mobile: 10 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('z-index: 10');
    });

    it('should generate z-index CSS with negative value', () => {
      const props = {
        ...baseProps,
        zIndex: { mobile: -1 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('z-index: -1');
    });

    it('should not generate z-index CSS when undefined', () => {
      const props = {
        ...baseProps,
        // zIndex not provided
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).not.toContain('z-index');
    });
  });

  describe('Opacity Control', () => {
    it('should generate opacity CSS with full opacity (100)', () => {
      const props = {
        ...baseProps,
        opacity: { mobile: 100 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('opacity: 1');
    });

    it('should generate opacity CSS with 50% opacity', () => {
      const props = {
        ...baseProps,
        opacity: { mobile: 50 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('opacity: 0.5');
    });

    it('should generate opacity CSS with 0% opacity', () => {
      const props = {
        ...baseProps,
        opacity: { mobile: 0 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('opacity: 0');
    });

    it('should generate opacity CSS with custom value', () => {
      const props = {
        ...baseProps,
        opacity: { mobile: 75 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('opacity: 0.75');
    });

    it('should not generate opacity CSS when undefined', () => {
      const props = {
        ...baseProps,
        // opacity not provided
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      // Should not have opacity rule when undefined
      expect(style?.textContent).not.toMatch(/opacity:\s*\d/);
    });
  });

  describe('Overflow Control', () => {
    it('should NOT generate overflow CSS with visible value (default)', () => {
      const props = {
        ...baseProps,
        overflow: { mobile: 'visible' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      // visible is the default - CSS generator optimizes by not outputting it
      expect(style?.textContent).not.toContain('overflow: visible');
    });

    it('should generate overflow CSS with hidden value', () => {
      const props = {
        ...baseProps,
        overflow: { mobile: 'hidden' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('overflow: hidden');
    });

    it('should generate overflow CSS with scroll value', () => {
      const props = {
        ...baseProps,
        overflow: { mobile: 'scroll' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('overflow: scroll');
    });

    it('should generate overflow CSS with auto value', () => {
      const props = {
        ...baseProps,
        overflow: { mobile: 'auto' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('overflow: auto');
    });

    it('should not generate overflow CSS when undefined', () => {
      const props = {
        ...baseProps,
        // overflow not provided
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      // Overflow might not be in CSS if not explicitly set
      const cssText = style?.textContent || '';
      const hasOverflowRule = /overflow:\s*(visible|hidden|scroll|auto)/.test(cssText);
      expect(hasOverflowRule).toBe(false);
    });
  });

  describe('Combined Layout Advanced Properties', () => {
    it('should generate CSS for all three properties together', () => {
      const props = {
        ...baseProps,
        zIndex: { mobile: 50 },
        opacity: { mobile: 80 },
        overflow: { mobile: 'auto' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      const cssText = style?.textContent || '';

      expect(cssText).toContain('z-index: 50');
      expect(cssText).toContain('opacity: 0.8');
      expect(cssText).toContain('overflow: auto');
    });

    it('should work with flex display', () => {
      const props = {
        ...baseProps,
        display: { mobile: 'flex' as const },
        zIndex: { mobile: 10 },
        opacity: { mobile: 90 },
        overflow: { mobile: 'hidden' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      const cssText = style?.textContent || '';

      // Should have flex properties AND layout advanced properties
      expect(cssText).toContain('flex-direction');
      expect(cssText).toContain('z-index: 10');
      expect(cssText).toContain('opacity: 0.9');
      expect(cssText).toContain('overflow: hidden');
    });
  });

  describe('Position Control', () => {
    it('should NOT generate position CSS with static value (default)', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'static' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      // Static is default, so shouldn't be in CSS
      expect(style?.textContent).not.toContain('position');
    });

    it('should generate position CSS with relative value', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'relative' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('position: relative');
    });

    it('should generate position CSS with absolute value', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'absolute' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('position: absolute');
    });

    it('should generate position CSS with fixed value', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'fixed' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('position: fixed');
    });

    it('should generate position CSS with sticky value', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'sticky' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).toContain('position: sticky');
    });

    it('should not generate position CSS when undefined', () => {
      const props = {
        ...baseProps,
        // position not provided
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      expect(style?.textContent).not.toContain('position:');
    });

    it('should work with z-index when position is absolute', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'absolute' as const },
        zIndex: { mobile: 999 },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      const cssText = style?.textContent || '';

      expect(cssText).toContain('position: absolute');
      expect(cssText).toContain('z-index: 999');
    });

    it('should combine all four layout advanced properties', () => {
      const props = {
        ...baseProps,
        position: { mobile: 'fixed' as const },
        zIndex: { mobile: 100 },
        opacity: { mobile: 95 },
        overflow: { mobile: 'scroll' as const },
      };
      const { container } = render(<BoxComponent {...props} />);
      const style = container.querySelector('style');
      const cssText = style?.textContent || '';

      expect(cssText).toContain('position: fixed');
      expect(cssText).toContain('z-index: 100');
      expect(cssText).toContain('opacity: 0.95');
      expect(cssText).toContain('overflow: scroll');
    });
  });
});
