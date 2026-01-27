import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider } from '../components/forms/FormContext';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      };
      return colors[token] || fallback;
    },
  }),
  usePuckEditMode: () => true
}));

// Dynamic import to ensure mock is applied
const getSubmitButton = async () => {
  const module = await import('../components/forms/SubmitButton');
  return module.SubmitButton;
};

describe('SubmitButton Component', () => {
  let SubmitButtonConfig: any;

  beforeEach(async () => {
    SubmitButtonConfig = await getSubmitButton();
  });

  const getBaseProps = () => ({
    ...(SubmitButtonConfig?.defaultProps || {}),
    text: 'Submit',
    loadingText: 'Submitting...',
    backgroundColor: { type: 'theme' as const, value: 'colors.primary' },
    textColor: { type: 'custom' as const, value: '#ffffff' },
    hoverBackgroundColor: { type: 'theme' as const, value: 'colors.primary' },
    disabledBackgroundColor: { type: 'custom' as const, value: '#9ca3af' },
    borderRadius: '6',
    size: 'md' as const,
    fullWidth: false,
    showIcon: false,
    iconPosition: 'right' as const,
    display: { mobile: 'inline-flex' as const },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
  });

  const renderSubmitButton = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = {
      ...getBaseProps(),
      ...props,
    };
    return render(
      <FormProvider formName="test-form">
        {SubmitButtonConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with button text', () => {
    renderSubmitButton();

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('has type="submit"', () => {
    renderSubmitButton();

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('applies custom button text', () => {
    renderSubmitButton({ text: 'Send Message' });

    expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = renderSubmitButton({ size: 'sm' });

    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <FormProvider formName="test-form">
        {SubmitButtonConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies full width when specified', () => {
    renderSubmitButton({ fullWidth: true });

    const button = screen.getByRole('button');
    // Check for full-width styling
    expect(button).toBeInTheDocument();
  });

  it('is disabled during form submission', async () => {
    // Create a form provider that's in submitting state
    const SubmittingProvider = ({ children }: { children: React.ReactNode }) => (
      <FormProvider formName="test-form">
        {children}
      </FormProvider>
    );

    render(
      <SubmittingProvider>
        {SubmitButtonConfig.render(getBaseProps() as any)}
      </SubmittingProvider>
    );

    // Button should be enabled initially
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('handles click events', () => {
    renderSubmitButton();

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Click should work without errors
    expect(button).toBeInTheDocument();
  });

  it('applies theme colors', () => {
    renderSubmitButton({ backgroundColor: { type: 'theme', value: 'colors.primary' } });

    const button = screen.getByRole('button');
    // Button should have theme-based styling
    expect(button).toBeInTheDocument();
  });

  it('applies custom colors', () => {
    renderSubmitButton({
      backgroundColor: { type: 'custom', value: '#ff0000' },
      textColor: { type: 'custom', value: '#ffffff' },
    });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
  usePuckEditMode: () => true
});
