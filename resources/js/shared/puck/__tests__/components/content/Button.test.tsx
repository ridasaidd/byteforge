import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver()
  }),
  useQuery: vi.fn(() => ({ data: null }))
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null }))
}));

const defaultProps = {
  id: 'test-button',
  text: 'Click me',
  size: 'md' as const,
  linkType: 'none' as const,
  backgroundColor: { type: 'theme' as const, value: 'components.button.variants.primary.backgroundColor' },
  textColor: { type: 'theme' as const, value: 'components.button.variants.primary.color' }
};

defineBlockTestSuite({
  name: 'Button',
  load: async () => {
    const module = await import('../../../components/content/Button');
    return { componentConfig: module.Button, componentRender: module.Button.render };
  },
  defaultProps,
  className: 'button-test-button',
  rootTag: 'button',
  allowedHardcodedValues: ['0px', 'none', 'transparent', '0.2s', 'all', '#3b82f6', '#ffffff'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Rendering', () => {
      it('renders button text', () => {
        renderWithDefaults();
        expect(screen.getByText('Click me')).toBeInTheDocument();
      });
    });

    describe('Styling', () => {
      it('renders backgroundColor and color in CSS', () => {
        const { css } = renderWithDefaults();
        expect(css).toContain('background-color');
        expect(css).toContain('color');
      });

      it('applies custom colors when provided', () => {
        const { css } = renderWithDefaults({
          backgroundColor: { type: 'custom' as const, value: '#8b5cf6' },
          textColor: { type: 'custom' as const, value: '#ffffff' },
        });

        expect(css).toContain('#8b5cf6');
        expect(css).toContain('background-color');
        expect(css).toContain('color');
      });
    });

    describe('Button Sizes', () => {
      it('renders small button', () => {
        renderWithDefaults({ size: 'sm' });
        expect(screen.getByText('Click me')).toBeInTheDocument();
      });

      it('renders medium button', () => {
        renderWithDefaults({ size: 'md' });
        expect(screen.getByText('Click me')).toBeInTheDocument();
      });

      it('renders large button', () => {
        renderWithDefaults({ size: 'lg' });
        expect(screen.getByText('Click me')).toBeInTheDocument();
      });
    });

    describe('Link Functionality', () => {
      it('renders as link when linkType is internal', () => {
        renderWithDefaults({ linkType: 'internal', internalPage: '/about' });
        const link = screen.getByText('Click me').closest('a');
        expect(link).toBeInTheDocument();
        expect(link?.getAttribute('href')).toBe('/about');
      });

      it('renders as external link when linkType is external', () => {
        renderWithDefaults({ linkType: 'external', href: 'https://example.com', openInNewTab: true });
        const link = screen.getByText('Click me').closest('a');
        expect(link?.getAttribute('href')).toBe('https://example.com');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      });

      it('renders as button when linkType is none', () => {
        renderWithDefaults({ linkType: 'none' });
        const button = screen.getByText('Click me').closest('button');
        expect(button).toBeInTheDocument();
      });
    });

    describe('Alignment', () => {
      it('does not have container wrapper when no alignment', () => {
        const { container } = renderWithDefaults({ alignment: undefined });
        const containerDiv = container.querySelector('.button-test-button-container');
        expect(containerDiv).not.toBeInTheDocument();
        const button = container.querySelector('button');
        expect(button).toBeInTheDocument();
      });

      it('uses inline-flex layout when alignment is set', () => {
        const { css } = renderWithDefaults({ alignment: { horizontal: 'center' } });
        expect(css).toContain('display: inline-flex');
      });
    });
  },
});
