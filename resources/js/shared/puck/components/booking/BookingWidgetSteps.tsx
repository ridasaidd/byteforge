import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  primaryColor: string;
}) {
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
}: {
  onBack: () => void;
  onSubmit: (data: NonNullable<WizardState['customer']>) => void;
  loading: boolean;
  primaryColor: string;
  text: BookingWidgetText;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="bw-form">
      <BackButton onClick={onBack} label={text.backButtonText} />
      <StepHeading>{text.customerStepTitle}</StepHeading>

      <label className="bw-label">{text.fullNameLabelText}</label>
      <input
        required
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={text.fullNamePlaceholderText}
        className="bw-input"
        maxLength={120}
      />

      <label className="bw-label">{text.emailLabelText}</label>
      <input
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={text.emailPlaceholderText}
        className="bw-input"
        maxLength={255}
      />

      <label className="bw-label">{text.phoneLabelText}</label>
      <input
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder={text.phonePlaceholderText}
        className="bw-input"
        maxLength={30}
      />

      <label className="bw-label">{text.notesLabelText}</label>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={text.notesPlaceholderText}
        rows={3}
        className="bw-input bw-textarea"
        maxLength={1000}
      />

      <PrimaryButton loading={loading} primaryColor={primaryColor}>
        {text.continueToReviewText}
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
              onClick={() => dispatch({
                type: 'SELECT_SERVICE',
                service,
                nextStep: toWizardStep(renderContext.getNextStep('service', service.booking_mode)) ?? 'date',
              })}
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
      onBack={() => previousStep && dispatch({ type: 'GO_STEP', step: previousStep })}
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
      <p className="bw-state-title">{successMessage || 'Booking confirmed!'}</p>
      <p className="bw-state-text">
        {renderContext.text.confirmationSentPrefixText} {state.customer?.email}.
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
