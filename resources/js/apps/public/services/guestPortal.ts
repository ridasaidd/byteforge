export interface GuestPortalGuest {
  id: number;
  email: string;
  name: string | null;
}

export interface GuestPortalBooking {
  id: number;
  status: 'pending' | 'pending_hold' | 'awaiting_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_notes: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cancelled_at: string | null;
  can_cancel: boolean;
  can_reschedule: boolean;
  service: {
    id: number;
    name: string;
    booking_mode: 'slot' | 'range';
  } | null;
  resource: {
    id: number;
    name: string;
    type: string;
  } | null;
  payment: {
    id: number;
    status: string;
    amount: number;
    currency: string;
  } | null;
}

export interface GuestPortalQuote {
  id: number;
  request_id: number;
  status: 'sent' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'converted';
  currency: string;
  subtotal_minor: number;
  tax_minor: number | null;
  total_minor: number;
  estimated_duration_minutes: number | null;
  customer_message: string | null;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  converted_at: string | null;
  subject_label: string | null;
  request_description: string | null;
  preferred_start_at: string | null;
  preferred_end_at: string | null;
  booking_service: {
    id: number;
    name: string;
  } | null;
  line_items: Array<{
    id: number;
    label: string;
    description: string | null;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
  }>;
  converted_booking: {
    id: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
}

interface GuestSessionResponse {
  guest: GuestPortalGuest | null;
  token: string | null;
}

interface VerifiedGuestSessionResponse {
  guest: GuestPortalGuest;
  token: string;
}

interface GuestBookingsResponse {
  data: GuestPortalBooking[];
}

interface GuestBookingResponse {
  data: GuestPortalBooking;
}

interface GuestQuotesResponse {
  data: GuestPortalQuote[];
}

interface GuestQuoteResponse {
  data: GuestPortalQuote;
}

let guestAccessToken: string | null = null;
let verifyMagicLinkRequest: { token: string; promise: Promise<GuestPortalGuest> } | null = null;
let restoreSessionRequest: Promise<GuestPortalGuest | null> | null = null;

async function requestJson<T>(path: string, init: RequestInit = {}, includeAuth = false): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeAuth && guestAccessToken) {
    headers.set('Authorization', `Bearer ${guestAccessToken}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    guestAccessToken = null;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json() as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Keep default message when the response body is empty or invalid JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const guestPortalService = {
  async requestMagicLink(email: string): Promise<void> {
    await requestJson<{ sent: boolean }>('/api/guest-auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyMagicLink(token: string): Promise<GuestPortalGuest> {
    if (verifyMagicLinkRequest?.token === token) {
      return verifyMagicLinkRequest.promise;
    }

    const promise = requestJson<VerifiedGuestSessionResponse>('/api/guest-auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).then((payload) => {
      guestAccessToken = payload.token;

      return payload.guest;
    }).finally(() => {
      if (verifyMagicLinkRequest?.promise === promise) {
        verifyMagicLinkRequest = null;
      }
    });

    verifyMagicLinkRequest = { token, promise };

    return promise;
  },

  async restoreSession(): Promise<GuestPortalGuest | null> {
    if (restoreSessionRequest) {
      return restoreSessionRequest;
    }

    const promise = requestJson<GuestSessionResponse>('/api/guest-auth/session')
      .then((payload) => {
        guestAccessToken = payload.token;

        return payload.guest;
      })
      .finally(() => {
        if (restoreSessionRequest === promise) {
          restoreSessionRequest = null;
        }
      });

    restoreSessionRequest = promise;

    return promise;
  },

  async logout(): Promise<void> {
    if (!guestAccessToken) {
      return;
    }

    try {
      await requestJson<{ message: string }>('/api/guest-auth/logout', {
        method: 'POST',
      }, true);
    } finally {
      guestAccessToken = null;
    }
  },

  async listBookings(): Promise<GuestPortalBooking[]> {
    const payload = await requestJson<GuestBookingsResponse>('/api/guest-auth/bookings', {}, true);

    return payload.data;
  },

  async getBooking(bookingId: number): Promise<GuestPortalBooking> {
    const payload = await requestJson<GuestBookingResponse>(`/api/guest-auth/bookings/${bookingId}`, {}, true);

    return payload.data;
  },

  async cancelBooking(bookingId: number): Promise<GuestPortalBooking> {
    const payload = await requestJson<GuestBookingResponse>(`/api/guest-auth/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
    }, true);

    return payload.data;
  },

  async rescheduleBooking(bookingId: number, startsAt: string, endsAt: string): Promise<GuestPortalBooking> {
    const payload = await requestJson<GuestBookingResponse>(`/api/guest-auth/bookings/${bookingId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt }),
    }, true);

    return payload.data;
  },

  async listQuotes(): Promise<GuestPortalQuote[]> {
    const payload = await requestJson<GuestQuotesResponse>('/api/guest-auth/quotes', {}, true);

    return payload.data;
  },

  async getQuote(quoteId: number): Promise<GuestPortalQuote> {
    const payload = await requestJson<GuestQuoteResponse>(`/api/guest-auth/quotes/${quoteId}`, {}, true);

    return payload.data;
  },

  async acceptQuote(quoteId: number): Promise<GuestPortalQuote> {
    const payload = await requestJson<GuestQuoteResponse>(`/api/guest-auth/quotes/${quoteId}/accept`, {
      method: 'POST',
    }, true);

    return payload.data;
  },

  async rejectQuote(quoteId: number): Promise<GuestPortalQuote> {
    const payload = await requestJson<GuestQuoteResponse>(`/api/guest-auth/quotes/${quoteId}/reject`, {
      method: 'POST',
    }, true);

    return payload.data;
  },

  clearAccessToken(): void {
    guestAccessToken = null;
    verifyMagicLinkRequest = null;
    restoreSessionRequest = null;
  },
};
