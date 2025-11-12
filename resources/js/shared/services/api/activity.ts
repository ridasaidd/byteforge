import { http } from '../http';
import type { ActivityLog, PaginatedResponse } from './types';

export const activity = {
  list: (params?: { page?: number; per_page?: number; search?: string; subject_type?: string; event?: string; causer_id?: number }) =>
    http.getAll<PaginatedResponse<ActivityLog>>('/superadmin/activity-logs', params),
};
