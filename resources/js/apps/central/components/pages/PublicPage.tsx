import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Render, type Data } from '@puckeditor/core';
import { useTranslation } from 'react-i18next';
import { config } from '../pages/puck-components';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import type { Theme } from '@/shared/services/api/types';

interface Page {
  id: number;
  title: string;
  slug: string;
  page_type: string;
  puck_data: unknown;
  puck_data_compiled?: unknown;
  meta_data: Record<string, unknown>;
  status: string;
  is_homepage: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  header?: {
    id: number;
    name: string;
    puck_data_compiled: { content?: unknown[]; root?: unknown };
  } | null;
  footer?: {
    id: number;
    name: string;
    puck_data_compiled: { content?: unknown[]; root?: unknown };
  } | null;
}

export function PublicPage() {
  const { t } = useTranslation('public');
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isHomepage = location.pathname === '/';
  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        if (isHomepage) {
          // Fetch homepage - we need to add this endpoint
          response = await fetch('/api/pages/public/homepage');
        } else if (slug) {
          // Fetch page by slug
          response = await fetch(`/api/pages/public/${slug}`);
        } else {
          throw new Error(t('no_slug'));
        }

        if (!response.ok) {
          throw new Error(t('not_found'));
        }

        const result = await response.json();
        setPage(result.data);

        // Fire page.viewed analytics beacon — non-blocking, failure is silently ignored
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'page.viewed',
            properties: {
              page_id: result.data?.id,
              slug:    result.data?.slug,
              title:   result.data?.title,
            },
          }),
        }).catch(() => { /* tracking must never break page load */ });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failed_load'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug, isHomepage, t]);

  // Set page title and meta tags
  useEffect(() => {
    if (page) {
      const metaTitle = (page.meta_data?.meta_title as string) || (page.meta_data?.title as string);
      document.title = metaTitle || page.title || t('default_title');

      // Set meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      const metaDescriptionText =
        (page.meta_data?.meta_description as string) || (page.meta_data?.description as string);
      if (metaDescription && metaDescriptionText) {
        metaDescription.setAttribute('content', metaDescriptionText);
      }
    }
  }, [page]);

  // TODO: Future - Replace with Puck-built splash screen (tenant customizable)
  // Puck can generate static HTML for loading states, removing Tailwind dependency
  if (isLoading) {
    return null; // Blank while loading - CSS already in <head> from blade
  }

  // TODO: Future - Replace with Puck-built 404 page (tenant customizable)
  if (error || !page) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>404</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>{error || t('not_found')}</p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none'
            }}
          >
            {t('go_home')}
          </a>
        </div>
      </div>
    );
  }

  // Extract metadata from compiled page data
  const pageData = (page.puck_data_compiled || page.puck_data) as {
    content?: unknown[];
    root?: unknown;
    metadata?: {
      navigations?: unknown[];
      settings?: Record<string, unknown>;
      theme?: {
        id: number;
        name: string;
        slug: string;
        data: Record<string, unknown>;
      };
    };
  };

  // Extract theme from metadata (if available)
  const themeFromMetadata: Theme | null = pageData?.metadata?.theme
    ? {
        id: pageData.metadata.theme.id,
        tenant_id: null,
        name: pageData.metadata.theme.name,
        slug: pageData.metadata.theme.slug,
        base_theme: null,
        theme_data: pageData.metadata.theme.data,
        is_active: true,
        is_system_theme: true,
        description: null,
        preview_image: null,
        author: null,
        version: '1.0.0',
        created_at: '',
        updated_at: '',
      }
    : null;

  return (
    <ThemeProvider initialTheme={themeFromMetadata}>
      {pageData && pageData.content ? (
        <Render
          config={config}
          data={pageData as Data}
          metadata={pageData.metadata || {}} // Puck propagates this to all components!
        />
        ) : (
          <div style={{ minHeight: '100vh', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{page.title}</h1>
            <p>{t('empty_page')}</p>
          </div>
        )}
    </ThemeProvider>
  );
}
