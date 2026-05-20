import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingWidgetRender, buildQuoteRequestBody } from '../BookingWidget';
import { getTenantBaseUrl } from '../../../../../../../tests/support/runtimeTestConfig';

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

  it('routes quote-request services into a service-bound quote request flow', async () => {
    const quoteRequestSpy = vi.fn();

    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 21,
              name: 'Color correction',
              description: 'Complex color work for longer hair.',
              booking_mode: 'slot',
              customer_flow: 'quote_request',
              duration_minutes: 120,
              price: null,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/quotes/requests') && init?.method === 'POST') {
        quoteRequestSpy(JSON.parse(String(init.body)));

        return mockJsonResponse({
          data: {
            id: 5,
            requested_booking_service_id: 21,
            guest_name: 'Jane Doe',
            guest_email: 'jane@example.com',
            status: 'submitted',
            submitted_at: '2026-05-10T08:00:00Z',
          },
        }, 201);
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Quote request received"
      />,
    );

    await screen.findByText('Select a service');
    fireEvent.click(await screen.findByText('Color correction'));

    expect(await screen.findByText('Request a quote for Color correction')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Share anything we should know...'), {
      target: { value: 'Long hair and a full color change.' },
    });
    fireEvent.change(screen.getByLabelText('Preferred earliest date'), { target: { value: '2026-05-20T09:00' } });
    fireEvent.change(screen.getByLabelText('Preferred latest date'), { target: { value: '2026-05-23T18:00' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Send quote request' }).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(quoteRequestSpy).toHaveBeenCalledWith({
        requested_booking_service_id: 21,
        guest_name: 'Jane Doe',
        guest_email: 'jane@example.com',
        guest_phone: undefined,
        subject_label: 'Color correction',
        request_description: 'Long hair and a full color change.',
        preferred_start_at: '2026-05-20T09:00',
        preferred_end_at: '2026-05-23T18:00',
      });
    });

    expect(await screen.findByText('Quote request received')).toBeInTheDocument();
    expect(screen.getByText('We received your request and will follow up at jane@example.com.')).toBeInTheDocument();
  });

  it('lets either-flow services branch into quote request from the service card', async () => {
    const quoteRequestSpy = vi.fn();

    setFetchMock((url, init) => {
      if (url.endsWith('/api/public/booking/config')) {
        return mockJsonResponse({ data: { time_format: 'HH:mm' } });
      }

      if (url.endsWith('/api/public/booking/services')) {
        return mockJsonResponse({
          data: [
            {
              id: 31,
              name: 'Bridal styling',
              description: 'Book directly or request a tailored quote.',
              booking_mode: 'slot',
              customer_flow: 'either',
              duration_minutes: 90,
              price: 150,
              currency: 'SEK',
              requires_payment: false,
            },
          ],
        });
      }

      if (url.endsWith('/api/public/quotes/requests') && init?.method === 'POST') {
        quoteRequestSpy(JSON.parse(String(init.body)));

        return mockJsonResponse({
          data: {
            id: 6,
            requested_booking_service_id: 31,
            guest_name: 'Jane Doe',
            guest_email: 'jane@example.com',
            status: 'submitted',
            submitted_at: '2026-05-10T08:00:00Z',
          },
        }, 201);
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    render(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Quote request received"
      />,
    );

    await screen.findByText('Bridal styling');
    fireEvent.click(screen.getByRole('button', { name: 'Get custom quote' }));

    expect(await screen.findByText('Request a quote for Bridal styling')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Share anything we should know...'), {
      target: { value: 'Need styling plus early morning prep.' },
    });
    fireEvent.change(screen.getByLabelText('Preferred earliest date'), { target: { value: '2026-06-10T07:00' } });
    fireEvent.change(screen.getByLabelText('Preferred latest date'), { target: { value: '2026-06-12T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send quote request' }));

    await waitFor(() => {
      expect(quoteRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
        requested_booking_service_id: 31,
        subject_label: 'Bridal styling',
        preferred_start_at: '2026-06-10T07:00',
        preferred_end_at: '2026-06-12T12:00',
      }));
    });
  });

  it('builds multipart quote-request payloads when attachments are present', () => {
    const attachment = new File(['photo'], 'reference.jpg', { type: 'image/jpeg' });

    const submittedBody = buildQuoteRequestBody(41, 'Extension consultation', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '',
      notes: 'Need pricing after photo review.',
      attachments: [attachment],
    }) as FormData;

    expect(submittedBody).toBeInstanceOf(FormData);
    expect(submittedBody.get('requested_booking_service_id')).toBe('41');
    expect(submittedBody.get('guest_name')).toBe('Jane Doe');
    expect(submittedBody.get('guest_email')).toBe('jane@example.com');
    expect(submittedBody.get('subject_label')).toBe('Extension consultation');
    expect(submittedBody.get('request_description')).toBe('Need pricing after photo review.');
    expect((submittedBody.getAll('attachments[]')[0] as File)?.name).toBe('reference.jpg');
    expect((submittedBody.getAll('attachments[]')[0] as File)?.type).toBe('image/jpeg');
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
            payment_url: `${getTenantBaseUrl() || 'http://tenant-one.byteforge.se'}/booking/payment#token=hold-1`,
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
