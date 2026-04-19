import { addMonths, subMonths } from 'date-fns';
import type { BookingResource, BookingService, Slot } from './types';

export type WizardStep =
  | 'service'
  | 'resource'
  | 'date'
  | 'slot'
  | 'customer'
  | 'confirm'
  | 'success'
  | 'error';

export interface WizardState {
  step: WizardStep;
  services: BookingService[];
  resources: BookingResource[];
  slots: Slot[];
  selectedService: BookingService | null;
  selectedResource: BookingResource | null;
  selectedDate: string | null;
  selectedSlot: Slot | null;
  customer: { name: string; email: string; phone: string; notes: string } | null;
  holdToken: string | null;
  holdExpiresAt: string | null;
  bookingId: number | null;
  loading: boolean;
  error: string | null;
  currentMonth: Date;
}

export type WizardAction =
  | { type: 'SET_SERVICES'; services: BookingService[] }
  | { type: 'SET_RESOURCES'; resources: BookingResource[] }
  | { type: 'SET_SLOTS'; slots: Slot[] }
  | { type: 'SELECT_SERVICE'; service: BookingService; nextStep: WizardStep }
  | { type: 'SELECT_RESOURCE'; resource: BookingResource; nextStep: WizardStep }
  | { type: 'SELECT_DATE'; date: string; nextStep: WizardStep }
  | { type: 'SELECT_SLOT'; slot: Slot; nextStep: WizardStep }
  | { type: 'SET_CUSTOMER'; customer: WizardState['customer']; nextStep: WizardStep }
  | { type: 'SET_HOLD'; holdToken: string; holdExpiresAt: string }
  | { type: 'SET_SUCCESS'; bookingId: number }
  | { type: 'SET_LOADING'; loading: boolean; preserveError?: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'GO_STEP'; step: WizardStep }
  | { type: 'GO_STEP_WITH_ERROR'; step: WizardStep; error: string }
  | { type: 'RESET' };

export function makeInitialState(initialServiceId: number): WizardState {
  return {
    step: initialServiceId > 0 ? 'date' : 'service',
    services: [],
    resources: [],
    slots: [],
    selectedService: null,
    selectedResource: null,
    selectedDate: null,
    selectedSlot: null,
    customer: null,
    holdToken: null,
    holdExpiresAt: null,
    bookingId: null,
    loading: false,
    error: null,
    currentMonth: new Date(),
  };
}

export function reducer(state: WizardState, action: WizardAction): WizardState {
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
        resources: [],
        slots: [],
        error: null,
        step: action.nextStep,
      };
    case 'SELECT_DATE':
      return {
        ...state,
        selectedDate: action.date,
        selectedResource: null,
        selectedSlot: null,
        resources: [],
        slots: [],
        error: null,
        step: action.nextStep,
      };
    case 'SELECT_RESOURCE':
      return {
        ...state,
        selectedResource: action.resource,
        selectedSlot: null,
        slots: [],
        error: null,
        step: action.nextStep,
      };
    case 'SELECT_SLOT':
      return { ...state, selectedSlot: action.slot, error: null, step: action.nextStep };
    case 'SET_CUSTOMER':
      return { ...state, customer: action.customer, error: null, step: action.nextStep };
    case 'SET_HOLD':
      return { ...state, holdToken: action.holdToken, holdExpiresAt: action.holdExpiresAt, loading: false, step: 'confirm' };
    case 'SET_SUCCESS':
      return { ...state, bookingId: action.bookingId, loading: false, step: 'success' };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.loading,
        error: action.preserveError ? state.error : null,
      };
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
    case 'GO_STEP_WITH_ERROR':
      return { ...state, loading: false, step: action.step, error: action.error };
    case 'RESET':
      return makeInitialState(0);
    default:
      return state;
  }
}
