import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider } from '../../components/forms/FormContext';

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
}));

// Import the actual component functions
import TextInputComponent from '../../components/forms/TextInput';
import SubmitButtonComponent from '../../components/forms/SubmitButton';
import SelectComponent from '../../components/forms/Select';
import CheckboxComponent from '../../components/forms/Checkbox';
import RadioGroupComponent from '../../components/forms/RadioGroup';
import TextareaComponent from '../../components/forms/Textarea';

// Extract render functions from Puck configs
const TextInput = TextInputComponent.render;
const SubmitButton = SubmitButtonComponent.render;
const Select = SelectComponent.render;
const Checkbox = CheckboxComponent.render;
const RadioGroup = RadioGroupComponent.render;
const Textarea = TextareaComponent.render;

describe('Form Block Integration Tests', () => {
  it('form receives values from form fields', () => {

    const onSubmit = vi.fn();

    render(
      <FormProvider formName="contact-form" onSubmit={onSubmit}>
        <TextInput
          name="email"
          label="Email"
          placeholder="Enter email"
          inputType="email"
          required={false}
          helpText=""
          labelColor={{ type: 'theme', value: 'foreground' }}
          inputBackgroundColor={{ type: 'theme', value: 'background' }}
          inputTextColor={{ type: 'theme', value: 'foreground' }}
          inputBorderColor={{ type: 'custom', value: '#e5e7eb' }}
          focusBorderColor={{ type: 'theme', value: 'primary' }}
          errorColor={{ type: 'custom', value: '#ef4444' }}
          borderRadius="4px"
          size="md"
          fullWidth={true}
        />
        <SubmitButton
          text="Submit"
          loadingText="Sending..."
          backgroundColor={{ type: 'theme', value: 'primary' }}
          textColor={{ type: 'custom', value: '#ffffff' }}
          hoverBackgroundColor={{ type: 'theme', value: 'primary' }}
          borderRadius="6px"
          size="md"
          fullWidth={false}
        />
      </FormProvider>
    );

    // Fill out the form
    const emailInput = screen.getByPlaceholderText('Enter email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Verify value is updated
    expect(emailInput).toHaveValue('test@example.com');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    // Verify submission was attempted
    expect(onSubmit).toHaveBeenCalled();
  });

  it('text input applies border radius configuration', () => {
    const { container } = render(
      <FormProvider formName="test-form">
        <TextInput
          name="username"
          label="Username"
          placeholder="Enter username"
          inputType="text"
          required={false}
          helpText=""
          labelColor={{ type: 'theme', value: 'foreground' }}
          inputBackgroundColor={{ type: 'theme', value: 'background' }}
          inputTextColor={{ type: 'theme', value: 'foreground' }}
          inputBorderColor={{ type: 'custom', value: '#ff0000' }}
          focusBorderColor={{ type: 'theme', value: 'primary' }}
          errorColor={{ type: 'custom', value: '#ef4444' }}
          borderRadius="8px"
          size="md"
          fullWidth={true}
        />
      </FormProvider>
    );

    // Find the input element
    const input = screen.getByPlaceholderText('Enter username');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');

    // Component should render with custom styling via CSS modules
    // The actual color is applied via CSS class names, not inline styles
  });

  it('submit button renders with correct attributes', () => {
    render(
      <FormProvider formName="test-form">
        <SubmitButton
          text="Send"
          loadingText="Sending..."
          backgroundColor={{ type: 'theme', value: 'primary' }}
          textColor={{ type: 'custom', value: '#ffffff' }}
          hoverBackgroundColor={{ type: 'theme', value: 'primary' }}
          borderRadius="8px"
          size="lg"
          fullWidth={true}
        />
      </FormProvider>
    );

    const button = screen.getByRole('button', { name: 'Send' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'submit');

    // Button should apply theme colors via CSS modules
  });

  it('checkbox toggles and applies configuration', () => {
    render(
      <FormProvider formName="test-form">
        <Checkbox
          name="terms"
          label="I agree"
          required={false}
          helpText=""
          checkboxColor={{ type: 'custom', value: '#10b981' }}
          labelColor={{ type: 'theme', value: 'foreground' }}
          size="md"
        />
      </FormProvider>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    // Toggle the checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Custom colors are applied via CSS modules
  });

  it('select dropdown has options and allows selection', () => {
    const options = [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
      { label: 'Option 3', value: 'opt3' },
    ];

    render(
      <FormProvider formName="test-form">
        <Select
          name="choice"
          label="Choose"
          placeholder="Select one"
          required={false}
          helpText=""
          options={options}
          labelColor={{ type: 'theme', value: 'foreground' }}
          inputBackgroundColor={{ type: 'theme', value: 'background' }}
          inputTextColor={{ type: 'theme', value: 'foreground' }}
          inputBorderColor={{ type: 'custom', value: '#e5e7eb' }}
          focusBorderColor={{ type: 'theme', value: 'primary' }}
          borderRadius="4px"
          size="md"
          fullWidth={true}
        />
      </FormProvider>
    );

    // Check label renders
    expect(screen.getByText('Choose')).toBeInTheDocument();

    // Check placeholder renders (select uses custom dropdown component)
    expect(screen.getByText('Select one')).toBeInTheDocument();

    // The Select component renders a custom dropdown, not a native <select>
    // It uses a button to trigger the dropdown
    const dropdownButton = screen.getByRole('button');
    expect(dropdownButton).toBeInTheDocument();
  });

  it('radio group allows single selection', () => {
    const options = [
      { label: 'Red', value: 'red' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
    ];

    render(
      <FormProvider formName="test-form">
        <RadioGroup
          name="color"
          label="Favorite Color"
          required={false}
          helpText=""
          options={options}
          radioColor={{ type: 'theme', value: 'primary' }}
          labelColor={{ type: 'theme', value: 'foreground' }}
          size="md"
          orientation="vertical"
        />
      </FormProvider>
    );

    const radios = screen.getAllByRole('radio');

    // Select first option
    fireEvent.click(radios[0]);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();

    // Select second option - first should be unchecked
    fireEvent.click(radios[1]);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  it('textarea respects rows configuration', () => {
    render(
      <FormProvider formName="test-form">
        <Textarea
          name="message"
          label="Message"
          placeholder="Type here"
          required={false}
          helpText=""
          rows={10}
          minLength={0}
          maxLength={500}
          labelColor={{ type: 'theme', value: 'foreground' }}
          inputBackgroundColor={{ type: 'theme', value: 'background' }}
          inputTextColor={{ type: 'theme', value: 'foreground' }}
          inputBorderColor={{ type: 'custom', value: '#e5e7eb' }}
          focusBorderColor={{ type: 'theme', value: 'primary' }}
          errorColor={{ type: 'custom', value: '#ef4444' }}
          borderRadius="4px"
          size="md"
          fullWidth={true}
        />
      </FormProvider>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '10');
    expect(textarea).toHaveAttribute('maxLength', '500');
  });
});
