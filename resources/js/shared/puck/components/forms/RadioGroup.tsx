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

interface RadioOption {
  label: string;
  value: string;
}

export interface RadioGroupProps {
  id?: string;
  // Field Settings
  name: string;
  label: string;
  helpText: string;
  required: boolean;

  // Options
  options: RadioOption[];

  // Layout
  direction: 'row' | 'column';
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;

  // Styling
  labelColor: ColorValue;
  radioColor: ColorValue;
  radioBorderColor: ColorValue;
  errorColor: ColorValue;

  // Size
  size: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Options Editor
// ============================================================================

interface OptionsEditorProps {
  value: RadioOption[];
  onChange: (options: RadioOption[]) => void;
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

function RadioGroupComponent(props: RadioGroupProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    name,
    label,
    helpText,
    required,
    options,
    direction,
    display,
    margin,
    labelColor,
    radioColor,
    radioBorderColor,
    errorColor,
    size,
    puck,
  } = props;

  const { resolve } = useTheme();
  const { value, error, onChange, onBlur } = useFormField(name);
  const className = `radiogroup-${id || name.replace(/\\s+/g, '-').toLowerCase()}`;

  // Helper to resolve color value
  const resolveColor = useCallback((colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    return resolve(colorVal.value, fallback);
  }, [resolve]);

  // Resolve colors
  const colors = useMemo(() => ({
    label: resolveColor(labelColor, 'inherit'),
    radio: resolveColor(radioColor, resolve('colors.primary', '#3b82f6')),
    border: resolveColor(radioBorderColor, '#d1d5db'),
    error: resolveColor(errorColor, '#ef4444'),
  }), [labelColor, radioColor, radioBorderColor, errorColor, resolveColor, resolve]);

  // Size variants
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { circle: 16, fontSize: '14px', labelSize: '13px', gap: 8 };
      case 'lg':
        return { circle: 24, fontSize: '18px', labelSize: '16px', gap: 12 };
      default:
        return { circle: 20, fontSize: '16px', labelSize: '14px', gap: 10 };
    }
  }, [size]);

  const groupId = useMemo(() =>
    `${className}-group`,
    [className]
  );

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
    rules.push(`.${className} { display: block; }`);

    // Group label
    rules.push(`.${className}-grouplabel {
  display: block;
  margin-bottom: 10px;
  font-size: ${sizeStyles.labelSize};
  font-weight: ${resolve('typography.fontWeight.medium', '500')};
  color: ${colors.label};
}
.${className}-required { margin-left: 4px; color: ${colors.error}; }`);

    // Options container
    rules.push(`.${className}-options {
  display: flex;
  flex-direction: ${direction};
  gap: ${direction === 'row' ? '20px' : '12px'};
  flex-wrap: wrap;
}`);

    // Option
    rules.push(`.${className}-option {
  display: flex;
  align-items: center;
  gap: ${sizeStyles.gap}px;
  cursor: pointer;
  font-size: ${sizeStyles.fontSize};
  color: ${colors.label};
}`);

    // Radio circle
    rules.push(`.${className}-radio {
  width: ${sizeStyles.circle}px;
  height: ${sizeStyles.circle}px;
  border-radius: 50%;
  border: 2px solid ${colors.border};
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.${className}-radio.selected { border-color: ${colors.radio}; }
.${className}-radio-inner {
  width: ${sizeStyles.circle * 0.5}px;
  height: ${sizeStyles.circle * 0.5}px;
  border-radius: 50%;
  background-color: ${colors.radio};
}`);

    // Hidden input
    rules.push(`.${className}-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}`);

    // Help/Error
    rules.push(`.${className}-error { margin-top: 4px; font-size: 13px; color: ${colors.error}; }
.${className}-help { margin-top: 4px; font-size: 13px; color: ${resolve('colors.muted', '#6b7280')}; }`);

    return rules.join('\n');
  };

  return (
    <>
      <style>{buildCSS()}</style>
      <div ref={puck?.dragRef} className={className} role="radiogroup" aria-labelledby={`${groupId}-label`}>
        {/* Group Label */}
        {label && (
          <div id={`${groupId}-label`} className={`${className}-grouplabel`}>
            {label}
            {required && <span className={`${className}-required`}>*</span>}
          </div>
        )}

        {/* Radio Options */}
        <div className={`${className}-options`}>
          {options?.map((option, index) => {
            const isSelected = value === option.value;
            const radioId = `${groupId}-${index}`;

            return (
              <label key={option.value} htmlFor={radioId} className={`${className}-option`}>
                {/* Custom Radio Circle */}
                <div className={`${className}-radio${isSelected ? ' selected' : ''}`}>
                  {isSelected && <div className={`${className}-radio-inner`} />}
                </div>

                {/* Hidden native radio */}
                <input
                  type="radio"
                  id={radioId}
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  required={required && index === 0}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={onBlur}
                  className={`${className}-input`}
                />

                {/* Label text */}
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>

        {/* Error & Help Text */}
        {error && <p className={`${className}-error`}>{error}</p>}
        {helpText && !error && <p className={`${className}-help`}>{helpText}</p>}
      </div>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const RadioGroup: ComponentConfig<RadioGroupProps> = {
  inline: true,
  label: 'Radio Group',

  fields: {
    name: {
      type: 'text',
      label: 'Field Name',
    },

    label: {
      type: 'text',
      label: 'Label',
    },

    helpText: {
      type: 'text',
      label: 'Help Text',
    },

    required: {
      type: 'radio',
      label: 'Required',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },

    options: {
      type: 'custom',
      label: 'Options',
      render: ({ value, onChange }) => (
        <OptionsEditor value={value} onChange={onChange} />
      ),
    },

    direction: {
      type: 'radio',
      label: 'Layout',
      options: [
        { label: 'Column', value: 'column' },
        { label: 'Row', value: 'row' },
      ],
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

    labelColor: {
      type: 'custom',
      label: 'Label Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'foreground' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    radioColor: {
      type: 'custom',
      label: 'Radio Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    radioBorderColor: {
      type: 'custom',
      label: 'Border Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'border' }, onChange } = props;
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
  },

  defaultProps: {
    name: 'radio_field',
    label: 'Choose an option',
    helpText: '',
    required: false,
    options: [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
      { label: 'Option 3', value: 'option_3' },
    ],
    direction: 'column',
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px', linked: false } },
    size: 'md',
    labelColor: { type: 'theme', value: 'foreground' },
    radioColor: { type: 'theme', value: 'primary' },
    radioBorderColor: { type: 'theme', value: 'border' },
    errorColor: { type: 'theme', value: 'destructive' },
  },

  render: (props) => <RadioGroupComponent {...props} />,
};

export default RadioGroup;
