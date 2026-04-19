/**
 * BookingWidget — Puck page-builder component for the Booking add-on.
 *
 * Requires the `booking` feature flag to be active on the tenant.
 * The PageEditorPage conditionally registers this component only when
 * the addon is enabled, so it never appears in the Puck sidebar for
 * tenants who don't have the add-on.
 *
 * Multi-step wizard flow:
 *   service → date → resource → slot/range → customer → confirm → success
 *
 * Date is picked before resource so the resource list can be filtered
 * to only show options that actually have availability on the chosen date.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePuckEditMode, useTheme } from '@/shared/hooks';
import { apiFetch, apiPost } from './api';
import { BookingProvider, useBookingContext } from './BookingContext';
import { BookingRenderProvider, useBookingRenderContext } from './BookingRenderContext';
import type { BookingAuthorableStep, BookingFlowResolution, BookingServiceMode } from './sectionOrder';
import { getDefaultBookingFlowResolution, resolveBookingSectionFlow } from './sectionOrder';
import {
  BookingErrorBanner,
  BookingErrorStep,
  ConfirmStep,
  CustomerStep,
  DateStep,
  ResourceStep,
  ServiceStep,
  SlotStep,
  SuccessContentStep,
} from './BookingWidgetSteps';
import {
  BOOKING_WIDGET_STATIC_CSS,
  buildBookingWidgetCssVars,
  getBookingWidgetInstanceClassName,
  resolveBookingPrimaryColor,
} from './styles';
import {
  getBookingWidgetProgressLabel,
  getBookingWidgetProgressStateText,
  getBookingWidgetText,
} from './text';
import { getBookingFlowItems, getBookingNextFlowStep, getBookingPreviousFlowStep } from './flow';
import type { WizardState, WizardStep } from './state';
import type { BookingResource, BookingService, BookingWidgetProps, Slot } from './types';

const SLOT_ONLY_WIDGET_ERROR = 'This booking widget currently supports appointment-style slot bookings only.';
const BOOKING_SECTION_LAYOUT_ENABLED = false;

function toWizardStep(step: 'service' | 'date' | 'resource' | 'slot' | 'range_checkout' | 'customer' | 'confirm' | null | undefined): WizardStep | null {
  if (!step || step === 'range_checkout') {
    return null;
  }

  return step;
}

function BookingWidgetShell({
  instanceClassName,
  headerContent: HeaderContent,
  editorCss,
  dragRef,
  children,
}: {
  instanceClassName: string;
  headerContent?: BookingWidgetProps['headerContent'];
  editorCss?: string;
  dragRef?: ((element: Element | null) => void) | null;
  children: ReactNode;
}) {
  return (
    <>
      {editorCss && <style>{editorCss}</style>}
      <div ref={dragRef} className={`${instanceClassName} bw-root`}>
      {HeaderContent ? (
        <div className="bw-shell-header">
          <HeaderContent />
        </div>
      ) : null}

      <div className="bw-shell-body">
        {children}
      </div>
      </div>
    </>
  );
}

function DefaultBookingSections({
  serviceId,
  primaryColor,
  showPrices,
  successMessage,
  successContent,
  timeFormat,
  submitHold,
  submitConfirm,
}: {
  serviceId: number;
  primaryColor: string;
  showPrices: boolean;
  successMessage: string;
  successContent?: BookingWidgetProps['successContent'];
  timeFormat: string;
  submitHold: (customer: NonNullable<WizardState['customer']>) => void;
  submitConfirm: () => void;
}) {
  const { state } = useBookingContext();

  return (
    <>
      <BookingErrorBanner />

      {state.step === 'service' && <ServiceStep primaryColor={primaryColor} showPrices={showPrices} />}

      {state.step === 'date' && <DateStep serviceId={serviceId} primaryColor={primaryColor} />}

      {state.step === 'resource' && <ResourceStep primaryColor={primaryColor} />}

      {state.step === 'slot' && <SlotStep primaryColor={primaryColor} timeFormat={timeFormat} />}

      {state.step === 'customer' && (
        <CustomerStep onSubmit={submitHold} loading={state.loading} primaryColor={primaryColor} />
      )}

      {state.step === 'confirm' && (
        <ConfirmStep
          onSubmit={submitConfirm}
          loading={state.loading}
          primaryColor={primaryColor}
          timeFormat={timeFormat}
        />
      )}

      {state.step === 'success' && (
        <SuccessContentStep
          primaryColor={primaryColor}
          successMessage={successMessage}
          successContent={successContent}
        />
      )}

      {state.step === 'error' && <BookingErrorStep primaryColor={primaryColor} />}
    </>
  );
}

function BookingSectionEditorHint() {
  return (
    <div className="bw-editor-card">
      <div className="bw-editor-card-title">Custom Booking Sections</div>
      <div className="bw-editor-card-copy">
        Add booking section blocks into the sections slot to compose the widget inside the editor.
      </div>
    </div>
  );
}

function filterServicesBySupportedModes(services: BookingService[], resolution: BookingFlowResolution): BookingService[] {
  const slotServices = services.filter((service) => service.booking_mode === 'slot');

  if (resolution.supportedModes.length === 2) {
    return slotServices;
  }

  return slotServices.filter((service) => resolution.supportedModes.includes(service.booking_mode));
}

function BookingSectionOrderWarning({
  message,
  tone,
}: {
  message: string;
  tone: 'info' | 'error';
}) {
  const isError = tone === 'error';

  return (
    <div
      className="bw-editor-card"
      style={{
        borderColor: isError ? '#dc2626' : '#f59e0b',
        background: isError ? '#fef2f2' : '#fffaf0',
        marginBottom: 12,
      }}
    >
      <div className="bw-editor-card-title" style={{ color: isError ? '#b91c1c' : '#b45309' }}>
        {isError ? 'Runtime Flow Error' : 'Runtime Flow Notice'}
      </div>
      <div className="bw-editor-card-copy" style={{ color: isError ? '#991b1b' : '#92400e' }}>
        {message}
      </div>
    </div>
  );
}

function BookingSectionsSlot({
  sections: SectionsComponent,
  isEditing,
}: {
  sections?: React.ComponentType<{ className?: string; minEmptyHeight?: string | number }>;
  isEditing: boolean;
}) {
  return (
    <div className={[ 'bw-sections-slot', isEditing ? 'is-editing' : '' ].filter(Boolean).join(' ')}>
      {isEditing && <BookingSectionEditorHint />}
      {SectionsComponent ? <SectionsComponent className="bw-sections-dropzone" minEmptyHeight={140} /> : null}
    </div>
  );
}

function isAuthorableBookingSectionStep(step: WizardState['step']): boolean {
  return [
    'service',
    'date',
    'resource',
    'slot',
    'customer',
    'confirm',
  ].includes(step);
}

function BookingFlowNavigator({ resolution }: { resolution: BookingFlowResolution }) {
  const { state, dispatch } = useBookingContext();
  const { progressOrientation, text } = useBookingRenderContext();
  const items = useMemo(() => getBookingFlowItems(state, resolution), [resolution, state]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={[
        'bw-flow-nav',
        progressOrientation === 'horizontal' ? 'is-horizontal' : '',
      ].filter(Boolean).join(' ')}
      aria-label={text.progressAriaLabel}
    >
      {items.map((item, index) => {
        const stepClassName = [
          'bw-flow-step',
          item.status === 'current' ? 'is-active' : '',
          item.status === 'complete' ? 'is-complete' : '',
          item.isClickable ? 'is-clickable' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={item.step}
            type="button"
            className={stepClassName}
            onClick={() => item.isClickable && dispatch({ type: 'GO_STEP', step: item.step })}
            disabled={!item.isClickable}
            aria-current={item.status === 'current' ? 'step' : undefined}
          >
            <span className="bw-flow-step-badge">{item.status === 'complete' ? '✓' : index + 1}</span>
            <span className="bw-flow-step-copy">
              <span className="bw-flow-step-label">{getBookingWidgetProgressLabel(item.step, item.label, text)}</span>
              <span className="bw-flow-step-state">
                {getBookingWidgetProgressStateText(item.status, text)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ParentManagedBookingStates({
  primaryColor,
  successMessage,
  successContent,
}: {
  primaryColor: string;
  successMessage: string;
  successContent?: BookingWidgetProps['successContent'];
}) {
  const { state } = useBookingContext();

  return (
    <>
      <BookingErrorBanner />

      {state.step === 'success' && (
        <SuccessContentStep
          primaryColor={primaryColor}
          successMessage={successMessage}
          successContent={successContent}
        />
      )}

      {state.step === 'error' && <BookingErrorStep primaryColor={primaryColor} />}
    </>
  );
}

function BookingWidgetEditorPreview({
  serviceId,
  showPrices,
  successMessage,
  successContent: SuccessContent,
  showProgress,
  progressOrientation,
  text,
}: {
  serviceId: number;
  showPrices: boolean;
  successMessage: string;
  successContent?: BookingWidgetProps['successContent'];
  showProgress: boolean;
  progressOrientation: 'vertical' | 'horizontal';
  text: ReturnType<typeof getBookingWidgetText>;
}) {
  const sampleServices = [
    {
      title: serviceId > 0 ? `Service #${serviceId}` : 'Consultation',
      subtitle: showPrices ? '30 min · 50 SEK' : '30 min session',
    },
    {
      title: 'Extended Session',
      subtitle: showPrices ? '60 min · 90 SEK' : '60 min session',
    },
  ];

  return (
    <div aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {showProgress && (
        <div
          className={[
            'bw-flow-nav',
            progressOrientation === 'horizontal' ? 'is-horizontal' : '',
          ].filter(Boolean).join(' ')}
          style={{ marginBottom: 20 }}
        >
          {[
            ...(serviceId > 0 ? [] : [text.progressServiceLabel]),
            text.progressDateLabel,
            text.progressResourceLabel,
            text.progressSlotLabel,
            text.progressCustomerLabel,
            text.progressConfirmLabel,
          ].map((label, index) => (
            <button
              key={label}
              type="button"
              className={[
                'bw-flow-step',
                index === 1 ? 'is-complete' : '',
                index === 2 ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              disabled={true}
            >
              <span className="bw-flow-step-badge">{index === 1 ? '✓' : index + 1}</span>
              <span className="bw-flow-step-copy">
                <span className="bw-flow-step-label">{label}</span>
                <span className="bw-flow-step-state">
                  {index === 2 ? text.progressCurrentStepText : index < 2 ? text.progressCompleteStepText : text.progressUpcomingStepText}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="bw-step-heading">{text.serviceStepTitle}</div>
      <div className="bw-card-grid" style={{ marginBottom: 20 }}>
        {sampleServices.map((service) => (
          <div key={service.title} className="bw-card">
            <div className="bw-card-title">{service.title}</div>
            <div className="bw-card-subtitle">{service.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="bw-step-heading">{text.dateStepTitle}</div>
      <div className="bw-calendar" style={{ marginBottom: 20 }}>
        <div className="bw-calendar-weekdays">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((dayName) => (
            <div key={dayName} className="bw-calendar-weekday">{dayName}</div>
          ))}
        </div>
        <div className="bw-calendar-grid">
          {['14', '15', '16', '17', '18', '19', '20'].map((day, index) => (
            <div
              key={day}
              className={[
                'bw-calendar-day',
                index === 2 ? 'is-selected' : '',
                index === 0 ? 'is-today' : '',
              ].filter(Boolean).join(' ')}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="bw-step-heading">{`${text.slotStepTitlePrefix} May 16, 2026`}</div>
      <div className="bw-slot-grid" style={{ marginBottom: 20 }}>
        {['09:00', '10:30', '13:00'].map((slot) => (
          <div key={slot} className="bw-slot">{slot}</div>
        ))}
      </div>

      <div className="bw-step-heading">{text.customerStepTitle}</div>
      <div style={{ marginBottom: 20 }}>
        <label className="bw-label">{text.fullNameLabelText.replace(/\s*\*$/, '')}</label>
        <div className="bw-input">Jane Doe</div>
        <label className="bw-label">{text.emailLabelText.replace(/\s*\*$/, '')}</label>
        <div className="bw-input">jane@example.com</div>
        <label className="bw-label">{text.phoneLabelText}</label>
        <div className="bw-input">+46 70 123 45 67</div>
        <label className="bw-label">{text.notesLabelText}</label>
        <div className="bw-input">Looking forward to the appointment.</div>
      </div>

      {SuccessContent ? (
        <div style={{ marginBottom: 20 }}>
          <SuccessContent />
        </div>
      ) : (
        <div className="bw-state" style={{ paddingBottom: 8 }}>
          <div className="bw-state-icon success">✓</div>
          <div className="bw-state-title">{successMessage || 'Your booking is confirmed!'}</div>
          <div className="bw-state-text">Preview of the success state styling.</div>
        </div>
      )}

      <button type="button" className="bw-btn">{text.continueToReviewText}</button>
    </div>
  );
}

function BookingWidgetContent(props: BookingWidgetProps) {
  const {
    id,
    puck,
    headerContent,
    successContent,
    serviceId,
    primaryColor,
    showPrices,
    successMessage,
    showProgress = true,
    progressOrientation = 'vertical',
    autoSkipSingleResource = false,
    showResourceDescription = false,
    layoutMode: requestedLayoutMode = 'legacy',
    sections: Sections,
  } = props;
  const layoutMode = BOOKING_SECTION_LAYOUT_ENABLED ? requestedLayoutMode : 'legacy';
  const isEditing = usePuckEditMode();
  const { resolve } = useTheme();
  const { state, dispatch } = useBookingContext();
  const [timeFormat, setTimeFormat] = useState('HH:mm');
  const [configuredSectionOrder, setConfiguredSectionOrder] = useState<BookingAuthorableStep[]>([]);
  const [sectionOrderReady, setSectionOrderReady] = useState(layoutMode !== 'sections' || !Sections);
  const sectionOrderProbeRef = useRef<HTMLDivElement | null>(null);
  const instanceClassName = useMemo(() => getBookingWidgetInstanceClassName(id), [id]);
  const resolvedPrimaryColor = useMemo(() => resolveBookingPrimaryColor(primaryColor), [primaryColor]);
  const bookingText = useMemo(() => getBookingWidgetText(props), [props]);
  const selectedServiceMode = state.selectedService?.booking_mode;
  const editorCss = useMemo(() => {
    if (!isEditing) return undefined;

    return `${BOOKING_WIDGET_STATIC_CSS}\n${buildBookingWidgetCssVars(`.${instanceClassName}`, props, resolve)}`;
  }, [instanceClassName, isEditing, props, resolve]);
  const flowResolution = useMemo(() => {
    if (layoutMode === 'sections' && Sections) {
      return resolveBookingSectionFlow(configuredSectionOrder, {
        serviceId,
        selectedServiceMode,
      });
    }

    return getDefaultBookingFlowResolution(serviceId, selectedServiceMode);
  }, [Sections, configuredSectionOrder, layoutMode, selectedServiceMode, serviceId]);
  const shouldUseSectionsRuntime = layoutMode === 'sections' && Boolean(Sections) && !flowResolution.usesFallback;
  const resolveFlowForServiceMode = useCallback((serviceMode?: BookingServiceMode) => {
    if (layoutMode === 'sections' && Sections) {
      return resolveBookingSectionFlow(configuredSectionOrder, {
        serviceId,
        selectedServiceMode: serviceMode,
      });
    }

    return getDefaultBookingFlowResolution(serviceId, serviceMode);
  }, [Sections, configuredSectionOrder, layoutMode, serviceId]);
  const getNextStep = useCallback((step: BookingAuthorableStep, serviceMode?: BookingServiceMode) => {
    return getBookingNextFlowStep(step, resolveFlowForServiceMode(serviceMode));
  }, [resolveFlowForServiceMode]);
  const getPreviousStep = useCallback((step: BookingAuthorableStep, serviceMode?: BookingServiceMode) => {
    return getBookingPreviousFlowStep(step, resolveFlowForServiceMode(serviceMode));
  }, [resolveFlowForServiceMode]);

  // ── Load tenant display format settings ───────────────────────────────────
  useEffect(() => {
    if (isEditing) return;
    apiFetch<{ data: { time_format: string } }>('/config')
      .then(res => setTimeFormat(res.data.time_format))
      .catch(() => {}); // silently fall back to 24h default
  }, [isEditing]);

  // -- Load services on mount if no pre-selected service
  useEffect(() => {
    if (isEditing) return;
    if (serviceId > 0) return; // designer pre-selected a service — skip service list
    if (!sectionOrderReady) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingService[] }>('/services')
      .then(res => {
        const compatibleServices = filterServicesBySupportedModes(res.data, flowResolution);

        dispatch({ type: 'SET_SERVICES', services: compatibleServices });

        if (compatibleServices.length === 0) {
          dispatch({
            type: 'SET_ERROR',
            error: res.data.some((service) => service.booking_mode !== 'slot')
              ? SLOT_ONLY_WIDGET_ERROR
              : 'No services match the current booking widget flow configuration.',
          });
        }
      })
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load services.' }));
  }, [dispatch, flowResolution, isEditing, sectionOrderReady, serviceId]);

  // ── Load pre-selected service detail when serviceId is set ───────────────
  useEffect(() => {
    if (isEditing || serviceId <= 0) return;
    if (!sectionOrderReady) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingService[] }>('/services')
      .then(res => {
        const svc = res.data.find(s => s.id === serviceId) ?? null;
        if (svc) {
          if (svc.booking_mode !== 'slot') {
            dispatch({ type: 'SET_ERROR', error: SLOT_ONLY_WIDGET_ERROR });
            return;
          }

          dispatch({
            type: 'SELECT_SERVICE',
            service: svc,
            nextStep: toWizardStep(getNextStep('service', svc.booking_mode)) ?? 'date',
          });
        }
        else     dispatch({ type: 'SET_ERROR', error: 'The configured service was not found.' });
      })
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load service.' }));
  }, [dispatch, getNextStep, isEditing, sectionOrderReady, serviceId]);

  // ── Load resources when service + date are selected (date-filtered) ────────
  useEffect(() => {
    if (isEditing || !state.selectedService || !state.selectedDate) return;
    if (state.step !== 'resource') return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingResource[] }>(
      `/resources?service_id=${state.selectedService.id}&date=${state.selectedDate}`,
    )
      .then(res => {
        if (autoSkipSingleResource && res.data.length === 1) {
          dispatch({ type: 'SET_RESOURCES', resources: res.data });
          dispatch({
            type: 'SELECT_RESOURCE',
            resource: res.data[0],
            nextStep: toWizardStep(getNextStep('resource', state.selectedService?.booking_mode)) ?? 'slot',
          });
          return;
        }

        dispatch({ type: 'SET_RESOURCES', resources: res.data });
      })
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load resources.' }));
  }, [autoSkipSingleResource, dispatch, getNextStep, isEditing, state.selectedDate, state.selectedService, state.step]);

  // ── Load slots when a date is selected (slot mode) ────────────────────────
  useEffect(() => {
    if (isEditing || state.step !== 'slot') return;
    if (!state.selectedService || !state.selectedResource || !state.selectedDate) return;

    dispatch({ type: 'SET_LOADING', loading: true, preserveError: Boolean(state.error) });
    apiFetch<{ data: Slot[] }>(
      `/slots?service_id=${state.selectedService.id}&resource_id=${state.selectedResource.id}&date=${state.selectedDate}`,
    )
      .then(res => dispatch({ type: 'SET_SLOTS', slots: res.data }))
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load slots.' }));
  }, [dispatch, isEditing, state.error, state.selectedDate, state.selectedResource, state.selectedService, state.step]);

  // ── Hold booking (called from customer step) ──────────────────────────────
  const submitHold = useCallback(async (customer: NonNullable<WizardState['customer']>) => {
    if (!state.selectedService || !state.selectedResource) return;

    dispatch({ type: 'SET_LOADING', loading: true });

    const payload: Record<string, unknown> = {
      service_id:     state.selectedService.id,
      resource_id:    state.selectedResource.id,
      customer_name:  customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || undefined,
      customer_notes: customer.notes || undefined,
    };

    if (!state.selectedSlot) {
      dispatch({ type: 'SET_ERROR', error: 'Please choose a slot before continuing.' });
      return;
    }

    payload.starts_at = state.selectedSlot.starts_at;
    payload.ends_at = state.selectedSlot.ends_at;

    try {
      const res = await apiPost<{ data: { hold_token: string; expires_at: string } }>('/hold', payload);
      dispatch({ type: 'SET_HOLD', holdToken: res.data.hold_token, holdExpiresAt: res.data.expires_at });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409 || e.status === 422) {
        dispatch({
          type: 'GO_STEP_WITH_ERROR',
          step: toWizardStep(getPreviousStep('customer', state.selectedService.booking_mode)) ?? 'date',
          error: e.message ?? 'That time slot is no longer available. Please choose another.',
        });
      } else {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'Could not reserve your slot. Please try again.' });
      }
    }
  }, [dispatch, getPreviousStep, state.selectedResource, state.selectedService, state.selectedSlot]);

  // ── Confirm hold (called from confirm step) ───────────────────────────────
  const submitConfirm = useCallback(async () => {
    if (!state.holdToken) return;

    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const res = await apiPost<{
        data: {
          booking_id: number;
          status: string;
          next_action?: 'confirmed' | 'payment_required';
          payment_url?: string;
        };
      }>(`/hold/${state.holdToken}`, {});

      if (res.data.next_action === 'payment_required' && res.data.payment_url) {
        window.location.assign(res.data.payment_url);
        return;
      }

      if (res.data.next_action === 'payment_required') {
        dispatch({ type: 'SET_ERROR', error: 'Payment handoff is not configured for this booking.' });
        return;
      }

      if (res.data.next_action === 'confirmed' || res.data.status === 'confirmed' || res.data.status === 'pending') {
        dispatch({ type: 'SET_SUCCESS', bookingId: res.data.booking_id });
        return;
      }

      dispatch({ type: 'SET_ERROR', error: 'Unsupported booking confirmation response from the server.' });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 410) {
        dispatch({ type: 'SET_ERROR', error: 'Your reservation expired. Please start again.' });
        dispatch({ type: 'RESET' });
      } else {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'Booking failed. Please try again.' });
      }
    }
  }, [dispatch, state.holdToken]);

  useEffect(() => {
    if (layoutMode !== 'sections' || !Sections) {
      setConfiguredSectionOrder([]);
      setSectionOrderReady(true);
      return;
    }

    const nextOrder = Array.from(
      sectionOrderProbeRef.current?.querySelectorAll<HTMLElement>('[data-booking-section-step]') ?? [],
    ).map((node) => node.dataset.bookingSectionStep as BookingAuthorableStep | undefined)
      .filter((step): step is BookingAuthorableStep => Boolean(step));

    setConfiguredSectionOrder((currentOrder) => {
      return currentOrder.join('|') === nextOrder.join('|') ? currentOrder : nextOrder;
    });
    setSectionOrderReady(true);
  }, [Sections, layoutMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Editor placeholder
  // ─────────────────────────────────────────────────────────────────────────

  const renderContextValue = {
    serviceId,
    primaryColor: resolvedPrimaryColor,
    showPrices,
    successMessage,
    successContent,
    showProgress,
    progressOrientation,
    autoSkipSingleResource,
    showResourceDescription,
    text: bookingText,
    timeFormat,
    flowResolution,
    submitHold,
    submitConfirm,
    getNextStep,
    getPreviousStep,
    mode: 'runtime' as const,
  };
  const sectionOrderWarning = layoutMode === 'sections' ? flowResolution.message : null;

  return (
    <BookingRenderProvider value={renderContextValue}>
      <BookingWidgetShell
        instanceClassName={instanceClassName}
        headerContent={headerContent}
        editorCss={editorCss}
        dragRef={puck?.dragRef}
      >
        {layoutMode === 'sections' && Sections ? (
          <BookingRenderProvider value={{ ...renderContextValue, mode: 'order-inspection' }}>
            <div ref={sectionOrderProbeRef} style={{ display: 'none' }} aria-hidden="true">
              <Sections className="bw-sections-order-probe" minEmptyHeight={0} />
            </div>
          </BookingRenderProvider>
        ) : null}
        {!isEditing && showProgress && <BookingFlowNavigator resolution={flowResolution} />}
        {layoutMode === 'sections' && isEditing ? (
          <>
            {sectionOrderWarning && flowResolution.messageTone ? (
              <BookingSectionOrderWarning message={sectionOrderWarning} tone={flowResolution.messageTone} />
            ) : null}
            <BookingSectionsSlot sections={Sections} isEditing={true} />
          </>
        ) : layoutMode === 'sections' && shouldUseSectionsRuntime && isAuthorableBookingSectionStep(state.step) ? (
          <>
            <BookingErrorBanner />
            <BookingSectionsSlot sections={Sections} isEditing={false} />
          </>
        ) : layoutMode === 'sections' && shouldUseSectionsRuntime ? (
          <ParentManagedBookingStates
            primaryColor={resolvedPrimaryColor}
            successMessage={successMessage}
            successContent={successContent}
          />
        ) : layoutMode === 'sections' ? (
          <DefaultBookingSections
            serviceId={serviceId}
            primaryColor={resolvedPrimaryColor}
            showPrices={showPrices}
            successMessage={successMessage}
            successContent={successContent}
            timeFormat={timeFormat}
            submitHold={submitHold}
            submitConfirm={submitConfirm}
          />
        ) : isEditing ? (
          <BookingWidgetEditorPreview
            serviceId={serviceId}
            showPrices={showPrices}
            successMessage={successMessage}
            successContent={successContent}
            showProgress={showProgress}
            progressOrientation={progressOrientation}
            text={bookingText}
          />
        ) : (
          <DefaultBookingSections
            serviceId={serviceId}
            primaryColor={resolvedPrimaryColor}
            showPrices={showPrices}
            successMessage={successMessage}
            successContent={successContent}
            timeFormat={timeFormat}
            submitHold={submitHold}
            submitConfirm={submitConfirm}
          />
        )}
      </BookingWidgetShell>
    </BookingRenderProvider>
  );
}

export function BookingWidgetRender(props: BookingWidgetProps) {
  return (
    <BookingProvider initialServiceId={props.serviceId}>
      <BookingWidgetContent {...props} />
    </BookingProvider>
  );
}
