import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider } from '../components/forms/FormContext';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        foreground: '#000000',
        primary: '#3b82f6',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        foreground: '#000000',
        primary: '#3b82f6',
      };
      return colors[token] || fallback;
    },
  }),
  usePuckEditMode: () => true
}));

// Dynamic import to ensure mock is applied
const getRadioGroup = async () => {
  const module = await import('../components/forms/RadioGroup');
  return module.RadioGroup;
};

describe('RadioGroup Component', () => {
  let RadioGroupConfig: any;

  beforeEach(async () => {
    RadioGroupConfig = await getRadioGroup();
  });

  const getBaseProps = () => ({
    ...(RadioGroupConfig?.defaultProps || {}),
    name: 'plan',
    label: 'Choose a plan',
    required: false,
    helpText: '',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
      { label: 'Enterprise', value: 'enterprise' },
    ],
    radioColor: { type: 'theme' as const, value: 'primary' },
    radioBorderColor: { type: 'theme' as const, value: 'border' },
    labelColor: { type: 'theme' as const, value: 'foreground' },
    size: 'md' as const,
    direction: 'column' as const,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
  });

  const renderRadioGroup = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = { ...getBaseProps(), ...props };
    return render(
      <FormProvider onSubmit={async () => {}}>
        {RadioGroupConfig.render(resolvedProps as any)}
      </FormProvider>
    );
  };

  it('renders with label', () => {
    renderRadioGroup();
    expect(screen.getByText('Choose a plan')).toBeInTheDocument();
  });

  it('renders all radio options', () => {
    renderRadioGroup();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('renders radio inputs', () => {
    renderRadioGroup();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('selects radio on click', () => {
    renderRadioGroup();
    const radios = screen.getAllByRole('radio');

    expect(radios[0]).not.toBeChecked();
    fireEvent.click(radios[0]);
    expect(radios[0]).toBeChecked();

    fireEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('shows required indicator when required', () => {
    renderRadioGroup({ required: true });
    const radios = screen.getAllByRole('radio');
    const hasRequired = radios.some(radio => radio.hasAttribute('required'));
    expect(hasRequired).toBe(true);
  });

  it('renders help text when provided', () => {
    renderRadioGroup({ helpText: 'Select the plan that fits your needs' });
    expect(screen.getByText('Select the plan that fits your needs')).toBeInTheDocument();
  });

  it('handles vertical orientation', () => {
    renderRadioGroup({ direction: 'column' });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('handles horizontal orientation', () => {
    renderRadioGroup({ direction: 'row' });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('handles different sizes', () => {
    const { rerender } = renderRadioGroup({ size: 'sm' });
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    rerender(
      <FormProvider onSubmit={async () => {}}>
        {RadioGroupConfig.render({ ...getBaseProps(), size: 'lg' } as any)}
      </FormProvider>
    );

    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('handles empty options array', () => {
    renderRadioGroup({ options: [] });
    expect(screen.getByText('Choose a plan')).toBeInTheDocument();
  });

  it('ensures only one radio is selected at a time', () => {
    renderRadioGroup();
    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[0]);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();

    fireEvent.click(radios[2]);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).toBeChecked();
  });
  usePuckEditMode: () => true
});
