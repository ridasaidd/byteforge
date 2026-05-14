import type { ComponentConfig } from '@puckeditor/core';
import { useMemo, useCallback } from 'react';
import { useFormField } from './FormContext';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import {
  DEFAULT_BORDER_RADIUS,
  ColorPickerControlColorful as ColorPickerControl,
  ResponsiveDisplayControl,
  ResponsiveSpacingControl,
  effectsFields,
  buildLayoutCSS,
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ResponsiveDisplayValue,
  type ResponsiveSpacingValue,
} from '../../fields';
import {
  createLegacyBorderRadiusField,
  createUniformBorder,
  normalizeLegacyBorderRadiusValue,
  normalizeLegacyBorderValue,
} from './styleUtils';

// ============================================================================
// Types
// ============================================================================

export interface CheckboxProps {
  id?: string;
  // Field Settings
  name: string;
  label: string;
  helpText: string;
  required: boolean;

  // Layout
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;

  // Styling
  labelColor: ColorValue;
  checkboxColor: ColorValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue | string;
  checkboxBorderColor?: ColorValue;
  checkmarkColor: ColorValue;
  errorColor: ColorValue;

  // Size
  size: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Component
// ============================================================================

function CheckboxComponent(props: CheckboxProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    name,
    label,
    helpText,
    required,
    display,
    margin,
    labelColor,
    checkboxColor,
    border,
    borderRadius,
    checkboxBorderColor,
    checkmarkColor,
    errorColor,
    size,
    puck,
  } = props;

  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const { value, error, onChange, onBlur } = useFormField(name);
  const className = `checkbox-${id || name.replace(/\s+/g, '-').toLowerCase()}`;

  const isChecked = Boolean(value);

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
    checkbox: resolveColor(checkboxColor, resolve('colors.primary', '#3b82f6')),
    checkmark: resolveColor(checkmarkColor, '#ffffff'),
    error: resolveColor(errorColor, '#ef4444'),
  }), [labelColor, checkboxColor, checkmarkColor, errorColor, resolveColor, resolve]);

  const checkboxBorderValue = useMemo(
    () => normalizeLegacyBorderValue(border, checkboxBorderColor, { type: 'theme', value: 'border' }, '2'),
    [border, checkboxBorderColor]
  );
  const checkboxBorderRadius = useMemo(
    () => normalizeLegacyBorderRadiusValue(borderRadius, '4'),
    [borderRadius]
  );

  // Size variants
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { box: 16, fontSize: '14px', gap: 8 };
      case 'lg':
        return { box: 24, fontSize: '18px', gap: 12 };
      default:
        return { box: 20, fontSize: '16px', gap: 10 };
    }
  }, [size]);

  const checkboxId = useMemo(() =>
    `${className}-field`,
    [className]
  );

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

    const checkboxBorderCss = buildLayoutCSS({
      className: `${className}-box`,
      border: checkboxBorderValue,
      borderRadius: checkboxBorderRadius,
      resolveToken: resolve,
    });
    if (checkboxBorderCss) rules.push(checkboxBorderCss);

    // Container
    rules.push(`.${className} { display: block; }`);

    // Label wrapper
    rules.push(`.${className}-label {
  display: flex;
  align-items: flex-start;
  gap: ${sizeStyles.gap}px;
  cursor: pointer;
  font-size: ${sizeStyles.fontSize};
  color: ${colors.label};
}`);

    // Checkbox box
    rules.push(`.${className}-box {
  width: ${sizeStyles.box}px;
  height: ${sizeStyles.box}px;
  min-width: ${sizeStyles.box}px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-top: 2px;
  background-color: transparent;
}
.${className}-box.checked {
  border-color: ${colors.checkbox};
  background-color: ${colors.checkbox};
}`);

    // Hidden input
    rules.push(`.${className}-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}`);

    // Help/Error
    rules.push(`.${className}-error {
  margin-top: 4px;
  margin-left: ${sizeStyles.box + sizeStyles.gap}px;
  font-size: 13px;
  color: ${colors.error};
}
.${className}-help { margin: 4px 0 0 0; font-size: 13px; font-weight: normal; color: ${resolve('colors.muted', '#6b7280')}; }
.${className}-required { margin-left: 4px; color: ${colors.error}; }`);

    return rules.join('\n');
  })() : '';

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      <div ref={puck?.dragRef} className={className}>
        <label htmlFor={checkboxId} className={`${className}-label`}>
          {/* Custom Checkbox */}
          <div className={`${className}-box${isChecked ? ' checked' : ''}`}>
            {isChecked && (
              <svg
                width={sizeStyles.box * 0.6}
                height={sizeStyles.box * 0.6}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.checkmark}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          {/* Hidden native checkbox for accessibility */}
          <input
            type="checkbox"
            id={checkboxId}
            name={name}
            checked={isChecked}
            required={required}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            className={`${className}-input`}
          />

          {/* Label text */}
          <div>
            <span>
              {label}
              {required && <span className={`${className}-required`}>*</span>}
            </span>

            {helpText && (
              <p className={`${className}-help`}>{helpText}</p>
            )}
          </div>
        </label>

        {error && (
          <p className={`${className}-error`}>{error}</p>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const Checkbox: ComponentConfig<CheckboxProps> = {
  inline: true,
  label: 'Checkbox',

  resolveData: ({ props }) => {
    const typedProps = props as Partial<CheckboxProps>;

    return {
      props: {
        ...typedProps,
        border: normalizeLegacyBorderValue(typedProps.border, typedProps.checkboxBorderColor, { type: 'theme', value: 'border' }, '2'),
        borderRadius: normalizeLegacyBorderRadiusValue(typedProps.borderRadius, '4'),
      },
    };
  },

  resolveFields: (_data, { fields }) => fields,

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

    checkboxColor: {
      type: 'custom',
      label: 'Checkbox Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    border: { ...effectsFields.border, label: 'Checkbox Border' },

    borderRadius: createLegacyBorderRadiusField('Checkbox Border Radius', DEFAULT_BORDER_RADIUS),

    checkmarkColor: {
      type: 'custom',
      label: 'Checkmark Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary-foreground' }, onChange } = props;
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
    name: 'checkbox_field',
    label: 'I agree to the terms and conditions',
    helpText: '',
    required: false,
    display: { mobile: 'block' },
    margin: { mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px', linked: false } },
    size: 'md',
    labelColor: { type: 'theme', value: 'foreground' },
    checkboxColor: { type: 'theme', value: 'primary' },
    border: createUniformBorder({ type: 'theme', value: 'border' }, '2'),
    borderRadius: { ...DEFAULT_BORDER_RADIUS, topLeft: '4', topRight: '4', bottomRight: '4', bottomLeft: '4' },
    checkmarkColor: { type: 'theme', value: 'primary-foreground' },
    errorColor: { type: 'theme', value: 'destructive' },
  },

  render: (props) => <CheckboxComponent {...props} />,
};

export default Checkbox;
