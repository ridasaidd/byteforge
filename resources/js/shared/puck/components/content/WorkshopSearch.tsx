import { useState, useCallback } from 'react';
import type { ComponentConfig } from '@puckeditor/core';
import { MapPin, Phone, Mail, Globe, Search, CheckCircle, Loader2 } from 'lucide-react';
import { workshopSearch } from '@/shared/services/api/workshops';
import type { WorkshopSearchResult } from '@/shared/services/api/types';

// ============================================================================
// Types
// ============================================================================

export type WorkshopSearchProps = {
  title?: string;
  subtitle?: string;
  defaultRadius?: number;
  placeholderText?: string;
};

// ============================================================================
// Individual workshop card
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
function WorkshopCard({ workshop }: { workshop: WorkshopSearchResult }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{workshop.name}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
          {workshop.is_verified && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                color: '#059669',
                fontWeight: 500,
              }}
            >
              <CheckCircle size={12} /> Verified
            </span>
          )}
          {workshop.distance_km !== null && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {workshop.distance_km} km away
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      {(workshop.address || workshop.city) && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <MapPin size={13} />
          {[workshop.address, workshop.city, workshop.postal_code].filter(Boolean).join(', ')}
        </p>
      )}

      {/* Description */}
      {workshop.description && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>
          {workshop.description.length > 160
            ? workshop.description.slice(0, 160) + '…'
            : workshop.description}
        </p>
      )}

      {/* Specializations */}
      {workshop.specializations && workshop.specializations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
          {workshop.specializations.map((s) => (
            <span
              key={s}
              style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontWeight: 500,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Contact */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
        {workshop.phone && (
          <a
            href={`tel:${workshop.phone}`}
            style={{ fontSize: '0.82rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <Phone size={13} /> {workshop.phone}
          </a>
        )}
        {workshop.email && (
          <a
            href={`mailto:${workshop.email}`}
            style={{ fontSize: '0.82rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <Mail size={13} /> {workshop.email}
          </a>
        )}
        {workshop.website && (
          <a
            href={workshop.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.82rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <Globe size={13} /> Website
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
function WorkshopSearchComponent({
  title = 'Find a Mechanic Near You',
  subtitle = 'Search for car mechanic workshops by your location.',
  defaultRadius = 50,
  placeholderText = 'Enter specialization (e.g. Brakes, Tyres)…',
}: WorkshopSearchProps) {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(defaultRadius);
  const [results, setResults] = useState<WorkshopSearchResult[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; radius_km: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const doSearch = useCallback(
    async (lat: number, lng: number, q: string, r: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await workshopSearch.search({ lat, lng, radius: r, q: q || undefined, per_page: 20 });
        const data = res as unknown as {
          data: WorkshopSearchResult[];
          meta: { total: number };
          search: { radius_km: number };
        };
        setResults(data.data);
        setMeta({ total: data.meta.total, radius_km: data.search.radius_km });
      } catch {
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => doSearch(pos.coords.latitude, pos.coords.longitude, query, radius),
      () => setLocationError('Could not get your location. Please allow location access and try again.')
    );
  };

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      {title && (
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>{title}</h2>
      )}
      {subtitle && (
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '1rem' }}>{subtitle}</p>
      )}

      {/* Search bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.35rem', color: '#374151' }}>
            Service type
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={placeholderText}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: '0 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.35rem', color: '#374151' }}>
            Radius (km)
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              backgroundColor: '#fff',
              outline: 'none',
            }}
          >
            {[5, 10, 25, 50, 100, 200].map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '0.6rem 1.25rem',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0,
          }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
          {loading ? 'Searching…' : 'Use My Location'}
        </button>
      </div>

      {/* Errors */}
      {locationError && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>{locationError}</p>
      )}
      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
      )}

      {/* Results summary */}
      {meta && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
          Found {meta.total} workshop{meta.total !== 1 ? 's' : ''} within {meta.radius_km} km
        </p>
      )}

      {/* Results */}
      {results !== null && results.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6b7280',
            border: '1px dashed #d1d5db',
            borderRadius: '0.75rem',
          }}
        >
          <MapPin size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>No workshops found in this area. Try increasing the radius.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {results.map((w) => (
            <WorkshopCard key={w.id} workshop={w} />
          ))}
        </div>
      )}

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================================================
// Puck component config
// ============================================================================

export const WorkshopSearch: ComponentConfig<WorkshopSearchProps> = {
  label: 'Workshop Search',

  fields: {
    title: {
      type: 'text',
      label: 'Title',
    },
    subtitle: {
      type: 'textarea',
      label: 'Subtitle',
    },
    defaultRadius: {
      type: 'number',
      label: 'Default search radius (km)',
      min: 1,
      max: 500,
    },
    placeholderText: {
      type: 'text',
      label: 'Search placeholder',
    },
  },

  defaultProps: {
    title: 'Find a Mechanic Near You',
    subtitle: 'Search for car mechanic workshops by your current location.',
    defaultRadius: 50,
    placeholderText: 'Enter specialization (e.g. Brakes, Tyres)…',
  },

  render: WorkshopSearchComponent,
};
