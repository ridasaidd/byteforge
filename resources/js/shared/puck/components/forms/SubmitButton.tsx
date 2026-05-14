import type { ComponentConfig } from '@puckeditor/core';
import { useMemo, useCallback } from 'react';
import { useFormContext } from './FormContext';
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
} from './styleUtils';

// ============================================================================
// Types
// ============================================================================

export interface SubmitButtonProps {
  id?: string;
  // Content
  text: string;
  loadingText: string;

  // Layout
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;

  // Styling
  backgroundColor: ColorValue;
  textColor: ColorValue;
  hoverBackgroundColor: ColorValue;
  disabledBackgroundColor: ColorValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue | string;

  // Size
  size: 'sm' | 'md' | 'lg';
  fullWidth: boolean;

  // Icon
  showIcon: boolean;
  iconPosition: 'left' | 'right';
}

// ============================================================================
// Component
// ============================================================================

function SubmitButtonComponent(props: SubmitButtonProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const {
    id,
    text,
    loadingText,
    display,
    margin,
    backgroundColor,
    textColor,
    hoverBackgroundColor,
    disabledBackgroundColor,
    border,
    borderRadius,
    size,
    fullWidth,
    showIcon,
    iconPosition,
    puck,
  } = props;

  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const formContext = useFormContext();
  const className = `submitbutton-${id || 'button'}`;

  const isSubmitting = formContext?.isSubmitting || false;
  const isSubmitted = formContext?.isSubmitted || false;

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
    background: resolveColor(backgroundColor, resolve('colors.primary', '#3b82f6')),
    text: resolveColor(textColor, '#ffffff'),
    hover: resolveColor(hoverBackgroundColor, resolve('colors.primaryDark', '#2563eb')),
    disabled: resolveColor(disabledBackgroundColor, '#9ca3af'),
  }), [backgroundColor, textColor, hoverBackgroundColor, disabledBackgroundColor, resolveColor, resolve]);

  const buttonBorderValue = useMemo(
    () => border ?? createUniformBorder({ type: 'theme', value: 'border' }, '0', 'none'),
    [border]
  );
  const buttonBorderRadius = useMemo(
    () => normalizeLegacyBorderRadiusValue(borderRadius, '6'),
    [borderRadius]
  );

  // Size variants
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { padding: '8px 16px', fontSize: '14px', iconSize: 14 };
      case 'lg':
        return { padding: '12px 24px', fontSize: '18px', iconSize: 20 };
      default:
        return { padding: '10px 20px', fontSize: '16px', iconSize: 16 };
    }
  }, [size]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!formContext || isSubmitting || isSubmitted) return;

    try {
      await formContext.submit();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formContext, isSubmitting, isSubmitted]);

  // Display text
  const displayText = isSubmitting ? loadingText : text;

  // Build all CSS - no inline styles
  const css = isEditing ? (() => {
    const rules: string[] = [];

    // Layout CSS with responsive properties (applied directly to button)
    const layoutCss = buildLayoutCSS({
      className,
      display,
      margin,
      border: buttonBorderValue,
      borderRadius: buttonBorderRadius,
      resolveToken: resolve,
    });
    if (layoutCss) rules.push(layoutCss);

    // Button styles
    rules.push(`.${className} {
  ${fullWidth ? 'width: 100%;' : ''}
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: ${resolve('typography.fontWeight.medium', '500')};
  transition: all 0.2s;
  color: ${colors.text};
  background-color: ${colors.background};
}
.${className}:hover:not(:disabled) { background-color: ${colors.hover}; }
.${className}:disabled { cursor: not-allowed; opacity: 0.6; background-color: ${colors.disabled}; }
.${className} svg { display: block; flex-shrink: 0; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.${className}-spinner { animation: spin 1s linear infinite; }`);

    return rules.join('\n');
  })() : '';

  // Arrow icon
  const ArrowIcon = () => (
    <svg
      width={sizeStyles.iconSize}
      height={sizeStyles.iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  // Loading spinner
  const LoadingSpinner = () => (
    <svg
      width={sizeStyles.iconSize}
      height={sizeStyles.iconSize}
      viewBox="0 0 24 24"
      fill="none"
      className={`${className}-spinner`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="32"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      <button
        ref={puck?.dragRef}
        type="submit"
        disabled={isSubmitting || isSubmitted}
        onClick={handleSubmit}
        className={className}
      >
        {isSubmitting && <LoadingSpinner />}
        {showIcon && iconPosition === 'left' && !isSubmitting && <ArrowIcon />}
        <span>{displayText}</span>
        {showIcon && iconPosition === 'right' && !isSubmitting && <ArrowIcon />}
      </button>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const SubmitButton: ComponentConfig<SubmitButtonProps> = {
  inline: true,
  label: 'Submit Button',

  resolveData: ({ props }) => {
    const typedProps = props as Partial<SubmitButtonProps>;

    return {
      props: {
        ...typedProps,
        border: typedProps.border ?? createUniformBorder({ type: 'theme', value: 'border' }, '0', 'none'),
        borderRadius: normalizeLegacyBorderRadiusValue(typedProps.borderRadius, '6'),
      },
    };
  },

  resolveFields: (_data, { fields }) => fields,

  fields: {
    text: {
      type: 'text',
      label: 'Button Text',
    },

    loadingText: {
      type: 'text',
      label: 'Loading Text',
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

    showIcon: {
      type: 'radio',
      label: 'Show Arrow Icon',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },

    iconPosition: {
      type: 'radio',
      label: 'Icon Position',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },

    backgroundColor: {
      type: 'custom',
      label: 'Background Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    textColor: {
      type: 'custom',
      label: 'Text Color',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary-foreground' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    hoverBackgroundColor: {
      type: 'custom',
      label: 'Hover Background',
      render: (props) => {
        const { value = { type: 'theme', value: 'primary' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    disabledBackgroundColor: {
      type: 'custom',
      label: 'Disabled Background',
      render: (props) => {
        const { value = { type: 'theme', value: 'muted' }, onChange } = props;
        return <ColorPickerControl {...props} value={value} onChange={onChange} />;
      },
    },

    border: { ...effectsFields.border, label: 'Button Border' },

    borderRadius: createLegacyBorderRadiusField('Button Border Radius', DEFAULT_BORDER_RADIUS),
  },

  defaultProps: {
    text: 'Submit',
    loadingText: 'Submitting...',
    display: { mobile: 'block' },
    margin: { mobile: { top: '16', right: '0', bottom: '0', left: '0', unit: 'px', linked: false } },
    size: 'md',
    fullWidth: false,
    showIcon: true,
    iconPosition: 'right',
    backgroundColor: { type: 'theme', value: 'primary' },
    textColor: { type: 'theme', value: 'primary-foreground' },
    hoverBackgroundColor: { type: 'theme', value: 'primary' },
    disabledBackgroundColor: { type: 'theme', value: 'muted' },
    border: createUniformBorder({ type: 'theme', value: 'border' }, '0', 'none'),
    borderRadius: { ...DEFAULT_BORDER_RADIUS, topLeft: '6', topRight: '6', bottomRight: '6', bottomLeft: '6' },
  },

  render: (props) => <SubmitButtonComponent {...props} />,
};

export default SubmitButton;
