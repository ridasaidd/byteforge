import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { guestPortalService, type GuestPortalBooking, type GuestPortalGuest } from '../services/guestPortal';

export function GuestPortalExperience({
  variant = 'embedded',
}: {
  variant?: 'standalone' | 'embedded';
}) {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const [guest, setGuest] = useState<GuestPortalGuest | null>(null);
  const [bookings, setBookings] = useState<GuestPortalBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<GuestPortalBooking | null>(null);
  const [email, setEmail] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedBookingId = parseBookingId(bookingId);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setIsBootstrapping(true);
        setErrorMessage(null);

        const restoredGuest = await guestPortalService.restoreSession();

        if (!restoredGuest || cancelled) {
          setGuest(null);
          setBookings([]);
          return;
        }

        const [nextBookings, nextSelectedBooking] = await Promise.all([
          guestPortalService.listBookings(),
          selectedBookingId ? guestPortalService.getBooking(selectedBookingId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setGuest(restoredGuest);
          setBookings(nextBookings);
          setSelectedBooking(nextSelectedBooking);
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setSelectedBooking(null);
          setErrorMessage(bootstrapError instanceof Error ? bootstrapError.message : 'Failed to load your guest booking space.');
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [selectedBookingId]);

  const handleRequestLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);

      await guestPortalService.requestMagicLink(email);

      setInfoMessage(`We sent a secure sign-in link to ${email.trim()}.`);
    } catch (requestError) {
      setErrorMessage(requestError instanceof Error ? requestError.message : 'Failed to send your sign-in link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsSubmitting(true);
      await guestPortalService.logout();
      setGuest(null);
      setBookings([]);
      setSelectedBooking(null);
      setInfoMessage('You have been signed out of your booking space.');
      setErrorMessage(null);
    } catch (logoutError) {
      setErrorMessage(logoutError instanceof Error ? logoutError.message : 'Failed to sign out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updatedBooking = await guestPortalService.cancelBooking(bookingId);
      setBookings((current) => current.map((booking) => booking.id === updatedBooking.id ? updatedBooking : booking));
      setSelectedBooking((current) => current?.id === updatedBooking.id ? updatedBooking : current);
      setInfoMessage('Your booking was cancelled.');
    } catch (cancellationError) {
      setErrorMessage(cancellationError instanceof Error ? cancellationError.message : 'Failed to cancel your booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewBooking = async (booking: GuestPortalBooking) => {
    if (selectedBookingId === booking.id) {
      return;
    }

    try {
      setIsLoadingDetails(true);
      setErrorMessage(null);
      const detailedBooking = await guestPortalService.getBooking(booking.id);
      setSelectedBooking(detailedBooking);
    } catch (detailError) {
      setSelectedBooking(null);
      setErrorMessage(detailError instanceof Error ? detailError.message : 'Failed to load booking details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const content = (
    <>
      {errorMessage ? <div style={{ ...styles.message, ...styles.error }}>{errorMessage}</div> : null}
      {infoMessage ? <div style={{ ...styles.message, ...styles.info }}>{infoMessage}</div> : null}

      {isBootstrapping ? (
        <section style={styles.panel}>
          <p style={styles.text}>Restoring your guest session...</p>
        </section>
      ) : guest ? (
        <>
          <section style={styles.panelRow}>
            <div>
              <p style={styles.panelLabel}>Signed in as</p>
              <p style={styles.identity}>{guest.email}</p>
            </div>
            <button type="button" onClick={handleLogout} disabled={isSubmitting} style={styles.secondaryButton}>
              Sign out
            </button>
          </section>

          <section style={styles.portalGrid}>
            <div style={styles.bookingGrid}>
              {bookings.length === 0 ? (
                <article style={styles.panel}>
                  <h2 style={styles.panelTitle}>No linked bookings yet</h2>
                  <p style={styles.text}>
                    When you book with this same email address, the booking will appear here automatically.
                  </p>
                </article>
              ) : (
                bookings.map((booking) => (
                  <article key={booking.id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <div>
                        <p style={styles.panelLabel}>Booking #{booking.id}</p>
                        <h2 style={styles.panelTitle}>{booking.service?.name ?? 'Service booking'}</h2>
                      </div>
                      <span style={statusStyle(booking.status)}>{formatStatus(booking.status)}</span>
                    </div>

                    <dl style={styles.metaList}>
                      <div>
                        <dt style={styles.metaTerm}>When</dt>
                        <dd style={styles.metaValue}>{formatDateRange(booking.starts_at, booking.ends_at)}</dd>
                      </div>
                      <div>
                        <dt style={styles.metaTerm}>Resource</dt>
                        <dd style={styles.metaValue}>{booking.resource?.name ?? 'Unassigned'}</dd>
                      </div>
                      <div>
                        <dt style={styles.metaTerm}>Email</dt>
                        <dd style={styles.metaValue}>{booking.customer_email}</dd>
                      </div>
                    </dl>

                    {booking.customer_notes ? <p style={styles.notes}>{booking.customer_notes}</p> : null}

                    <div style={styles.cardActions}>
                      <Link
                        to={`/guest-portal/${booking.id}`}
                        onClick={() => void handleViewBooking(booking)}
                        style={styles.detailLink}
                      >
                        {selectedBooking?.id === booking.id ? 'Viewing details' : 'View details'}
                      </Link>

                      {booking.can_cancel ? (
                        <button
                          type="button"
                          onClick={() => void handleCancelBooking(booking.id)}
                          disabled={isSubmitting}
                          style={styles.dangerButton}
                        >
                          Cancel booking
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>

            <aside style={styles.detailPanel}>
              {selectedBooking ? (
                <article style={styles.panel}>
                  <div style={styles.detailHeader}>
                    <div>
                      <p style={styles.panelLabel}>Selected booking</p>
                      <h2 style={styles.panelTitle}>{selectedBooking.service?.name ?? 'Service booking'}</h2>
                    </div>
                    <span style={statusStyle(selectedBooking.status)}>{formatStatus(selectedBooking.status)}</span>
                  </div>

                  <dl style={styles.detailList}>
                    <div>
                      <dt style={styles.metaTerm}>Booking ID</dt>
                      <dd style={styles.metaValue}>#{selectedBooking.id}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>When</dt>
                      <dd style={styles.metaValue}>{formatDateRange(selectedBooking.starts_at, selectedBooking.ends_at)}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Resource</dt>
                      <dd style={styles.metaValue}>{selectedBooking.resource?.name ?? 'Unassigned'}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Phone</dt>
                      <dd style={styles.metaValue}>{selectedBooking.customer_phone ?? 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Payment</dt>
                      <dd style={styles.metaValue}>{formatPayment(selectedBooking)}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Contact email</dt>
                      <dd style={styles.metaValue}>{selectedBooking.customer_email}</dd>
                    </div>
                  </dl>

                  {selectedBooking.customer_notes ? <p style={styles.notes}>{selectedBooking.customer_notes}</p> : null}

                  <div style={styles.detailActions}>
                    <Link to="/guest-portal" style={styles.secondaryLink}>Back to all bookings</Link>
                    {selectedBooking.can_cancel ? (
                      <button
                        type="button"
                        onClick={() => void handleCancelBooking(selectedBooking.id)}
                        disabled={isSubmitting}
                        style={styles.dangerButton}
                      >
                        Cancel booking
                      </button>
                    ) : null}
                  </div>
                </article>
              ) : (
                <article style={styles.panel}>
                  <h2 style={styles.panelTitle}>Booking details</h2>
                  <p style={styles.text}>
                    {isLoadingDetails
                      ? 'Loading booking details...'
                      : 'Choose a booking to view the full schedule, resource, payment, and contact details.'}
                  </p>
                </article>
              )}
            </aside>
          </section>
        </>
      ) : (
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Get a sign-in link</h2>
          <p style={styles.text}>
            Enter the email address you used for your booking. We will email you a secure link to open your guest space.
          </p>

          <form onSubmit={(event) => void handleRequestLink(event)} style={styles.form}>
            <label htmlFor="guest-email" style={styles.label}>Email address</label>
            <input
              id="guest-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={styles.input}
            />
            <button type="submit" disabled={isSubmitting} style={styles.primaryButton}>
              Send sign-in link
            </button>
          </form>
        </section>
      )}
    </>
  );

  if (variant === 'embedded') {
    return <div style={styles.embeddedShell}>{content}</div>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.hero}>
          <p style={styles.kicker}>Guest portal</p>
          <h1 style={styles.title}>My bookings</h1>
          <p style={styles.subtitle}>
            This is the customer-facing space for your tenant activities. Today it contains bookings.
            Later it can also include quote history, approvals, and other guest-visible add-on flows.
          </p>
        </div>
        {content}
      </section>
    </main>
  );
}

function parseBookingId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatStatus(status: GuestPortalBooking['status']): string {
  return status.replace(/_/g, ' ');
}

function formatPayment(booking: GuestPortalBooking): string {
  if (!booking.payment) {
    return 'No payment attached';
  }

  const amount = booking.payment.amount / 100;
  const currency = booking.payment.currency.toUpperCase();

  return `${amount.toFixed(2)} ${currency} · ${booking.payment.status}`;
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) {
    return 'Date pending';
  }

  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const startLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(start);

  if (!end) {
    return startLabel;
  }

  const endLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

function statusStyle(status: GuestPortalBooking['status']): React.CSSProperties {
  const palette: Record<GuestPortalBooking['status'], { background: string; color: string }> = {
    pending: { background: '#fef3c7', color: '#92400e' },
    pending_hold: { background: '#fde68a', color: '#92400e' },
    awaiting_payment: { background: '#dbeafe', color: '#1d4ed8' },
    confirmed: { background: '#dcfce7', color: '#166534' },
    completed: { background: '#e2e8f0', color: '#334155' },
    cancelled: { background: '#fee2e2', color: '#991b1b' },
    no_show: { background: '#e5e7eb', color: '#374151' },
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'capitalize',
    background: palette[status].background,
    color: palette[status].color,
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem 1rem 4rem',
    background: 'linear-gradient(180deg, rgba(255,248,235,0.96) 0%, rgba(255,255,255,0.98) 55%, rgba(248,250,252,0.98) 100%)',
  },
  shell: {
    width: '100%',
    maxWidth: '72rem',
    margin: '0 auto',
  },
  embeddedShell: {
    display: 'grid',
    gap: '1rem',
    width: '100%',
  },
  hero: {
    padding: '1rem 0 2rem',
  },
  kicker: {
    margin: 0,
    color: '#9a3412',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: '0.75rem 0 0',
    fontSize: 'clamp(2.4rem, 6vw, 5rem)',
    lineHeight: 0.95,
    letterSpacing: '-0.04em',
    color: '#0f172a',
  },
  subtitle: {
    margin: '1rem 0 0',
    maxWidth: '48rem',
    color: '#334155',
    fontSize: '1.05rem',
    lineHeight: 1.8,
  },
  message: {
    borderRadius: '1rem',
    padding: '0.9rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.95rem',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
  info: {
    background: '#dbeafe',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
  },
  panel: {
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: '1.5rem',
    boxShadow: '0 24px 80px rgba(15,23,42,0.12)',
    padding: '1.5rem',
  },
  panelRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: '1.5rem',
    boxShadow: '0 24px 80px rgba(15,23,42,0.12)',
    padding: '1.25rem 1.5rem',
  },
  panelLabel: {
    margin: 0,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  panelTitle: {
    margin: '0.45rem 0 0',
    fontSize: '1.3rem',
    color: '#0f172a',
  },
  identity: {
    margin: '0.35rem 0 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  text: {
    margin: '0.85rem 0 0',
    color: '#475569',
    lineHeight: 1.7,
  },
  form: {
    display: 'grid',
    gap: '0.85rem',
    marginTop: '1.25rem',
  },
  label: {
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  input: {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: '1rem',
    border: '1px solid rgba(15,23,42,0.16)',
    background: '#fff',
    color: '#0f172a',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  primaryButton: {
    appearance: 'none',
    border: 0,
    borderRadius: '999px',
    padding: '0.95rem 1.25rem',
    background: '#0f172a',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  secondaryButton: {
    appearance: 'none',
    border: '1px solid rgba(15,23,42,0.16)',
    borderRadius: '999px',
    padding: '0.85rem 1.1rem',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  dangerButton: {
    appearance: 'none',
    border: '1px solid #fecaca',
    borderRadius: '999px',
    padding: '0.8rem 1rem',
    background: '#fff5f5',
    color: '#b91c1c',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  portalGrid: {
    display: 'grid',
    gap: '1rem',
    marginTop: '1rem',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(18rem, 1fr)',
    alignItems: 'start',
  },
  bookingGrid: {
    display: 'grid',
    gap: '1rem',
  },
  detailPanel: {
    display: 'grid',
    gap: '1rem',
  },
  bookingCard: {
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: '1.5rem',
    boxShadow: '0 24px 80px rgba(15,23,42,0.12)',
    padding: '1.5rem',
  },
  bookingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  metaList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
    gap: '1rem',
    margin: '1.25rem 0 0',
  },
  metaTerm: {
    margin: 0,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  metaValue: {
    margin: '0.35rem 0 0',
    color: '#0f172a',
    lineHeight: 1.6,
  },
  notes: {
    margin: '1rem 0 0',
    padding: '1rem',
    borderRadius: '1rem',
    background: '#fff7ed',
    color: '#7c2d12',
    lineHeight: 1.7,
  },
  cardActions: {
    marginTop: '1.25rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  detailList: {
    display: 'grid',
    gap: '1rem',
    margin: '1.25rem 0 0',
  },
  detailActions: {
    marginTop: '1.25rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
  },
  detailLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  secondaryLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    background: '#fff',
    color: '#0f172a',
    textDecoration: 'none',
    fontWeight: 600,
    border: '1px solid rgba(15,23,42,0.16)',
    fontSize: '0.9rem',
  },
};
