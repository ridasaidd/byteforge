import { renderPuckComponent } from '@/shared/puck/__tests__/testUtils';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockIsEditing = true;
let mockBookingContext: object | null = null;
let mockRenderContext: object | null = null;

vi.mock('@/shared/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks')>('@/shared/hooks');

  return {
    ...actual,
    usePuckEditMode: () => mockIsEditing,
  };
});

vi.mock('../BookingContext', async () => {
  const actual = await vi.importActual<typeof import('../BookingContext')>('../BookingContext');

  return {
    ...actual,
    useOptionalBookingContext: () => mockBookingContext,
  };
});

vi.mock('../BookingRenderContext', async () => {
  const actual = await vi.importActual<typeof import('../BookingRenderContext')>('../BookingRenderContext');

  return {
    ...actual,
    useOptionalBookingRenderContext: () => mockRenderContext,
  };
});

import { BookingServiceSection } from '../BookingSectionConfigs';

describe('booking section configs', () => {
  afterEach(() => {
    mockIsEditing = true;
    mockBookingContext = null;
    mockRenderContext = null;
  });

  it('renders a guard card when used outside the booking widget slot in edit mode', () => {
    renderPuckComponent(BookingServiceSection.render?.({} as never) as JSX.Element);

    expect(screen.getByText('Booking Service Step')).toBeInTheDocument();
    expect(screen.getByText('This block only works inside the Booking Widget sections slot.')).toBeInTheDocument();
  });

  it('renders an editor card when used inside the booking widget slot in edit mode', () => {
    mockBookingContext = { state: { step: 'service' } };
    mockRenderContext = { primaryColor: '#3b82f6', showPrices: true };
    const dragRef = vi.fn();

    renderPuckComponent(BookingServiceSection.render?.({ puck: { dragRef } } as never) as JSX.Element);

    expect(screen.getByText('Booking Service Step')).toBeInTheDocument();
    expect(screen.getByText('Service selection view for the beginning of the booking flow.')).toBeInTheDocument();
    expect(dragRef.mock.calls.some(([node]) => node instanceof HTMLElement)).toBe(true);
  });

  it('renders nothing at runtime when used outside the booking widget scope', () => {
    mockIsEditing = false;

    const { container } = renderPuckComponent(BookingServiceSection.render?.({} as never) as JSX.Element);

    expect(container).toBeEmptyDOMElement();
  });
});
