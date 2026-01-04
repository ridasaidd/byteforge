import type { ComponentConfig } from '@measured/puck';
import { useMemo, useCallback } from 'react';
import { useFormField } from './FormContext';
import { useTheme } from '@/shared/hooks';
import {
  ColorPickerControl,
  ResponsiveDisplayControl,
  ResponsiveSpacingControl,
  generateDisplayCSS,
  generateMarginCSS,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveSpacingValue,
} from '../../fields';

// ============================================================================
// Types
// ============================================================================

export interface TextInputProps {
  id?: string;
  // Field Settings
  name: string;
  label: string;
  placeholder: string;
  inputType: 'text' | 'email' | 'tel' | 'number' | 'password';
  required: boolean;
  helpText: string;

  // Validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Layout
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;

  // Styling
  labelColor: ColorValue;
  inputBackgroundColor: ColorValue;
  inputTextColor: ColorValue;
  inputBorderColor: ColorValue;
  focusBorderColor: ColorValue;
  errorColor: ColorValue;
  borderRadius: string;

  // Size
  size: 'sm' | 'md' | 'lg';
  fullWidth: boolean;
}

// ============================================================================
// Component
// ============================================================================

function TextInputComponent(props: TextInputProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    name,
    label,
    placeholder,
    inputType,
    required,
    helpText,
    minLength,
    maxLength,
    display,
    margin,
    labelColor,
    inputBackgroundColor,
    inputTextColor,
    inputBorderColor,
    focusBorderColor,
    errorColor,
    borderRadius,
    size,
    fullWidth,
    puck,
  } = props;

  const { resolve } = useTheme();
  const { value, error, onChange, onBlur } = useFormField(name);
  const className = `textinput-${id || name.replace(/\s+/g, '-').toLowerCase()}`;

  // Helper to resolve color value
  const resolveColor = useCallback((colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    return resolve(colorVal.value, fallback);
  }, [resolve]);

  // Resolve colors
  const colors = useMemo(() => ({
    label: resolveColor(labelColor, 'inherit'),
    background: resolveColor(inputBackgroundColor, '#ffffff'),
    text: resolveColor(inputTextColor, '#000000'),
    border: resolveColor(inputBorderColor, '#e5e7eb'),
    focus: resolveColor(focusBorderColor, resolve('colors.primary', '#3b82f6')),
    error: resolveColor(errorColor, '#ef4444'),
  }), [labelColor, inputBackgroundColor, inputTextColor, inputBorderColor, focusBorderColor, errorColor, resolveColor, resolve]);

  // Size variants
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { padding: '8px 12px', fontSize: '14px', labelSize: '13px' };
      case 'lg':
        return { padding: '14px 18px', fontSize: '18px', labelSize: '16px' };
      default:
        return { padding: '10px 14px', fontSize: '16px', labelSize: '14px' };
    }
  }, [size]);

  const inputId = useMemo(() => `${className}-field`, [className]);

  // Build all CSS
  const buildCSS = (): string => {
    const rules: string[] = [];

    // Display (responsive)
    const displayCSS = generateDisplayCSS(className, display);
    if (displayCSS) rules.push(displayCSS);

    // Margin (responsive)
    const marginCSS = generateMarginCSS(className, margin);
    if (marginCSS) rules.push(marginCSS);

    // Container
    rules.push(`.${className} { width: ${fullWidth ? '100%' : 'auto'}; }`);

    // Label
    rules.push(`.${className}-label {
  display: block;
  margin-bottom: 6px;
  font-size: ${sizeStyles.labelSize};
  font-weight: ${resolve('typography.fontWeight.medium', '500')};
  color: ${colors.label};
}`);

    // Input
    rules.push(`.${className}-input {
  width: 100%;
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius}px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: ${colors.background};
  color: ${colors.text};
}
.${className}-input:focus {
  border-color: ${colors.focus};
  box-shadow: 0 0 0 3px ${colors.focus}20;
}
.${className}-input.error {
  border-color: ${colors.error};
}`);

    // Help/Error text
    rules.push(`.${className}-error { margin-top: 4px; font-size: 13px; color: ${colors.error}; }
.${className}-help { margin-top: 4px; font-size: 13px; color: ${resolve('colors.muted', '#6b7280')}; }
.${className}-required { margin-left: 4px; color: ${colors.error}; }`);

    return rules.join('\n');
  };

  return (
    <>
      <style>{buildCSS()}</style>
      <div ref={puck?.dragRef} className={className}>
        {label && (
          <label htmlFor={inputId} className={`${className}-label`}>
            {label}
            {required && <span className={`${className}-required`}>*</span>}
          </label>
        )}

        <input
          id={inputId}
          name={name}
          type={inputType}
          value={typeof value === 'string' || typeof value === 'number' ? value : ''}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${className}-input ${error ? 'error' : ''}`}
        />

        {error && <p className={`${className}-error`}>{error}</p>}
        {helpText && !error && <p className={`${className}-help`}>{helpText}</p>}
      </div>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const TextInput: ComponentConfig<TextInputProps> = {
  inline: true,
  label: 'Text Input',

  fields: {
    name: { type: 'text', label: 'Field Name' },
    label: { type: 'text', label: 'Label' },
    placeholder: { type: 'text', label: 'Placeholder' },
    inputType: {
      type: 'select',
      label: 'Input Type',
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'tel' },
        { label: 'Number', value: 'number' },
        { label: 'Password', value: 'password' },
      ],
    },
    required: { type: 'radio', label: 'Required', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
    helpText: { type: 'text', label: 'Help Text' },
    minLength: { type: 'number', label: 'Min Length' },
    maxLength: { type: 'number', label: 'Max Length' },
    size: { type: 'radio', label: 'Size', options: [{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
    fullWidth: { type: 'radio', label: 'Full Width', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
    display: { type: 'custom', label: 'Display', render: (props) => <ResponsiveDisplayControl {...props} field={{ label: 'Display' }} /> },
    margin: { type: 'custom', label: 'Margin', render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Margin' }} /> },
    labelColor: { type: 'custom', label: 'Label Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'foreground' }} onChange={props.onChange} /> },
    inputBackgroundColor: { type: 'custom', label: 'Input Background', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'background' }} onChange={props.onChange} /> },
    inputTextColor: { type: 'custom', label: 'Input Text Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'foreground' }} onChange={props.onChange} /> },
    inputBorderColor: { type: 'custom', label: 'Border Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'border' }} onChange={props.onChange} /> },
    focusBorderColor: { type: 'custom', label: 'Focus Border Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'primary' }} onChange={props.onChange} /> },
    errorColor: { type: 'custom', label: 'Error Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'destructive' }} onChange={props.onChange} /> },
    borderRadius: { type: 'select', label: 'Border Radius', options: [{ label: 'None', value: '0' }, { label: 'Small', value: '4' }, { label: 'Medium', value: '6' }, { label: 'Large', value: '8' }, { label: 'XL', value: '12' }] },
  },

  defaultProps: {
    name: 'field_name',
    label: 'Label',
    placeholder: 'Enter text...',
    inputType: 'text',
    required: false,
    helpText: '',
    minLength: undefined,
    maxLength: undefined,
    size: 'md',
    fullWidth: true,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } },
    labelColor: { type: 'theme', value: 'foreground' },
    inputBackgroundColor: { type: 'theme', value: 'background' },
    inputTextColor: { type: 'theme', value: 'foreground' },
    inputBorderColor: { type: 'theme', value: 'border' },
    focusBorderColor: { type: 'theme', value: 'primary' },
    errorColor: { type: 'theme', value: 'destructive' },
    borderRadius: '6',
  },

  render: (props) => <TextInputComponent {...props} />,
};

export default TextInput;
