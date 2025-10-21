import { http } from './http';

export type PermissionDto = { id: number; name: string; guard_name: string };
export type RoleDto = { id: number; name: string; guard_name: string; permissions?: PermissionDto[] };

export const rolesApi = {
  list: () => http.get<RoleDto[]>('/superadmin/roles', { params: { guard: 'api' } as unknown as Record<string, unknown> }),
  create: (data: { name: string; guard_name?: string }) => http.post<RoleDto>('/superadmin/roles', data),
  update: (id: number, data: { name?: string; guard_name?: string }) => http.put<RoleDto>(`/superadmin/roles/${id}`, data),
  delete: (id: number) => http.delete<{ message: string }>(`/superadmin/roles/${id}`),
  assignPermissions: (id: number, permissions: string[]) => http.post<RoleDto>(`/superadmin/roles/${id}/permissions`, { permissions }),
};

export const permissionsApi = {
  list: () => http.get<PermissionDto[]>('/superadmin/permissions', { params: { guard: 'api' } as unknown as Record<string, unknown> }),
  create: (data: { name: string; guard_name?: string }) => http.post<PermissionDto>('/superadmin/permissions', data),
  update: (id: number, data: { name?: string; guard_name?: string }) => http.put<PermissionDto>(`/superadmin/permissions/${id}`, data),
  delete: (id: number) => http.delete<{ message: string }>(`/superadmin/permissions/${id}`),
};
