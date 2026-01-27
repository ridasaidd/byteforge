import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider } from '../components/forms/FormContext';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        foreground: '#000000',
        background: '#ffffff',
        border: '#e5e7eb',
        primary: '#3b82f6',
        error: '#ef4444',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        foreground: '#000000',
        background: '#ffffff',
        border: '#e5e7eb',
        primary: '#3b82f6',
        error: '#ef4444',
      };
      return colors[token] || fallback;
    },
  }),
  usePuckEditMode: () => true
}));

// Dynamic import to ensure mock is applied
const getTextarea = async () => {
  const module = await import('../components/forms/Textarea');
  return module.Textarea;
};

describe('Textarea Component', () => {
  let TextareaConfig: any;

  beforeEach(async () => {
    TextareaConfig = await getTextarea();
  });

  const getBaseProps = () => ({
    ...(TextareaConfig?.defaultProps || {}),
    name: 'message',
    label: 'Your Message',
    placeholder: 'Enter your message here',
    required: false,
    helpText: '',
    rows: 4,
    resize: 'vertical' as const,
    minLength: 0,
    maxLength: 1000,
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

  const renderTextarea = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    return render(
      <FormProvider onSubmit={async () => {}}>
        {TextareaConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with label', () => {
    renderTextarea();
    expect(screen.getByText('Your Message')).toBeInTheDocument();
  });

  it('renders textarea element', () => {
    renderTextarea();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders with placeholder', () => {
    renderTextarea();
    expect(screen.getByPlaceholderText('Enter your message here')).toBeInTheDocument();
  });

  it('updates value on change', () => {
    renderTextarea();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello world!' } });
    expect(textarea).toHaveValue('Hello world!');
  });

  it('respects rows prop', () => {
    renderTextarea({ rows: 8 });
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8');
  });

  it('shows required indicator when required', () => {
    renderTextarea({ required: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('required');
  });

  it('renders help text when provided', () => {
    renderTextarea({ helpText: 'Maximum 1000 characters' });
    expect(screen.getByText('Maximum 1000 characters')).toBeInTheDocument();
  });

  it('handles validation attributes', () => {
    renderTextarea({ minLength: 10, maxLength: 500 });
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('minLength', '10');
    expect(textarea).toHaveAttribute('maxLength', '500');
  });

  it('handles multiline input', () => {
    renderTextarea();
    const textarea = screen.getByRole('textbox');
    const multilineText = 'Line 1\nLine 2\nLine 3';
    fireEvent.change(textarea, { target: { value: multilineText } });
    expect(textarea).toHaveValue(multilineText);
  });

  it('applies different sizes', () => {
    const { rerender } = renderTextarea({ size: 'sm' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {TextareaConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  usePuckEditMode: () => true
});
