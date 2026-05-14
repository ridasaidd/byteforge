import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

const { mockUsePuckEditMode } = vi.hoisted(() => ({
  mockUsePuckEditMode: vi.fn(() => true),
}));

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver(),
  }),
  usePuckEditMode: mockUsePuckEditMode,
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

const defaultProps = {
  id: 'test-logo',
  src: 'https://example.com/logo.png',
  alt: 'Test logo',
};

defineBlockTestSuite({
  name: 'Logo',
  load: async () => {
    const module = await import('../../../components/content/Logo');
    return {
      componentConfig: module.Logo,
      componentRender: module.Logo.render,
      wrapRender: (node) => (
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          {node}
        </MemoryRouter>
      ),
    };
  },
  defaultProps,
  className: 'logo-test-logo',
  rootTag: 'img',
  allowedHardcodedValues: ['0px', 'none', 'contain', 'cover', 'fill', 'auto'],
  supportsPadding: false,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Logo-specific tests', () => {
      it('renders with src and alt attributes', () => {
        const { container } = renderWithDefaults();
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
        expect(img).toHaveAttribute('alt', 'Test logo');
      });

      it('applies object-fit style from unified control', () => {
        const { css } = renderWithDefaults({ objectFit: 'contain' });
        expect(css).toContain('object-fit: contain');
      });

      it('generates responsive CSS from shared controls', () => {
        const { css } = renderWithDefaults({
          width: {
            mobile: { value: '140', unit: 'px' },
            desktop: { value: '220', unit: 'px' },
          },
        });
        expect(css).toContain('width');
        expect(css).toContain('@media');
      });

      describe('Shared interaction behavior', () => {
        beforeEach(() => {
          mockUsePuckEditMode.mockReturnValue(false);
        });

        afterEach(() => {
          mockUsePuckEditMode.mockReturnValue(true);
        });

        it('renders linked logo for internal targets', () => {
          renderWithDefaults({
            linkType: 'internal' as const,
            internalPage: '/pages/home',
          });

          const img = screen.getByAltText('Test logo');
          const link = img.closest('a');
          expect(link).toBeInTheDocument();
          expect(link?.getAttribute('href')).toBe('/pages/home');
        });

        it('renders linked logo for external targets', () => {
          renderWithDefaults({
            linkType: 'external' as const,
            href: 'https://example.com',
            openInNewTab: true,
          });

          const img = screen.getByAltText('Test logo');
          const link = img.closest('a');
          expect(link).toBeInTheDocument();
          expect(link?.getAttribute('href')).toBe('https://example.com');
          expect(link?.getAttribute('target')).toBe('_blank');
          expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        });
      });

      it('generates storefront CSS through layout aggregator', async () => {
        const { extractLayoutComponentsCss } = await import('../../../services/PuckCssAggregator');

        const css = extractLayoutComponentsCss({
          content: [{
            type: 'Logo',
            props: {
              id: 'logo-storefront',
              display: { mobile: 'inline-block' },
              width: { mobile: { value: '180', unit: 'px' } },
              height: { mobile: { value: '48', unit: 'px' } },
              maxWidth: { mobile: { value: '100', unit: '%' } },
              maxHeight: { mobile: { value: 'none', unit: 'none' } },
              margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
              objectFit: 'contain',
            },
          }],
        } as any);

        expect(css).toContain('.logo-logo-storefront');
        expect(css).toContain('height: 48px');
        expect(css).toContain('object-fit: contain');
      });
    });
  },
});
