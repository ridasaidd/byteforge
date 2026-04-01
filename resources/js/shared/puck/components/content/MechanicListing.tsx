import type { ComponentConfig } from '@puckeditor/core';
import { useTheme } from '@/shared/hooks';
import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

type MechanicResult = {
  id: number;
  tenant_id: string;
  workshop_name: string | null;
  domain: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  services: string[];
  is_verified: boolean;
  distance_km?: number;
};

type SearchMeta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

export type MechanicListingProps = {
  id?: string;
  /** Section heading displayed above the listing grid */
  heading: string;
  /** Optional sub-heading */
  subheading?: string;
  /** Pre-filter by city name */
  defaultCity?: string;
  /** Pre-filter by service */
  defaultService?: string;
  /** Search radius in km (GPS mode) */
  radiusKm: number;
  /** Number of results per page */
  perPage: number;
  /** Show only verified mechanics */
  verifiedOnly: boolean;
  /** Allow the visitor to trigger GPS-based search */
  enableGps: boolean;
  /** Base URL for the central API (without trailing slash) */
  apiBaseUrl?: string;
};

// ============================================================================
// Component
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
function MechanicListingComponent({
  id,
  heading,
  subheading,
  defaultCity,
  defaultService,
  radiusKm,
  perPage,
  verifiedOnly,
  enableGps,
  apiBaseUrl,
}: MechanicListingProps) {
  const { resolve } = useTheme();
  const containerClass = `mechanic-listing-${id}`;

  const [mechanics, setMechanics] = useState<MechanicResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(defaultCity ?? '');
  const [service, setService] = useState(defaultService ?? '');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const primaryColor = resolve('colors.primary.500', '#3B82F6');
  const foreground   = resolve('colors.foreground', '#111827');
  const muted        = resolve('colors.muted', '#6B7280');
  const base         = apiBaseUrl ?? '/api';

  const fetchMechanics = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('per_page', String(perPage));
    params.set('page', String(currentPage));
    if (city)         params.set('city',     city);
    if (service)      params.set('service',  service);
    if (verifiedOnly) params.set('verified', '1');
    if (gpsCoords) {
      params.set('lat',    String(gpsCoords.lat));
      params.set('lng',    String(gpsCoords.lng));
      params.set('radius', String(radiusKm));
    }

    try {
      const res  = await fetch(`${base}/mechanics/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMechanics(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      setError('Failed to load mechanics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [base, city, service, verifiedOnly, gpsCoords, radiusKm, perPage]);

  useEffect(() => {
    setPage(1);
    fetchMechanics(1);
  }, [fetchMechanics]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMechanics(1);
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setError('Unable to retrieve your location.');
        setGpsLoading(false);
      }
    );
  };

  const handlePage = (next: number) => {
    setPage(next);
    fetchMechanics(next);
  };

  return (
    <div className={containerClass}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: foreground, margin: 0 }}>
          {heading}
        </h2>
        {subheading && (
          <p style={{ fontSize: '1.1rem', color: muted, marginTop: '0.5rem' }}>{subheading}</p>
        )}
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}
      >
        <input
          type="text"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Service (e.g. oil change)"
          value={service}
          onChange={(e) => setService(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={{ ...btnStyle, backgroundColor: primaryColor, color: '#fff' }}>
          Search
        </button>
        {enableGps && (
          <button
            type="button"
            onClick={handleGps}
            disabled={gpsLoading}
            style={{ ...btnStyle, backgroundColor: gpsCoords ? '#10B981' : '#6B7280', color: '#fff' }}
          >
            {gpsLoading ? 'Locating…' : gpsCoords ? '📍 Location set' : '📍 Use my location'}
          </button>
        )}
        {gpsCoords && (
          <button
            type="button"
            onClick={() => setGpsCoords(null)}
            style={{ ...btnStyle, backgroundColor: '#EF4444', color: '#fff' }}
          >
            Clear location
          </button>
        )}
      </form>

      {/* Error */}
      {error && (
        <p style={{ color: '#EF4444', marginBottom: '1rem' }}>{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: muted, textAlign: 'center', padding: '2rem 0' }}>Loading mechanics…</p>
      )}

      {/* Results grid */}
      {!loading && mechanics.length === 0 && !error && (
        <p style={{ color: muted, textAlign: 'center', padding: '2rem 0' }}>
          No mechanic workshops found. Try broadening your search.
        </p>
      )}

      {!loading && mechanics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {mechanics.map((m) => (
            <MechanicCard key={m.id} mechanic={m} primaryColor={primaryColor} foreground={foreground} muted={muted} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePage(p)}
              style={{
                ...btnStyle,
                backgroundColor: p === page ? primaryColor : '#E5E7EB',
                color: p === page ? '#fff' : foreground,
                minWidth: '2.5rem',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
function MechanicCard({
  mechanic,
  primaryColor,
  foreground,
  muted,
}: {
  mechanic: MechanicResult;
  primaryColor: string;
  foreground: string;
  muted: string;
}) {
  const workshopUrl = mechanic.domain
    ? `https://${mechanic.domain}`
    : mechanic.website ?? '#';

  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: foreground, margin: 0 }}>
          {mechanic.workshop_name ?? 'Mechanic Workshop'}
        </h3>
        {mechanic.is_verified && (
          <span
            title="Verified"
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              borderRadius: '9999px',
              padding: '0.2rem 0.6rem',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ Verified
          </span>
        )}
      </div>

      {(mechanic.city || mechanic.country) && (
        <p style={{ fontSize: '0.875rem', color: muted, margin: 0 }}>
          📍 {[mechanic.address, mechanic.city, mechanic.country].filter(Boolean).join(', ')}
        </p>
      )}

      {mechanic.distance_km !== undefined && (
        <p style={{ fontSize: '0.8rem', color: primaryColor, fontWeight: 500, margin: 0 }}>
          {mechanic.distance_km.toFixed(1)} km away
        </p>
      )}

      {mechanic.description && (
        <p style={{ fontSize: '0.875rem', color: muted, margin: 0, lineHeight: 1.5 }}>
          {mechanic.description.length > 120
            ? mechanic.description.slice(0, 120) + '…'
            : mechanic.description}
        </p>
      )}

      {mechanic.services.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
          {mechanic.services.slice(0, 5).map((s) => (
            <span
              key={s}
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                borderRadius: '9999px',
                padding: '0.15rem 0.6rem',
              }}
            >
              {s}
            </span>
          ))}
          {mechanic.services.length > 5 && (
            <span style={{ fontSize: '0.75rem', color: muted }}>+{mechanic.services.length - 5} more</span>
          )}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <a
          href={workshopUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.45rem 1rem',
            backgroundColor: primaryColor,
            color: '#fff',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          View Workshop
        </a>
        {mechanic.phone && (
          <a
            href={`tel:${mechanic.phone}`}
            style={{
              display: 'inline-block',
              padding: '0.45rem 1rem',
              backgroundColor: '#F3F4F6',
              color: foreground,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Call
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Shared inline styles
// ============================================================================

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #D1D5DB',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  flex: '1 1 180px',
};

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
};

// ============================================================================
// Puck component config
// ============================================================================

export const MechanicListing: ComponentConfig<MechanicListingProps> = {
  label: 'Mechanic Listing',

  fields: {
    heading: {
      type: 'text',
      label: 'Heading',
    },
    subheading: {
      type: 'text',
      label: 'Sub-heading',
    },
    defaultCity: {
      type: 'text',
      label: 'Default City Filter',
    },
    defaultService: {
      type: 'text',
      label: 'Default Service Filter',
    },
    radiusKm: {
      type: 'number',
      label: 'GPS Search Radius (km)',
      min: 1,
      max: 500,
    },
    perPage: {
      type: 'number',
      label: 'Results Per Page',
      min: 1,
      max: 100,
    },
    verifiedOnly: {
      type: 'radio',
      label: 'Show only verified mechanics',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    enableGps: {
      type: 'radio',
      label: 'Enable GPS location search',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    apiBaseUrl: {
      type: 'text',
      label: 'API Base URL (optional override)',
    },
  },

  defaultProps: {
    heading: 'Find a Mechanic Near You',
    subheading: 'Browse trusted car workshops in your area',
    defaultCity: '',
    defaultService: '',
    radiusKm: 50,
    perPage: 12,
    verifiedOnly: false,
    enableGps: true,
    apiBaseUrl: '',
  },

  render: MechanicListingComponent,
};
