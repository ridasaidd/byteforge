import type { ComponentConfig } from '@puckeditor/core';
import { useMemo, useCallback } from 'react';
import { useFormField } from './FormContext';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import {
  ColorPickerControlColorful as ColorPickerControl,
  ResponsiveDisplayControl,
  ResponsiveSpacingControl,
  buildLayoutCSS,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveSpacingValue,
} from '../../fields';

// ============================================================================
// Types
// ============================================================================

export interface TextareaProps {
  id?: string;
  // Field Settings
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  helpText: string;

  // Size
  rows: number;
  resize: 'none' | 'vertical' | 'horizontal' | 'both';

  // Validation
  minLength?: number;
  maxLength?: number;

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

  // Size variant
  size: 'sm' | 'md' | 'lg';
  fullWidth: boolean;
}

// ============================================================================
// Component
// ============================================================================

function TextareaComponent(props: TextareaProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    name,
    label,
    placeholder,
    required,
    helpText,
    rows,
    resize,
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
  const isEditing = usePuckEditMode();
  const { value, error, onChange, onBlur } = useFormField(name);
  const className = `textarea-${id || name.replace(/\s+/g, '-').toLowerCase()}`;

  // Helper to resolve color value
  const resolveColor = useCallback((colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
    return resolve(val, fallback);
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

  // Unique ID
  const textareaId = useMemo(() =>
    `${className}-field`,
    [className]
  );

  // Normalize value to string
  const stringValue = typeof value === 'string' ? value : String(value ?? '');

  // Character count
  const charCount = stringValue.length || 0;
  const showCharCount = maxLength && maxLength > 0;

  // Build all CSS - no inline styles
  const css = isEditing ? (() => {
    const rules: string[] = [];

    // Layout CSS with responsive properties
    const layoutCss = buildLayoutCSS({
      className,
      display,
      margin,
    });
    if (layoutCss) rules.push(layoutCss);

    // Container width
    rules.push(`.${className} { width: ${fullWidth ? '100%' : 'auto'}; }`);

    // Label
    rules.push(`.${className}-label {
  display: block;
  margin-bottom: 6px;
  font-size: ${sizeStyles.labelSize};
  font-weight: ${resolve('typography.fontWeight.medium', '500')};
  color: ${colors.label};
}`);

    // Textarea
    rules.push(`.${className}-textarea {
  width: 100%;
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius}px;
  outline: none;
  resize: ${resize};
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  background-color: ${colors.background};
  color: ${colors.text};
}
.${className}-textarea:focus {
  border-color: ${colors.focus};
  box-shadow: 0 0 0 3px ${colors.focus}20;
}
.${className}-textarea.error {
  border-color: ${colors.error};
}`);

    // Footer and help/error text
    rules.push(`.${className}-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 4px;
}
.${className}-footer-content { flex: 1; }
.${className}-error { font-size: 13px; color: ${colors.error}; margin: 0; }
.${className}-help { font-size: 13px; color: ${resolve('colors.muted', '#6b7280')}; margin: 0; }
.${className}-char-count { margin-left: 8px; font-size: 12px; white-space: nowrap; margin: 0; }
.${className}-required { margin-left: 4px; color: ${colors.error}; }`);

    return rules.join('\n');
  })() : '';

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      <div ref={puck?.dragRef} className={className}>
        {label && (
          <label
            htmlFor={textareaId}
            className={`${className}-label`}
          >
            {label}
            {required && <span className={`${className}-required`}>*</span>}
          </label>
        )}

        <textarea
          id={textareaId}
          name={name}
          value={stringValue}
          placeholder={placeholder}
          required={required}
          rows={rows}
          minLength={minLength}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${className}-textarea${error ? ' error' : ''}`}
        />

        <div className={`${className}-footer`}>
          <div className={`${className}-footer-content`}>
            {error && (
              <p className={`${className}-error`}>
                {error}
              </p>
            )}

            {helpText && !error && (
              <p className={`${className}-help`}>
                {helpText}
              </p>
            )}
          </div>

          {showCharCount && (
            <p
              className={`${className}-char-count`}
              style={{
                color: charCount >= maxLength ? colors.error : resolve('colors.muted', '#6b7280'),
              }}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const Textarea: ComponentConfig<TextareaProps> = {
  inline: true,
  label: 'Textarea',

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

    rows: {
      type: 'number',
      label: 'Rows',
      min: 2,
      max: 20,
    },

    resize: {
      type: 'select',
      label: 'Resize',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Both', value: 'both' },
      ],
    },

    minLength: {
      type: 'number',
      label: 'Min Length',
    },

    maxLength: {
      type: 'number',
      label: 'Max Length',
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
      label: 'Input Background',
      render: (props) => {
        const { value = { type: 'theme', value: 'background' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    inputTextColor: {
      type: 'custom',
      label: 'Input Text Color',
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
    name: 'message',
    label: 'Message',
    placeholder: 'Enter your message...',
    required: false,
    helpText: '',
    minLength: undefined,
    maxLength: undefined,
    rows: 4,
    resize: 'vertical',
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

  render: (props) => <TextareaComponent {...props} />,
};

export default Textarea;
