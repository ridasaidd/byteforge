import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock the theme and usePuckEditMode hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    resolve: mockThemeResolver()
  }),
  usePuckEditMode: () => true
}));

const defaultProps = {
  id: 'submit-1',
  text: 'Submit Form',
  backgroundColor: { type: 'custom' as const, value: '#3b82f6' },
  textColor: { type: 'custom' as const, value: '#ffffff' },
  hoverBackgroundColor: { type: 'custom' as const, value: '#2563eb' },
  disabledBackgroundColor: { type: 'custom' as const, value: '#9ca3af' },
  borderRadius: '6',
  size: 'md' as const,
  fullWidth: false,
};

defineBlockTestSuite({
  name: 'SubmitButton',
  load: async () => {
    const module = await import('../../../components/forms/SubmitButton');
    return { componentConfig: module.SubmitButton, componentRender: module.SubmitButton.render };
  },
  defaultProps,
  className: 'submitbutton-submit-1',
  rootTag: 'button',
  allowedHardcodedValues: ['width: 100%', '0.2s', 'pointer', 'not-allowed', 'opacity: 0.6', '#2563eb', '#ffffff', '8px 16px', '14px', '10px 20px', '16px', '12px 24px', '18px'],
  extraTests: ({ renderWithDefaults }) => {
    describe('SubmitButton-specific tests', () => {
      it('should render button text', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Submit Form');
      });

      it('should render as submit type button', () => {
        const { container } = renderWithDefaults();
        const button = container.querySelector('button[type="submit"]');
        expect(button).toBeTruthy();
      });

      it('should apply small size', () => {
        const { css } = renderWithDefaults({ size: 'sm' });
        expect(css).toContain('padding: 8px 16px');
        expect(css).toContain('font-size: 14px');
      });

      it('should apply medium size', () => {
        const { css } = renderWithDefaults({ size: 'md' });
        expect(css).toContain('padding: 10px 20px');
        expect(css).toContain('font-size: 16px');
      });

      it('should apply large size', () => {
        const { css } = renderWithDefaults({ size: 'lg' });
        expect(css).toContain('padding: 12px 24px');
        expect(css).toContain('font-size: 18px');
      });

      it('should apply full width when true', () => {
        const { css } = renderWithDefaults({ fullWidth: true });
        expect(css).toContain('width: 100%');
      });

      it('should not be full width when false', () => {
        const { css } = renderWithDefaults({ fullWidth: false });
        expect(css).not.toContain('width: 100%');
      });
    });
  },
});
