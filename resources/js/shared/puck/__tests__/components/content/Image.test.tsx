import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock useTheme and usePuckEditMode hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver()
  }),
  usePuckEditMode: () => true // Always return true in tests to generate CSS
}));

const defaultProps = {
  id: 'test-image',
  src: 'https://example.com/image.jpg',
  alt: 'Test image'
};

defineBlockTestSuite({
  name: 'Image',
  load: async () => {
    const module = await import('../../../components/content/Image');
    return { componentConfig: module.Image, componentRender: module.Image.render };
  },
  defaultProps,
  className: 'image-test-image',
  rootTag: 'img',
  allowedHardcodedValues: ['0px', 'none', 'cover', 'contain', 'auto', '#FFFFFF', '#ffffff'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Image-specific tests', () => {
      it('should render with src and alt attributes', () => {
        const { container } = renderWithDefaults();
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
        expect(img).toHaveAttribute('alt', 'Test image');
      });

      it('should apply object-fit as cover', () => {
        const { css } = renderWithDefaults({ objectFit: 'cover' });
        expect(css).toContain('object-fit: cover');
      });

      it('should apply object-fit as contain', () => {
        const { css } = renderWithDefaults({ objectFit: 'contain' });
        expect(css).toContain('object-fit: contain');
      });

      it('should apply width constraints', () => {
        const { css } = renderWithDefaults({
          width: {
            mobile: { value: '100', unit: '%' },
            desktop: { value: '500', unit: 'px' }
          }
        });
        expect(css).toContain('width');
        expect(css).toContain('@media');
      });

      it('should apply height constraints', () => {
        const { css } = renderWithDefaults({
          height: { value: '300', unit: 'px' }
        });
        expect(css).toContain('height');
      });

      it('should apply border-radius', () => {
        const { css } = renderWithDefaults({
          borderRadius: { value: '8', unit: 'px' }
        });
        expect(css).toContain('border-radius');
      });

    });
  },
});
