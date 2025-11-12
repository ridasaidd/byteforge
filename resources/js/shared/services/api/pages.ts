import { http } from '../http';
import type { Page, CreatePageData, UpdatePageData, PaginatedResponse, ApiResponse } from './types';

export const pages = {
  list: (params?: { page?: number; per_page?: number; search?: string; status?: string; page_type?: string }) =>
    http.getAll<PaginatedResponse<Page>>('/superadmin/pages', params),
  get: (id: number | string) =>
    http.getOne<ApiResponse<Page>>('/superadmin/pages', id),
  create: (data: CreatePageData) =>
    http.create<ApiResponse<Page>>('/superadmin/pages', data),
  update: (id: number | string, data: UpdatePageData) =>
    http.update<ApiResponse<Page>>('/superadmin/pages', id, data),
  delete: (id: number | string) =>
    http.remove<{ message: string }>('/superadmin/pages', id),
};
