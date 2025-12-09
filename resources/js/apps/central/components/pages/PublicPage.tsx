import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Render, type Data } from '@measured/puck';
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
  const [isRendered, setIsRendered] = useState(false);

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

  // Delay rendering to allow styles to apply
  useEffect(() => {
    if (!isLoading && page) {
      // Use requestAnimationFrame to ensure styles are applied
      requestAnimationFrame(() => {
        setIsRendered(true);
      });
    } else {
      setIsRendered(false);
    }
  }, [isLoading, page]);

  if (isLoading || !isRendered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">{error || 'Page not found'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
          <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-16">
              <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
              <p className="text-gray-600">This page is empty. Please edit it in the dashboard.</p>
            </div>
          </div>
        )}
    </ThemeProvider>
  );
}
