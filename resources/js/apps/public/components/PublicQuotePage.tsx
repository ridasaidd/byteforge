import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import type { CmsQuote } from '@/shared/services/api/quotes';
import { publicQuotesService } from '../services/quotes';

function formatQuoteAmount(amountMinor: number, currency: string): string {
  return `${amountMinor} ${currency}`;
}

function statusHeading(status: string, t: (key: string) => string): string {
  if (status === 'accepted') {
    return t('quotes_public_accepted_heading');
  }

  if (status === 'rejected') {
    return t('quotes_public_rejected_heading');
  }

  if (status === 'expired') {
    return t('quotes_public_expired_heading');
  }

  if (status === 'cancelled') {
    return t('quotes_public_cancelled_heading');
  }

  if (status === 'converted') {
    return t('quotes_public_converted_heading');
  }

  return t('quotes_public_page_title');
}

export function PublicQuotePage() {
  const { t } = useTranslation('common');
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<CmsQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      if (!token) {
        setQuote(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextQuote = await publicQuotesService.getQuote(token);

        if (!cancelled) {
          setQuote(nextQuote);
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setErrorMessage(error instanceof Error ? error.message : t('quotes_public_not_found'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const handleDecision = async (decision: 'accept' | 'reject') => {
    if (!token || !quote) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const nextQuote = decision === 'accept'
        ? await publicQuotesService.acceptQuote(token)
        : await publicQuotesService.rejectQuote(token);

      setQuote(nextQuote);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('quotes_public_action_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <main style={styles.page}><p style={styles.text}>{t('quotes_public_loading')}</p></main>;
  }

  if (!quote) {
    return <main style={styles.page}><p style={styles.error}>{errorMessage ?? t('quotes_public_not_found')}</p></main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>{t('quotes_public_eyebrow')}</p>
        <h1 style={styles.heading}>{statusHeading(quote.status, t)}</h1>
        <p style={styles.text}>{quote.customer_message ?? t('quotes_public_description')}</p>

        {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}

        <section style={styles.section}>
          <h2 style={styles.sectionHeading}>{t('quotes_public_summary_heading')}</h2>
          <div style={styles.summaryRow}>
            <span>{t('quotes_total_label')}</span>
            <strong>{formatQuoteAmount(quote.total_minor, quote.currency)}</strong>
          </div>
          {quote.valid_until ? (
            <p style={styles.meta}>{t('quotes_valid_until_public', { value: new Date(quote.valid_until).toLocaleString() })}</p>
          ) : null}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionHeading}>{t('quotes_line_items_heading')}</h2>
          <div style={styles.list}>
            {quote.line_items.map((item) => (
              <article key={item.id} style={styles.lineItem}>
                <div>
                  <p style={styles.lineItemTitle}>{item.label}</p>
                  {item.description ? <p style={styles.meta}>{item.description}</p> : null}
                </div>
                <strong>{formatQuoteAmount(item.line_total_minor, quote.currency)}</strong>
              </article>
            ))}
          </div>
        </section>

        {quote.status === 'sent' ? (
          <div style={styles.actions}>
            <button type="button" onClick={() => handleDecision('accept')} disabled={isSubmitting} style={styles.primaryButton}>
              {t('quotes_accept_button')}
            </button>
            <button type="button" onClick={() => handleDecision('reject')} disabled={isSubmitting} style={styles.secondaryButton}>
              {t('quotes_reject_button')}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f6f3ec 0%, #fffdf8 100%)',
    padding: '48px 20px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    background: '#ffffff',
    borderRadius: '24px',
    border: '1px solid rgba(39, 39, 42, 0.08)',
    padding: '32px',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
  },
  eyebrow: {
    margin: 0,
    fontSize: '0.85rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#8b5e34',
  },
  heading: {
    margin: '12px 0 8px',
    fontSize: '2.2rem',
    lineHeight: 1.1,
    color: '#1f2937',
  },
  text: {
    margin: 0,
    color: '#4b5563',
    lineHeight: 1.6,
  },
  section: {
    marginTop: '28px',
    display: 'grid',
    gap: '12px',
  },
  sectionHeading: {
    margin: 0,
    fontSize: '1rem',
    color: '#1f2937',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 18px',
    borderRadius: '16px',
    background: '#f9f6ef',
    color: '#1f2937',
  },
  meta: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#6b7280',
  },
  list: {
    display: 'grid',
    gap: '12px',
  },
  lineItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '16px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(39, 39, 42, 0.08)',
    alignItems: 'flex-start',
  },
  lineItemTitle: {
    margin: 0,
    fontWeight: 600,
    color: '#1f2937',
  },
  actions: {
    marginTop: '28px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  primaryButton: {
    border: 'none',
    borderRadius: '999px',
    background: '#14532d',
    color: '#ffffff',
    padding: '12px 18px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid rgba(39, 39, 42, 0.12)',
    borderRadius: '999px',
    background: '#ffffff',
    color: '#1f2937',
    padding: '12px 18px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    marginTop: '16px',
    color: '#991b1b',
  },
};
