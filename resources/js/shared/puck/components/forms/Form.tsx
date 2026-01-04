import type { ComponentConfig } from '@measured/puck';
import { useCallback } from 'react';
import { FormProvider } from './FormContext';
import { useTheme } from '@/shared/hooks';
import {
  generatePaddingCSS,
  generateMarginCSS,
  generateWidthCSS,
  generateDisplayCSS,
  getDisplayBaseStyle,
  isResponsiveValue,
  BREAKPOINTS,
  type ResponsiveSpacingValue,
  type ResponsiveWidthValue,
  type ResponsiveDisplayValue,
  type ColorValue,
  type BorderValue,
  type ShadowValue,
  ColorPickerControl,
  ResponsiveDisplayControl,
  ResponsiveSpacingControl,
  ResponsiveWidthControl,
  BorderControl,
  ShadowControl,
} from '../../fields';

// ============================================================================
// Types
// ============================================================================

export interface FormProps {
  id?: string;
  formFields?: React.FC;
  formName: string;
  submitAction: 'email' | 'webhook' | 'none';
  emailTo?: string;
  webhookUrl?: string;
  successMessage: string;
  errorMessage: string;
  display?: ResponsiveDisplayValue;
  gap: string;
  direction: 'column' | 'row' | 'row-reverse' | 'column-reverse';
  justify: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  width?: ResponsiveWidthValue;
  backgroundColor: ColorValue;
  padding: ResponsiveSpacingValue;
  margin: ResponsiveSpacingValue;
  border?: BorderValue;
  shadow?: ShadowValue;
  puck?: { isEditing?: boolean; dragRef?: React.Ref<HTMLFormElement> };
}

// ============================================================================
// CSS Maps
// ============================================================================

const justifyMap: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
};

const alignMap: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', baseline: 'baseline',
};

const shadowPresets: Record<string, string> = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// ============================================================================
// Component
// ============================================================================

function FormComponent(props: FormProps) {
  const {
    id, formFields: FormFields, formName, submitAction, emailTo, webhookUrl,
    display, gap, direction, justify, align, width,
    backgroundColor, padding, margin, border, shadow, puck,
  } = props;

  const { resolve } = useTheme();
  const className = `form-${id}`;

  const resolveColor = useCallback((colorVal: ColorValue | undefined, fallback: string): string => {
    if (!colorVal) return fallback;
    if (colorVal.type === 'custom') return colorVal.value;
    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
    return resolve(val, fallback);
  }, [resolve]);

  const baseDisplay = getDisplayBaseStyle(display) || 'flex';
  const isFlexMode = baseDisplay === 'flex' || baseDisplay === 'inline-flex';

  const buildCSS = (): string => {
    const rules: string[] = [];

    const displayCSS = generateDisplayCSS(className, display);
    if (displayCSS) rules.push(displayCSS);

    if (isFlexMode) {
      rules.push(`.${className} {
  flex-direction: ${direction};
  justify-content: ${justifyMap[justify]};
  align-items: ${alignMap[align]};
  gap: ${gap}px;
}`);
    }

    if (display && isResponsiveValue(display)) {
      if (display.tablet === 'flex' || display.tablet === 'inline-flex') {
        rules.push(`@media (min-width: ${BREAKPOINTS.tablet}px) {
  .${className} { flex-direction: ${direction}; justify-content: ${justifyMap[justify]}; align-items: ${alignMap[align]}; gap: ${gap}px; }
}`);
      }
      if (display.desktop === 'flex' || display.desktop === 'inline-flex') {
        rules.push(`@media (min-width: ${BREAKPOINTS.desktop}px) {
  .${className} { flex-direction: ${direction}; justify-content: ${justifyMap[justify]}; align-items: ${alignMap[align]}; gap: ${gap}px; }
}`);
      }
    }

    const widthCSS = generateWidthCSS(className, width);
    if (widthCSS) rules.push(widthCSS);

    const paddingCSS = generatePaddingCSS(className, padding);
    if (paddingCSS) rules.push(paddingCSS);

    const marginCSS = generateMarginCSS(className, margin);
    if (marginCSS) rules.push(marginCSS);

    rules.push(`.${className} { background-color: ${resolveColor(backgroundColor, 'transparent')}; }`);

    if (border && border.style !== 'none') {
      rules.push(`.${className} { border: ${border.width}${border.unit} ${border.style} ${border.color}; border-radius: ${border.radius}${border.unit}; }`);
    }

    if (shadow && shadow.preset !== 'none') {
      const shadowValue = shadow.preset === 'custom' ? shadow.custom : shadowPresets[shadow.preset];
      if (shadowValue) rules.push(`.${className} { box-shadow: ${shadowValue}; }`);
    }

    if (puck?.isEditing) rules.push(`.${className} { min-height: 100px; }`);

    return rules.join('\n');
  };

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (puck?.isEditing) return;
    if (submitAction === 'none') { console.log('Form values:', values); return; }
    if (submitAction === 'email' && emailTo) {
      const response = await fetch('/api/form-submit/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, formName, values }),
      });
      if (!response.ok) throw new Error('Email submission failed');
    }
    if (submitAction === 'webhook' && webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formName, values, timestamp: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Webhook submission failed');
    }
  }, [submitAction, emailTo, webhookUrl, formName, puck?.isEditing]);

  return (
    <>
      <style>{buildCSS()}</style>
      <FormProvider onSubmit={handleSubmit}>
        <form ref={puck?.dragRef} className={className} onSubmit={(e) => e.preventDefault()}>
          {FormFields && <FormFields />}
        </form>
      </FormProvider>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const Form: ComponentConfig<FormProps> = {
  label: 'Form',
  inline: true,

  resolveFields: (data, { fields }) => {
    const displayValue = data.props.display;
    const baseDisplay = displayValue && typeof displayValue === 'object' && 'mobile' in displayValue
      ? displayValue.mobile : (displayValue || 'flex');
    const isFlexMode = baseDisplay === 'flex' || baseDisplay === 'inline-flex';

    if (!isFlexMode) {
      const flexFields = ['direction', 'justify', 'align', 'gap'];
      return Object.fromEntries(Object.entries(fields).filter(([key]) => !flexFields.includes(key))) as typeof fields;
    }
    return fields;
  },

  fields: {
    formFields: { type: 'slot', label: 'Form Fields', allow: ['TextInput', 'Textarea', 'Select', 'Checkbox', 'RadioGroup', 'SubmitButton'] },
    formName: { type: 'text', label: 'Form Name' },
    submitAction: { type: 'select', label: 'Submit Action', options: [{ label: 'None (Preview)', value: 'none' }, { label: 'Send Email', value: 'email' }, { label: 'Webhook', value: 'webhook' }] },
    emailTo: { type: 'text', label: 'Email To' },
    webhookUrl: { type: 'text', label: 'Webhook URL' },
    successMessage: { type: 'textarea', label: 'Success Message' },
    errorMessage: { type: 'textarea', label: 'Error Message' },
    display: { type: 'custom', label: 'Display', render: (props) => <ResponsiveDisplayControl {...props} field={{ label: 'Display' }} /> },
    direction: { type: 'select', label: 'Direction', options: [{ label: 'Column', value: 'column' }, { label: 'Row', value: 'row' }, { label: 'Row Reverse', value: 'row-reverse' }, { label: 'Column Reverse', value: 'column-reverse' }] },
    justify: { type: 'select', label: 'Justify Content', options: [{ label: 'Start', value: 'start' }, { label: 'End', value: 'end' }, { label: 'Center', value: 'center' }, { label: 'Space Between', value: 'between' }, { label: 'Space Around', value: 'around' }, { label: 'Space Evenly', value: 'evenly' }] },
    align: { type: 'select', label: 'Align Items', options: [{ label: 'Start', value: 'start' }, { label: 'End', value: 'end' }, { label: 'Center', value: 'center' }, { label: 'Stretch', value: 'stretch' }, { label: 'Baseline', value: 'baseline' }] },
    gap: { type: 'select', label: 'Gap', options: [{ label: 'None', value: '0' }, { label: '8px', value: '8' }, { label: '12px', value: '12' }, { label: '16px', value: '16' }, { label: '20px', value: '20' }, { label: '24px', value: '24' }, { label: '32px', value: '32' }] },
    width: { type: 'custom', label: 'Width', render: (props) => <ResponsiveWidthControl {...props} field={{ label: 'Width' }} /> },
    backgroundColor: { type: 'custom', label: 'Background Color', render: (props) => <ColorPickerControl {...props} value={props.value || { type: 'theme', value: 'transparent' }} onChange={props.onChange} /> },
    padding: { type: 'custom', label: 'Padding', render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Padding' }} /> },
    margin: { type: 'custom', label: 'Margin', render: (props) => <ResponsiveSpacingControl {...props} field={{ label: 'Margin' }} /> },
    border: { type: 'custom', label: 'Border', render: (props) => <BorderControl {...props} value={props.value || { width: '1', style: 'solid', color: '#e5e7eb', radius: '8', unit: 'px' }} onChange={props.onChange} /> },
    shadow: { type: 'custom', label: 'Shadow', render: (props) => <ShadowControl {...props} value={props.value || { preset: 'none' }} onChange={props.onChange} /> },
  },

  defaultProps: {
    formName: 'Contact Form',
    submitAction: 'none',
    emailTo: '',
    webhookUrl: '',
    successMessage: 'Thank you! Your submission has been received.',
    errorMessage: 'Something went wrong. Please try again.',
    display: { mobile: 'flex' },
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: '16',
    width: { mobile: { value: '100', unit: '%' } },
    backgroundColor: { type: 'theme', value: 'transparent' },
    padding: { mobile: { top: '24', right: '24', bottom: '24', left: '24', unit: 'px', linked: true } },
    margin: { mobile: { top: '0', right: 'auto', bottom: '0', left: 'auto', unit: 'px', linked: false } },
    border: { width: '1', style: 'solid', color: '#e5e7eb', radius: '8', unit: 'px' },
    shadow: { preset: 'none' },
  },

  render: (props) => <FormComponent {...props} />,
};

export default Form;
