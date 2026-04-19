import { describe, expect, it, vi } from 'vitest';
import {
  PAYMENT_SESSION_TOKEN_STORAGE_KEY,
  clearStoredPaymentSessionToken,
  extractPaymentSessionTokenFromHash,
  resolvePaymentSessionToken,
  stripPaymentSessionTokenFromUrl,
} from '../bookingPaymentSessionToken';

describe('booking payment session token helpers', () => {
  it('extracts valid payment tokens from the URL fragment', () => {
    expect(extractPaymentSessionTokenFromHash('#token=abc123XYZ')).toBe('abc123XYZ');
    expect(extractPaymentSessionTokenFromHash('token=abc123XYZ')).toBe('abc123XYZ');
  });

  it('rejects malformed payment tokens from the URL fragment', () => {
    expect(extractPaymentSessionTokenFromHash('#token=')).toBeNull();
    expect(extractPaymentSessionTokenFromHash('#token=abc-123')).toBeNull();
    expect(extractPaymentSessionTokenFromHash('#other=value')).toBeNull();
  });

  it('stores a valid hash token and falls back to session storage', () => {
    const storage = {
      getItem: vi.fn(() => 'storedToken987'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(resolvePaymentSessionToken('#token=abc123XYZ', storage)).toBe('abc123XYZ');
    expect(storage.setItem).toHaveBeenCalledWith(PAYMENT_SESSION_TOKEN_STORAGE_KEY, 'abc123XYZ');

    storage.getItem.mockReturnValueOnce('storedToken987');
    expect(resolvePaymentSessionToken('', storage)).toBe('storedToken987');
  });

  it('removes invalid stored tokens and strips the fragment from the current URL', () => {
    const storage = {
      getItem: vi.fn(() => 'bad-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const historyApi = {
      replaceState: vi.fn(),
    };

    expect(resolvePaymentSessionToken('', storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(PAYMENT_SESSION_TOKEN_STORAGE_KEY);

    stripPaymentSessionTokenFromUrl(
      { pathname: '/booking/payment', search: '?foo=bar', hash: '#token=abc123XYZ' },
      historyApi,
      'Booking payment',
    );

    expect(historyApi.replaceState).toHaveBeenCalledWith(null, 'Booking payment', '/booking/payment?foo=bar');

    clearStoredPaymentSessionToken(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(PAYMENT_SESSION_TOKEN_STORAGE_KEY);
  });
});
