/**
 * Analytics API client tests — Phase 9.
 *
 * Tests: rangeFromPreset helper, getTenantOverview, getPlatformOverview.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsApi, rangeFromPreset } from '../analytics';
import { http } from '../../http';

vi.mock('../../http', () => ({
  http: {
    get: vi.fn(),
  },
}));

describe('rangeFromPreset', () => {
  it('returns 7 days range for "7d"', () => {
    const { from, to } = rangeFromPreset('7d');
    const diff =
      new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('returns 30 days range for "30d"', () => {
    const { from, to } = rangeFromPreset('30d');
    const diff =
      new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('returns 90 days range for "90d"', () => {
    const { from, to } = rangeFromPreset('90d');
    const diff =
      new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('formats dates as YYYY-MM-DD', () => {
    const { from } = rangeFromPreset('7d');
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('analyticsApi', () => {
  const mockResponse = {
    data:         { total_events: 42, by_type: { 'page.viewed': 42 } },
    period:       { from: '2026-02-02', to: '2026-03-04' },
    generated_at: '2026-03-04T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTenantOverview', () => {
    it('calls GET /analytics/overview with from and to params', async () => {
      vi.mocked(http.get).mockResolvedValue(mockResponse);

      await analyticsApi.getTenantOverview('2026-02-02', '2026-03-04');

      expect(http.get).toHaveBeenCalledWith('/analytics/overview', {
        params: { from: '2026-02-02', to: '2026-03-04' },
      });
    });

    it('returns the response data', async () => {
      vi.mocked(http.get).mockResolvedValue(mockResponse);

      const result = await analyticsApi.getTenantOverview('2026-02-02', '2026-03-04');

      expect(result.data.total_events).toBe(42);
      expect(result.period.from).toBe('2026-02-02');
    });
  });

  describe('getPlatformOverview', () => {
    it('calls GET /superadmin/analytics/overview with from and to params', async () => {
      vi.mocked(http.get).mockResolvedValue(mockResponse);

      await analyticsApi.getPlatformOverview('2026-02-02', '2026-03-04');

      expect(http.get).toHaveBeenCalledWith(
        '/superadmin/analytics/overview',
        { params: { from: '2026-02-02', to: '2026-03-04' } }
      );
    });

    it('returns the response data', async () => {
      vi.mocked(http.get).mockResolvedValue(mockResponse);

      const result = await analyticsApi.getPlatformOverview('2026-02-02', '2026-03-04');

      expect(result.data.total_events).toBe(42);
    });
  });
});
