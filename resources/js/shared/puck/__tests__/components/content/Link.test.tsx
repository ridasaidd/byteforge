import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
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
  id: 'test-link',
  label: 'Click here',
  linkType: 'internal' as const,
  internalPage: '/about',
};

defineBlockTestSuite({
  name: 'Link',
  load: async () => {
    const module = await import('../../../components/content/Link');
    return { componentConfig: module.Link, componentRender: module.Link.render };
  },
  defaultProps,
  className: 'link-test-link',
  rootTag: 'span',
  allowedHardcodedValues: ['0px', 'none', 'transparent', '#0066cc', '#0052a3'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Rendering', () => {
      it('renders link text', () => {
        renderWithDefaults();
        expect(screen.getByText('Click here')).toBeInTheDocument();
      });
    });

    describe('Link behavior', () => {
      beforeEach(() => {
        mockUsePuckEditMode.mockReturnValue(false);
      });

      afterEach(() => {
        mockUsePuckEditMode.mockReturnValue(true);
      });

      it('renders as anchor for internal links outside SPA shell paths', () => {
        renderWithDefaults({ internalPage: '/about' });
        const link = screen.getByText('Click here').closest('a');
        expect(link).toBeInTheDocument();
        expect(link?.getAttribute('href')).toBe('/about');
      });

      it('renders as external link with new tab behavior', () => {
        renderWithDefaults({
          linkType: 'external',
          href: 'https://example.com',
          openInNewTab: true,
        });
        const link = screen.getByText('Click here').closest('a');
        expect(link?.getAttribute('href')).toBe('https://example.com');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      });
    });
  },
});

describe('Link legacy interaction migration', () => {
  it('maps legacy to/target props onto the shared interaction contract', async () => {
    const module = await import('../../../components/content/Link');
    const result = module.Link.resolveData?.({
      props: {
        linkType: 'internal',
        to: '/pages/example',
        target: '_blank',
      },
    } as never);

    expect(result?.props.internalPage).toBe('/pages/example');
    expect(result?.props.openInNewTab).toBe(true);
    expect('to' in (result?.props || {})).toBe(false);
    expect('target' in (result?.props || {})).toBe(false);
  });
});
