import type { ComponentConfig } from '@puckeditor/core';
import { useCallback, useState } from 'react';
import { FormProvider, useFormContext } from './FormContext';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import {
  buildLayoutCSS,
  extractDefaults,
  displayField,
  flexLayoutFields,
  layoutFields,
  backgroundFields,
  spacingFields,
  effectsFields,
  DEFAULT_BORDER_RADIUS,
  type BorderRadiusValue,
  type ResponsiveGapValue,
  type ResponsiveFlexDirectionValue,
  type ResponsiveSpacingValue,
  type ResponsiveWidthValue,
  type ResponsiveDisplayValue,
  type ColorValue,
  type BorderValue,
  type ShadowValue,
} from '../../fields';
import { createUniformBorder } from './styleUtils';

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
  flexGap?: ResponsiveGapValue;
  gap?: string;
  direction?: ResponsiveFlexDirectionValue | 'column' | 'row' | 'row-reverse' | 'column-reverse';
  justify: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  width?: ResponsiveWidthValue;
  backgroundColor: ColorValue;
  padding: ResponsiveSpacingValue;
  margin: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  puck?: { isEditing?: boolean; dragRef?: React.Ref<HTMLFormElement> };
}

function normalizeLegacyFlexGap(
  flexGap?: ResponsiveGapValue,
  legacyGap?: string
): ResponsiveGapValue | undefined {
  if (flexGap) return flexGap;
  if (!legacyGap) return undefined;

  return {
    mobile: {
      value: String(legacyGap),
      unit: 'px',
    },
  };
}

const formLayoutFields = {
  ...displayField,
  direction: flexLayoutFields.direction,
  justify: flexLayoutFields.justify,
  align: flexLayoutFields.align,
  flexGap: flexLayoutFields.flexGap,
  width: layoutFields.width,
};

const formStyleFields = {
  ...backgroundFields,
  padding: spacingFields.padding,
  margin: spacingFields.margin,
  border: effectsFields.border,
  borderRadius: effectsFields.borderRadius,
  shadow: effectsFields.shadow,
};

// ============================================================================
// CSS Maps
// ============================================================================

// ============================================================================
// Component
// ============================================================================

interface FormContentProps {
  className: string;
  FormFields?: React.FC;
  successMessage: string;
  errorMessage: string;
  isEditing: boolean;
  dragRef?: React.Ref<HTMLFormElement>;
  honeypotValue: string;
  onHoneypotChange: (value: string) => void;
}

function FormContent({ className, FormFields, successMessage, errorMessage, isEditing, dragRef, honeypotValue, onHoneypotChange }: FormContentProps) {
  const formContext = useFormContext();
  const submitError = formContext?.submitError;
  const isSubmitted = formContext?.isSubmitted;
  const statusVariant = submitError ? 'error' : isSubmitted ? 'success' : null;
  const statusMessage = submitError
    ? (errorMessage || submitError)
    : isSubmitted
      ? successMessage
      : null;

  return (
    <form ref={dragRef} className={className} onSubmit={(e) => e.preventDefault()}>
      {!isEditing && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-10000px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          <label htmlFor={`${className}-website`}>Website</label>
          <input
            id={`${className}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypotValue}
            onChange={(event) => onHoneypotChange(event.target.value)}
          />
        </div>
      )}
      {FormFields && <FormFields />}
      {!isEditing && statusVariant && statusMessage && (
        <div
          role={statusVariant === 'error' ? 'alert' : 'status'}
          aria-live={statusVariant === 'error' ? 'assertive' : 'polite'}
          className={`${className}-status ${className}-status-${statusVariant}`}
        >
          {statusMessage}
        </div>
      )}
    </form>
  );
}

function FormComponent(props: FormProps) {
  const {
    id, formFields: FormFields, formName, submitAction, emailTo, webhookUrl,
    successMessage, errorMessage,
    display, flexGap, gap, direction, justify, align, width,
    backgroundColor, padding, margin, border, borderRadius, shadow, puck,
  } = props;

  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const className = `form-${id || 'unknown'}`;
  const [honeypotValue, setHoneypotValue] = useState('');
  const normalizedFlexGap = normalizeLegacyFlexGap(flexGap, gap);

  const resolveColor = useCallback((colorVal: ColorValue | undefined, fallback: string): string => {
    try {
      if (!colorVal) return fallback;
      if (colorVal.type === 'custom') return colorVal.value;
      const val = colorVal.value;
      if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;
      return resolve(val, fallback);
    } catch (err) {
      console.warn('Error resolving color:', err, colorVal);
      return fallback;
    }
  }, [resolve]);

  // Build all CSS using buildLayoutCSS
  const css = isEditing ? (() => {
    const rules: string[] = [];

    // Resolve background color
    const resolvedBgColor = resolveColor(backgroundColor, 'transparent');

    // Use buildLayoutCSS for comprehensive layout styling
    const layoutCss = buildLayoutCSS({
      className,
      display,
      width,
      padding,
      margin,
      border,
      borderRadius,
      shadow,
      backgroundColor: resolvedBgColor,
      // Flex properties
      direction,
      justify,
      align,
      flexGap: normalizedFlexGap,
    });
    if (layoutCss) rules.push(layoutCss);

    // Add min-height for editor
    if (puck?.isEditing) {
      rules.push(`.${className} { min-height: 100px; }`);
    }

    return rules.join('\\n');
  })() : '';

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (puck?.isEditing) return;
    if (submitAction === 'none') { console.log('Form values:', values); return; }
    if (submitAction === 'email' && emailTo) {
      const response = await fetch('/api/form-submit/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, formName, website: honeypotValue, values }),
      });
      if (!response.ok) throw new Error('Email submission failed');
    }
    if (submitAction === 'webhook' && webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formName, website: honeypotValue, values, timestamp: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Webhook submission failed');
    }
  }, [submitAction, emailTo, webhookUrl, formName, honeypotValue, puck?.isEditing]);

  return (
    <>
      {isEditing && css && <style>{css}</style>}
      <FormProvider onSubmit={handleSubmit}>
        <FormContent
          className={className}
          FormFields={FormFields}
          successMessage={successMessage}
          errorMessage={errorMessage}
          isEditing={isEditing}
          dragRef={puck?.dragRef}
          honeypotValue={honeypotValue}
          onHoneypotChange={setHoneypotValue}
        />
      </FormProvider>
    </>
  );
}

// ============================================================================
// Config
// ============================================================================

export const Form: ComponentConfig<FormProps> = {
  label: 'Contact Form',
  inline: true,

  resolveData: ({ props }) => {
    const typedProps = props as Partial<FormProps>;
    const nextProps: Partial<FormProps> & { gap?: string } = {
      ...typedProps,
      flexGap: normalizeLegacyFlexGap(typedProps.flexGap, typedProps.gap),
    };

    delete nextProps.gap;

    return { props: nextProps };
  },

  resolveFields: (data, { fields }) => {
    const displayValue = data.props.display;
    const baseDisplay = displayValue && typeof displayValue === 'object' && 'mobile' in displayValue
      ? displayValue.mobile : (displayValue || 'flex');
    const isFlexMode = baseDisplay === 'flex' || baseDisplay === 'inline-flex';

    if (!isFlexMode) {
      const flexFields = ['direction', 'justify', 'align', 'flexGap'];
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
    ...formLayoutFields,
    ...formStyleFields,
  },

  defaultProps: {
    formName: 'Contact Form',
    submitAction: 'none',
    emailTo: '',
    webhookUrl: '',
    successMessage: 'Thank you! Your submission has been received.',
    errorMessage: 'Something went wrong. Please try again.',
    ...extractDefaults(formLayoutFields, formStyleFields),
    display: { mobile: 'flex' },
    direction: { mobile: 'column' },
    justify: 'start',
    align: 'stretch',
    flexGap: { mobile: { value: '16', unit: 'px' } },
    backgroundColor: { type: 'theme', value: 'transparent' },
    padding: { mobile: { top: '24', right: '24', bottom: '24', left: '24', unit: 'px', linked: true } },
    margin: { mobile: { top: '0', right: 'auto', bottom: '0', left: 'auto', unit: 'px', linked: false } },
    border: createUniformBorder({ type: 'theme', value: 'border' }),
    borderRadius: DEFAULT_BORDER_RADIUS,
    shadow: { preset: 'none' },
  },

  render: (props) => <FormComponent {...props} />,
};

export default Form;
