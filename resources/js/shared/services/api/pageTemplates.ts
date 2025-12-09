import { http } from '../http';
import type { PageTemplate, CreatePageTemplateData, UpdatePageTemplateData, PaginatedResponse, ApiResponse } from './types';

export const pageTemplates = {
  list: (params?: { page?: number; per_page?: number; search?: string; category?: string; theme_id?: number }) =>
    http.getAll<PaginatedResponse<PageTemplate>>('/superadmin/page-templates', params),
  get: (id: number | string) =>
    http.getOne<ApiResponse<PageTemplate>>('/superadmin/page-templates', id),
  create: (data: CreatePageTemplateData) =>
    http.create<ApiResponse<PageTemplate>>('/superadmin/page-templates', data),
  update: (id: number | string, data: UpdatePageTemplateData) =>
    http.update<ApiResponse<PageTemplate>>('/superadmin/page-templates', id, data),
  delete: (id: number | string) =>
    http.remove<{ message: string }>('/superadmin/page-templates', id),
};
