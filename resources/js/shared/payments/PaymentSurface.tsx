import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { KlarnaPaymentInfo, PaymentInfo, StripePaymentInfo, SwishPaymentInfo } from './types';

const STRIPE_CLIENT_SECRET_PATTERN = /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;
const STRIPE_PUBLISHABLE_KEY_PATTERN = /^pk_(test|live)_[A-Za-z0-9_]+$/;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export interface PaymentSurfaceText {
  title: string;
  amountDueLabel: string;
  payNowButtonText: string;
  swishOpenButtonText: string;
  swishInstructionText: string;
  klarnaLoadingText: string;
  klarnaPayButtonText: string;
  stripeUnavailableTitle: string;
  stripeUnavailableMessage: string;
}

export const DEFAULT_PAYMENT_SURFACE_TEXT: PaymentSurfaceText = {
  title: 'Payment',
  amountDueLabel: 'Amount due:',
  payNowButtonText: 'Pay now',
  swishOpenButtonText: 'Open Swish',
  swishInstructionText: 'A Swish payment request will be sent. Approve it in your Swish app.',
  klarnaLoadingText: 'Loading Klarna...',
  klarnaPayButtonText: 'Pay with Klarna',
  stripeUnavailableTitle: 'Payment is temporarily unavailable',
  stripeUnavailableMessage: 'The Stripe payment session is invalid. Refresh the page or contact support if the problem continues.',
};

export const SHARED_PAYMENT_SURFACE_CSS = `
.sp-spinner {
  animation: sp-spin 1s linear infinite;
}

.sp-step-heading {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.sp-payment-panel {
  color: #374151;
}

.sp-payment-amount {
  margin-bottom: 16px;
  font-size: 14px;
  color: #374151;
}

.sp-payment-surface {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.sp-payment-note {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
}

.sp-state {
  padding: 16px 0;
  text-align: center;
}

.sp-state-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.sp-state-text {
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
}

.sp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.sp-button:disabled {
  cursor: not-allowed;
}

@keyframes sp-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

function resolvePaymentTexts(overrides?: Partial<PaymentSurfaceText>): PaymentSurfaceText {
  return {
    ...DEFAULT_PAYMENT_SURFACE_TEXT,
    ...overrides,
  };
}

export function isValidStripeClientSecret(value: string | null | undefined): boolean {
  return typeof value === 'string' && STRIPE_CLIENT_SECRET_PATTERN.test(value);
}

export function isValidStripePublishableKey(value: string | null | undefined): boolean {
  return typeof value === 'string' && STRIPE_PUBLISHABLE_KEY_PATTERN.test(value);
}

export function PaymentButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  primaryColor,
}: {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  primaryColor: string;
}) {
  const style: CSSProperties = {
    backgroundColor: disabled || loading ? '#9ca3af' : primaryColor,
  };

  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled || loading}
      className="sp-button"
      style={style}
    >
      {loading ? <Loader2 size={16} className="sp-spinner" /> : null}
      {children}
    </button>
  );
}

function PaymentHeading({ children }: { children: ReactNode }) {
  return <h3 className="sp-step-heading">{children}</h3>;
}

function StripeCheckoutForm({
  onSuccess,
  onError,
  primaryColor,
  payNowButtonText,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  primaryColor: string;
  payNowButtonText: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      setSubmitting(false);
      onError(error.message ?? 'Payment failed. Please try again.');
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement onReady={() => setReady(true)} />
      {ready ? (
        <PaymentButton loading={submitting} disabled={!stripe} primaryColor={primaryColor}>
          <CreditCard size={16} /> {payNowButtonText}
        </PaymentButton>
      ) : null}
    </form>
  );
}

function StripePayment({
  paymentInfo,
  onSuccess,
  onError,
  primaryColor,
  texts,
}: {
  paymentInfo: StripePaymentInfo;
  onSuccess: () => void;
  onError: (msg: string) => void;
  primaryColor: string;
  texts: PaymentSurfaceText;
}) {
  const hasValidClientSecret = isValidStripeClientSecret(paymentInfo.client_secret);
  const hasValidPublishableKey = isValidStripePublishableKey(paymentInfo.publishable_key);

  if (!hasValidClientSecret || !hasValidPublishableKey) {
    return (
      <div className="sp-payment-surface" role="alert">
        <div className="sp-state-title">{texts.stripeUnavailableTitle}</div>
        <div className="sp-state-text">{texts.stripeUnavailableMessage}</div>
      </div>
    );
  }

  const [stripePromise] = useState(() => loadStripe(paymentInfo.publishable_key));

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: paymentInfo.client_secret,
        appearance: { theme: 'stripe', variables: { colorPrimary: primaryColor } },
      }}
    >
      <StripeCheckoutForm
        onSuccess={onSuccess}
        onError={onError}
        primaryColor={primaryColor}
        payNowButtonText={texts.payNowButtonText}
      />
    </Elements>
  );
}

function SwishPayment({
  paymentInfo,
  onProcessing,
  primaryColor,
  texts,
}: {
  paymentInfo: SwishPaymentInfo;
  onProcessing: () => void;
  primaryColor: string;
  texts: PaymentSurfaceText;
}) {
  function handlePay() {
    window.open(paymentInfo.redirect_url, '_blank', 'noopener');
    onProcessing();
  }

  return (
    <div className="sp-payment-surface">
      <PaymentButton onClick={handlePay} primaryColor={primaryColor}>
        {texts.swishOpenButtonText}
      </PaymentButton>
      <p className="sp-payment-note">{texts.swishInstructionText}</p>
    </div>
  );
}

function KlarnaPayment({
  paymentInfo,
  onSuccess,
  onError,
  primaryColor,
  texts,
}: {
  paymentInfo: KlarnaPaymentInfo;
  onSuccess: () => void;
  onError: (msg: string) => void;
  primaryColor: string;
  texts: PaymentSurfaceText;
}) {
  const [loading, setLoading] = useState(true);
  const [klarnaReady, setKlarnaReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const existing = document.querySelector('script[src*="klarna.com/payments"]');
    const script = existing as HTMLScriptElement | null ?? (() => {
      const next = document.createElement('script');
      next.src = 'https://x.klarnacdn.net/kp/lib/v1/api.js';
      next.async = true;
      document.head.appendChild(next);
      return next;
    })();

    function init() {
      const Klarna = (window as unknown as Record<string, unknown>).Klarna as {
        Payments: {
          init: (opts: { client_token: string }) => void;
          load: (
            opts: { container: string; payment_method_category: string },
            cb: (res: { show_form: boolean; error?: { invalid_fields?: string[] } }) => void,
          ) => void;
          authorize: (
            opts: { payment_method_category: string },
            data: Record<string, unknown>,
            cb: (res: { approved: boolean; authorization_token?: string; show_form?: boolean; error?: { invalid_fields?: string[] } }) => void,
          ) => void;
        };
      } | undefined;

      if (!Klarna) {
        onError('Klarna.js failed to load.');
        return;
      }

      Klarna.Payments.init({ client_token: paymentInfo.client_token });
      Klarna.Payments.load(
        { container: '#shared-payment-klarna-container', payment_method_category: 'pay_now' },
        (result) => {
          setLoading(false);
          if (result.show_form) {
            setKlarnaReady(true);
            return;
          }
          onError('Klarna payment is not available for this purchase.');
        },
      );
    }

    if (script.dataset.loaded === 'true') {
      init();
      return;
    }

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      init();
    });
    script.addEventListener('error', () => onError('Failed to load Klarna.'));
  }, [paymentInfo.client_token, onError]);

  function handleAuthorize() {
    const Klarna = (window as unknown as Record<string, unknown>).Klarna as {
      Payments: {
        authorize: (
          opts: { payment_method_category: string },
          data: Record<string, unknown>,
          cb: (res: { approved: boolean; authorization_token?: string }) => void,
        ) => void;
      };
    } | undefined;

    if (!Klarna) return;

    Klarna.Payments.authorize(
      { payment_method_category: 'pay_now' },
      {},
      (result) => {
        if (result.approved) {
          onSuccess();
          return;
        }

        onError('Klarna payment was not approved. Please try again.');
      },
    );
  }

  return (
    <div>
      {loading ? (
        <div className="sp-state">
          <Loader2 size={24} className="sp-spinner" />
          <p className="sp-state-text">{texts.klarnaLoadingText}</p>
        </div>
      ) : null}
      <div id="shared-payment-klarna-container" className="sp-payment-surface" />
      {klarnaReady ? (
        <PaymentButton onClick={handleAuthorize} primaryColor={primaryColor}>
          {texts.klarnaPayButtonText}
        </PaymentButton>
      ) : null}
    </div>
  );
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function PaymentSurface({
  paymentInfo,
  onSuccess,
  onProcessing,
  onError,
  primaryColor,
  texts,
}: {
  paymentInfo: PaymentInfo;
  onSuccess: () => void;
  onProcessing: () => void;
  onError: (msg: string) => void;
  primaryColor: string;
  texts?: Partial<PaymentSurfaceText>;
}) {
  const resolvedTexts = resolvePaymentTexts(texts);

  return (
    <div className="sp-payment-panel">
      <PaymentHeading>{resolvedTexts.title}</PaymentHeading>
      <div className="sp-payment-amount">
        {resolvedTexts.amountDueLabel} <strong>{formatAmount(paymentInfo.amount, paymentInfo.currency)}</strong>
      </div>

      {paymentInfo.provider === 'stripe' ? (
        <StripePayment
          paymentInfo={paymentInfo}
          onSuccess={onSuccess}
          onError={onError}
          primaryColor={primaryColor}
          texts={resolvedTexts}
        />
      ) : null}

      {paymentInfo.provider === 'swish' ? (
        <SwishPayment
          paymentInfo={paymentInfo}
          onProcessing={onProcessing}
          primaryColor={primaryColor}
          texts={resolvedTexts}
        />
      ) : null}

      {paymentInfo.provider === 'klarna' ? (
        <KlarnaPayment
          paymentInfo={paymentInfo}
          onSuccess={onSuccess}
          onError={onError}
          primaryColor={primaryColor}
          texts={resolvedTexts}
        />
      ) : null}
    </div>
  );
}

export function usePaymentPolling(
  token: string | null,
  shouldPoll: boolean,
  pollStatus: (token: string) => Promise<{ id: number; status: string }>,
  onConfirmed: (bookingId: number) => void,
  onFailed: (message: string) => void,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!shouldPoll || !token) return;

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(async () => {
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
        clearInterval(intervalRef.current);
        onFailed('Payment confirmation timed out. If you completed the payment, your booking will be confirmed shortly via email.');
        return;
      }

      try {
        const result = await pollStatus(token);

        if (result.status === 'confirmed') {
          clearInterval(intervalRef.current);
          onConfirmed(result.id);
          return;
        }

        if (result.status === 'cancelled' || result.status === 'failed') {
          clearInterval(intervalRef.current);
          onFailed('Payment was not completed. Please try again.');
        }
      } catch {
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [shouldPoll, token, pollStatus, onConfirmed, onFailed]);
}
