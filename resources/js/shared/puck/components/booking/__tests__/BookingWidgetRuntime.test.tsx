import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingWidgetRender } from '../BookingWidget';

vi.mock('@/shared/hooks', async () => {
  const actual = await vi.importActual('../../../../hooks');

  return {
    ...actual,
    usePuckEditMode: () => false,
    useTheme: () => ({ resolve: (_path: string, fallback?: string) => fallback ?? '' }),
  };
});

type FetchResponseShape = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function mockJsonResponse(body: unknown, status = 200): FetchResponseShape {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function setFetchMock(handler: (url: string, init?: RequestInit) => FetchResponseShape | Promise<FetchResponseShape>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return handler(url, init);
  }));
}

function clickFirstEnabledCalendarDay(container: HTMLElement) {
  const dayButton = container.querySelector<HTMLButtonElement>('.bw-calendar-day:not(.is-disabled)');
  expect(dayButton).not.toBeNull();
  fireEvent.click(dayButton!);
}

function clickFirstSlotButton(container: HTMLElement) {
  const slotButton = container.querySelector<HTMLButtonElement>('.bw-slot-grid .bw-slot');
  expect(slotButton).not.toBeNull();
  fireEvent.click(slotButton!);
}

describe('BookingWidget runtime flows', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('completes the legacy slot flow even when section layout is requested', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            {
              id: 7,
              name: 'Alex',
              type: 'staff',
              description: 'Senior specialist with evening availability.',
              resource_label: 'specialist',
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-1', expires_at: '2026-05-10T08:45:00Z' } });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        showResourceDescription={true}
        successMessage="Booked"
        layoutMode="sections"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    expect(screen.queryByText('Senior specialist with evening availability.')).not.toBeNull();
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    await screen.findByText('Confirm your booking');
    expect(screen.queryByText('Consultation')).not.toBeNull();
    expect(screen.queryByText('Alex')).not.toBeNull();
    expect(screen.queryByText('jane@example.com')).not.toBeNull();
  });

  it('shows a slot-only error when a preselected service uses range booking mode', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 42,
              name: 'Cabin stay',
              description: 'Overnight stay',
              booking_mode: 'range',
              duration_minutes: null,
              price: 120,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 9, name: 'Cabin A', type: 'room', resource_label: 'cabin' },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-2', expires_at: '2026-05-11T12:00:00Z' } });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={42}
        showPrices={true}
        successMessage="Booked"
        layoutMode="sections"
      />,
    );

    await screen.findByText(/appointment-style slot bookings only/i);
  expect(within(container).queryByText('Choose check-in date')).toBeNull();
  });

  it('can skip the resource step automatically when only one resource exists', async () => {
    setFetchMock((url) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        autoSkipSingleResource={true}
        successMessage="Booked"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    const dayButton = document.querySelector<HTMLButtonElement>('.bw-calendar-day:not(.is-disabled)');
    expect(dayButton).not.toBeNull();
    fireEvent.click(dayButton!);

    await screen.findByText(/Slots for/);
    expect(screen.queryByText(/Choose your specialist|Choose a resource/)).toBeNull();
  });

  it('applies guest detail label and placeholder overrides for all four sprint fields', async () => {
    setFetchMock((url) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        customerStepTitle="Guest details"
        fullNameLabelText="Guest name *"
        fullNamePlaceholderText="Full name for the booking"
        emailLabelText="Guest email *"
        emailPlaceholderText="guest@example.com"
        phoneLabelText="Guest phone"
        phonePlaceholderText="+46 701234567"
        notesLabelText="Custom message"
        notesPlaceholderText="Tell us anything we should know"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Guest details');
    expect(screen.getByText('Guest name *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full name for the booking')).toBeInTheDocument();
    expect(screen.getByText('Guest email *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('guest@example.com')).toBeInTheDocument();
    expect(screen.getByText('Guest phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+46 701234567')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tell us anything we should know')).toBeInTheDocument();
  });

  it('returns to the resolved selection step when a hold conflict occurs', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ message: 'That time slot is no longer available.' }, 409);
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        layoutMode="sections"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));
    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);
    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));
    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
  fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    await waitFor(() => {
      expect(screen.queryByText(/That (time )?slot is no longer available/i)).not.toBeNull();
    });
    expect(screen.queryByText(/Slots for/)).not.toBeNull();
    expect(within(container).queryByText('Your details')).toBeNull();
  });

  it('renders custom success slot content after confirmation succeeds', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-1', expires_at: '2026-05-10T08:45:00Z' } });
      }

      if (url.endsWith('/api/public/booking/hold/hold-1') && init?.method === 'POST') {
        return mockJsonResponse({ data: { booking_id: 88, status: 'confirmed' } });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        successContent={() => <div>Fully custom success state</div>}
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    await screen.findByText('Confirm your booking');
    fireEvent.click(screen.getByText('Confirm booking'));

    await screen.findByText('Fully custom success state');
    expect(screen.queryByText(/A confirmation email has been sent/i)).toBeNull();
  });

  it('falls back to the default success state when Puck provides an empty success slot', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-1', expires_at: '2026-05-10T08:45:00Z' } });
      }

      if (url.endsWith('/api/public/booking/hold/hold-1') && init?.method === 'POST') {
        return mockJsonResponse({ data: { booking_id: 88, status: 'confirmed', next_action: 'confirmed' } });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Appointment confirmed!"
        successContent={() => <div />}
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    await screen.findByText('Confirm your booking');
    fireEvent.click(screen.getByText('Confirm booking'));

    await screen.findByText('Appointment confirmed!');
    expect(screen.getByText(/A confirmation has been sent to/i)).toBeInTheDocument();
  });

  it('switches the final CTA and redirects to the payment handoff when payment is required', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: true,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-1', expires_at: '2026-05-10T08:45:00Z' } });
      }

      if (url.endsWith('/api/public/booking/hold/hold-1') && init?.method === 'POST') {
        return mockJsonResponse({
          data: {
            booking_id: 88,
            status: 'awaiting_payment',
            next_action: 'payment_required',
            payment_url: 'http://tenant-one.byteforge.se/booking/payment#token=hold-1',
          },
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    const continueButton = await screen.findByText('Continue to payment');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([input, init]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        return url.endsWith('/api/public/booking/hold/hold-1') && init?.method === 'POST';
      })).toBe(true);
    });
  });

  it('shows an error when payment is required but the handoff URL is missing', async () => {
    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 1,
              name: 'Consultation',
              description: '30 min session',
              booking_mode: 'slot',
              duration_minutes: 30,
              price: 50,
              currency: 'SEK',
              requires_payment: true,
            },
          ],
        });
      }

      if (url.includes('/api/public/booking/resources')) {
        return mockJsonResponse({
          data: [
            { id: 7, name: 'Alex', type: 'staff', resource_label: 'specialist' },
          ],
        });
      }

      if (url.includes('/api/public/booking/slots')) {
        return mockJsonResponse({
          data: [
            {
              starts_at: '2026-05-10T09:00:00Z',
              ends_at: '2026-05-10T09:30:00Z',
              available: true,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/booking/hold') && init?.method === 'POST') {
        return mockJsonResponse({ data: { hold_token: 'hold-1', expires_at: '2026-05-10T08:45:00Z' } });
      }

      if (url.endsWith('/api/public/booking/hold/hold-1') && init?.method === 'POST') {
        return mockJsonResponse({
          data: {
            booking_id: 88,
            status: 'awaiting_payment',
            next_action: 'payment_required',
          },
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    const { container } = render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Consultation'));

    await screen.findByText('Choose a date');
    clickFirstEnabledCalendarDay(container);

    await screen.findByText(/Choose your specialist|Choose a resource/);
    fireEvent.click(await screen.findByText('Alex'));

    await screen.findByText(/Slots for/);
    clickFirstSlotButton(container);

    await screen.findByText('Your details');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('Continue to review'));

    fireEvent.click(await screen.findByText('Continue to payment'));

    await screen.findByText('Payment handoff is not configured for this booking.');
  });
});
