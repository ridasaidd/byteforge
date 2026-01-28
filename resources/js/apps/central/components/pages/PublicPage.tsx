import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Render, type Data } from '@puckeditor/core';
import { config } from '../pages/puck-components';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

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
          throw new Error('No slug provided');
        }

        if (!response.ok) {
          throw new Error('Page not found');
        }

        const result = await response.json();
        setPage(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug, isHomepage]);

  // Set page title and meta tags
  useEffect(() => {
    if (page) {
      document.title = (page.meta_data?.title as string) || page.title || 'ByteForge';

      // Set meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && page.meta_data?.description) {
        metaDescription.setAttribute('content', page.meta_data.description as string);
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
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>{error || 'Page not found'}</p>
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
            Go Home
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
  const themeFromMetadata = pageData?.metadata?.theme ? {
    id: pageData.metadata.theme.id,
    name: pageData.metadata.theme.name,
    slug: pageData.metadata.theme.slug,
    theme_data: pageData.metadata.theme.data,
  } : null;

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
            <p>This page is empty. Please edit it in the dashboard.</p>
          </div>
        )}
    </ThemeProvider>
  );
}
