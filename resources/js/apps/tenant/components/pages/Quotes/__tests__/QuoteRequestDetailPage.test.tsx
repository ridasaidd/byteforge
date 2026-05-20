import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteRequestDetailPage } from '../QuoteRequestDetailPage';

const {
  getRequestMock,
  createDraftQuoteMock,
  convertToBookingMock,
  sendQuoteMock,
  cancelQuoteMock,
  deleteQuoteMock,
  downloadRequestAttachmentMock,
  toastMock,
  navigateMock,
} = vi.hoisted(() => ({
  getRequestMock: vi.fn(),
  createDraftQuoteMock: vi.fn(),
  convertToBookingMock: vi.fn(),
  sendQuoteMock: vi.fn(),
  cancelQuoteMock: vi.fn(),
  deleteQuoteMock: vi.fn(),
  downloadRequestAttachmentMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useParams: () => ({ id: '42' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/shared/services/api/quotes', () => ({
  cmsQuotesApi: {
    getRequest: getRequestMock,
    createDraftQuote: createDraftQuoteMock,
    convertToBooking: convertToBookingMock,
    sendQuote: sendQuoteMock,
    cancelQuote: cancelQuoteMock,
    deleteQuote: deleteQuoteMock,
    downloadRequestAttachment: downloadRequestAttachmentMock,
  },
}));

vi.mock('@/shared/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: (permission: string) => permission === 'quotes.manage' || permission === 'quotes.view' || permission === 'quotes.send' || permission === 'quotes.convert' || permission === 'bookings.view' }),
}));

vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuoteRequestDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('QuoteRequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRequestMock.mockResolvedValue({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: '2026-05-20T09:00:00Z',
        preferred_end_at: '2026-05-22T17:00:00Z',
        status: 'submitted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        attachments: [],
        latest_quote: null,
      },
    });

    createDraftQuoteMock.mockResolvedValue({
      data: {
        id: 99,
        version: 1,
        currency: 'SEK',
        status: 'draft',
        subtotal_minor: 9000,
        tax_minor: null,
        total_minor: 9000,
        estimated_duration_minutes: 150,
        customer_message: 'Estimate after inspection.',
        internal_notes: 'Complex restorative treatment.',
        valid_until: '2026-05-22T10:00:00Z',
        sent_at: null,
        line_items: [
          {
            id: 1,
            label: 'Hair restoration session',
            description: 'Initial treatment and assessment',
            quantity: 2,
            unit_price_minor: 4500,
            line_total_minor: 9000,
          },
        ],
      },
    });

    sendQuoteMock.mockResolvedValue({
      data: {
        id: 99,
        version: 1,
        currency: 'SEK',
        status: 'sent',
        subtotal_minor: 9000,
        tax_minor: null,
        total_minor: 9000,
        estimated_duration_minutes: 150,
        customer_message: 'Estimate after inspection.',
        internal_notes: 'Complex restorative treatment.',
        valid_until: '2026-05-22T10:00:00Z',
        sent_at: '2026-05-16T10:00:00Z',
        line_items: [
          {
            id: 1,
            label: 'Hair restoration session',
            description: 'Initial treatment and assessment',
            quantity: 2,
            unit_price_minor: 4500,
            line_total_minor: 9000,
          },
        ],
      },
    });

    convertToBookingMock.mockResolvedValue({
      data: {
        quote_id: 99,
        service_id: 7,
        customer_name: 'Anna Andersson',
        customer_email: 'anna@example.com',
        customer_phone: '0701234567',
        customer_notes: 'Estimate after inspection.',
        internal_notes: 'Complex restorative treatment.',
      },
    });

    cancelQuoteMock.mockResolvedValue({ data: { id: 99, status: 'cancelled' } });
    deleteQuoteMock.mockResolvedValue({});
    downloadRequestAttachmentMock.mockResolvedValue(new Blob(['attachment']));
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it('submits a draft quote from the request detail page', async () => {
    renderPage();

    expect(await screen.findByText('Quote Request #42')).toBeInTheDocument();
    expect(screen.getByText(/Preferred date window:/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Draft note to customer'), {
      target: { value: 'Estimate after inspection.' },
    });
    fireEvent.change(screen.getByLabelText('Internal notes'), {
      target: { value: 'Complex restorative treatment.' },
    });
    fireEvent.change(screen.getByLabelText('Estimated duration (minutes)'), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText('Valid until'), {
      target: { value: '2026-05-22T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Line item label'), {
      target: { value: 'Hair restoration session' },
    });
    fireEvent.change(screen.getByLabelText('Line item description'), {
      target: { value: 'Initial treatment and assessment' },
    });
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Unit price (minor units)'), {
      target: { value: '4500' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create draft quote' }));

    await waitFor(() => {
      expect(createDraftQuoteMock).toHaveBeenCalledWith(42, {
        currency: 'SEK',
        estimated_duration_minutes: 150,
        customer_message: 'Estimate after inspection.',
        internal_notes: 'Complex restorative treatment.',
        valid_until: expect.any(String),
        line_items: [
          {
            label: 'Hair restoration session',
            description: 'Initial treatment and assessment',
            quantity: 2,
            unit_price_minor: 4500,
          },
        ],
      });
    });
  });

  it('shows the latest draft quote and lets staff send it', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        attachments: [],
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'draft',
          sent_at: null,
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Draft Quote')).toBeInTheDocument();
    expect(screen.getByText('Hair restoration session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send quote' }));

    await waitFor(() => {
      expect(sendQuoteMock).toHaveBeenCalledWith(99);
    });
  });

  it('renders request attachments and downloads them through the cms api', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'submitted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        attachments: [
          {
            id: 11,
            file_name: 'reference-photo.jpg',
            name: 'reference-photo.jpg',
            mime_type: 'image/jpeg',
            size: 4096,
            download_url: '/api/quotes/requests/42/attachments/11/download',
          },
        ],
        latest_quote: null,
      },
    });

    renderPage();

    expect(await screen.findByText('Request attachments')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(downloadRequestAttachmentMock).toHaveBeenCalledWith(42, 11);
    });
  });

  it('lets staff delete a draft quote', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'manual',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'draft',
          sent_at: null,
          line_items: [],
        },
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft' }));

    await waitFor(() => {
      expect(deleteQuoteMock).toHaveBeenCalledWith(99);
    });
  });

  it('shows a sent quote as awaiting customer decision', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'sent',
          sent_at: '2026-05-16T10:00:00Z',
          accepted_at: null,
          rejected_at: null,
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Quote sent')).toBeInTheDocument();
    expect(screen.getByText('Waiting for customer response.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel quote' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send quote' })).not.toBeInTheDocument();
  });

  it('lets staff cancel a sent quote', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'sent',
          sent_at: '2026-05-16T10:00:00Z',
          accepted_at: null,
          rejected_at: null,
          line_items: [],
        },
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel quote' }));

    await waitFor(() => {
      expect(cancelQuoteMock).toHaveBeenCalledWith(99);
    });
  });

  it('shows an accepted quote as accepted by the customer', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'accepted',
          sent_at: '2026-05-16T10:00:00Z',
          accepted_at: '2026-05-17T08:30:00Z',
          rejected_at: null,
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Quote accepted')).toBeInTheDocument();
    expect(screen.getByText('The customer accepted this quote.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Convert to booking' }));

    await waitFor(() => {
      expect(convertToBookingMock).toHaveBeenCalledWith(99);
      expect(navigateMock).toHaveBeenCalledWith('/cms/bookings', {
        state: {
          createBookingPrefill: {
            quote_id: 99,
            service_id: 7,
            customer_name: 'Anna Andersson',
            customer_email: 'anna@example.com',
            customer_phone: '0701234567',
            customer_notes: 'Estimate after inspection.',
            internal_notes: 'Complex restorative treatment.',
          },
        },
      });
    });
  });

  it('shows a rejected quote as rejected by the customer', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'rejected',
          sent_at: '2026-05-16T10:00:00Z',
          accepted_at: null,
          rejected_at: '2026-05-17T08:30:00Z',
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Quote rejected')).toBeInTheDocument();
    expect(screen.getByText('The customer rejected this quote.')).toBeInTheDocument();
  });

  it('shows an expired quote as expired', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-16T10:00:00Z',
          status: 'expired',
          sent_at: '2026-05-15T10:00:00Z',
          accepted_at: null,
          rejected_at: null,
          expired_at: '2026-05-16T10:01:00Z',
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Quote expired')).toBeInTheDocument();
    expect(screen.getByText('This quote expired before the customer responded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send quote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convert to booking' })).not.toBeInTheDocument();
  });

  it('shows a converted quote with its linked booking', async () => {
    getRequestMock.mockResolvedValueOnce({
      data: {
        id: 42,
        requested_booking_service_id: 7,
        origin_surface: 'public',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Long hair consultation',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'quoted',
        submitted_at: '2026-05-15T10:00:00Z',
        last_activity_at: '2026-05-15T10:00:00Z',
        booking_service: { id: 7, name: 'Hair assessment' },
        latest_quote: {
          id: 99,
          version: 1,
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 150,
          customer_message: 'Estimate after inspection.',
          internal_notes: 'Complex restorative treatment.',
          valid_until: '2026-05-22T10:00:00Z',
          status: 'converted',
          sent_at: '2026-05-16T10:00:00Z',
          accepted_at: '2026-05-17T08:30:00Z',
          rejected_at: null,
          converted_at: '2026-05-17T10:30:00Z',
          converted_booking_id: 123,
          line_items: [
            {
              id: 1,
              label: 'Hair restoration session',
              description: 'Initial treatment and assessment',
              quantity: 2,
              unit_price_minor: 4500,
              line_total_minor: 9000,
            },
          ],
        },
      },
    });

    renderPage();

    expect(await screen.findByText('Quote converted')).toBeInTheDocument();
    expect(screen.getByText('This quote has been converted into a booking.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View booking #123' })).toBeInTheDocument();
  });
});
