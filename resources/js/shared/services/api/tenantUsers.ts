import { http } from '../http';
import type { User, PaginatedResponse, ApiResponse } from './types';

export interface TenantRole {
  id: number;
  name: string;
  guard_name?: string;
  permissions?: Array<{ id: number; name: string }>;
}

export interface TenantPermission {
  id: number;
  name: string;
}

export const tenantUsers = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    http.getAll<PaginatedResponse<User>>('/users', params as Record<string, string | number | boolean>),

  create: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
  }) =>
    http.post<ApiResponse<User>>('/users', payload),

  get: (id: string | number) =>
    http.getOne<ApiResponse<User>>('/users', id),

  /** Replace the user's role with the given role name. */
  assignRole: (userId: string | number, role: string) =>
    http.post<ApiResponse<User>>(`/users/${userId}/roles`, { role }),

  /** Remove a specific role (by role id) from a user. */
  removeRole: (userId: string | number, roleId: string | number) =>
    http.delete<{ message: string }>(`/users/${userId}/roles/${roleId}`),

  /** List roles assignable through the tenant CMS. */
  listRoles: () =>
    http.get<{ data: TenantRole[] }>('/roles'),

  listPermissions: () =>
    http.get<{ data: TenantPermission[] }>('/permissions'),

  createRole: (payload: { name: string; permissions: string[] }) =>
    http.post<{ data: TenantRole }>('/roles', payload),

  updateRole: (roleId: string | number, payload: { name?: string; permissions?: string[] }) =>
    http.put<{ data: TenantRole }>(`/roles/${roleId}`, payload),

  deleteRole: (roleId: string | number) =>
    http.delete<{ message: string }>(`/roles/${roleId}`),
};
