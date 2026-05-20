import type { ComponentConfig } from '@puckeditor/core';
import { useId, useState, type CSSProperties, type FormEvent } from 'react';
import { usePuckEditMode, useTheme } from '@/shared/hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  extractDefaults,
  createColorField,
  type ColorValue,
} from '../../fields';
import { publicQuotesApi } from '@/shared/services/api/publicQuotes';

export interface QuoteRequestWidgetProps {
  id?: string;
  title: string;
  description: string;
  serviceId: number;
  showPhoneField: boolean;
  showSubjectField: boolean;
  submitButtonText: string;
  successMessage: string;
  errorMessage: string;
  editorPreviewText: string;
  maxWidth: string;
  sectionBackgroundColor?: ColorValue;
  cardBackgroundColor?: ColorValue;
  borderColor?: ColorValue;
  headingColor?: ColorValue;
  textColor?: ColorValue;
  mutedColor?: ColorValue;
  inputBackgroundColor?: ColorValue;
  inputBorderColor?: ColorValue;
  inputTextColor?: ColorValue;
  buttonBackgroundColor?: ColorValue;
  buttonTextColor?: ColorValue;
  puck?: { dragRef?: ((element: Element | null) => void) | null };
}

function resolveColor(value: ColorValue | undefined, resolver: (path: string, fallback?: string) => string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (value.type === 'custom') {
    return value.value || fallback;
  }

  const token = value.value;

  if (!token) {
    return fallback;
  }

  if (token.startsWith('#') || token.startsWith('rgb') || token.startsWith('var(')) {
    return token;
  }

  return resolver(token, fallback);
}

function QuoteRequestWidgetComponent({
  title,
  description,
  serviceId,
  showPhoneField,
  showSubjectField,
  submitButtonText,
  successMessage,
  errorMessage,
  editorPreviewText,
  maxWidth,
  sectionBackgroundColor,
  cardBackgroundColor,
  borderColor,
  headingColor,
  textColor,
  mutedColor,
  inputBackgroundColor,
  inputBorderColor,
  inputTextColor,
  buttonBackgroundColor,
  buttonTextColor,
  puck,
}: QuoteRequestWidgetProps) {
  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const fieldId = useId();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [subjectLabel, setSubjectLabel] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [preferredStartAt, setPreferredStartAt] = useState('');
  const [preferredEndAt, setPreferredEndAt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const colors = {
    sectionBackground: resolveColor(sectionBackgroundColor, resolve, '#f8fafc'),
    cardBackground: resolveColor(cardBackgroundColor, resolve, '#ffffff'),
    border: resolveColor(borderColor, resolve, 'rgba(15, 23, 42, 0.1)'),
    heading: resolveColor(headingColor, resolve, '#0f172a'),
    text: resolveColor(textColor, resolve, '#334155'),
    muted: resolveColor(mutedColor, resolve, '#64748b'),
    inputBackground: resolveColor(inputBackgroundColor, resolve, '#ffffff'),
    inputBorder: resolveColor(inputBorderColor, resolve, '#cbd5e1'),
    inputText: resolveColor(inputTextColor, resolve, '#0f172a'),
    buttonBackground: resolveColor(buttonBackgroundColor, resolve, '#0f172a'),
    buttonText: resolveColor(buttonTextColor, resolve, '#ffffff'),
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isEditing) {
      return;
    }

    try {
      setIsSubmitting(true);
      setRuntimeError(null);

      await publicQuotesApi.createRequest({
        requested_booking_service_id: serviceId > 0 ? serviceId : null,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_phone: showPhoneField && guestPhone.trim() !== '' ? guestPhone.trim() : null,
        subject_label: showSubjectField && subjectLabel.trim() !== '' ? subjectLabel.trim() : null,
        request_description: requestDescription.trim(),
        preferred_start_at: preferredStartAt || null,
        preferred_end_at: preferredEndAt || null,
        attachments,
      });

      setSubmitted(true);
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      setSubjectLabel('');
      setRequestDescription('');
      setPreferredStartAt('');
      setPreferredEndAt('');
      setAttachments([]);
      setAttachmentInputKey((value) => value + 1);
    } catch (submissionError) {
      setRuntimeError(submissionError instanceof Error ? submissionError.message : errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={puck?.dragRef ?? undefined}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px',
        background: colors.sectionBackground,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          borderRadius: '28px',
          border: `1px solid ${colors.border}`,
          background: colors.cardBackground,
          padding: '28px',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: colors.muted }}>
            Estimate request
          </p>
          <h2 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.05, color: colors.heading }}>
            {title}
          </h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: colors.text }}>
            {description}
          </p>
          {serviceId > 0 ? (
            <p style={{ margin: 0, fontSize: '0.95rem', color: colors.muted }}>
              This widget will attach the request to service #{serviceId}.
            </p>
          ) : null}
          {isEditing ? (
            <p style={{ margin: 0, fontSize: '0.95rem', color: colors.muted }}>
              {editorPreviewText}
            </p>
          ) : null}
        </div>

        {submitted ? (
          <div
            style={{
              borderRadius: '20px',
              border: `1px solid ${colors.border}`,
              background: colors.sectionBackground,
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: colors.heading }}>Request received</h3>
            <p style={{ margin: 0, color: colors.text }}>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-full-name`} style={{ color: colors.text }}>
                Full name
              </Label>
              <Input
                id={`${fieldId}-full-name`}
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                required
                disabled={isSubmitting || isEditing}
                style={inputStyle(colors)}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-email`} style={{ color: colors.text }}>
                Email address
              </Label>
              <Input
                id={`${fieldId}-email`}
                type="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                required
                disabled={isSubmitting || isEditing}
                style={inputStyle(colors)}
              />
            </div>

            {showPhoneField ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                <Label htmlFor={`${fieldId}-phone`} style={{ color: colors.text }}>
                  Phone number
                </Label>
                <Input
                  id={`${fieldId}-phone`}
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  disabled={isSubmitting || isEditing}
                  style={inputStyle(colors)}
                />
              </div>
            ) : null}

            {showSubjectField ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                <Label htmlFor={`${fieldId}-subject`} style={{ color: colors.text }}>
                  Request subject
                </Label>
                <Input
                  id={`${fieldId}-subject`}
                  type="text"
                  value={subjectLabel}
                  onChange={(event) => setSubjectLabel(event.target.value)}
                  disabled={isSubmitting || isEditing}
                  style={inputStyle(colors)}
                />
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-request-description`} style={{ color: colors.text }}>
                Tell us what you need
              </Label>
              <Textarea
                id={`${fieldId}-request-description`}
                value={requestDescription}
                onChange={(event) => setRequestDescription(event.target.value)}
                required
                rows={5}
                disabled={isSubmitting || isEditing}
                style={{ ...inputStyle(colors), resize: 'vertical', minHeight: '140px' }}
              />
            </div>

            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: colors.muted }}>
              Optional preferred dates help the service provider review availability first. Final appointment suggestions should still come from the provider after they assess the request.
            </p>

            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-preferred-start`} style={{ color: colors.text }}>
                Preferred earliest date
              </Label>
              <Input
                id={`${fieldId}-preferred-start`}
                type="datetime-local"
                value={preferredStartAt}
                onChange={(event) => setPreferredStartAt(event.target.value)}
                disabled={isSubmitting || isEditing}
                style={inputStyle(colors)}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-preferred-end`} style={{ color: colors.text }}>
                Preferred latest date
              </Label>
              <Input
                id={`${fieldId}-preferred-end`}
                type="datetime-local"
                min={preferredStartAt || undefined}
                value={preferredEndAt}
                onChange={(event) => setPreferredEndAt(event.target.value)}
                disabled={isSubmitting || isEditing}
                style={inputStyle(colors)}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <Label htmlFor={`${fieldId}-attachments`} style={{ color: colors.text }}>
                Reference photos or videos
              </Label>
              <Input
                key={attachmentInputKey}
                id={`${fieldId}-attachments`}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
                disabled={isSubmitting || isEditing}
                onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 5))}
                style={inputStyle(colors)}
              />
              <p style={{ margin: 0, fontSize: '0.9rem', color: colors.muted }}>
                Add up to 5 images or videos. Files stay private and are reviewed with your request.
              </p>
              {attachments.length > 0 ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: colors.text }}>
                  {attachments.length} file{attachments.length === 1 ? '' : 's'} selected
                </p>
              ) : null}
            </div>

            {runtimeError ? <p style={{ margin: 0, color: '#b91c1c' }}>{runtimeError}</p> : null}

            <Button
              type="submit"
              disabled={isSubmitting || isEditing}
              className="h-auto rounded-full px-4 py-3"
              style={{
                background: colors.buttonBackground,
                color: colors.buttonText,
                fontWeight: 600,
                opacity: isSubmitting || isEditing ? 0.7 : 1,
              }}
            >
              {submitButtonText}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function inputStyle(colors: {
  inputBackground: string;
  inputBorder: string;
  inputText: string;
}): CSSProperties {
  return {
    width: '100%',
    borderRadius: '14px',
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBackground,
    color: colors.inputText,
    padding: '12px 14px',
    fontSize: '1rem',
  };
}

const contentFields = {
  title: {
    type: 'text' as const,
    label: 'Title',
    defaultValue: 'Request a quote',
  },
  description: {
    type: 'textarea' as const,
    label: 'Description',
    defaultValue: 'Tell guests how to request an estimate before a final booking is created.',
  },
  serviceId: {
    type: 'number' as const,
    label: 'Pre-selected Service ID (0 = no service link)',
    defaultValue: 0,
  },
  showPhoneField: {
    type: 'radio' as const,
    label: 'Show phone field',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: true,
  },
  showSubjectField: {
    type: 'radio' as const,
    label: 'Show subject field',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: true,
  },
  submitButtonText: {
    type: 'text' as const,
    label: 'Submit button text',
    defaultValue: 'Send request',
  },
  successMessage: {
    type: 'textarea' as const,
    label: 'Success message',
    defaultValue: 'Thanks. We received your request and will follow up with your quote soon.',
  },
  errorMessage: {
    type: 'text' as const,
    label: 'Fallback error message',
    defaultValue: 'We could not send your request right now. Please try again.',
  },
  editorPreviewText: {
    type: 'text' as const,
    label: 'Editor preview helper text',
    defaultValue: 'Live submission is disabled in the editor preview.',
  },
  maxWidth: {
    type: 'select' as const,
    label: 'Max width',
    options: [
      { label: '560px', value: '560px' },
      { label: '640px', value: '640px' },
      { label: '760px', value: '760px' },
      { label: '880px', value: '880px' },
    ],
    defaultValue: '760px',
  },
};

const styleFields = {
  sectionBackgroundColor: createColorField('Section Background', { type: 'custom', value: '#f8fafc' }),
  cardBackgroundColor: createColorField('Card Background', { type: 'custom', value: '#ffffff' }),
  borderColor: createColorField('Border Color', { type: 'custom', value: 'rgba(15, 23, 42, 0.1)' }),
  headingColor: createColorField('Heading Color', { type: 'custom', value: '#0f172a' }),
  textColor: createColorField('Body Text Color', { type: 'custom', value: '#334155' }),
  mutedColor: createColorField('Muted Text Color', { type: 'custom', value: '#64748b' }),
  inputBackgroundColor: createColorField('Input Background', { type: 'custom', value: '#ffffff' }),
  inputBorderColor: createColorField('Input Border Color', { type: 'custom', value: '#cbd5e1' }),
  inputTextColor: createColorField('Input Text Color', { type: 'custom', value: '#0f172a' }),
  buttonBackgroundColor: createColorField('Button Background', { type: 'custom', value: '#0f172a' }),
  buttonTextColor: createColorField('Button Text Color', { type: 'custom', value: '#ffffff' }),
};

export const QuoteRequestWidget: ComponentConfig<QuoteRequestWidgetProps> = {
  inline: true,
  label: 'Quote Request Widget',
  fields: {
    ...contentFields,
    ...styleFields,
  },
  defaultProps: {
    ...extractDefaults(contentFields, styleFields),
    title: 'Request a quote',
    description: 'Tell guests how to request an estimate before a final booking is created.',
    submitButtonText: 'Send request',
    successMessage: 'Thanks. We received your request and will follow up with your quote soon.',
    errorMessage: 'We could not send your request right now. Please try again.',
    editorPreviewText: 'Live submission is disabled in the editor preview.',
    serviceId: 0,
    showPhoneField: true,
    showSubjectField: true,
    maxWidth: '760px',
  },
  render: QuoteRequestWidgetComponent,
};
