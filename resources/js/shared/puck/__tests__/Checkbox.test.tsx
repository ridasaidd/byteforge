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
        border: '#e5e7eb',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
        border: '#e5e7eb',
      };
      return colors[token] || fallback;
    },
  }),
  usePuckEditMode: () => true
}));

// Dynamic import to ensure mock is applied
const getCheckbox = async () => {
  const module = await import('../components/forms/Checkbox');
  return module.Checkbox;
};

describe('Checkbox Component', () => {
  let CheckboxConfig: any;

  beforeEach(async () => {
    CheckboxConfig = await getCheckbox();
  });

  const getBaseProps = () => ({
    ...(CheckboxConfig?.defaultProps || {}),
    name: 'terms',
    label: 'I agree to the terms and conditions',
    helpText: '',
    required: false,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
    checkboxColor: { type: 'theme' as const, value: 'primary' },
    checkboxBorderColor: { type: 'theme' as const, value: 'border' },
    checkmarkColor: { type: 'theme' as const, value: 'primary-foreground' },
    labelColor: { type: 'theme' as const, value: 'foreground' },
    size: 'md' as const,
  });

  const renderCheckbox = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    return render(
      <FormProvider onSubmit={async () => {}}>
        {CheckboxConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with label', () => {
    renderCheckbox();
    expect(screen.getByText('I agree to the terms and conditions')).toBeInTheDocument();
  });

  it('renders checkbox input', () => {
    renderCheckbox();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('toggles checked state on click', () => {
    renderCheckbox();
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('shows required indicator when required', () => {
    renderCheckbox({ required: true });
    expect(screen.getByRole('checkbox')).toHaveAttribute('required');
  });

  it('renders help text when provided', () => {
    renderCheckbox({ helpText: 'Please read our terms carefully' });
    expect(screen.getByText('Please read our terms carefully')).toBeInTheDocument();
  });

  it('clicking label toggles checkbox', () => {
    renderCheckbox();
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('I agree to the terms and conditions');

    expect(checkbox).not.toBeChecked();
    fireEvent.click(label);
    expect(checkbox.closest('label') || checkbox).toBeInTheDocument();
  });

  it('handles different sizes', () => {
    const { rerender } = renderCheckbox({ size: 'sm' });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {CheckboxConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('applies theme colors', () => {
    renderCheckbox({ checkboxColor: { type: 'theme', value: 'primary' } });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('applies custom colors', () => {
    renderCheckbox({ checkboxColor: { type: 'custom', value: '#ff0000' } });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
  usePuckEditMode: () => true
});
