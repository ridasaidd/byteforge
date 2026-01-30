/**
 * Phase 6 Step 3: ThemeBuilderPage Mode Tests
 *
 * Tests for the mode prop that differentiates between:
 * - 'create': Full theme creation (all tabs visible)
 * - 'customize': Theme customization only (limited tabs)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeBuilderPage } from '@/shared/components/organisms/ThemeBuilderPage';

// Mock all dependencies to focus on tab visibility logic
vi.mock('@/shared/services/api/themes', () => ({
  themes: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/themeParts', () => ({
  themeParts: {
    getByThemeId: vi.fn(() => Promise.resolve({ data: [] })),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/pageTemplates', () => ({
  pageTemplates: {
    getByThemeId: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('@/shared/services/api/themeCss', () => ({
  themeCssApi: {
    save: vi.fn(),
  },
}));

// Mock react-router useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'new' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock Puck editor - just render a placeholder
vi.mock('@puckeditor/core', () => ({
  Puck: () => <div data-testid="puck-editor">Puck Editor</div>,
  createUsePuck: () => () => ({ appState: {}, dispatch: vi.fn() }),
}));

// Mock hooks
vi.mock('@/shared/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useEditorCssLoader: vi.fn(),
}));

vi.mock('@/shared/hooks/useSettingsRuntimeCss', () => ({
  useSettingsRuntimeCss: () => ({ css: '' }),
}));

vi.mock('@/shared/hooks/useThemeCssSectionSave', () => ({
  useThemeCssSectionSave: () => ({ saveSection: vi.fn() }),
}));

describe('ThemeBuilderPage - Mode Prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode (default)', () => {
    it('should show all tabs in create mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="create" />
        </MemoryRouter>
      );

      expect(screen.getByRole('tab', { name: /info/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /header/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /footer/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /pages/i })).toBeInTheDocument();
    });

    it('should start on info tab in create mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="create" />
        </MemoryRouter>
      );

      const infoTab = screen.getByRole('tab', { name: /info/i });
      expect(infoTab).toHaveAttribute('data-state', 'active');
    });

    it('should default to create mode when no mode prop provided', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('tab', { name: /info/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /pages/i })).toBeInTheDocument();
    });
  });

  describe('Customize Mode', () => {
    it('should hide info tab in customize mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      expect(screen.queryByRole('tab', { name: /info/i })).not.toBeInTheDocument();
    });

    it('should hide pages tab in customize mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      expect(screen.queryByRole('tab', { name: /pages/i })).not.toBeInTheDocument();
    });

    it('should show settings, header, and footer tabs in customize mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /header/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /footer/i })).toBeInTheDocument();
    });

    it('should start on settings tab in customize mode', () => {
      render(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      expect(settingsTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Mode Persistence', () => {
    it('should maintain customize mode when switching tabs', () => {
      const { rerender } = render(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();

      // After rerender, tabs should still respect customize mode
      rerender(
        <MemoryRouter>
          <ThemeBuilderPage mode="customize" />
        </MemoryRouter>
      );

      expect(screen.queryByRole('tab', { name: /info/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /pages/i })).not.toBeInTheDocument();
    });
  });
});
