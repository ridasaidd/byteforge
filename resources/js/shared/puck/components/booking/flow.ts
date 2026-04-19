import type { WizardState, WizardStep } from './state';
import type { BookingAuthorableStep, BookingFlowResolution } from './sectionOrder';

type BookingRuntimeFlowStep = Exclude<BookingAuthorableStep, 'range_checkout'>;

export interface BookingFlowItem {
  step: BookingRuntimeFlowStep;
  label: string;
  status: 'upcoming' | 'current' | 'complete';
  isClickable: boolean;
}

const STEP_LABELS: Record<WizardStep, string> = {
  service: 'Service',
  resource: 'Resource',
  date: 'Date',
  slot: 'Time',
  customer: 'Details',
  confirm: 'Review',
  success: 'Complete',
  error: 'Resolve',
};

function getFlowStepLabel(step: BookingRuntimeFlowStep, resolution: BookingFlowResolution): string {
  if (step === 'slot' && resolution.selectionLabel) {
    return resolution.selectionLabel;
  }

  return STEP_LABELS[step];
}

export function getBookingActiveFlowStep(state: WizardState, resolution: BookingFlowResolution): WizardStep {
  if (state.step === 'success' || state.step === 'error') {
    if (state.customer) return 'confirm';
    if (state.selectedSlot) return 'customer';
    if (state.selectedResource) return 'slot';
    if (state.selectedDate) return 'resource';
    if (state.selectedService || !resolution.usesServiceStep) return 'date';
    return 'service';
  }

  return state.step;
}

function isStepCompleted(step: BookingRuntimeFlowStep, state: WizardState, resolution: BookingFlowResolution): boolean {
  switch (step) {
    case 'service':
      return resolution.usesServiceStep && Boolean(state.selectedService);
    case 'date':
      return Boolean(state.selectedService || !resolution.usesServiceStep);
    case 'resource':
      return Boolean(state.selectedDate);
    case 'slot':
      return Boolean(state.selectedResource);
    case 'customer':
      return Boolean(state.selectedSlot);
    case 'confirm':
      return Boolean(state.customer);
    default:
      return false;
  }
}

export function getBookingFlowItems(state: WizardState, resolution: BookingFlowResolution): BookingFlowItem[] {
  const flow = resolution.runtimeOrder.filter(
    (step): step is BookingRuntimeFlowStep => step !== 'range_checkout',
  );

  const activeStep = getBookingActiveFlowStep(state, resolution);
  const navigationLocked = state.step === 'success';

  return flow.map((step) => {
    const isCurrent = step === activeStep;
    const isComplete = !isCurrent && isStepCompleted(step, state, resolution);

    return {
      step,
      label: getFlowStepLabel(step, resolution),
      status: isCurrent ? 'current' : isComplete ? 'complete' : 'upcoming',
      isClickable: !navigationLocked && isComplete,
    };
  });
}

export function getBookingNextFlowStep(
  step: BookingAuthorableStep,
  resolution: BookingFlowResolution,
): BookingAuthorableStep | null {
  const index = resolution.runtimeOrder.indexOf(step);

  if (index === -1 || index >= resolution.runtimeOrder.length - 1) {
    return null;
  }

  return resolution.runtimeOrder[index + 1] ?? null;
}

export function getBookingPreviousFlowStep(
  step: BookingAuthorableStep,
  resolution: BookingFlowResolution,
): BookingAuthorableStep | null {
  const index = resolution.runtimeOrder.indexOf(step);

  if (index <= 0) {
    return null;
  }

  return resolution.runtimeOrder[index - 1] ?? null;
}
