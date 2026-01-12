import { useState, useEffect } from 'react';
import { pages } from '@/shared/services/api/pages';
import type { Page } from '@/shared/services/api/types';

interface PagesSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

export function PagesSelector({ value, onChange }: PagesSelectorProps) {
  const [pagesList, setPagesList] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      try {
        const response = await pages.list({ per_page: 100, status: 'published' });
        // response is PaginatedResponse<Page>, which has a data property containing Page[]
        setPagesList(response.data || []);
      } catch (error) {
        console.error('Failed to fetch pages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, []);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '14px',
        fontFamily: 'inherit',
      }}
    >
      <option value="">{isLoading ? 'Loading pages...' : 'Select a page'}</option>
      {pagesList.map((page) => (
        <option key={page.id} value={`/${page.slug}`}>
          {page.title}
        </option>
      ))}
    </select>
  );
}
