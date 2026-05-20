import { useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useBookingContext } from './BookingContext';
import { useBookingRenderContext } from './BookingRenderContext';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { PrimaryButton, StepHeading } from './shared';
import type { WizardState, WizardStep } from './state';
import type { BookingWidgetText } from './text';
import type { BookingWidgetProps } from './types';

interface CalendarProps {
  month: Date;
  selected: string | null;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  primaryColor: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toWizardStep(step: 'service' | 'date' | 'resource' | 'slot' | 'range_checkout' | 'customer' | 'confirm' | null | undefined): WizardStep | null {
  if (!step || step === 'range_checkout') {
    return null;
  }

  return step;
}

function LoadingSpinner() {
  return <Loader2 size={24} className="bw-spinner bw-loading" />;
}

function MiniCalendar({ month, selected, onSelect, onPrev, onNext }: CalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  function isDisabled(day: Date): boolean {
    if (isBefore(day, today) && !isToday(day)) return true;

    return false;
  }

  return (
    <div className="bw-calendar">
      <div className="bw-calendar-header">
        <button
          type="button"
          onClick={onPrev}
          className="bw-calendar-nav"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="bw-calendar-month">{format(month, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={onNext}
          className="bw-calendar-nav"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="bw-calendar-weekdays">
        {WEEKDAYS.map((dayName) => (
          <div key={dayName} className="bw-calendar-weekday">
            {dayName}
          </div>
        ))}
      </div>

      <div className="bw-calendar-grid">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = day.getMonth() === month.getMonth();
          const selectedDay = selected ? isSameDay(day, parseISO(selected)) : false;
          const disabled = isDisabled(day);
          const todayMark = isToday(day);
          const className = [
            'bw-calendar-day',
            selectedDay ? 'is-selected' : '',
            disabled ? 'is-disabled' : '',
            !inMonth ? 'is-outside-month' : '',
            todayMark ? 'is-today' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={className}
              aria-label={format(day, 'PPP')}
              aria-pressed={selectedDay}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="bw-card-grid">{children}</div>;
}

function SelectCard({
  label,
  sublabel,
  onClick,
  secondaryAction,
  actionHint,
  primaryActionText,
  secondaryActionText,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  secondaryAction?: () => void;
  actionHint?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  primaryColor: string;
}) {
  if (secondaryAction) {
    return (
      <div className="bw-card">
        <div className="bw-card-title">{label}</div>
        {sublabel && <div className="bw-card-subtitle">{sublabel}</div>}
        {actionHint ? <div className="bw-card-action-hint">{actionHint}</div> : null}
        <div className="bw-card-actions">
          <PrimaryButton onClick={onClick} primaryColor="" className="bw-card-primary-action">
            {primaryActionText ?? 'Continue'}
          </PrimaryButton>
          <button type="button" onClick={secondaryAction} className="bw-secondary-action bw-card-secondary-action">
            {secondaryActionText ?? 'Alternate action'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="bw-card"
    >
      <div className="bw-card-title">{label}</div>
      {sublabel && <div className="bw-card-subtitle">{sublabel}</div>}
    </button>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="bw-back-button">
      <ChevronLeft size={14} /> {label}
    </button>
  );
}

function CustomerForm({
  onBack,
  onSubmit,
  loading,
  primaryColor,
  text,
  title,
  submitText,
  notesRequired = false,
  showPreferredDateFields = false,
  preferredDateHelpText,
  showAttachmentField = false,
  attachmentHelpText,
}: {
  onBack?: () => void;
  onSubmit: (data: NonNullable<WizardState['customer']>) => void;
  loading: boolean;
  primaryColor: string;
  text: BookingWidgetText;
  title?: string;
  submitText?: string;
  notesRequired?: boolean;
  showPreferredDateFields?: boolean;
  preferredDateHelpText?: string;
  showAttachmentField?: boolean;
  attachmentHelpText?: string;
}) {
  const fieldId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredStartAt, setPreferredStartAt] = useState('');
  const [preferredEndAt, setPreferredEndAt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      preferredStartAt: preferredStartAt || undefined,
      preferredEndAt: preferredEndAt || undefined,
      attachments,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bw-form">
      {onBack ? <BackButton onClick={onBack} label={text.backButtonText} /> : null}
      <StepHeading>{title ?? text.customerStepTitle}</StepHeading>

      <Label className="bw-label" htmlFor={`${fieldId}-name`}>{text.fullNameLabelText}</Label>
      <Input
        id={`${fieldId}-name`}
        required
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={text.fullNamePlaceholderText}
        className="bw-input"
        maxLength={120}
      />

      <Label className="bw-label" htmlFor={`${fieldId}-email`}>{text.emailLabelText}</Label>
      <Input
        id={`${fieldId}-email`}
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={text.emailPlaceholderText}
        className="bw-input"
        maxLength={255}
      />

      <Label className="bw-label" htmlFor={`${fieldId}-phone`}>{text.phoneLabelText}</Label>
      <Input
        id={`${fieldId}-phone`}
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder={text.phonePlaceholderText}
        className="bw-input"
        maxLength={30}
      />

      <Label className="bw-label" htmlFor={`${fieldId}-notes`}>{text.notesLabelText}</Label>
      <Textarea
        id={`${fieldId}-notes`}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={text.notesPlaceholderText}
        rows={3}
        className="bw-input bw-textarea"
        maxLength={1000}
        required={notesRequired}
      />

      {showAttachmentField ? (
        <>
          <Label className="bw-label" htmlFor={`${fieldId}-attachments`}>Reference photos or videos</Label>
          <Input
            id={`${fieldId}-attachments`}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 5))}
            className="bw-input"
          />
          <p className="bw-meta">
            {attachmentHelpText ?? 'Add up to 5 private images or videos to help us prepare your estimate.'}
          </p>
        </>
      ) : null}

      {showPreferredDateFields ? (
        <>
          {preferredDateHelpText ? <p className="bw-meta">{preferredDateHelpText}</p> : null}

          <Label className="bw-label" htmlFor={`${fieldId}-preferred-start`}>Preferred earliest date</Label>
          <Input
            id={`${fieldId}-preferred-start`}
            type="datetime-local"
            value={preferredStartAt}
            onChange={(event) => setPreferredStartAt(event.target.value)}
            className="bw-input"
          />

          <Label className="bw-label" htmlFor={`${fieldId}-preferred-end`}>Preferred latest date</Label>
          <Input
            id={`${fieldId}-preferred-end`}
            type="datetime-local"
            value={preferredEndAt}
            min={preferredStartAt || undefined}
            onChange={(event) => setPreferredEndAt(event.target.value)}
            className="bw-input"
          />
        </>
      ) : null}

      <PrimaryButton loading={loading} primaryColor={primaryColor}>
        {submitText ?? text.continueToReviewText}
      </PrimaryButton>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bw-summary-row">
      <span className="bw-summary-label">{label}:</span>
      <span className="bw-summary-value">{value}</span>
    </div>
  );
}

export function BookingErrorBanner() {
  const { state, dispatch } = useBookingContext();

  if (!state.error) return null;

  return (
    <div className="bw-error-banner">
      <AlertCircle size={16} className="bw-error-banner-icon" />
      <span className="bw-error-banner-message">{state.error}</span>
      <button
        type="button"
        onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
        className="bw-error-banner-dismiss"
        aria-label="Dismiss booking error"
      >
        x
      </button>
    </div>
  );
}

export function ServiceStep({ primaryColor, showPrices }: { primaryColor: string; showPrices: boolean }) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();

  const selectServiceForBooking = (service: typeof state.services[number]) => {
    dispatch({
      type: 'SELECT_SERVICE',
      service,
      nextStep: toWizardStep(renderContext.getNextStep('service', service.booking_mode)) ?? 'date',
      flow: 'booking',
    });
  };

  const selectServiceForQuote = (service: typeof state.services[number]) => {
    dispatch({
      type: 'SELECT_SERVICE',
      service,
      nextStep: 'customer',
      flow: 'quote_request',
    });
  };

  return (
    <>
      <StepHeading>{renderContext.text.serviceStepTitle}</StepHeading>
      {state.loading ? (
        <LoadingSpinner />
      ) : (
        <CardGrid>
          {state.services.map((service) => (
            <SelectCard
              key={service.id}
              label={service.name}
              sublabel={
                service.description
                  ? `${service.description}${showPrices && service.price ? ` · ${service.price} ${service.currency ?? ''}` : ''}`
                  : showPrices && service.price
                    ? `${service.price} ${service.currency ?? ''}`
                    : undefined
              }
              onClick={() => service.customer_flow === 'quote_request'
                ? selectServiceForQuote(service)
                : selectServiceForBooking(service)}
              secondaryAction={service.customer_flow === 'either'
                ? () => selectServiceForQuote(service)
                : undefined}
              actionHint={service.customer_flow === 'either'
                ? 'Choose a standard slot instantly, or ask for a tailored quote first.'
                : undefined}
              primaryActionText={service.customer_flow === 'either' ? 'Book now' : undefined}
              secondaryActionText={service.customer_flow === 'either' ? 'Get custom quote' : undefined}
              primaryColor={primaryColor}
            />
          ))}
        </CardGrid>
      )}
    </>
  );
}

export function DateStep({ serviceId, primaryColor }: { serviceId: number; primaryColor: string }) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();
  const previousStep = toWizardStep(renderContext.getPreviousStep('date', state.selectedService?.booking_mode));
  const nextStep = toWizardStep(renderContext.getNextStep('date', state.selectedService?.booking_mode)) ?? 'resource';

  if (serviceId > 0 && !state.selectedService) {
    return null;
  }

  return (
    <>
      {serviceId === 0 && previousStep && <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: previousStep })} label={renderContext.text.backButtonText} />}
      <StepHeading>{renderContext.text.dateStepTitle}</StepHeading>
      <MiniCalendar
        month={state.currentMonth}
        selected={state.selectedDate}
        onSelect={(date) => dispatch({
          type: 'SELECT_DATE',
          date,
          nextStep,
        })}
        onPrev={() => dispatch({ type: 'PREV_MONTH' })}
        onNext={() => dispatch({ type: 'NEXT_MONTH' })}
        primaryColor={primaryColor}
      />
    </>
  );
}

export function ResourceStep({ primaryColor }: { primaryColor: string }) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();

  const resourceLabel = state.resources.length > 0 ? state.resources[0].resource_label ?? null : null;
  const previousStep = toWizardStep(renderContext.getPreviousStep('resource', state.selectedService?.booking_mode));
  const nextStep = toWizardStep(renderContext.getNextStep('resource', state.selectedService?.booking_mode)) ?? 'slot';

  return (
    <>
      {previousStep && <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: previousStep })} label={renderContext.text.backButtonText} />}
      <StepHeading>
        {state.selectedService?.name ? `${state.selectedService.name} — ` : ''}
        {resourceLabel
          ? `${renderContext.text.resourceStepTitleWithLabelPrefix} ${resourceLabel}`
          : renderContext.text.resourceStepTitle}
      </StepHeading>
      {state.loading ? (
        <LoadingSpinner />
      ) : (
        <CardGrid>
          {state.resources.length === 0 ? (
            <p className="bw-muted-text">{renderContext.text.noResourcesAvailableText}</p>
          ) : (
            <>
              {state.resources.length > 1 && (
                <SelectCard
                  key="any"
                  label={resourceLabel ? `${renderContext.text.resourceAnyLabel} ${resourceLabel}` : renderContext.text.resourceAnyLabel}
                  sublabel={renderContext.text.resourceAnySubtitle}
                  onClick={() => dispatch({
                    type: 'SELECT_RESOURCE',
                    resource: state.resources[0],
                    nextStep,
                  })}
                  primaryColor={primaryColor}
                />
              )}
              {state.resources.map((resource) => (
                <SelectCard
                  key={resource.id}
                  label={resource.name}
                  sublabel={renderContext.showResourceDescription ? resource.description ?? undefined : undefined}
                  onClick={() => dispatch({
                    type: 'SELECT_RESOURCE',
                    resource,
                    nextStep,
                  })}
                  primaryColor={primaryColor}
                />
              ))}
            </>
          )}
        </CardGrid>
      )}
    </>
  );
}

export function SlotStep({ timeFormat }: { primaryColor: string; timeFormat: string }) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();
  const previousStep = toWizardStep(renderContext.getPreviousStep('slot', 'slot'));
  const nextStep = toWizardStep(renderContext.getNextStep('slot', 'slot')) ?? 'customer';

  return (
    <>
      {previousStep && <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: previousStep })} label={renderContext.text.backButtonText} />}
      <StepHeading>
        {renderContext.text.slotStepTitlePrefix} {state.selectedDate ? format(parseISO(state.selectedDate), 'PP') : ''}
      </StepHeading>
      {state.loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bw-slot-grid">
          {state.slots.length === 0 && (
            <p className="bw-slot-empty">
              {renderContext.text.noSlotsAvailableText}
            </p>
          )}
          {state.slots.length > 0 && state.slots.filter((slot) => slot.available).length === 0 && (
            <p className="bw-slot-empty">
              {renderContext.text.allSlotsBookedText}
            </p>
          )}
          {state.slots.filter((slot) => slot.available).map((slot) => (
            <button
              key={slot.starts_at}
              type="button"
              onClick={() => dispatch({
                type: 'SELECT_SLOT',
                slot,
                nextStep,
              })}
              className="bw-slot"
            >
              {format(parseISO(slot.starts_at), timeFormat)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function CustomerStep({
  onSubmit,
  loading,
  primaryColor,
}: {
  onSubmit: (data: NonNullable<WizardState['customer']>) => void;
  loading: boolean;
  primaryColor: string;
}) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();
  const previousStep = toWizardStep(renderContext.getPreviousStep('customer', state.selectedService?.booking_mode));
  const nextStep = toWizardStep(renderContext.getNextStep('customer', state.selectedService?.booking_mode)) ?? 'confirm';

  return (
    <CustomerForm
      onBack={previousStep ? () => dispatch({ type: 'GO_STEP', step: previousStep }) : undefined}
      onSubmit={(customer) => {
        dispatch({ type: 'SET_CUSTOMER', customer, nextStep });
        onSubmit(customer);
      }}
      loading={loading}
      primaryColor={primaryColor}
      text={renderContext.text}
    />
  );
}

export function QuoteRequestStep({
  onSubmit,
  loading,
  primaryColor,
}: {
  onSubmit: (data: NonNullable<WizardState['customer']>) => void;
  loading: boolean;
  primaryColor: string;
}) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();
  const title = state.selectedService?.name
    ? `Request a quote for ${state.selectedService.name}`
    : 'Request a quote';

  return (
    <CustomerForm
      onBack={renderContext.serviceId === 0 ? () => dispatch({ type: 'GO_STEP', step: 'service' }) : undefined}
      onSubmit={onSubmit}
      loading={loading}
      primaryColor={primaryColor}
      text={renderContext.text}
      title={title}
      submitText="Send quote request"
      notesRequired={true}
      showPreferredDateFields={true}
      preferredDateHelpText="Optional preferred dates help the provider review availability before they suggest the final appointment time."
      showAttachmentField={true}
      attachmentHelpText="Add up to 5 private images or videos to support your quote request."
    />
  );
}

export function ConfirmStep({
  onSubmit,
  loading,
  primaryColor,
  timeFormat,
}: {
  onSubmit: () => void;
  loading: boolean;
  primaryColor: string;
  timeFormat: string;
}) {
  const { state, dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();

  const previousStep = toWizardStep(renderContext.getPreviousStep('confirm', state.selectedService?.booking_mode));

  if (!state.selectedService || !state.customer) return null;

  return (
    <>
      <StepHeading>{renderContext.text.confirmStepTitle}</StepHeading>
      <div className="bw-summary">
        <Row label={renderContext.text.summaryServiceLabelText} value={state.selectedService.name} />
        <Row label={renderContext.text.summaryResourceLabelText} value={state.selectedResource?.name ?? ''} />
        {state.selectedSlot && (
          <>
            <Row label={renderContext.text.summaryDateLabelText} value={format(parseISO(state.selectedSlot.starts_at), 'PP')} />
            <Row
              label={renderContext.text.summaryTimeLabelText}
              value={`${format(parseISO(state.selectedSlot.starts_at), timeFormat)} – ${format(parseISO(state.selectedSlot.ends_at), timeFormat)}`}
            />
          </>
        )}
        <Row label={renderContext.text.summaryNameLabelText} value={state.customer.name} />
        <Row label={renderContext.text.summaryEmailLabelText} value={state.customer.email} />
        {state.customer.phone && <Row label={renderContext.text.summaryPhoneLabelText} value={state.customer.phone} />}
      </div>
      {state.holdExpiresAt && (
        <p className="bw-meta">
          {renderContext.text.holdExpiresPrefixText} {format(parseISO(state.holdExpiresAt), timeFormat)}.
        </p>
      )}
      <PrimaryButton onClick={onSubmit} loading={loading} primaryColor={primaryColor}>
        {state.selectedService.requires_payment
          ? renderContext.text.continueToPaymentText
          : renderContext.text.confirmBookingText}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => previousStep && dispatch({ type: 'GO_STEP', step: previousStep })}
        className="bw-secondary-action"
      >
        {renderContext.text.editDetailsText}
      </button>
    </>
  );
}

export function SuccessStep({ primaryColor: _primaryColor, successMessage }: { primaryColor: string; successMessage: string }) {
  void _primaryColor;

  const { state } = useBookingContext();
  const renderContext = useBookingRenderContext();

  return (
    <div className="bw-state">
      <CheckCircle size={48} className="bw-state-icon success" />
      <p className="bw-state-title">{successMessage || (state.submissionKind === 'quote_request' ? 'Quote request received' : 'Booking confirmed!')}</p>
      <p className="bw-state-text">
        {state.submissionKind === 'quote_request'
          ? `We received your request and will follow up at ${state.customer?.email}.`
          : `${renderContext.text.confirmationSentPrefixText} ${state.customer?.email}.`}
      </p>
    </div>
  );
}

function slotHasRenderableContent(node: HTMLElement | null): boolean {
  if (!node) {
    return false;
  }

  if (node.textContent?.trim()) {
    return true;
  }

  return Boolean(node.querySelector('img, svg, video, canvas, iframe, button, input, textarea, select, audio'));
}

function OptionalSuccessContent({
  SuccessContent,
  fallback,
}: {
  SuccessContent?: BookingWidgetProps['successContent'];
  fallback: ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  useLayoutEffect(() => {
    if (!SuccessContent) {
      setIsEmpty(true);
      return;
    }

    setIsEmpty(!slotHasRenderableContent(slotRef.current));
  }, [SuccessContent]);

  if (!SuccessContent) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div ref={slotRef} style={{ display: isEmpty ? 'none' : 'contents' }}>
        <SuccessContent />
      </div>
      {isEmpty ? fallback : null}
    </>
  );
}

export function SuccessContentStep({
  primaryColor,
  successMessage,
  successContent: SuccessContent,
}: {
  primaryColor: string;
  successMessage: string;
  successContent?: BookingWidgetProps['successContent'];
}) {
  return (
    <OptionalSuccessContent
      SuccessContent={SuccessContent}
      fallback={<SuccessStep primaryColor={primaryColor} successMessage={successMessage} />}
    />
  );
}

export function BookingErrorStep({ primaryColor }: { primaryColor: string }) {
  const { dispatch } = useBookingContext();
  const renderContext = useBookingRenderContext();

  return (
    <div className="bw-state">
      <AlertCircle size={48} className="bw-state-icon error" />
      <p className="bw-state-title">{renderContext.text.genericErrorTitleText}</p>
      <PrimaryButton onClick={() => dispatch({ type: 'RESET' })} primaryColor={primaryColor}>
        {renderContext.text.retryButtonText}
      </PrimaryButton>
    </div>
  );
}
