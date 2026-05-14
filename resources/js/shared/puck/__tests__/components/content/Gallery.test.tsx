import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver(),
  }),
  usePuckEditMode: () => true,
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

const defaultProps = {
  id: 'test-gallery',
  images: [
    { src: 'https://example.com/a.jpg', alt: 'Image A', caption: 'Image A' },
    { src: 'https://example.com/b.jpg', alt: 'Image B', caption: 'Image B' },
    { src: 'https://example.com/c.jpg', alt: 'Image C', caption: 'Image C' },
  ],
  display: { mobile: 'grid' as const },
  width: { mobile: { value: '100', unit: '%' as const } },
  numColumns: { mobile: 1, tablet: 2, desktop: 3 },
  gridGap: { mobile: { value: '16', unit: 'px' as const } },
};

defineBlockTestSuite({
  name: 'Gallery',
  load: async () => {
    const module = await import('../../../components/content/Gallery');
    return {
      componentConfig: module.Gallery,
      componentRender: module.Gallery.render,
    };
  },
  defaultProps,
  className: 'gallery-test-gallery',
  rootTag: 'div',
  allowedHardcodedValues: ['0px', 'none', 'cover', 'contain', 'fill', 'auto', 'inherit', '8px', '14px', '1.4', '100%'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Gallery-specific tests', () => {
      it('renders all provided images', () => {
        const { container } = renderWithDefaults();
        const images = container.querySelectorAll('img');
        expect(images.length).toBe(3);
      });

      it('renders captions when enabled', () => {
        const { container } = renderWithDefaults({ showCaptions: true });
        expect(container.textContent).toContain('Image A');
      });

      it('hides captions when disabled', () => {
        const { container } = renderWithDefaults({ showCaptions: false });
        expect(container.textContent).not.toContain('Image A');
      });

      it('uses responsive grid controls from unified fields', () => {
        const { css } = renderWithDefaults({
          numColumns: { mobile: 1, tablet: 2, desktop: 4 },
        });
        expect(css).toContain('grid-template-columns');
        expect(css).toContain('@media');
      });

      it('generates storefront CSS through the layout aggregator', async () => {
        const { extractLayoutComponentsCss } = await import('../../../services/PuckCssAggregator');

        const css = extractLayoutComponentsCss({
          content: [{
            type: 'Gallery',
            props: {
              id: 'gallery-storefront',
              display: { mobile: 'grid' },
              width: { mobile: { value: '100', unit: '%' } },
              numColumns: { mobile: 1, desktop: 3 },
              gridGap: { mobile: { value: '20', unit: 'px' } },
              objectFit: 'cover',
              imageAspectRatio: '3 / 2',
            },
          }],
        } as any);

        expect(css).toContain('.gallery-gallery-storefront');
        expect(css).toContain('grid-template-columns');
        expect(css).toContain('aspect-ratio: 3 / 2');
      });
    });
  },
});
