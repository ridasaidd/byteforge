import { describe, expect, it } from 'vitest';
import {
  getBookingActiveFlowStep,
  getBookingFlowItems,
  getBookingNextFlowStep,
  getBookingPreviousFlowStep,
} from '../flow';
import { getDefaultBookingFlowResolution } from '../sectionOrder';
import { makeInitialState, type WizardState } from '../state';

function buildState(overrides: Partial<WizardState>): WizardState {
  return {
    ...makeInitialState(0),
    ...overrides,
  };
}

describe('booking flow helpers', () => {
  it('builds a slot-based flow with a service step when no service is preselected', () => {
    const state = buildState({
      step: 'service',
    });
    const resolution = getDefaultBookingFlowResolution(0);

    expect(getBookingFlowItems(state, resolution).map((item) => item.step)).toEqual([
      'service',
      'date',
      'resource',
      'slot',
      'customer',
      'confirm',
    ]);
    expect(getBookingFlowItems(state, resolution).find((item) => item.step === 'slot')?.label).toBe('Time');
  });

  it('keeps the slot flow clickable through review before payment locks navigation', () => {
    const state = buildState({
      step: 'customer',
      selectedService: {
        id: 1,
        name: 'Consultation',
        description: null,
        booking_mode: 'slot',
        duration_minutes: 30,
        price: 100,
        currency: 'SEK',
      },
      selectedDate: '2026-04-20',
      selectedResource: {
        id: 2,
        name: 'Alex',
        type: 'staff',
        resource_label: 'specialist',
      },
      selectedSlot: {
        starts_at: '2026-04-20T09:00:00Z',
        ends_at: '2026-04-20T09:30:00Z',
      },
    });
    const resolution = getDefaultBookingFlowResolution(0, 'slot');

    const items = getBookingFlowItems(state, resolution);

    expect(items.map((item) => item.step)).toEqual([
      'service',
      'date',
      'resource',
      'slot',
      'customer',
      'confirm',
    ]);
    expect(items.find((item) => item.step === 'date')?.isClickable).toBe(true);
    expect(items.find((item) => item.step === 'slot')?.status).toBe('complete');
    expect(items.find((item) => item.step === 'customer')?.status).toBe('current');
  });

  it('locks navigation once booking reaches success and keeps review as the active flow step', () => {
    const state = buildState({
      step: 'success',
      selectedService: {
        id: 1,
        name: 'Consultation',
        description: null,
        booking_mode: 'slot',
        duration_minutes: 30,
        price: 50,
        currency: 'SEK',
      },
      selectedDate: '2026-04-20',
      selectedResource: {
        id: 2,
        name: 'Alex',
        type: 'staff',
        resource_label: 'specialist',
      },
      selectedSlot: {
        starts_at: '2026-04-20T09:00:00Z',
        ends_at: '2026-04-20T09:30:00Z',
      },
      customer: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '',
        notes: '',
      },
    });
    const resolution = getDefaultBookingFlowResolution(0, 'slot');

    const items = getBookingFlowItems(state, resolution);

    expect(getBookingActiveFlowStep(state, resolution)).toBe('confirm');
    expect(items.find((item) => item.step === 'confirm')?.status).toBe('current');
    expect(items.every((item) => item.isClickable === false)).toBe(true);
  });

  it('returns previous and next authorable steps from the resolved flow', () => {
    const resolution = getDefaultBookingFlowResolution(0, 'slot');

    expect(getBookingPreviousFlowStep('date', resolution)).toBe('service');
    expect(getBookingNextFlowStep('date', resolution)).toBe('resource');
    expect(getBookingPreviousFlowStep('slot', resolution)).toBe('resource');
    expect(getBookingNextFlowStep('slot', resolution)).toBe('customer');
    expect(getBookingNextFlowStep('confirm', resolution)).toBeNull();
  });
});
