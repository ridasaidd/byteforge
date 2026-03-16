import { http } from '../http';

export interface TenantDashboardStats {
  totalPages: number;
  publishedPages: number;
  mediaFiles: number;
  menuItems: number;
  recentActivityCount: number;
}

export const tenantDashboard = {
  getStats: () => http.get<TenantDashboardStats>('/dashboard'),
};
