import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config, Data } from '@puckeditor/core';

const { getMock, listThemePartsMock, activeThemeMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  listThemePartsMock: vi.fn(),
  activeThemeMock: vi.fn(),
}));

let capturedPuckProps: { config: Config; data: Data } | null = null;

vi.mock('@puckeditor/core', () => ({
  Puck: (props: { config: Config; data: Data }) => {
    capturedPuckProps = { config: props.config, data: props.data };
    return <div data-testid="puck-mock">Puck Editor</div>;
  },
  createUsePuck: () => () => ({ appState: { ui: {} } }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ surfaceKey: 'guest_portal' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
  usePuckEditMode: () => false,
}));

vi.mock('@/shared/services/api/systemSurfaces', () => ({
  tenantSystemSurfaces: {
    get: getMock,
    update: vi.fn(),
  },
}));

vi.mock('@/shared/services/api/themeParts', () => ({
  tenantThemeParts: {
    list: listThemePartsMock,
  },
}));

vi.mock('@/shared/services/api/themes', () => ({
  tenantThemes: {
    active: activeThemeMock,
  },
  themes: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    active: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('@/shared/hooks/useEditorCssLoader', () => ({
  useEditorCssLoader: vi.fn(),
}));

import { SystemSurfaceEditorPage } from '../SystemSurfaceEditorPage';

describe('SystemSurfaceEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPuckProps = null;

    getMock.mockResolvedValue({
      data: {
        id: 1,
        surface_key: 'guest_portal',
        title: 'Guest Portal',
        route_path: '/guest-portal',
        surface_type: 'guest_portal',
        puck_data: null,
        is_enabled: true,
        published_at: '2026-05-28T10:00:00Z',
        updated_at: '2026-05-28T10:00:00Z',
      },
    });

    activeThemeMock.mockResolvedValue({
      data: { id: 42, theme_data: {} },
    });

    listThemePartsMock.mockResolvedValue({
      data: [
        {
          id: 1,
          theme_id: 42,
          type: 'header',
          puck_data_raw: { content: [{ type: 'Heading', props: { id: 'h1', title: 'Site Header' } }], root: {} },
        },
      ],
    });
  });

  it('loads theme parts for guest-facing surfaces', async () => {
    render(<SystemSurfaceEditorPage />);

    await waitFor(() => {
      expect(capturedPuckProps).not.toBeNull();
    });

    expect(activeThemeMock).toHaveBeenCalled();
    expect(listThemePartsMock).toHaveBeenCalledWith({ type: 'header', theme_id: 42 });
    expect(listThemePartsMock).toHaveBeenCalledWith({ type: 'footer', theme_id: 42 });
  });

  it('passes a config with chrome rendering for guest-facing surfaces', async () => {
    render(<SystemSurfaceEditorPage />);

    await waitFor(() => {
      expect(capturedPuckProps).not.toBeNull();
    });

    expect(capturedPuckProps?.config.root?.render).toBeDefined();
    expect(typeof capturedPuckProps?.config.root?.render).toBe('function');
  });
});
