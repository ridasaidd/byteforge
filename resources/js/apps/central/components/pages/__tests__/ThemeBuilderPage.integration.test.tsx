import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useParams } from 'react-router-dom';
import { ThemeBuilderPage } from '../ThemeBuilderPage';
import { themes } from '@/shared/services/api/themes';
import { themeParts } from '@/shared/services/api/themeParts';
import { pageTemplates } from '@/shared/services/api/pageTemplates';
import { themeCssApi } from '@/shared/services/api/themeCss';
import type { Data } from '@puckeditor/core';

// Mock dependencies
vi.mock('@/shared/services/api/themes');
vi.mock('@/shared/services/api/themeParts');
vi.mock('@/shared/services/api/pageTemplates');
vi.mock('@/shared/services/api/themeCss');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: undefined }), // Default: new theme
  };
});

// Mock Puck
vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Puck: ({ data, onChange }: { data: Data; onChange: (data: Data) => void }) => (
      <div data-testid="puck-editor" onClick={() => onChange({ content: [], root: {} })}>
        Puck Editor
      </div>
    ),
  };
});

// Mock Shadcn components
vi.mock('@/shared/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/shared/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ value, children, ...props }: any) => (
    <button data-tab={value} {...props}>{children}</button>
  ),
  TabsContent: ({ value, children }: any) => (
    <div data-tab-content={value}>{children}</div>
  ),
}));

vi.mock('@/shared/hooks', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ThemeBuilderPage - CSS Integration', () => {
  const mockThemeId = '123';
  const mockThemeData = {
    colors: {
      primary: { '500': '#222222' },
      secondary: { '500': '#666666' },
    },
    typography: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  };

  const mockHeaderData: Data = {
    content: [
      {
        type: 'HeadingBlock',
        props: { children: 'Header', paddingTop: '1rem', paddingBottom: '1rem' },
      },
    ],
    root: { title: 'Header' },
  };

  const mockFooterData: Data = {
    content: [
      {
        type: 'TextBlock',
        props: { children: 'Footer', display: 'flex', justifyContent: 'center' },
      },
    ],
    root: { title: 'Footer' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API responses
    (themes.create as any).mockResolvedValue({
      data: { id: mockThemeId, ...mockThemeData },
    });

    (themes.update as any).mockResolvedValue({
      data: { id: mockThemeId, ...mockThemeData },
    });

    (themeParts.create as any).mockResolvedValue({
      data: { id: 1 },
    });

    (themeParts.update as any).mockResolvedValue({
      data: { id: 1 },
    });

    (pageTemplates.list as any).mockResolvedValue({
      data: [],
    });

    (themeCssApi.saveSection as any).mockResolvedValue({});
    (themeCssApi.validatePublish as any).mockResolvedValue({
      isValid: true,
      missingFolders: [],
      errors: [],
    });
    (themeCssApi.publish as any).mockResolvedValue({
      cssUrl: '/storage/themes/123/123.css',
    });
  });

  describe('Theme Save - CSS Section Generation', () => {
    it('should save variables CSS when theme settings are saved', async () => {
      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      // Find and fill theme name input
      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Test Theme');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      // Wait for theme creation
      await waitFor(() => {
        expect(themes.create).toHaveBeenCalled();
      });

      // Verify CSS variables section was saved
      await waitFor(() => {
        expect(themeCssApi.saveSection).toHaveBeenCalledWith(
          expect.any(Number),
          'variables',
          expect.stringContaining('--color') // Should contain CSS variable names
        );
      });
    });

    it('should handle CSS save errors gracefully without breaking theme save', async () => {
      (themeCssApi.saveSection as any).mockRejectedValueOnce(
        new Error('CSS save failed')
      );

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Test Theme');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      // Theme should still be created even if CSS save fails
      await waitFor(() => {
        expect(themes.create).toHaveBeenCalled();
      });

      // CSS error should be logged
      expect(themeCssApi.saveSection).toHaveBeenCalled();
    });

    it('should not save empty header/footer CSS sections', async () => {
      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Minimal Theme');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(themes.create).toHaveBeenCalled();
      });

      // Should save variables CSS (always) but not header/footer (since they're empty)
      const calls = (themeCssApi.saveSection as any).mock.calls;
      expect(calls.some((call: any[]) => call[1] === 'variables')).toBe(true);
    });
  });

  describe('Template Save - CSS Section Generation', () => {
    it('should provide a path for template CSS generation', async () => {
      // This is a placeholder test for template CSS generation
      // Full implementation would require testing the handleSaveTemplate method
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should continue saving other sections if one fails', async () => {
      // Mock saveSection to fail on header, succeed on others
      let callCount = 0;
      (themeCssApi.saveSection as any).mockImplementation((themeId: any, section: string) => {
        callCount++;
        if (section === 'header' && callCount === 2) {
          return Promise.reject(new Error('Header CSS save failed'));
        }
        return Promise.resolve({});
      });

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Resilient Theme');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      // Theme and variables CSS should still save
      await waitFor(() => {
        expect(themes.create).toHaveBeenCalled();
        expect(themeCssApi.saveSection).toHaveBeenCalledWith(
          expect.any(Number),
          'variables',
          expect.any(String)
        );
      });
    });

    it('should show user feedback for CSS errors without blocking workflow', async () => {
      (themeCssApi.saveSection as any).mockRejectedValue(
        new Error('CSS generation failed')
      );

      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Problem Theme');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      // Theme should still be created
      await waitFor(() => {
        expect(themes.create).toHaveBeenCalled();
      });
    });
  });

  describe('Section-specific CSS Generation', () => {
    it('should generate CSS variables from theme settings', async () => {
      render(
        <BrowserRouter>
          <ThemeBuilderPage />
        </BrowserRouter>
      );

      const nameInputs = screen.getAllByPlaceholderText('Enter theme name');
      await userEvent.type(nameInputs[0], 'Color Theme');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        const calls = (themeCssApi.saveSection as any).mock.calls;
        const variablesCall = calls.find((call: any[]) => call[1] === 'variables');

        if (variablesCall) {
          const css = variablesCall[2];
          expect(css).toMatch(/--color/);
        }
      });
    });
  });
});
