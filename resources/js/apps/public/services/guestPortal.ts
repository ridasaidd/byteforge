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

let guestAccessToken: string | null = null;

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
    const payload = await requestJson<VerifiedGuestSessionResponse>('/api/guest-auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    guestAccessToken = payload.token;

    return payload.guest;
  },

  async restoreSession(): Promise<GuestPortalGuest | null> {
    const payload = await requestJson<GuestSessionResponse>('/api/guest-auth/session');

    guestAccessToken = payload.token;

    return payload.guest;
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

  clearAccessToken(): void {
    guestAccessToken = null;
  },
};
