import { http } from '../http';
import type { PaginatedResponse, Tenant, User, ActivityLog, Page } from './types';

export interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  recentActivityCount: number;
  totalPages: number;
}

/**
 * Dashboard stats service
 * Fetches aggregated statistics for the dashboard
 */
export const stats = {
  /**
   * Get dashboard stats from dedicated optimized endpoint
   *
   * This endpoint aggregates stats server-side with 10-minute caching,
   * reducing 4 API calls to 1 single call.
   *
   * Previous approach (4 API calls for pagination metadata):
   * - /superadmin/tenants?per_page=1
   * - /superadmin/users?per_page=1
   * - /superadmin/activity-logs?per_page=1
   * - /superadmin/pages?per_page=1
   *
   * New approach (1 optimized call):
   * - /superadmin/dashboard/stats ✓
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await http.get<DashboardStats>('/superadmin/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Refresh dashboard stats cache (invalidate and fetch fresh data)
   * Useful for immediately seeing updated statistics
   */
  async refreshStats(): Promise<DashboardStats> {
    try {
      const response = await http.post<DashboardStats>('/superadmin/dashboard/stats/refresh', {});
      return response;
    } catch (error) {
      console.error('Failed to refresh dashboard stats:', error);
      throw error;
    }
  },
};
