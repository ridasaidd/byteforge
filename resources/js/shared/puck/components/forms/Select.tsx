import type { ComponentConfig } from '@measured/puck';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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

interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  id?: string;
  // Field Settings
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  helpText: string;

  // Options
  options: SelectOption[];

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
// Options Editor Field Component
// ============================================================================

interface OptionsEditorProps {
  value: SelectOption[];
  onChange: (options: SelectOption[]) => void;
}

function OptionsEditor({ value, onChange }: OptionsEditorProps) {
  const options = value || [];

  const addOption = () => {
    onChange([...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }]);
  };

  const updateOption = (index: number, field: 'label' | 'value', newValue: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
        Options
      </label>

      {options.map((option, index) => (
        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={option.label}
            placeholder="Label"
            onChange={(e) => updateOption(index, 'label', e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
            }}
          />
          <input
            type="text"
            value={option.value}
            placeholder="Value"
            onChange={(e) => updateOption(index, 'value', e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={() => removeOption(index)}
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={addOption}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          background: '#f3f4f6',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        + Add Option
      </button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

function SelectComponent(props: SelectProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    name,
    label,
    placeholder,
    required,
    helpText,
    options,
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const className = `select-${id || name.replace(/\s+/g, '-').toLowerCase()}`;

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

  // Find selected option
  const selectedOption = options?.find(opt => opt.value === value);

  // Build all CSS - no inline styles
  const buildCSS = (): string => {
    const rules: string[] = [];

    // Display (responsive)
    const displayCSS = generateDisplayCSS(className, display);
    if (displayCSS) rules.push(displayCSS);

    // Margin (responsive)
    const marginCSS = generateMarginCSS(className, margin);
    if (marginCSS) rules.push(marginCSS);

    // Container
    rules.push(`.${className} {
  width: ${fullWidth ? '100%' : 'auto'};
  position: relative;
}`);

    // Label
    rules.push(`.${className}-label {
  display: block;
  margin-bottom: 6px;
  font-size: ${sizeStyles.labelSize};
  font-weight: ${resolve('typography.fontWeight.medium', '500')};
  color: ${colors.label};
}
.${className}-required { margin-left: 4px; color: ${colors.error}; }`);

    // Button
    rules.push(`.${className}-button {
  width: 100%;
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius}px;
  outline: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: ${colors.background};
  color: ${colors.text};
}
.${className}-button.open {
  border-color: ${colors.focus};
  box-shadow: 0 0 0 3px ${colors.focus}20;
}
.${className}-button.error { border-color: ${colors.error}; }
.${className}-button svg { transition: transform 0.2s; }
.${className}-button.open svg { transform: rotate(180deg); }
.${className}-placeholder { color: ${resolve('colors.muted', '#9ca3af')}; }`);

    // Dropdown
    rules.push(`.${className}-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius}px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 999;
  max-height: 200px;
  overflow-y: auto;
  background-color: ${colors.background};
}`);

    // Options
    rules.push(`.${className}-option {
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  cursor: pointer;
  background-color: transparent;
  color: ${colors.text};
}
.${className}-option:hover { background-color: ${colors.focus}10; }
.${className}-option.selected { background-color: ${colors.focus}10; }`);

    // Help/Error
    rules.push(`.${className}-error { margin-top: 4px; font-size: 13px; color: ${colors.error}; }
.${className}-help { margin-top: 4px; font-size: 13px; color: ${resolve('colors.muted', '#6b7280')}; }`);

    return rules.join('\n');
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  return (
    <>
      <style>{buildCSS()}</style>
      <div ref={puck?.dragRef || containerRef} className={className}>
        {label && (
          <label className={`${className}-label`}>
            {label}
            {required && <span className={`${className}-required`}>*</span>}
          </label>
        )}

        {/* Select Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${className}-button${isOpen ? ' open' : ''}${error ? ' error' : ''}`}
        >
          <span className={!selectedOption ? `${className}-placeholder` : ''}>
            {selectedOption?.label || placeholder}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && options && options.length > 0 && (
          <div className={`${className}-dropdown`}>
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`${className}-option${option.value === value ? ' selected' : ''}`}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className={`${className}-error`}>{error}</p>
        )}

        {helpText && !error && (
          <p className={`${className}-help`}>{helpText}</p>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const Select: ComponentConfig<SelectProps> = {
  inline: true,
  label: 'Select',

  fields: {
    name: {
      type: 'text',
      label: 'Field Name',
    },

    label: {
      type: 'text',
      label: 'Label',
    },

    placeholder: {
      type: 'text',
      label: 'Placeholder',
    },

    required: {
      type: 'radio',
      label: 'Required',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },

    helpText: {
      type: 'text',
      label: 'Help Text',
    },

    options: {
      type: 'custom',
      label: 'Options',
      render: ({ value, onChange }) => (
        <OptionsEditor value={value} onChange={onChange} />
      ),
    },

    display: {
      type: 'custom',
      label: 'Display',
      render: (props) => <ResponsiveDisplayControl field={{ label: 'Display' }} value={props.value} onChange={props.onChange} />,
    },

    margin: {
      type: 'custom',
      label: 'Margin',
      render: (props) => <ResponsiveSpacingControl field={{ label: 'Margin' }} value={props.value} onChange={props.onChange} />,
    },

    size: {
      type: 'radio',
      label: 'Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },

    fullWidth: {
      type: 'radio',
      label: 'Full Width',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },

    labelColor: {
      type: 'custom',
      label: 'Label Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'foreground' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    inputBackgroundColor: {
      type: 'custom',
      label: 'Select Background',
      render: (props) => {
        const { value = { type: 'theme', value: 'background' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    inputTextColor: {
      type: 'custom',
      label: 'Text Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'foreground' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    inputBorderColor: {
      type: 'custom',
      label: 'Border Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'border' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    focusBorderColor: {
      type: 'custom',
      label: 'Focus Border Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    errorColor: {
      type: 'custom',
      label: 'Error Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'destructive' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    borderRadius: {
      type: 'select',
      label: 'Border Radius',
      options: [
        { label: 'None', value: '0' },
        { label: 'Small', value: '4' },
        { label: 'Medium', value: '6' },
        { label: 'Large', value: '8' },
        { label: 'XL', value: '12' },
      ],
    },
  },

  defaultProps: {
    name: 'select_field',
    label: 'Select an option',
    placeholder: 'Choose...',
    required: false,
    helpText: '',
    options: [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
      { label: 'Option 3', value: 'option_3' },
    ],
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px', linked: false } },
    size: 'md',
    fullWidth: true,
    labelColor: { type: 'theme', value: 'foreground' },
    inputBackgroundColor: { type: 'theme', value: 'background' },
    inputTextColor: { type: 'theme', value: 'foreground' },
    inputBorderColor: { type: 'theme', value: 'border' },
    focusBorderColor: { type: 'theme', value: 'primary' },
    errorColor: { type: 'theme', value: 'destructive' },
    borderRadius: '6',
  },

  render: (props) => <SelectComponent {...props} />,
};

export default Select;
