import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guestPortalService } from '../../services/guestPortal';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('guestPortalService', () => {
  beforeEach(() => {
    guestPortalService.clearAccessToken();
  });

  it('restores a guest session and stores the returned access token in memory', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        guest: { id: 5, email: 'guest@example.com', name: null },
        token: 'guest-access-token',
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const guest = await guestPortalService.restoreSession();
    const bookingsFetch = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', bookingsFetch);

    await guestPortalService.listBookings();

    expect(guest).toEqual({ id: 5, email: 'guest@example.com', name: null });
    expect(bookingsFetch).toHaveBeenCalledWith(
      '/api/guest-auth/bookings',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: expect.any(Headers),
      })
    );

    const headers = bookingsFetch.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer guest-access-token');
  });

  it('uses the verified guest token for quote requests as well', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        guest: { id: 9, email: 'verify@example.com', name: 'Verified Guest' },
        token: 'verified-token',
      }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
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
          subject_label: 'Verified quote',
          request_description: 'Quote request',
          preferred_start_at: null,
          preferred_end_at: null,
          booking_service: null,
          line_items: [],
          converted_booking: null,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: 7,
          request_id: 4,
          status: 'accepted',
          currency: 'SEK',
          subtotal_minor: 9000,
          tax_minor: null,
          total_minor: 9000,
          estimated_duration_minutes: 60,
          customer_message: 'Quote details',
          valid_until: null,
          sent_at: null,
          accepted_at: '2026-05-19T10:00:00Z',
          rejected_at: null,
          cancelled_at: null,
          expired_at: null,
          converted_at: null,
          subject_label: 'Verified quote',
          request_description: 'Quote request',
          preferred_start_at: null,
          preferred_end_at: null,
          booking_service: null,
          line_items: [],
          converted_booking: null,
        },
      }));

    vi.stubGlobal('fetch', fetchMock);

    await guestPortalService.verifyMagicLink('magic-token-123');
    await guestPortalService.listQuotes();
    await guestPortalService.getQuote(7);
    await guestPortalService.acceptQuote(7);

    const listHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(listHeaders.get('Authorization')).toBe('Bearer verified-token');

    const detailHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
    expect(detailHeaders.get('Authorization')).toBe('Bearer verified-token');

    const acceptHeaders = fetchMock.mock.calls[3][1]?.headers as Headers;
    expect(acceptHeaders.get('Authorization')).toBe('Bearer verified-token');
  });

  it('returns null when the guest session is unauthenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ guest: null, token: null })));

    await expect(guestPortalService.restoreSession()).resolves.toBeNull();
  });

  it('verifies a magic link and uses the returned token for cancellation requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        guest: { id: 9, email: 'verify@example.com', name: 'Verified Guest' },
        token: 'verified-token',
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: 42,
          status: 'confirmed',
          customer_name: 'Verified Guest',
          customer_email: 'verify@example.com',
          customer_phone: null,
          customer_notes: null,
          starts_at: null,
          ends_at: null,
          cancelled_at: null,
          can_cancel: true,
          can_reschedule: true,
          service: null,
          resource: null,
          payment: null,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: 42,
          status: 'cancelled',
          customer_name: 'Verified Guest',
          customer_email: 'verify@example.com',
          customer_phone: null,
          customer_notes: null,
          starts_at: null,
          ends_at: null,
          cancelled_at: null,
          can_cancel: false,
          can_reschedule: false,
          service: null,
          resource: null,
          payment: null,
        },
      }));

    vi.stubGlobal('fetch', fetchMock);

    await guestPortalService.verifyMagicLink('magic-token-123');
    await guestPortalService.getBooking(42);
    await guestPortalService.cancelBooking(42);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/guest-auth/verify',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const detailHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(detailHeaders.get('Authorization')).toBe('Bearer verified-token');

    const cancelHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
    expect(cancelHeaders.get('Authorization')).toBe('Bearer verified-token');
  });

  it('uses the verified guest token for reschedule requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        guest: { id: 9, email: 'verify@example.com', name: 'Verified Guest' },
        token: 'verified-token',
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: 42,
          status: 'confirmed',
          customer_name: 'Verified Guest',
          customer_email: 'verify@example.com',
          customer_phone: null,
          customer_notes: null,
          starts_at: '2026-06-01T11:00:00.000Z',
          ends_at: '2026-06-01T12:00:00.000Z',
          cancelled_at: null,
          can_cancel: true,
          can_reschedule: true,
          service: null,
          resource: null,
          payment: null,
        },
      }));

    vi.stubGlobal('fetch', fetchMock);

    await guestPortalService.verifyMagicLink('magic-token-123');
    await guestPortalService.rescheduleBooking(42, '2026-06-01T11:00:00.000Z', '2026-06-01T12:00:00.000Z');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/guest-auth/bookings/42/reschedule',
      expect.objectContaining({
        method: 'PATCH',
      })
    );

    const headers = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer verified-token');
  });
});
