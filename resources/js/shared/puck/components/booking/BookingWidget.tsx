/**
 * BookingWidget — Puck page-builder component for the Booking add-on.
 *
 * Requires the `booking` feature flag to be active on the tenant.
 * The PageEditorPage conditionally registers this component only when
 * the addon is enabled, so it never appears in the Puck sidebar for
 * tenants who don't have the add-on.
 *
 * Multi-step wizard flow:
 *   service → resource → date → slot/range → customer → confirm → success
 */

import type { ComponentConfig } from '@puckeditor/core';
import { useReducer, useEffect, useCallback, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isBefore,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { usePuckEditMode } from '@/shared/hooks';
import { ColorPickerControlColorful as ColorPickerControl } from '../../fields';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingService {
  id: number;
  name: string;
  description: string | null;
  booking_mode: 'slot' | 'range';
  duration_minutes: number | null;
  price: number | null;
  currency: string | null;
}

interface BookingResource {
  id: number;
  name: string;
  type: string;
  resource_label: string | null;
}

interface Slot {
  starts_at: string;
  ends_at: string;
  available: boolean;
}

type WizardStep =
  | 'service'
  | 'resource'
  | 'date'
  | 'slot'
  | 'range_checkout'
  | 'customer'
  | 'confirm'
  | 'success'
  | 'error';

interface WizardState {
  step: WizardStep;
  services: BookingService[];
  resources: BookingResource[];
  slots: Slot[];
  selectedService: BookingService | null;
  selectedResource: BookingResource | null;
  selectedDate: string | null;      // Y-m-d
  selectedSlot: Slot | null;
  checkIn: string | null;           // Y-m-d (range mode)
  checkOut: string | null;          // Y-m-d (range mode)
  customer: { name: string; email: string; phone: string; notes: string } | null;
  holdToken: string | null;
  holdExpiresAt: string | null;
  bookingId: number | null;
  loading: boolean;
  error: string | null;
  currentMonth: Date;
}

type WizardAction =
  | { type: 'SET_SERVICES'; services: BookingService[] }
  | { type: 'SET_RESOURCES'; resources: BookingResource[] }
  | { type: 'SET_SLOTS'; slots: Slot[] }
  | { type: 'SELECT_SERVICE'; service: BookingService }
  | { type: 'SELECT_RESOURCE'; resource: BookingResource }
  | { type: 'SELECT_DATE'; date: string }
  | { type: 'SELECT_SLOT'; slot: Slot }
  | { type: 'SELECT_CHECKOUT'; date: string }
  | { type: 'SET_CUSTOMER'; customer: WizardState['customer'] }
  | { type: 'SET_HOLD'; holdToken: string; holdExpiresAt: string }
  | { type: 'SET_SUCCESS'; bookingId: number }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'GO_STEP'; step: WizardStep }
  | { type: 'RESET' };

function makeInitialState(initialServiceId: number): WizardState {
  return {
    step: initialServiceId > 0 ? 'resource' : 'service',
    services: [],
    resources: [],
    slots: [],
    selectedService: null,
    selectedResource: null,
    selectedDate: null,
    selectedSlot: null,
    checkIn: null,
    checkOut: null,
    customer: null,
    holdToken: null,
    holdExpiresAt: null,
    bookingId: null,
    loading: false,
    error: null,
    currentMonth: new Date(),
  };
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_SERVICES':
      return { ...state, services: action.services, loading: false };
    case 'SET_RESOURCES':
      return { ...state, resources: action.resources, loading: false };
    case 'SET_SLOTS':
      return { ...state, slots: action.slots, loading: false };
    case 'SELECT_SERVICE':
      return {
        ...state,
        selectedService: action.service,
        selectedResource: null,
        selectedDate: null,
        selectedSlot: null,
        checkIn: null,
        checkOut: null,
        resources: [],
        slots: [],
        step: 'resource',
      };
    case 'SELECT_RESOURCE':
      return {
        ...state,
        selectedResource: action.resource,
        selectedDate: null,
        selectedSlot: null,
        checkIn: null,
        checkOut: null,
        slots: [],
        step: 'date',
      };
    case 'SELECT_DATE':
      return {
        ...state,
        selectedDate: action.date,
        selectedSlot: null,
        slots: [],
        step: state.selectedService?.booking_mode === 'slot' ? 'slot' : 'range_checkout',
      };
    case 'SELECT_SLOT':
      return { ...state, selectedSlot: action.slot, step: 'customer' };
    case 'SELECT_CHECKOUT':
      return { ...state, checkOut: action.date, step: 'customer' };
    case 'SET_CUSTOMER':
      return { ...state, customer: action.customer, step: 'confirm' };
    case 'SET_HOLD':
      return { ...state, holdToken: action.holdToken, holdExpiresAt: action.holdExpiresAt, loading: false, step: 'confirm' };
    case 'SET_SUCCESS':
      return { ...state, bookingId: action.bookingId, loading: false, step: 'success' };
    case 'SET_LOADING':
      return { ...state, loading: action.loading, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'PREV_MONTH':
      return { ...state, currentMonth: subMonths(state.currentMonth, 1) };
    case 'NEXT_MONTH':
      return { ...state, currentMonth: addMonths(state.currentMonth, 1) };
    case 'GO_STEP':
      return { ...state, step: action.step, error: null };
    case 'RESET':
      return makeInitialState(0);
    default:
      return state;
  }
}

// ─── API helpers (plain fetch — public unauthenticated endpoints) ─────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public/booking${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/public/booking${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status, body });
  }
  return body as T;
}

// ─── Calendar component ───────────────────────────────────────────────────────

interface CalendarProps {
  month: Date;
  selected: string | null;
  rangeStart?: string | null;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  primaryColor: string;
  isCheckout?: boolean;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function MiniCalendar({ month, selected, rangeStart, onSelect, onPrev, onNext, primaryColor, isCheckout }: CalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd   = endOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today      = new Date();

  function isDisabled(d: Date): boolean {
    if (isBefore(d, today) && !isToday(d)) return true;
    if (isCheckout && rangeStart) {
      // Check-out must be after check-in
      return !isBefore(parseISO(rangeStart), d) || isSameDay(parseISO(rangeStart), d);
    }
    return false;
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          type="button"
          onClick={onPrev}
          style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{format(month, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={onNext}
          style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map(day => {
          const dateStr    = format(day, 'yyyy-MM-dd');
          const inMonth    = day.getMonth() === month.getMonth();
          const sel        = selected ? isSameDay(day, parseISO(selected)) : false;
          const disabled   = isDisabled(day);
          const todayMark  = isToday(day);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              style={{
                padding: '6px 0',
                textAlign: 'center',
                fontSize: 13,
                borderRadius: 6,
                border: todayMark && !sel ? `1px solid ${primaryColor}` : '1px solid transparent',
                background: sel ? primaryColor : 'transparent',
                color: sel ? '#fff' : disabled ? '#d1d5db' : !inMonth ? '#d1d5db' : '#111827',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: sel ? 700 : 400,
                transition: 'background 0.15s',
              }}
              aria-label={format(day, 'PPP')}
              aria-pressed={sel}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function StepHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>{children}</h3>;
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {children}
    </div>
  );
}

function SelectCard({
  label,
  sublabel,
  onClick,
  primaryColor,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  primaryColor: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        borderRadius: 8,
        border: `1px solid ${hover ? primaryColor : '#e5e7eb'}`,
        background: hover ? `${primaryColor}11` : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sublabel}</div>}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#6b7280',
        fontSize: 13,
        padding: '0 0 12px',
      }}
    >
      <ChevronLeft size={14} /> Back
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  primaryColor,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  primaryColor: string;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 16px',
        background: disabled || loading ? '#9ca3af' : primaryColor,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        marginTop: 12,
        transition: 'background 0.15s',
      }}
    >
      {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      background: '#fef2f2',
      border: '1px solid #fca5a5',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 12,
      fontSize: 13,
      color: '#dc2626',
    }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0 }}>✕</button>
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────

export interface BookingWidgetProps {
  title: string;
  serviceId: number;
  primaryColor: string;
  showPrices: boolean;
  successMessage: string;
}

function BookingWidgetRender(props: BookingWidgetProps) {
  const { title, serviceId, primaryColor, showPrices, successMessage } = props;
  const isEditing = usePuckEditMode();

  const [state, dispatch] = useReducer(reducer, makeInitialState(serviceId));

  // ── Load services on mount if no pre-selected service ────────────────────
  useEffect(() => {
    if (isEditing) return;
    if (serviceId > 0) return; // designer pre-selected a service — skip service list

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingService[] }>('/services')
      .then(res => dispatch({ type: 'SET_SERVICES', services: res.data }))
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load services.' }));
  }, [isEditing, serviceId]);

  // ── Load pre-selected service detail when serviceId is set ───────────────
  useEffect(() => {
    if (isEditing || serviceId <= 0) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingService[] }>('/services')
      .then(res => {
        const svc = res.data.find(s => s.id === serviceId) ?? null;
        if (svc) dispatch({ type: 'SELECT_SERVICE', service: svc });
        else     dispatch({ type: 'SET_ERROR', error: 'The configured service was not found.' });
      })
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load service.' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, serviceId]);

  // ── Load resources when a service is selected ─────────────────────────────
  useEffect(() => {
    if (isEditing || !state.selectedService) return;
    if (state.step !== 'resource') return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: BookingResource[] }>(`/resources?service_id=${state.selectedService.id}`)
      .then(res => dispatch({ type: 'SET_RESOURCES', resources: res.data }))
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load resources.' }));
  }, [isEditing, state.selectedService, state.step]);

  // ── Load slots when a date is selected (slot mode) ────────────────────────
  useEffect(() => {
    if (isEditing || state.step !== 'slot') return;
    if (!state.selectedService || !state.selectedResource || !state.selectedDate) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    apiFetch<{ data: Slot[] }>(
      `/slots?service_id=${state.selectedService.id}&resource_id=${state.selectedResource.id}&date=${state.selectedDate}`,
    )
      .then(res => dispatch({ type: 'SET_SLOTS', slots: res.data }))
      .catch(err => dispatch({ type: 'SET_ERROR', error: err.message ?? 'Failed to load slots.' }));
  }, [isEditing, state.step, state.selectedService, state.selectedResource, state.selectedDate]);

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

    if (state.selectedService.booking_mode === 'slot' && state.selectedSlot) {
      payload.starts_at = state.selectedSlot.starts_at;
      payload.ends_at   = state.selectedSlot.ends_at;
    } else {
      payload.check_in  = state.checkIn;
      payload.check_out = state.checkOut;
    }

    try {
      const res = await apiPost<{ data: { hold_token: string; expires_at: string } }>('/hold', payload);
      dispatch({ type: 'SET_CUSTOMER', customer });
      dispatch({ type: 'SET_HOLD', holdToken: res.data.hold_token, holdExpiresAt: res.data.expires_at });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409 || e.status === 422) {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'That slot is no longer available. Please choose another.' });
        dispatch({ type: 'GO_STEP', step: 'date' });
      } else {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'Could not reserve your slot. Please try again.' });
      }
    }
  }, [state.selectedService, state.selectedResource, state.selectedSlot, state.checkIn, state.checkOut]);

  // ── Confirm hold (called from confirm step) ───────────────────────────────
  const submitConfirm = useCallback(async () => {
    if (!state.holdToken) return;

    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const res = await apiPost<{ data: { booking_id: number } }>(`/hold/${state.holdToken}`, {});
      dispatch({ type: 'SET_SUCCESS', bookingId: res.data.booking_id });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 410) {
        dispatch({ type: 'SET_ERROR', error: 'Your reservation expired. Please start again.' });
        dispatch({ type: 'RESET' });
      } else {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'Booking failed. Please try again.' });
      }
    }
  }, [state.holdToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // Editor placeholder
  // ─────────────────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <div style={{
        border: '2px dashed #3b82f6',
        borderRadius: 12,
        padding: 24,
        background: '#eff6ff',
        textAlign: 'center',
        color: '#1d4ed8',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title || 'Booking Widget'}</div>
        <div style={{ fontSize: 13, color: '#3b82f6' }}>
          {serviceId > 0 ? `Pre-selected service ID: ${serviceId}` : 'Customer selects service'}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
          This widget renders a multi-step booking wizard on the public storefront.
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Container
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      maxWidth: 420,
      margin: '0 auto',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      {title && (
        <div style={{
          background: primaryColor,
          color: '#fff',
          padding: '16px 20px',
          fontWeight: 700,
          fontSize: 18,
        }}>
          {title}
        </div>
      )}

      {/* Step spin animation style */}
      <style>{`@keyframes bw-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: 20 }}>
        {state.error && (
          <ErrorBanner message={state.error} onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })} />
        )}

        {/* ── Step: service ── */}
        {state.step === 'service' && (
          <>
            <StepHeading>Select a service</StepHeading>
            {state.loading
              ? <Loader2 size={24} style={{ animation: 'bw-spin 1s linear infinite', display: 'block', margin: '24px auto' }} />
              : (
                <CardGrid>
                  {state.services.map(svc => (
                    <SelectCard
                      key={svc.id}
                      label={svc.name}
                      sublabel={
                        svc.description
                          ? `${svc.description}${showPrices && svc.price ? ` · ${svc.price} ${svc.currency ?? ''}` : ''}`
                          : showPrices && svc.price ? `${svc.price} ${svc.currency ?? ''}` : undefined
                      }
                      onClick={() => dispatch({ type: 'SELECT_SERVICE', service: svc })}
                      primaryColor={primaryColor}
                    />
                  ))}
                </CardGrid>
              )}
          </>
        )}

        {/* ── Step: resource ── */}
        {state.step === 'resource' && (
          <>
            {serviceId === 0 && <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: 'service' })} />}
            <StepHeading>
              {state.selectedService?.name}
              {' — '}
              {state.selectedService?.booking_mode === 'range' ? 'Choose your accommodation' : 'Choose a resource'}
            </StepHeading>
            {state.loading
              ? <Loader2 size={24} style={{ animation: 'bw-spin 1s linear infinite', display: 'block', margin: '24px auto' }} />
              : (
                <CardGrid>
                  {state.resources.length === 0
                    ? <p style={{ color: '#6b7280', fontSize: 13 }}>No resources available at this time.</p>
                    : state.resources.map(r => (
                      <SelectCard
                        key={r.id}
                        label={r.name}
                        sublabel={r.resource_label ?? undefined}
                        onClick={() => dispatch({ type: 'SELECT_RESOURCE', resource: r })}
                        primaryColor={primaryColor}
                      />
                    ))}
                </CardGrid>
              )}
          </>
        )}

        {/* ── Step: date ── */}
        {state.step === 'date' && (
          <>
            <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: 'resource' })} />
            <StepHeading>
              {state.selectedService?.booking_mode === 'range' ? 'Choose check-in date' : 'Choose a date'}
            </StepHeading>
            <MiniCalendar
              month={state.currentMonth}
              selected={state.selectedDate}
              onSelect={date => dispatch({ type: 'SELECT_DATE', date })}
              onPrev={() => dispatch({ type: 'PREV_MONTH' })}
              onNext={() => dispatch({ type: 'NEXT_MONTH' })}
              primaryColor={primaryColor}
            />
          </>
        )}

        {/* ── Step: slot ── */}
        {state.step === 'slot' && (
          <>
            <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: 'date' })} />
            <StepHeading>
              Slots for {state.selectedDate ? format(parseISO(state.selectedDate), 'PP') : ''}
            </StepHeading>
            {state.loading
              ? <Loader2 size={24} style={{ animation: 'bw-spin 1s linear infinite', display: 'block', margin: '24px auto' }} />
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {state.slots.length === 0 && (
                    <p style={{ color: '#6b7280', fontSize: 13, gridColumn: '1/-1' }}>No availability configured for this date. Please try a different date.</p>
                  )}
                  {state.slots.length > 0 && state.slots.filter(s => s.available).length === 0 && (
                    <p style={{ color: '#6b7280', fontSize: 13, gridColumn: '1/-1' }}>All slots are booked on this date. Please try a different date.</p>
                  )}
                  {state.slots.filter(s => s.available).map(slot => (
                    <button
                      key={slot.starts_at}
                      type="button"
                      onClick={() => dispatch({ type: 'SELECT_SLOT', slot })}
                      style={{
                        padding: '8px 4px',
                        textAlign: 'center',
                        borderRadius: 6,
                        border: `1px solid ${primaryColor}`,
                        background: '#fff',
                        color: primaryColor,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                    >
                      {format(parseISO(slot.starts_at), 'HH:mm')}
                    </button>
                  ))}
                </div>
              )}
          </>
        )}

        {/* ── Step: range_checkout ── */}
        {state.step === 'range_checkout' && (
          <>
            <BackButton onClick={() => dispatch({ type: 'GO_STEP', step: 'date' })} />
            <StepHeading>Choose check-out date</StepHeading>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
              Check-in: {state.checkIn ? format(parseISO(state.checkIn), 'PP') : state.selectedDate ? format(parseISO(state.selectedDate), 'PP') : ''}
            </p>
            <MiniCalendar
              month={state.currentMonth}
              selected={state.checkOut}
              rangeStart={state.selectedDate ?? undefined}
              onSelect={date => dispatch({ type: 'SELECT_CHECKOUT', date })}
              onPrev={() => dispatch({ type: 'PREV_MONTH' })}
              onNext={() => dispatch({ type: 'NEXT_MONTH' })}
              primaryColor={primaryColor}
              isCheckout={true}
            />
          </>
        )}

        {/* ── Step: customer ── */}
        {state.step === 'customer' && (
          <CustomerForm
            onBack={() => dispatch({
              type: 'GO_STEP',
              step: state.selectedService?.booking_mode === 'slot' ? 'slot' : 'range_checkout',
            })}
            onSubmit={submitHold}
            loading={state.loading}
            primaryColor={primaryColor}
          />
        )}

        {/* ── Step: confirm ── */}
        {state.step === 'confirm' && state.selectedService && state.customer && (
          <>
            <StepHeading>Confirm your booking</StepHeading>
            <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              <Row label="Service" value={state.selectedService.name} />
              <Row label="Resource" value={state.selectedResource?.name ?? ''} />
              {state.selectedService.booking_mode === 'slot' && state.selectedSlot && (
                <>
                  <Row label="Date" value={format(parseISO(state.selectedSlot.starts_at), 'PP')} />
                  <Row label="Time" value={`${format(parseISO(state.selectedSlot.starts_at), 'HH:mm')} – ${format(parseISO(state.selectedSlot.ends_at), 'HH:mm')}`} />
                </>
              )}
              {state.selectedService.booking_mode === 'range' && state.selectedDate && state.checkOut && (
                <>
                  <Row label="Check-in"  value={format(parseISO(state.selectedDate), 'PP')} />
                  <Row label="Check-out" value={format(parseISO(state.checkOut), 'PP')} />
                </>
              )}
              <Row label="Name"  value={state.customer.name} />
              <Row label="Email" value={state.customer.email} />
              {state.customer.phone && <Row label="Phone" value={state.customer.phone} />}
            </div>
            {state.holdExpiresAt && (
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Your slot is reserved until {format(parseISO(state.holdExpiresAt), 'HH:mm')}.
              </p>
            )}
            <PrimaryButton
              onClick={submitConfirm}
              loading={state.loading}
              primaryColor={primaryColor}
            >
              Confirm booking
            </PrimaryButton>
            <button
              type="button"
              onClick={() => dispatch({ type: 'GO_STEP', step: 'customer' })}
              style={{ display: 'block', width: '100%', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13 }}
            >
              Edit details
            </button>
          </>
        )}

        {/* ── Step: success ── */}
        {state.step === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle size={48} color={primaryColor} style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>{successMessage || 'Booking confirmed!'}</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              A confirmation has been sent to {state.customer?.email}.
            </p>
          </div>
        )}

        {/* ── Step: error ── */}
        {state.step === 'error' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <AlertCircle size={48} color="#dc2626" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Something went wrong</p>
            <PrimaryButton onClick={() => dispatch({ type: 'RESET' })} primaryColor={primaryColor}>
              Try again
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Customer form (separate component to own its own form state) ─────────────

function CustomerForm({
  onBack,
  onSubmit,
  loading,
  primaryColor,
}: {
  onBack: () => void;
  onSubmit: (data: { name: string; email: string; phone: string; notes: string }) => void;
  loading: boolean;
  primaryColor: string;
}) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
    marginBottom: 10,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 4,
    color: '#374151',
  };

  return (
    <form onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />
      <StepHeading>Your details</StepHeading>

      <label style={labelStyle}>Full name *</label>
      <input
        required
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        style={inputStyle}
        maxLength={120}
      />

      <label style={labelStyle}>Email *</label>
      <input
        required
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={inputStyle}
        maxLength={255}
      />

      <label style={labelStyle}>Phone</label>
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="+46 70 000 00 00"
        style={inputStyle}
        maxLength={30}
      />

      <label style={labelStyle}>Notes</label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Any special requests…"
        rows={3}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        maxLength={1000}
      />

      <PrimaryButton loading={loading} primaryColor={primaryColor}>
        Continue to review
      </PrimaryButton>
    </form>
  );
}

// ─── Confirm step helper ──────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#6b7280', minWidth: 80 }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Puck component config ────────────────────────────────────────────────────

export const BookingWidget: ComponentConfig<BookingWidgetProps> = {
  label: 'Booking Widget',

  fields: {
    title: {
      type: 'text',
      label: 'Title',
    },
    serviceId: {
      type: 'number',
      label: 'Pre-selected Service ID (0 = customer picks)',
    },
    primaryColor: {
      type: 'custom',
      label: 'Primary Color',
      render: (props) => (
        <ColorPickerControl
          {...props}
          value={
            typeof props.value === 'string'
              ? { type: 'custom' as const, value: props.value }
              : (props.value ?? { type: 'custom' as const, value: '#3b82f6' })
          }
          onChange={(cv) =>
            props.onChange(cv?.type === 'custom' ? cv.value : '#3b82f6')
          }
        />
      ),
    },
    showPrices: {
      type: 'radio',
      label: 'Show prices',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    successMessage: {
      type: 'text',
      label: 'Success message',
    },
  },

  defaultProps: {
    title: 'Book Now',
    serviceId: 0,
    primaryColor: '#3b82f6',
    showPrices: true,
    successMessage: 'Your booking is confirmed!',
  },

  render: BookingWidgetRender,
};
