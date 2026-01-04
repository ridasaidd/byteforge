import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver()
  })
}));

const defaultProps = {
  id: 'test-card',
  title: 'Card Title',
  description: 'Card description text',
  mode: 'card' as const
};

defineBlockTestSuite({
  name: 'Card',
  load: async () => {
    const module = await import('../../../components/content/Card');
    return { componentConfig: module.Card, componentRender: module.Card.render };
  },
  defaultProps,
  className: 'card-test-card',
  rootTag: 'div',
  allowedHardcodedValues: ['0px', 'none', 'left', 'center', 'right', '#FFFFFF', '#ffffff'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Card-specific tests', () => {
      it('should render title and description', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Card Title');
        expect(container.textContent).toContain('Card description text');
      });

      it('should render in flat mode', () => {
        const { container } = renderWithDefaults({ mode: 'flat' });
        expect(container.querySelector('.card-test-card')).toBeInTheDocument();
      });

      it('should render in card mode', () => {
        const { container } = renderWithDefaults({ mode: 'card' });
        expect(container.querySelector('.card-test-card')).toBeInTheDocument();
      });

      it('should render with icon when provided', () => {
        const { container } = renderWithDefaults({ icon: 'star' });
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      it('should render without icon when not provided', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Card Title');
      });

      it('should apply text alignment', () => {
        const { css } = renderWithDefaults({ textAlign: 'center' });
        expect(css).toContain('text-align: center');
      });

      it('should apply background color', () => {
        const { css } = renderWithDefaults({
          backgroundColor: { type: 'custom' as const, value: '#f0f0f0' }
        });
        expect(css).toContain('#f0f0f0');
      });

      it('should apply block display', () => {
        const { css } = renderWithDefaults({ display: 'block' });
        expect(css).toContain('display: block');
      });

      it('should apply flex display', () => {
        const { css } = renderWithDefaults({ display: 'flex' });
        expect(css).toContain('display: flex');
      });

      it('should generate responsive width CSS', () => {
        const { css } = renderWithDefaults({
          width: {
            mobile: { value: '100', unit: '%' },
            desktop: { value: '50', unit: '%' }
          }
        });
        expect(css).toContain('width');
        expect(css).toContain('@media');
      });
    });
  },
});
