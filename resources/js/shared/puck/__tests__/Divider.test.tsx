import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    resolve: (token: string, fallback: string) => {
      const values: Record<string, string> = {
        border: '#e5e7eb',
      };
      return values[token] || fallback;
    },
  }),
  usePuckEditMode: () => true,
}));

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

const getDivider = async () => {
  const module = await import('../components/content/Divider');
  return module.Divider;
};

describe('Divider Component', () => {
  let DividerConfig: any;

  beforeEach(async () => {
    DividerConfig = await getDivider();
  });

  it('renders a separator element', () => {
    render(DividerConfig.render(DividerConfig.defaultProps as any));

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('emits scoped edit-mode CSS for thickness and color', () => {
    const { container } = render(DividerConfig.render({
      ...DividerConfig.defaultProps,
      id: 'divider-test',
      height: { mobile: { value: '3', unit: 'px' } },
      backgroundColor: { type: 'custom', value: '#111827' },
    } as any));

    const style = container.querySelector('style');

    expect(style?.textContent).toContain('.divider-divider-test');
    expect(style?.textContent).toContain('height: 3px');
    expect(style?.textContent).toContain('background-color: #111827');
  });

  it('generates storefront CSS through the aggregator', async () => {
    const { extractLayoutComponentsCss } = await import('../services/PuckCssAggregator');

    const css = extractLayoutComponentsCss({
      content: [{
        type: 'Divider',
        props: {
          id: 'divider-storefront',
          display: { mobile: 'block' },
          width: { mobile: { value: '100', unit: '%' } },
          height: { mobile: { value: '2', unit: 'px' } },
          maxWidth: { mobile: { value: 'none', unit: 'none' } },
          margin: { mobile: { top: '12', right: '0', bottom: '12', left: '0', unit: 'px', linked: false } },
          backgroundColor: { type: 'custom', value: '#2563eb' },
          borderRadius: { topLeft: '999', topRight: '999', bottomRight: '999', bottomLeft: '999', unit: 'px', linked: true },
          opacity: { mobile: '1' },
          visibility: { mobile: 'visible' },
        },
      }],
    } as any);

    expect(css).toContain('.divider-divider-storefront');
    expect(css).toContain('height: 2px');
    expect(css).toContain('background-color: #2563eb');
  });
});
