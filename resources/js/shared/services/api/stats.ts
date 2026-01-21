import { http } from '../http';
import type { PaginatedResponse, Tenant, User, ActivityLog } from './types';

export interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  recentActivityCount: number;
  totalPages?: number;
}

/**
 * Dashboard stats service
 * Fetches aggregated statistics for the dashboard
 */
export const stats = {
  /**
   * Get dashboard stats by fetching minimal data from multiple endpoints
   * This is a frontend aggregation approach - for better performance,
   * consider creating a dedicated /superadmin/dashboard/stats endpoint
   * with server-side caching (see ROADMAP.md - Performance section)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Fetch counts from pagination metadata (per_page=1 for minimal data transfer)
      const [tenantsResponse, usersResponse, activityResponse] = await Promise.all([
        http.getAll<PaginatedResponse<Tenant>>('/superadmin/tenants', { per_page: 1 }),
        http.getAll<PaginatedResponse<User>>('/superadmin/users', { per_page: 1 }),
        http.getAll<PaginatedResponse<ActivityLog>>('/superadmin/activity-logs', { per_page: 1 }),
      ]);

      return {
        totalTenants: tenantsResponse.meta.total,
        totalUsers: usersResponse.meta.total,
        recentActivityCount: activityResponse.meta.total,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },
};
