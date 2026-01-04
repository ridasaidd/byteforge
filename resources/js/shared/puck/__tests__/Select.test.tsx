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
}));

// Dynamic import to ensure mock is applied
const getSelect = async () => {
  const module = await import('../components/forms/Select');
  return module.Select;
};

describe('Select Component', () => {
  let SelectConfig: any;

  beforeEach(async () => {
    SelectConfig = await getSelect();
  });

  const getBaseProps = () => ({
    ...(SelectConfig?.defaultProps || {}),
    name: 'country',
    label: 'Country',
    placeholder: 'Select a country',
    required: false,
    helpText: '',
    options: [
      { label: 'United States', value: 'us' },
      { label: 'Canada', value: 'ca' },
      { label: 'United Kingdom', value: 'uk' },
    ],
    labelColor: { type: 'theme' as const, value: 'foreground' },
    inputBackgroundColor: { type: 'theme' as const, value: 'background' },
    inputTextColor: { type: 'theme' as const, value: 'foreground' },
    inputBorderColor: { type: 'theme' as const, value: 'border' },
    focusBorderColor: { type: 'theme' as const, value: 'primary' },
    borderRadius: '6',
    size: 'md' as const,
    fullWidth: true,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
  });

  const renderSelect = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    return render(
      <FormProvider onSubmit={async () => {}}>
        {SelectConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with label', () => {
    renderSelect();
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('renders select element', () => {
    renderSelect();
    expect(screen.getByRole('button', { name: /select a country/i })).toBeInTheDocument();
  });

  it('displays placeholder option', () => {
    renderSelect();
    expect(screen.getByText('Select a country')).toBeInTheDocument();
  });

  it('renders all options', () => {
    renderSelect();
    fireEvent.click(screen.getByRole('button', { name: /select a country/i }));
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
  });

  it('updates value on selection', () => {
    renderSelect();
    fireEvent.click(screen.getByRole('button', { name: /select a country/i }));
    fireEvent.click(screen.getByText('Canada'));
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    renderSelect({ required: true });
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders help text when provided', () => {
    renderSelect({ helpText: 'Choose your country of residence' });
    expect(screen.getByText('Choose your country of residence')).toBeInTheDocument();
  });

  it('handles different sizes', () => {
    const { rerender } = renderSelect({ size: 'sm' });
    expect(screen.getByRole('button', { name: /select a country/i })).toBeInTheDocument();

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {SelectConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getByRole('button', { name: /select a country/i })).toBeInTheDocument();
  });

  it('handles empty options array', () => {
    renderSelect({ options: [] });
    expect(screen.getByRole('button', { name: /select a country/i })).toBeInTheDocument();
  });
});
