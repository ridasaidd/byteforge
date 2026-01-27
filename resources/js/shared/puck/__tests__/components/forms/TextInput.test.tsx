import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock useTheme and usePuckEditMode hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver()
  }),
  usePuckEditMode: () => true,
  useQuery: vi.fn(() => ({ data: null }))
}));

// Mock FormContext
vi.mock('../../../components/forms/FormContext', () => ({
  useFormField: () => ({
    value: '',
    error: null,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  }),
}));

const defaultProps = {
  id: 'test-input',
  name: 'email',
  label: 'Email Address',
  placeholder: 'Enter your email',
  inputType: 'email' as const,
  required: true,
  helpText: '',
  labelColor: { type: 'theme' as const, value: 'colors.foreground' },
  inputBackgroundColor: { type: 'custom' as const, value: '#ffffff' },
  inputTextColor: { type: 'theme' as const, value: 'colors.foreground' },
  inputBorderColor: { type: 'custom' as const, value: '#e5e7eb' },
  focusBorderColor: { type: 'theme' as const, value: 'colors.primary.500' },
  errorColor: { type: 'custom' as const, value: '#ef4444' },
  borderRadius: '6',
  size: 'md' as const,
  fullWidth: true,
};

defineBlockTestSuite({
  name: 'TextInput',
  load: async () => {
    const module = await import('../../../components/forms/TextInput');
    return { componentConfig: module.TextInput, componentRender: module.TextInput.render };
  },
  defaultProps,
  className: 'textinput-test-input',
  rootTag: 'div',
  allowedHardcodedValues: ['width: 100%', '0.2s', 'none', '#3b82f6', '#e5e7eb'],
  extraTests: ({ renderWithDefaults }) => {
    describe('TextInput-specific tests', () => {
      it('should render label and input field', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Email Address');
        const input = container.querySelector('input');
        expect(input).toBeTruthy();
      });

      it('should render text input type', () => {
        const { container } = renderWithDefaults({ inputType: 'text' });
        const input = container.querySelector('input[type="text"]');
        expect(input).toBeTruthy();
      });

      it('should render email input type', () => {
        const { container } = renderWithDefaults({ inputType: 'email' });
        const input = container.querySelector('input[type="email"]');
        expect(input).toBeTruthy();
      });

      it('should render password input type', () => {
        const { container } = renderWithDefaults({ inputType: 'password' });
        const input = container.querySelector('input[type="password"]');
        expect(input).toBeTruthy();
      });

      it('should apply small size', () => {
        const { container } = renderWithDefaults({ size: 'sm' });
        expect(container.querySelector('input')).toBeTruthy();
      });

      it('should apply medium size', () => {
        const { container } = renderWithDefaults({ size: 'md' });
        expect(container.querySelector('input')).toBeTruthy();
      });

      it('should apply large size', () => {
        const { container } = renderWithDefaults({ size: 'lg' });
        expect(container.querySelector('input')).toBeTruthy();
      });

      it('should show asterisk for required fields', () => {
        const { container } = renderWithDefaults({ required: true });
        expect(container.textContent).toContain('*');
      });
    });
  },
});
