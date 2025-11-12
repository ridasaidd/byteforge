import { http } from '../http';
import type { PaginatedResponse, ApiResponse } from './types';

export interface Layout {
  id: number;
  tenant_id: string | null;
  name: string;
  slug: string;
  header_id: number | null;
  footer_id: number | null;
  sidebar_left_id: number | null;
  sidebar_right_id: number | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface CreateLayoutData {
  name: string;
  slug?: string;
  header_id?: number | null;
  footer_id?: number | null;
  sidebar_left_id?: number | null;
  sidebar_right_id?: number | null;
  status: 'draft' | 'published';
}

export interface UpdateLayoutData {
  name?: string;
  slug?: string;
  header_id?: number | null;
  footer_id?: number | null;
  sidebar_left_id?: number | null;
  sidebar_right_id?: number | null;
  status?: 'draft' | 'published';
}

export const layouts = {
  list: (params?: { page?: number; per_page?: number; search?: string; status?: string }) =>
    http.getAll<PaginatedResponse<Layout>>('/superadmin/layouts', params),
  get: (id: number | string) =>
    http.getOne<ApiResponse<Layout>>('/superadmin/layouts', id),
  create: (data: CreateLayoutData) =>
    http.create<ApiResponse<Layout>>('/superadmin/layouts', data),
  update: (id: number | string, data: UpdateLayoutData) =>
    http.update<ApiResponse<Layout>>('/superadmin/layouts', id, data),
  delete: (id: number | string) =>
    http.remove<{ message: string }>('/superadmin/layouts', id),
};
