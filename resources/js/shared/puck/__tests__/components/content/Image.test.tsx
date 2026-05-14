import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

const { mockUsePuckEditMode } = vi.hoisted(() => ({
  mockUsePuckEditMode: vi.fn(() => true),
}));

// Mock useTheme and usePuckEditMode hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver()
  }),
  usePuckEditMode: mockUsePuckEditMode,
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

const defaultProps = {
  id: 'test-image',
  src: 'https://example.com/image.jpg',
  alt: 'Test image',
};

defineBlockTestSuite({
  name: 'Image',
  load: async () => {
    const module = await import('../../../components/content/Image');
    return {
      componentConfig: module.Image,
      componentRender: module.Image.render,
      wrapRender: (node) => (
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          {node}
        </MemoryRouter>
      ),
    };
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
          borderRadiusPreset: 'md'
        });
        expect(css).toContain('border-radius');
      });

      describe('Shared interaction behavior', () => {
        beforeEach(() => {
          mockUsePuckEditMode.mockReturnValue(false);
        });

        afterEach(() => {
          mockUsePuckEditMode.mockReturnValue(true);
        });

        it('renders a linked image for internal targets', () => {
          renderWithDefaults({
            linkType: 'internal' as const,
            internalPage: '/pages/about',
          });

          const img = screen.getByAltText('Test image');
          const link = img.closest('a');
          expect(link).toBeInTheDocument();
          expect(link?.getAttribute('href')).toBe('/pages/about');
        });

        it('renders a linked image for external targets in a new tab', () => {
          renderWithDefaults({
            linkType: 'external' as const,
            href: 'https://example.com',
            openInNewTab: true,
          });

          const img = screen.getByAltText('Test image');
          const link = img.closest('a');
          expect(link).toBeInTheDocument();
          expect(link?.getAttribute('href')).toBe('https://example.com');
          expect(link?.getAttribute('target')).toBe('_blank');
          expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        });
      });

    });
  },
});
