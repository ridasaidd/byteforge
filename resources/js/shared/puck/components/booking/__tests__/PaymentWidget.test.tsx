import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT_SESSION_TOKEN_STORAGE_KEY } from '../paymentSessionToken';

vi.mock('@/shared/hooks', async () => {
  const actual = await vi.importActual('@/shared/hooks');

  return {
    ...(actual as Record<string, unknown>),
    usePuckEditMode: () => false,
  };
});

import { PaymentWidgetRender } from '../PaymentWidget';

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

describe('PaymentWidgetRender', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
    window.sessionStorage.clear();
  });

  it('shows an editor placeholder in Puck edit mode', async () => {
    window.history.pushState({}, '', '/cms/pages/12/edit');
    const fetchSpy = vi.spyOn(global, 'fetch');

    render(<PaymentWidgetRender puck={{ isEditing: true }} />);

    expect(screen.getByText('Payment Widget')).toBeInTheDocument();
    expect(screen.getByText(/Place this on the page selected in Booking Settings/)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('shows a booking-link error when loaded without a payment token', async () => {
    window.history.pushState({}, '', '/pages/payment');

    render(<PaymentWidgetRender />);

    expect(await screen.findByText('Payment unavailable')).toBeInTheDocument();
    expect(screen.getByText('Open this page from a booking payment link to continue.')).toBeInTheDocument();
  });

  it('stores the fragment token, strips it from the URL, and loads the guest payment session', async () => {
    window.history.pushState({}, '', '/pages/booking-payment#token=abc123XYZ');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        data: {
          booking_id: 42,
          status: 'awaiting_payment',
          customer_email: 'guest@example.com',
          payment: {
            id: 7,
            provider: 'swish',
            provider_transaction_id: 'swish-payment-1',
            status: 'processing',
            amount: 49900,
            currency: 'SEK',
            redirect_url: 'https://example.test/swish',
          },
        },
      }),
    );

    render(<PaymentWidgetRender />);

    expect(await screen.findByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Amount due:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Swish' })).toBeInTheDocument();
    expect(screen.getByText(/Approve it in your Swish app/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/public/booking/payment/abc123XYZ');
    expect(window.sessionStorage.getItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY)).toBe('abc123XYZ');
    expect(replaceStateSpy).toHaveBeenCalledWith(null, document.title, '/pages/booking-payment');
    expect(window.location.hash).toBe('');
  });

  it('falls back to the stored token when the URL no longer has a fragment', async () => {
    window.history.pushState({}, '', '/pages/booking-payment');
    window.sessionStorage.setItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY, 'storedToken987');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        data: {
          booking_id: 84,
          status: 'confirmed',
          customer_email: 'stored@example.com',
          payment: null,
        },
      }),
    );

    render(<PaymentWidgetRender />);

    expect(await screen.findByText('Booking confirmed!')).toBeInTheDocument();
    expect(screen.getByText(/stored@example.com/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/public/booking/payment/storedToken987');
  });

  it('shows a payment-session error when the booking is not payable', async () => {
    window.history.pushState({}, '', '/pages/booking-payment#token=abc123XYZ');
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        data: {
          booking_id: 42,
          status: 'pending',
          customer_email: 'guest@example.com',
          payment: null,
        },
      }),
    );

    render(<PaymentWidgetRender />);

    expect(await screen.findByText('Payment unavailable')).toBeInTheDocument();
    expect(screen.getByText('No active payment session was found for this booking.')).toBeInTheDocument();
  });
});
