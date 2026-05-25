import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { guestPortalService, type GuestPortalBooking, type GuestPortalGuest, type GuestPortalQuote } from '../services/guestPortal';

export function GuestPortalExperience({
  variant = 'embedded',
}: {
  variant?: 'standalone' | 'embedded';
}) {
  const { bookingId, quoteId } = useParams<{ bookingId?: string; quoteId?: string }>();
  const [guest, setGuest] = useState<GuestPortalGuest | null>(null);
  const [bookings, setBookings] = useState<GuestPortalBooking[]>([]);
  const [quotes, setQuotes] = useState<GuestPortalQuote[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<GuestPortalBooking | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<GuestPortalQuote | null>(null);
  const [email, setEmail] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRescheduleFormOpen, setIsRescheduleFormOpen] = useState(false);
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState('');
  const [rescheduleEndsAt, setRescheduleEndsAt] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedBookingId = parseBookingId(bookingId);
  const selectedQuoteId = parseBookingId(quoteId);

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
          setQuotes([]);
          setSelectedBooking(null);
          setSelectedQuote(null);
          return;
        }

        const [nextBookings, nextQuotes, nextSelectedBooking, nextSelectedQuote] = await Promise.all([
          guestPortalService.listBookings(),
          guestPortalService.listQuotes(),
          selectedBookingId ? guestPortalService.getBooking(selectedBookingId) : Promise.resolve(null),
          selectedQuoteId ? guestPortalService.getQuote(selectedQuoteId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setGuest(restoredGuest);
          setBookings(nextBookings);
          setQuotes(nextQuotes);
          setSelectedBooking(nextSelectedBooking);
          setSelectedQuote(nextSelectedQuote);
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setSelectedBooking(null);
          setSelectedQuote(null);
          setErrorMessage(bootstrapError instanceof Error ? bootstrapError.message : 'Failed to load your guest portal.');
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
  }, [selectedBookingId, selectedQuoteId]);

  useEffect(() => {
    setIsRescheduleFormOpen(false);
    setRescheduleStartsAt(toDateTimeLocalValue(selectedBooking?.starts_at ?? null));
    setRescheduleEndsAt(toDateTimeLocalValue(selectedBooking?.ends_at ?? null));
  }, [selectedBooking?.id, selectedBooking?.starts_at, selectedBooking?.ends_at]);

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
      setQuotes([]);
      setSelectedBooking(null);
      setSelectedQuote(null);
      setInfoMessage('You have been signed out of your guest portal.');
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

  const handleRescheduleBooking = async (bookingId: number) => {
    if (!rescheduleStartsAt || !rescheduleEndsAt) {
      setErrorMessage('Choose both a new start and end time before rescheduling.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updatedBooking = await guestPortalService.rescheduleBooking(
        bookingId,
        new Date(rescheduleStartsAt).toISOString(),
        new Date(rescheduleEndsAt).toISOString(),
      );
      setBookings((current) => current.map((booking) => booking.id === updatedBooking.id ? updatedBooking : booking));
      setSelectedBooking((current) => current?.id === updatedBooking.id ? updatedBooking : current);
      setInfoMessage('Your booking was rescheduled.');
      setIsRescheduleFormOpen(false);
    } catch (rescheduleError) {
      setErrorMessage(rescheduleError instanceof Error ? rescheduleError.message : 'Failed to reschedule your booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuoteDecision = async (quoteId: number, decision: 'accept' | 'reject') => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const updatedQuote = decision === 'accept'
        ? await guestPortalService.acceptQuote(quoteId)
        : await guestPortalService.rejectQuote(quoteId);

      setQuotes((current) => current.map((quote) => quote.id === updatedQuote.id ? updatedQuote : quote));
      setSelectedQuote((current) => current?.id === updatedQuote.id ? updatedQuote : current);
      setInfoMessage(decision === 'accept' ? 'Your quote was accepted.' : 'Your quote was declined.');
    } catch (decisionError) {
      setErrorMessage(decisionError instanceof Error ? decisionError.message : 'Failed to update your quote.');
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

  const handleViewQuote = async (quote: GuestPortalQuote) => {
    if (selectedQuoteId === quote.id) {
      return;
    }

    try {
      setIsLoadingDetails(true);
      setErrorMessage(null);
      const detailedQuote = await guestPortalService.getQuote(quote.id);
      setSelectedQuote(detailedQuote);
    } catch (detailError) {
      setSelectedQuote(null);
      setErrorMessage(detailError instanceof Error ? detailError.message : 'Failed to load quote details.');
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
              {quotes.length === 0 ? (
                <article style={styles.panel}>
                  <h2 style={styles.panelTitle}>No linked quotes yet</h2>
                  <p style={styles.text}>
                    Quotes sent to this same email address will appear here automatically.
                  </p>
                </article>
              ) : (
                quotes.map((quote) => (
                  <article key={quote.id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <div>
                        <p style={styles.panelLabel}>Quote #{quote.id}</p>
                        <h2 style={styles.panelTitle}>{quote.subject_label ?? quote.booking_service?.name ?? 'Service quote'}</h2>
                      </div>
                      <span style={quoteStatusStyle(quote.status)}>{formatQuoteStatus(quote.status)}</span>
                    </div>

                    <dl style={styles.metaList}>
                      <div>
                        <dt style={styles.metaTerm}>Total</dt>
                        <dd style={styles.metaValue}>{formatQuoteAmount(quote.total_minor, quote.currency)}</dd>
                      </div>
                      <div>
                        <dt style={styles.metaTerm}>Service</dt>
                        <dd style={styles.metaValue}>{quote.booking_service?.name ?? 'Custom request'}</dd>
                      </div>
                      <div>
                        <dt style={styles.metaTerm}>Valid until</dt>
                        <dd style={styles.metaValue}>{formatOptionalDate(quote.valid_until, 'No expiry')}</dd>
                      </div>
                    </dl>

                    {quote.request_description ? <p style={styles.notes}>{quote.request_description}</p> : null}

                    <div style={styles.cardActions}>
                      <Link
                        to={`/guest-portal/quotes/${quote.id}`}
                        onClick={() => void handleViewQuote(quote)}
                        style={styles.detailLink}
                      >
                        {selectedQuote?.id === quote.id ? 'Viewing details' : 'View quote'}
                      </Link>

                      {quote.status === 'sent' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleQuoteDecision(quote.id, 'accept')}
                            disabled={isSubmitting}
                            style={styles.primaryButton}
                          >
                            Accept quote
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleQuoteDecision(quote.id, 'reject')}
                            disabled={isSubmitting}
                            style={styles.secondaryButton}
                          >
                            Reject quote
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}

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
                      {booking.can_reschedule ? (
                        <button
                          type="button"
                          onClick={() => void handleViewBooking(booking)}
                          disabled={isSubmitting}
                          style={styles.secondaryButton}
                        >
                          Reschedule booking
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>

            <aside style={styles.detailPanel}>
              {selectedQuote ? (
                <article style={styles.panel}>
                  <div style={styles.detailHeader}>
                    <div>
                      <p style={styles.panelLabel}>Selected quote</p>
                      <h2 style={styles.panelTitle}>{selectedQuote.subject_label ?? selectedQuote.booking_service?.name ?? 'Service quote'}</h2>
                    </div>
                    <span style={quoteStatusStyle(selectedQuote.status)}>{formatQuoteStatus(selectedQuote.status)}</span>
                  </div>

                  <dl style={styles.detailList}>
                    <div>
                      <dt style={styles.metaTerm}>Quote ID</dt>
                      <dd style={styles.metaValue}>#{selectedQuote.id}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Total</dt>
                      <dd style={styles.metaValue}>{formatQuoteAmount(selectedQuote.total_minor, selectedQuote.currency)}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Service</dt>
                      <dd style={styles.metaValue}>{selectedQuote.booking_service?.name ?? 'Custom request'}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Preferred date</dt>
                      <dd style={styles.metaValue}>{formatDateRange(selectedQuote.preferred_start_at, selectedQuote.preferred_end_at)}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Valid until</dt>
                      <dd style={styles.metaValue}>{formatOptionalDate(selectedQuote.valid_until, 'No expiry')}</dd>
                    </div>
                    <div>
                      <dt style={styles.metaTerm}>Converted booking</dt>
                      <dd style={styles.metaValue}>
                        {selectedQuote.converted_booking ? `#${selectedQuote.converted_booking.id}` : 'Not converted'}
                      </dd>
                    </div>
                  </dl>

                  {selectedQuote.customer_message ? <p style={styles.notes}>{selectedQuote.customer_message}</p> : null}
                  {selectedQuote.request_description ? <p style={styles.notesAlt}>{selectedQuote.request_description}</p> : null}

                  {selectedQuote.line_items.length > 0 ? (
                    <div style={styles.detailList}>
                      {selectedQuote.line_items.map((item) => (
                        <div key={item.id} style={styles.lineItemRow}>
                          <div>
                            <dt style={styles.metaTerm}>{item.label}</dt>
                            <dd style={styles.metaValue}>{item.description ?? 'No additional description'}</dd>
                          </div>
                          <dd style={styles.metaValue}>{formatQuoteAmount(item.line_total_minor, selectedQuote.currency)}</dd>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={styles.detailActions}>
                    <Link to="/guest-portal" style={styles.secondaryLink}>Back to all activity</Link>
                    {selectedQuote.status === 'sent' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleQuoteDecision(selectedQuote.id, 'accept')}
                          disabled={isSubmitting}
                          style={styles.primaryButton}
                        >
                          Accept quote
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleQuoteDecision(selectedQuote.id, 'reject')}
                          disabled={isSubmitting}
                          style={styles.secondaryButton}
                        >
                          Reject quote
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ) : selectedBooking ? (
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

                  {selectedBooking.can_reschedule ? (
                    <div style={styles.rescheduleSection}>
                      <div style={styles.rescheduleHeader}>
                        <div>
                          <p style={styles.panelLabel}>Reschedule</p>
                          <p style={styles.textMuted}>Choose a new time for this booking.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRescheduleFormOpen((current) => !current)}
                          disabled={isSubmitting}
                          style={styles.secondaryButton}
                        >
                          {isRescheduleFormOpen ? 'Hide reschedule form' : 'Reschedule booking'}
                        </button>
                      </div>

                      {isRescheduleFormOpen ? (
                        <div style={styles.rescheduleForm}>
                          <label style={styles.label} htmlFor="guest-reschedule-start">New start time</label>
                          <input
                            id="guest-reschedule-start"
                            type="datetime-local"
                            value={rescheduleStartsAt}
                            onChange={(event) => setRescheduleStartsAt(event.target.value)}
                            style={styles.input}
                          />

                          <label style={styles.label} htmlFor="guest-reschedule-end">New end time</label>
                          <input
                            id="guest-reschedule-end"
                            type="datetime-local"
                            value={rescheduleEndsAt}
                            onChange={(event) => setRescheduleEndsAt(event.target.value)}
                            style={styles.input}
                          />

                          <div style={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() => void handleRescheduleBooking(selectedBooking.id)}
                              disabled={isSubmitting}
                              style={styles.primaryButton}
                            >
                              Confirm reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsRescheduleFormOpen(false)}
                              disabled={isSubmitting}
                              style={styles.secondaryButton}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

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
                  <h2 style={styles.panelTitle}>Activity details</h2>
                  <p style={styles.text}>
                    {isLoadingDetails
                      ? 'Loading activity details...'
                      : 'Choose a quote or booking to view the full schedule, pricing, and contact details.'}
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
          <h1 style={styles.title}>My bookings and quotes</h1>
          <p style={styles.subtitle}>
            This is the customer-facing space for your tenant activities, including linked bookings and quote history
            for the same authenticated guest identity.
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

function formatQuoteStatus(status: GuestPortalQuote['status']): string {
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

function formatQuoteAmount(amountMinor: number, currency: string): string {
  return `${amountMinor} ${currency}`;
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

function formatOptionalDate(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
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

function quoteStatusStyle(status: GuestPortalQuote['status']): React.CSSProperties {
  const palette: Record<GuestPortalQuote['status'], { background: string; color: string }> = {
    sent: { background: '#dbeafe', color: '#1d4ed8' },
    accepted: { background: '#dcfce7', color: '#166534' },
    rejected: { background: '#fee2e2', color: '#991b1b' },
    cancelled: { background: '#fde68a', color: '#92400e' },
    expired: { background: '#e5e7eb', color: '#374151' },
    converted: { background: '#ede9fe', color: '#5b21b6' },
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
  textMuted: {
    margin: '0.45rem 0 0',
    color: '#64748b',
    lineHeight: 1.6,
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
  notesAlt: {
    margin: '0.85rem 0 0',
    padding: '1rem',
    borderRadius: '1rem',
    background: '#eff6ff',
    color: '#1d4ed8',
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
  rescheduleSection: {
    marginTop: '1.5rem',
    padding: '1rem',
    borderRadius: '1rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  rescheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rescheduleForm: {
    display: 'grid',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  inlineActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  lineItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.9rem 1rem',
    borderRadius: '1rem',
    background: '#f8fafc',
    alignItems: 'flex-start',
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
