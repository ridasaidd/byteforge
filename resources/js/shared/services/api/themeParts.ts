import { http } from '../http';
import type { ThemePart, CreateThemePartData, UpdateThemePartData, PaginatedResponse, ApiResponse } from './types';

export const themeParts = {
  list: (params?: { page?: number; per_page?: number; search?: string; status?: string; type?: string }) =>
    http.getAll<PaginatedResponse<ThemePart>>('/superadmin/theme-parts', params),
  get: (id: number | string) =>
    http.getOne<ApiResponse<ThemePart>>('/superadmin/theme-parts', id),
  create: (data: CreateThemePartData) =>
    http.create<ApiResponse<ThemePart>>('/superadmin/theme-parts', data),
  update: (id: number | string, data: UpdateThemePartData) =>
    http.update<ApiResponse<ThemePart>>('/superadmin/theme-parts', id, data),
  delete: (id: number | string) =>
    http.remove<{ message: string }>('/superadmin/theme-parts', id),
};
