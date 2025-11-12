import { http } from '../http';
import type { Tenant, CreateTenantData, UpdateTenantData, PaginatedResponse, ApiResponse } from './types';

export const tenants = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    http.getAll<PaginatedResponse<Tenant>>('/superadmin/tenants', params),
  get: (id: string) =>
    http.getOne<ApiResponse<Tenant>>('/superadmin/tenants', id),
  create: (data: CreateTenantData) =>
    http.create<ApiResponse<Tenant>>('/superadmin/tenants', data),
  update: (id: string, data: UpdateTenantData) =>
    http.update<ApiResponse<Tenant>>('/superadmin/tenants', id, data),
  delete: (id: string) =>
    http.remove<{ message: string }>('/superadmin/tenants', id),
};
