/**
 * Analytics API client — Phase 9.
 *
 * Tenant endpoint:  GET /api/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Central endpoint: GET /api/superadmin/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Both return the same AnalyticsOverviewResponse envelope.
 */
import { http } from '../http';
import type { AnalyticsOverviewResponse, AnalyticsRangePreset } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a preset label to { from, to } ISO date strings (YYYY-MM-DD).
 */
export function rangeFromPreset(preset: AnalyticsRangePreset): { from: string; to: string } {
  const days  = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - days);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { from: fmt(from), to: fmt(today) };
}

// ─── Analytics API ───────────────────────────────────────────────────────────

export const analyticsApi = {
  /**
   * GET /api/analytics/overview
   * Tenant-scoped analytics. Must be called from a tenant-domain context.
   */
  async getTenantOverview(
    from: string,
    to: string,
  ): Promise<AnalyticsOverviewResponse> {
    return http.get<AnalyticsOverviewResponse>('/analytics/overview', {
      params: { from, to },
    });
  },

  /**
   * GET /api/superadmin/analytics/overview
   * Platform-level analytics. Central domain only; requires view platform analytics.
   */
  async getPlatformOverview(
    from: string,
    to: string,
  ): Promise<AnalyticsOverviewResponse> {
    return http.get<AnalyticsOverviewResponse>('/superadmin/analytics/overview', {
      params: { from, to },
    });
  },
};
