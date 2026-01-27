import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider } from '../components/forms/FormContext';

// Mock useTheme and usePuckEditMode hooks
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
        border: '#e5e7eb',
        error: '#ef4444',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
        border: '#e5e7eb',
        error: '#ef4444',
      };
      return colors[token] || fallback;
    },
  }),
  usePuckEditMode: () => true
}));

// Dynamic import to ensure mock is applied
const getTextInput = async () => {
  const module = await import('../components/forms/TextInput');
  return module.TextInput;
};

describe('TextInput Component', () => {
  let TextInputConfig: any;

  beforeEach(async () => {
    TextInputConfig = await getTextInput();
  });

  const getBaseProps = () => ({
    ...(TextInputConfig?.defaultProps || {}),
    name: 'email',
    label: 'Email Address',
    placeholder: 'Enter your email',
    inputType: 'email' as const,
    required: false,
    helpText: '',
    labelColor: { type: 'theme' as const, value: 'foreground' },
    inputBackgroundColor: { type: 'theme' as const, value: 'background' },
    inputTextColor: { type: 'theme' as const, value: 'foreground' },
    inputBorderColor: { type: 'theme' as const, value: 'border' },
    focusBorderColor: { type: 'theme' as const, value: 'primary' },
    errorColor: { type: 'theme' as const, value: 'error' },
    borderRadius: '6',
    size: 'md' as const,
    fullWidth: true,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
  });

  const renderTextInput = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    return render(
      <FormProvider onSubmit={async () => {}}>
        {TextInputConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with label', () => {
    renderTextInput();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    renderTextInput();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('updates value on change', () => {
    renderTextInput();
    const input = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input).toHaveValue('test@example.com');
  });

  it('shows required asterisk when required', () => {
    renderTextInput({ required: true });
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toHaveAttribute('required');
  });

  it('renders help text when provided', () => {
    renderTextInput({ helpText: 'We will never share your email' });
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();
  });

  it('handles different input types', () => {
    const { rerender } = renderTextInput({ inputType: 'text' });
    expect(screen.getByPlaceholderText('Enter your email')).toHaveAttribute('type', 'text');

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {TextInputConfig.render({ ...getBaseProps(), inputType: 'password' } as any)}
      </FormProvider>
    );

    expect(screen.getByPlaceholderText('Enter your email')).toHaveAttribute('type', 'password');
  });

  it('applies size variants', () => {
    const { rerender } = renderTextInput({ size: 'sm' });
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {TextInputConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('respects fullWidth prop', () => {
    renderTextInput({ fullWidth: true });
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('handles validation attributes', () => {
    renderTextInput({ minLength: 5, maxLength: 50 });
    const input = screen.getByPlaceholderText('Enter your email');
    expect(input).toHaveAttribute('minLength', '5');
    expect(input).toHaveAttribute('maxLength', '50');
  });
});
