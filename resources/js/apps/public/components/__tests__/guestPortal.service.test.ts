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
});
