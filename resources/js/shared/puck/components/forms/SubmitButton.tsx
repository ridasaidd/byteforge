import type { ComponentConfig } from '@measured/puck';
import { useMemo, useCallback } from 'react';
import { useFormContext } from './FormContext';
import { useTheme } from '@/shared/hooks';
import {
  ColorPickerControlColorful as ColorPickerControl,
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
  borderRadius: string;

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
    borderRadius,
    size,
    fullWidth,
    showIcon,
    iconPosition,
    puck,
  } = props;

  const { resolve } = useTheme();
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
  const buildCSS = (): string => {
    const rules: string[] = [];

    // Display (responsive) - applied directly to button
    const displayCSS = generateDisplayCSS(className, display);
    if (displayCSS) rules.push(displayCSS);

    // Margin (responsive) - applied directly to button
    const marginCSS = generateMarginCSS(className, margin);
    if (marginCSS) rules.push(marginCSS);

    // Button styles
    rules.push(`.${className} {
  ${fullWidth ? 'width: 100%;' : ''}
  padding: ${sizeStyles.padding};
  font-size: ${sizeStyles.fontSize};
  border: none;
  border-radius: ${borderRadius}px;
  cursor: pointer;
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
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.${className}-spinner { animation: spin 1s linear infinite; }`);

    return rules.join('\n');
  };

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
      <style>{buildCSS()}</style>
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

    borderRadius: {
      type: 'select',
      label: 'Border Radius',
      options: [
        { label: 'None', value: '0' },
        { label: 'Small', value: '4' },
        { label: 'Medium', value: '6' },
        { label: 'Large', value: '8' },
        { label: 'XL', value: '12' },
        { label: 'Full', value: '9999' },
      ],
    },
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
    borderRadius: '6',
  },

  render: (props) => <SubmitButtonComponent {...props} />,
};

export default SubmitButton;
