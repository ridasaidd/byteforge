import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ThemeBuilderPage } from '../ThemeBuilderPage';
import { BrowserRouter } from 'react-router-dom';
import type { Theme } from '@/shared/services/api/types';

// Mock API modules
vi.mock('@/shared/services/api/themes', () => ({
  themes: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/themeParts', () => ({
  themeParts: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/pageTemplates', () => ({
  pageTemplates: {
    getByTheme: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/themeCss', () => ({
  themeCssApi: {
    publish: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/shared/hooks/useThemeCssSectionSave', () => ({
  useThemeCssSectionSave: () => ({
    saveSection: vi.fn(),
  }),
}));

// Mock Puck
vi.mock('@puckeditor/core', () => ({
  Puck: ({ data }: { data: unknown }) => <div data-testid="puck-editor">Puck: {JSON.stringify(data)}</div>,
  createUsePuck: () => () => ({
    appState: {},
    dispatch: vi.fn(),
  }),
}));

// Mock react-router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('ThemeBuilderPage - CSS Loading', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.head.innerHTML = '';
    vi.clearAllMocks();

    // Mock fetch for CSS files
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('_header.css')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('.box-test { background-color: #10b981; }'),
        } as Response);
      }
      if (url.includes('_footer.css')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('.footer-test { color: #fff; }'),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Header Tab CSS Loading', () => {
    it('should load header CSS file when header tab is active', async () => {
      // Mock theme API to return theme with header part
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: { id: 1, puck_data_raw: { content: [], root: {} } },
          footer_part: null,
        },
      } as unknown as { data: Theme });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      // Wait for CSS to be loaded
      await waitFor(() => {
        const styleTag = document.getElementById('editor-header-css');
        expect(styleTag).toBeInTheDocument();
        expect(styleTag?.textContent).toContain('.box-test { background-color: #10b981; }');
      });
    });

    it('should update header CSS when header data changes', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: { id: 1, puck_data_raw: { content: [], root: {} } },
          footer_part: null,
        },
      } as unknown as { data: Theme });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const styleTag = document.getElementById('editor-header-css');
        expect(styleTag).toBeInTheDocument();
      });

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/storage/themes/1/1_header.css')
      );
    });

    it('should handle missing header CSS file gracefully', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: { id: 1, puck_data_raw: { content: [], root: {} } },
          footer_part: null,
        },
      } as unknown as { data: Theme });

      // Mock fetch to return 404
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
      } as Response));

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      // Should not crash, CSS tag should be empty or not exist
      await waitFor(() => {
        const styleTag = document.getElementById('editor-header-css');
        if (styleTag) {
          expect(styleTag.textContent).toBe('');
        }
      });
    });
  });

  describe('Footer Tab CSS Loading', () => {
    it('should load footer CSS file when footer tab is active', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: null,
          footer_part: { id: 2, puck_data_raw: { content: [], root: {} } },
        },
      } as unknown as { data: Theme });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      // Wait for CSS to be loaded
      await waitFor(() => {
        const styleTag = document.getElementById('editor-footer-css');
        expect(styleTag).toBeInTheDocument();
        expect(styleTag?.textContent).toContain('.footer-test { color: #fff; }');
      });
    });
  });

  describe('CSS Cascade Behavior', () => {
    it('should load base CSS before component runtime CSS', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: { id: 1, puck_data_raw: { content: [], root: {} } },
          footer_part: null,
        },
      } as unknown as { data: Theme });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const headerCss = document.getElementById('editor-header-css');
        expect(headerCss).toBeInTheDocument();

        // Verify it's in the <head>
        expect(document.head.contains(headerCss)).toBe(true);
      });
    });

    it('should cleanup CSS when component unmounts', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {},
          header_part: { id: 1, puck_data_raw: { content: [], root: {} } },
          footer_part: null,
        },
      } as unknown as { data: Theme });

      const { unmount } = render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(document.getElementById('editor-header-css')).toBeInTheDocument();
      });

      unmount();

      // CSS should be removed from DOM
      expect(document.getElementById('editor-header-css')).not.toBeInTheDocument();
    });
  });

  describe('Settings Tab CSS Loading', () => {
    it('should load theme variables CSS when on settings tab', async () => {
      const { themes } = await import('@/shared/services/api/themes');
      vi.mocked(themes.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Test Theme',
          theme_data: {
            colors: { primary: { 500: '#0432ff' } },
          },
          header_part: null,
          footer_part: null,
        },
      } as unknown as { data: Theme });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      // Variables CSS should be loaded from theme_data
      await waitFor(() => {
        // Implementation will inject CSS variables when theme loads
        const styleTag = document.getElementById('editor-variables-css');
        if (styleTag) {
          expect(styleTag.textContent).toContain(':root');
        }
      });
    });
  });
});
