import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock the theme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    resolve: mockThemeResolver()
  })
}));

// Mock FormContext
vi.mock('../../../components/forms/FormContext', () => ({
  useFormField: vi.fn((name: string) => ({
    value: '',
    error: null,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  })),
}));

const defaultProps = {
  id: 'textarea-1',
  name: 'description',
  label: 'Description',
  placeholder: 'Enter description',
  required: false,
  helpText: 'Provide details',
  rows: 4,
  resize: 'vertical' as const,
  labelColor: { type: 'custom' as const, value: '#000000' },
  inputBackgroundColor: { type: 'custom' as const, value: '#ffffff' },
  inputTextColor: { type: 'custom' as const, value: '#000000' },
  inputBorderColor: { type: 'custom' as const, value: '#e5e7eb' },
  focusBorderColor: { type: 'custom' as const, value: '#3b82f6' },
  errorColor: { type: 'custom' as const, value: '#ef4444' },
  borderRadius: '6',
  size: 'md' as const,
  fullWidth: true,
};

defineBlockTestSuite({
  name: 'Textarea',
  load: async () => {
    const module = await import('../../../components/forms/Textarea');
    return { componentConfig: module.Textarea, componentRender: module.Textarea.render };
  },
  defaultProps,
  className: 'textarea-textarea-1',
  rootTag: 'div',
  allowedHardcodedValues: ['width: 100%', '0.2s', 'inherit', '#3b82f6', '#000000', '8px 12px', '14px', '10px 14px', '16px', '14px 18px', '18px'],
  extraTests: ({ renderWithDefaults }) => {
    describe('Textarea-specific tests', () => {
      it('should render label and textarea field', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Description');
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeTruthy();
      });

      it('should apply rows attribute', () => {
        const { container } = renderWithDefaults({ rows: 6 });
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(textarea.rows).toBe(6);
      });

      it('should apply resize: none', () => {
        const { css } = renderWithDefaults({ resize: 'none' });
        expect(css).toContain('resize: none');
      });

      it('should apply resize: vertical', () => {
        const { css } = renderWithDefaults({ resize: 'vertical' });
        expect(css).toContain('resize: vertical');
      });

      it('should apply resize: both', () => {
        const { css } = renderWithDefaults({ resize: 'both' });
        expect(css).toContain('resize: both');
      });

      it('should apply small size', () => {
        const { css } = renderWithDefaults({ size: 'sm' });
        expect(css).toContain('padding: 8px 12px');
        expect(css).toContain('font-size: 14px');
      });

      it('should apply medium size', () => {
        const { css } = renderWithDefaults({ size: 'md' });
        expect(css).toContain('padding: 10px 14px');
        expect(css).toContain('font-size: 16px');
      });

      it('should apply large size', () => {
        const { css } = renderWithDefaults({ size: 'lg' });
        expect(css).toContain('padding: 14px 18px');
        expect(css).toContain('font-size: 18px');
      });

      it('should show asterisk for required fields', () => {
        const { container } = renderWithDefaults({ required: true });
        expect(container.textContent).toContain('*');
      });
    });
  },
});
