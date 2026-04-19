import { createElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentSurface, isValidStripeClientSecret, isValidStripePublishableKey } from '../../../../payments/PaymentSurface';

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => createElement('div', { 'data-testid': 'stripe-elements' }, children),
  PaymentElement: () => createElement('div', { 'data-testid': 'payment-element' }),
  useElements: () => null,
  useStripe: () => null,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

function renderPaymentStep() {
  return render(createElement(PaymentSurface, {
    paymentInfo: {
      id: 1,
      provider: 'stripe',
      provider_transaction_id: 'pi_bad',
      status: 'processing',
      amount: 5000,
      currency: 'SEK',
      client_secret: 'pi_test_69e361650eb63412090162_secret_test',
      publishable_key: 'pk_test_1234567890abcDEF',
    },
    onSuccess: () => {},
    onProcessing: () => {},
    onError: () => {},
    primaryColor: '#2563eb',
  }));
}

describe('booking payment helpers', () => {
  it('accepts real-looking Stripe client secrets', () => {
    expect(isValidStripeClientSecret('pi_3NabcXYZ123_secret_456defUVW789')).toBe(true);
  });

  it('rejects fabricated Stripe client secrets with invalid intent ids', () => {
    expect(isValidStripeClientSecret('pi_test_69e361650eb63412090162_secret_test')).toBe(false);
    expect(isValidStripeClientSecret('')).toBe(false);
  });

  it('accepts Stripe publishable keys and rejects invalid values', () => {
    expect(isValidStripePublishableKey('pk_test_1234567890abcDEF')).toBe(true);
    expect(isValidStripePublishableKey('pk_live_1234567890abcDEF')).toBe(true);
    expect(isValidStripePublishableKey('not-a-stripe-key')).toBe(false);
  });

  it('renders a safe fallback instead of mounting Stripe Elements for invalid payment sessions', () => {
    renderPaymentStep();

    expect(screen.getByRole('alert').textContent).toContain('Payment is temporarily unavailable');
    expect(screen.queryByTestId('stripe-elements')).toBeNull();
  });
});
