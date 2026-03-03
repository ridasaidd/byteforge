import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavData } from '../useNavData';
import { navigations } from '@/shared/services/api/navigations';

vi.mock('@/shared/services/api/navigations', () => ({
  navigations: {
    get: vi.fn(),
  },
}));

describe('useNavData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses metadata navigation first and skips API fetch', () => {
    const metadata = {
      navigations: [
        {
          id: 1,
          structure: [
            { id: 'home', label: 'Home', order: 0, parent_id: null },
          ],
        },
      ],
    };

    const { result } = renderHook(() => useNavData(1, undefined, metadata));

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].label).toBe('Home');
    expect(navigations.get).not.toHaveBeenCalled();
  });

  it('fetches from API in editor context when metadata is unavailable', async () => {
    vi.mocked(navigations.get).mockResolvedValue({
      data: {
        id: 9,
        structure: [
          { id: 'about', label: 'About', order: 2, parent_id: null },
          { id: 'home', label: 'Home', order: 1, parent_id: null },
          { id: 'team', label: 'Team', order: 0, parent_id: 'about' },
        ],
      },
    } as never);

    const { result } = renderHook(() => useNavData(9, undefined, undefined));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(navigations.get).toHaveBeenCalledWith(9);
    expect(result.current.items[0].label).toBe('Home');
    expect(result.current.items[1].label).toBe('About');
    expect(result.current.items[1].children?.[0].label).toBe('Team');
  });

  it('falls back to placeholder items when no metadata and no API navigation selected', () => {
    const placeholderItems = [
      {
        id: 'services',
        label: 'Services',
        order: 2,
        children: [{ id: 'design', label: 'Design', order: 1 }],
      },
      {
        id: 'home',
        label: 'Home',
        order: 1,
      },
    ];

    const { result } = renderHook(() => useNavData(undefined, placeholderItems, undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].label).toBe('Home');
    expect(result.current.items[1].children?.[0].label).toBe('Design');
    expect(navigations.get).not.toHaveBeenCalled();
  });

  it('does NOT fall back to placeholder items when navigationId is set but API is still loading', () => {
    // Simulate a slow API response — the promise never resolves in this test
    vi.mocked(navigations.get).mockReturnValue(new Promise(() => {}));

    const placeholderItems = [{ id: 'fake', label: 'Fake Theme Item', order: 0 }];

    const { result } = renderHook(() => useNavData(42, placeholderItems, undefined));

    // Should be in loading state, not showing fake placeholder content
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toHaveLength(0);
  });

  it('does NOT fall back to placeholder items when navigationId is set and both exist', async () => {
    vi.mocked(navigations.get).mockResolvedValue({
      data: {
        id: 5,
        structure: [{ id: 'real', label: 'Real Page', order: 0, parent_id: null }],
      },
    } as never);

    const placeholderItems = [{ id: 'fake', label: 'Fake Theme Item', order: 0 }];

    const { result } = renderHook(() => useNavData(5, placeholderItems, undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].label).toBe('Real Page');
  });
});
