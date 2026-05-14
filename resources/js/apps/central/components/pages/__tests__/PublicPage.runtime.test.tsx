import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicPage } from '../PublicPage';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

function renderPage(path = '/pages/storefront-clickable') {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/pages/:slug" element={<PublicPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function pageResponse(content: Array<Record<string, unknown>>) {
  return {
    data: {
      id: 1,
      title: 'Storefront Clickability Test',
      slug: 'storefront-clickable',
      page_type: 'general',
      meta_data: {},
      status: 'published',
      is_homepage: false,
      published_at: '2026-05-14T00:00:00Z',
      created_at: '2026-05-14T00:00:00Z',
      updated_at: '2026-05-14T00:00:00Z',
      puck_data_compiled: {
        content,
        root: { props: {} },
        zones: {},
      },
    },
  };
}

describe('PublicPage runtime clickability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.title = 'ByteForge';
  });

  it('renders a clickable image block on the storefront', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/pages/public/storefront-clickable')) {
        return new Response(
          JSON.stringify(
            pageResponse([
              {
                type: 'Image',
                props: {
                  id: 'image-clickable',
                  src: 'https://example.com/image.jpg',
                  alt: 'Runtime image',
                  linkType: 'internal',
                  internalPage: '/pages/target-page',
                },
              },
            ]),
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/analytics/track')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    await screen.findByAltText('Runtime image');

    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/pages/target-page');
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/pages/public/storefront-clickable')
    );
  });

  it('renders a clickable box block on the storefront', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/pages/public/storefront-clickable')) {
        return new Response(
          JSON.stringify(
            pageResponse([
              {
                type: 'Box',
                props: {
                  id: 'box-clickable',
                  linkType: 'external',
                  href: 'https://example.com/box-target',
                  openInNewTab: true,
                  items: [
                    {
                      type: 'Heading',
                      props: {
                        id: 'box-heading',
                        text: 'Runtime box content',
                        level: '3',
                      },
                    },
                  ],
                },
              },
            ]),
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/analytics/track')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    await screen.findByRole('heading', { name: 'Runtime box content', level: 3 });

    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/box-target');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
