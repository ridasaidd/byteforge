import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuestPortalPage } from '../GuestPortalPage';

const publicGetMock = vi.fn();
const restoreSessionMock = vi.fn();
const listBookingsMock = vi.fn();
const listQuotesMock = vi.fn();
const getBookingMock = vi.fn();
const getQuoteMock = vi.fn();
const acceptQuoteMock = vi.fn();
const rejectQuoteMock = vi.fn();

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>();

  return {
    ...actual,
    Render: ({ data }: { data: { root?: { props?: { title?: string } } } }) => (
      <div data-testid="system-surface-render">{data.root?.props?.title}</div>
    ),
  };
});

vi.mock('@/shared/services/api/systemSurfaces', () => ({
  tenantSystemSurfaces: {
    publicGet: (...args: unknown[]) => publicGetMock(...args),
  },
}));

vi.mock('../../services/guestPortal', () => ({
  guestPortalService: {
    restoreSession: (...args: unknown[]) => restoreSessionMock(...args),
    listBookings: (...args: unknown[]) => listBookingsMock(...args),
    listQuotes: (...args: unknown[]) => listQuotesMock(...args),
    getBooking: (...args: unknown[]) => getBookingMock(...args),
    getQuote: (...args: unknown[]) => getQuoteMock(...args),
    requestMagicLink: vi.fn(),
    logout: vi.fn(),
    cancelBooking: vi.fn(),
    acceptQuote: (...args: unknown[]) => acceptQuoteMock(...args),
    rejectQuote: (...args: unknown[]) => rejectQuoteMock(...args),
  },
}));

function renderPage(path = '/guest-portal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/guest-portal" element={<GuestPortalPage />} />
        <Route path="/guest-portal/quotes/:quoteId" element={<GuestPortalPage />} />
        <Route path="/guest-portal/:bookingId" element={<GuestPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreSessionMock.mockResolvedValue(null);
    listBookingsMock.mockResolvedValue([]);
    listQuotesMock.mockResolvedValue([]);
    getBookingMock.mockResolvedValue(null);
    getQuoteMock.mockResolvedValue(null);
    acceptQuoteMock.mockResolvedValue(null);
    rejectQuoteMock.mockResolvedValue(null);
  });

  it('renders the system surface runtime when guest_portal data exists', async () => {
    publicGetMock.mockResolvedValue({
      data: {
        surface_key: 'guest_portal',
        puck_data: {
          root: {
            props: {
              title: 'Portal from surface',
            },
          },
        },
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId('system-surface-render')).toHaveTextContent('Portal from surface'));
    expect(publicGetMock).toHaveBeenCalledWith('guest_portal');
  });

  it('falls back to the standalone guest portal when no system surface is available', async () => {
    publicGetMock.mockRejectedValue(new Error('missing surface'));

    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'My bookings and quotes' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Get a sign-in link' })).toBeInTheDocument());
  });

  it('shows linked quotes inside the fallback guest portal experience', async () => {
    publicGetMock.mockRejectedValue(new Error('missing surface'));
    restoreSessionMock.mockResolvedValue({ id: 9, email: 'guest@example.com', name: null });
    listQuotesMock.mockResolvedValue([
      {
        id: 7,
        request_id: 4,
        status: 'sent',
        currency: 'SEK',
        subtotal_minor: 9000,
        tax_minor: null,
        total_minor: 9000,
        estimated_duration_minutes: 60,
        customer_message: 'Quote details',
        valid_until: null,
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        cancelled_at: null,
        expired_at: null,
        converted_at: null,
        subject_label: 'Inspection quote',
        request_description: 'Need a repair estimate',
        preferred_start_at: null,
        preferred_end_at: null,
        booking_service: null,
        line_items: [],
        converted_booking: null,
      },
    ]);

    renderPage('/guest-portal');

    await waitFor(() => expect(screen.getByText('Inspection quote')).toBeInTheDocument());
    expect(screen.getByText('Need a repair estimate')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View quote' })).toBeInTheDocument();
  });
});
