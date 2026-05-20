import { http } from '../http';
import type { ActivityLog, PaginatedResponse } from './types';

export const tenantActivity = {
  list: (params?: { page?: number; per_page?: number; subject_type?: string; event?: string; causer_id?: number }) =>
    http.getAll<PaginatedResponse<ActivityLog>>('/activity-logs', params),
};