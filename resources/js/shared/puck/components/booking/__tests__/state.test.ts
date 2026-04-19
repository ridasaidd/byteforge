import { describe, expect, it } from 'vitest';
import { makeInitialState, reducer } from '../state';

describe('booking reducer', () => {
  it('uses the provided next step when selecting a preselected service flow', () => {
    const initial = makeInitialState(99);

    const next = reducer(initial, {
      type: 'SELECT_SERVICE',
      service: {
        id: 99,
        name: 'Consultation',
        description: null,
        booking_mode: 'slot',
        duration_minutes: 30,
        price: 50,
        currency: 'SEK',
      },
      nextStep: 'date',
    });

    expect(next.step).toBe('date');
    expect(next.selectedService?.booking_mode).toBe('slot');
  });

  it('uses explicit next steps for resource and customer transitions', () => {
    const afterResource = reducer(
      {
        ...makeInitialState(0),
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
      },
      {
        type: 'SELECT_RESOURCE',
        resource: {
          id: 2,
          name: 'Alex',
          type: 'staff',
          resource_label: 'specialist',
        },
        nextStep: 'slot',
      },
    );

    expect(afterResource.step).toBe('slot');

    const afterCustomer = reducer(afterResource, {
      type: 'SET_CUSTOMER',
      customer: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '',
        notes: '',
      },
      nextStep: 'confirm',
    });

    expect(afterCustomer.step).toBe('confirm');
    expect(afterCustomer.customer?.email).toBe('jane@example.com');
  });

  it('preserves recovery errors during loading and clears them on fresh selections', () => {
    const withError = {
      ...makeInitialState(0),
      step: 'slot' as const,
      error: 'That time slot is no longer available.',
    };

    const loadingState = reducer(withError, {
      type: 'SET_LOADING',
      loading: true,
      preserveError: true,
    });

    expect(loadingState.loading).toBe(true);
    expect(loadingState.error).toBe('That time slot is no longer available.');

    const afterSelection = reducer(loadingState, {
      type: 'SELECT_SLOT',
      slot: {
        starts_at: '2026-04-20T09:00:00Z',
        ends_at: '2026-04-20T09:30:00Z',
        available: true,
      },
      nextStep: 'customer',
    });

    expect(afterSelection.error).toBeNull();
    expect(afterSelection.step).toBe('customer');
  });

  it('moves back to a prior step with an error atomically', () => {
    const recovered = reducer(makeInitialState(0), {
      type: 'GO_STEP_WITH_ERROR',
      step: 'slot',
      error: 'That time slot is no longer available.',
    });

    expect(recovered.step).toBe('slot');
    expect(recovered.loading).toBe(false);
    expect(recovered.error).toBe('That time slot is no longer available.');
  });
});
