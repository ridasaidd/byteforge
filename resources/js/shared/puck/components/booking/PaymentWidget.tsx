import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import { usePuckEditMode } from '@/shared/hooks';
import {
  PaymentButton,
  PaymentSurface,
  SHARED_PAYMENT_SURFACE_CSS,
  usePaymentPolling,
} from '@/shared/payments/PaymentSurface';
import type { PaymentInfo } from '@/shared/payments/types';
import {
  clearStoredPaymentSessionToken,
  resolvePaymentSessionToken,
  stripPaymentSessionTokenFromUrl,
} from './paymentSessionToken';
import { BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR, resolveBookingPrimaryColor } from './styles';
import type { PaymentWidgetProps } from './types';

const PAYMENT_WIDGET_CSS = `
.bpw-root {
  width: 100%;
  max-width: 560px;
  padding: 0 16px;
  box-sizing: border-box;
}

.bpw-shell {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.bpw-editor-state {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
}

.bpw-editor-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.bpw-editor-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}

@media (max-width: 640px) {
  .bpw-root {
    padding: 0 12px;
  }

  .bpw-shell {
    padding: 20px;
    border-radius: 12px;
  }
}
`;

const PAYMENT_PAGE_CONFIRMATION_PREFIX = 'A confirmation has been sent to';

interface BookingPaymentSession {
  booking_id: number;
  status: string;
  customer_email: string;
  payment: PaymentInfo | null;
}

export function PaymentWidgetRender({
  primaryColor,
  puck,
  standalone = false,
}: PaymentWidgetProps) {
  const puckEditMode = usePuckEditMode();
  const isEditing = Boolean(puck?.isEditing) || puckEditMode;
  const resolvedPrimaryColor = useMemo(() => {
    return resolveBookingPrimaryColor(primaryColor) || BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR;
  }, [primaryColor]);
  const shellCss = useMemo(() => {
    return `${SHARED_PAYMENT_SURFACE_CSS}\n${PAYMENT_WIDGET_CSS}`;
  }, []);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<BookingPaymentSession | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'payment' | 'processing' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setToken(null);
      setSession(null);
      setPhase('idle');
      setError(null);
      return;
    }

    const nextToken = resolvePaymentSessionToken(window.location.hash, window.sessionStorage);

    if (!nextToken) {
      setToken(null);
      setError('Open this page from a booking payment link to continue.');
      setPhase('idle');
      return;
    }

    if (window.location.hash) {
      stripPaymentSessionTokenFromUrl(window.location, window.history, document.title);
    }

    setError(null);
    setToken(nextToken);
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !token) {
      return;
    }

    let cancelled = false;

    async function loadSession() {
      try {
        setError(null);
        setPhase('loading');
        const response = await apiFetch<{ data: BookingPaymentSession }>(`/payment/${token}`);

        if (cancelled) return;

        setSession(response.data);

        if (response.data.status === 'confirmed') {
          setPhase('success');
          return;
        }

        if (response.data.status === 'awaiting_payment' && response.data.payment) {
          setPhase('payment');
          return;
        }

        setPhase('idle');
        setError('No active payment session was found for this booking.');
      } catch (nextError) {
        if (cancelled) return;
        setPhase('idle');
        setError(nextError instanceof Error ? nextError.message : 'Failed to load payment session.');
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [isEditing, token]);

  function returnToSite() {
    clearStoredPaymentSessionToken(window.sessionStorage);
    window.location.assign('/');
  }

  usePaymentPolling(
    token,
    phase === 'processing',
    async (activeToken) => {
      const response = await apiFetch<{ data: { id: number; status: string } }>(`/${activeToken}`);
      return response.data;
    },
    (bookingId) => {
      setSession((current) => current ? { ...current, booking_id: bookingId, status: 'confirmed' } : current);
      setPhase('success');
      setError(null);
    },
    (message) => {
      setError(message);
      setPhase('payment');
    },
  );

  const rootStyle = standalone ? { margin: '24px auto' } : { margin: '0 auto' };

  return (
    <>
      <style>{shellCss}</style>
      <div className="bpw-root" ref={puck?.dragRef ?? undefined} style={rootStyle}>
        <div className="bpw-shell">
          {isEditing ? (
            <div className="bpw-editor-state">
              <h3 className="bpw-editor-title">Payment Widget</h3>
              <p className="bpw-editor-text">
                Place this on the page selected in Booking Settings. Customers arriving from the booking flow will load their payment session here.
              </p>
            </div>
          ) : null}

          {!isEditing && phase === 'loading' ? <div className="sp-state-text">Loading payment session...</div> : null}

          {!isEditing && error ? (
            <div className="sp-payment-surface" role="alert">
              <div className="sp-state-title">Payment unavailable</div>
              <div className="sp-state-text">{error}</div>
              <PaymentButton onClick={returnToSite} primaryColor={resolvedPrimaryColor}>
                Return to site
              </PaymentButton>
            </div>
          ) : null}

          {!isEditing && !error && phase === 'payment' && session?.payment ? (
            <PaymentSurface
              paymentInfo={session.payment}
              onSuccess={() => setPhase('processing')}
              onProcessing={() => setPhase('processing')}
              onError={(message) => setError(message)}
              primaryColor={resolvedPrimaryColor}
            />
          ) : null}

          {!isEditing && !error && phase === 'processing' ? (
            <div className="sp-state">
              <div className="sp-state-title">Processing payment...</div>
              <div className="sp-state-text">
                Please wait while we confirm your payment. This may take a moment.
              </div>
            </div>
          ) : null}

          {!isEditing && !error && phase === 'success' ? (
            <div className="sp-state">
              <div className="sp-state-title">Booking confirmed!</div>
              <div className="sp-state-text">
                {PAYMENT_PAGE_CONFIRMATION_PREFIX} {session?.customer_email}.
              </div>
              <PaymentButton onClick={returnToSite} primaryColor={resolvedPrimaryColor}>
                Return to site
              </PaymentButton>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
