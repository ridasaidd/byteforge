import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { guestPortalService } from '../services/guestPortal';

export function GuestMagicLinkPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token) {
        setError('This sign-in link is invalid.');
        return;
      }

      try {
        await guestPortalService.verifyMagicLink(token);

        if (!cancelled) {
          navigate('/guest-portal', { replace: true });
        }
      } catch (verificationError) {
        if (!cancelled) {
          setError(verificationError instanceof Error ? verificationError.message : 'Failed to verify your sign-in link.');
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Guest access</p>
        <h1 style={styles.title}>{error ? 'We could not sign you in' : 'Signing you in...'}</h1>
        <p style={styles.text}>
          {error ?? 'Please wait while we verify your secure link and restore your booking space.'}
        </p>
        <div style={styles.actions}>
          <a href="/guest-portal" style={styles.primaryLink}>Go to Guest Portal</a>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  panel: {
    width: '100%',
    maxWidth: '40rem',
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: '1.5rem',
    boxShadow: '0 24px 80px rgba(15,23,42,0.14)',
    padding: '2rem',
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
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    lineHeight: 1.05,
    color: '#0f172a',
  },
  text: {
    margin: '1rem 0 0',
    color: '#334155',
    fontSize: '1rem',
    lineHeight: 1.7,
  },
  actions: {
    marginTop: '1.5rem',
  },
  primaryLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.85rem 1.2rem',
    borderRadius: '999px',
    background: '#0f172a',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
