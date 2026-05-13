import { http } from '../http';
import type {
  ActivityLog,
  ActivateThemeData,
  ApiResponse,
  CreateTenantData,
  GrantTenantSupportAccessData,
  PaginatedResponse,
  AssignTenantUserData,
  AssignTenantUserResponse,
  Tenant,
  TenantInspectionPage,
  TenantInspectionUser,
  TenantInspectionSummary,
  TenantInspectionTheme,
  TenantSupportAccessGrant,
  TenantSupportAccessOverview,
  RevokeTenantSupportAccessData,
  UpdateTenantData,
} from './types';

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
  summary: (id: string) =>
    http.get<ApiResponse<TenantInspectionSummary>>(`/superadmin/tenants/${id}/summary`),
  themes: (id: string) =>
    http.get<ApiResponse<TenantInspectionTheme[]>>(`/superadmin/tenants/${id}/themes`),
  pages: (id: string, params?: { page?: number; per_page?: number; search?: string; status?: string }) =>
    http.get<PaginatedResponse<TenantInspectionPage>>(`/superadmin/tenants/${id}/pages`, { params }),
  users: (id: string) =>
    http.get<ApiResponse<TenantInspectionUser[]>>(`/superadmin/tenants/${id}/users`),
  activity: (id: string, params?: { page?: number; per_page?: number; event?: string }) =>
    http.get<PaginatedResponse<ActivityLog>>(`/superadmin/tenants/${id}/activity-logs`, { params }),
  activateTheme: (id: string, data: ActivateThemeData) =>
    http.post<{ data: TenantInspectionTheme; message: string }>(`/superadmin/tenants/${id}/themes/activate`, data),
  supportAccess: (id: string) =>
    http.get<ApiResponse<TenantSupportAccessOverview>>(`/superadmin/tenants/${id}/support-access`),
  grantSupportAccess: (id: string, data: GrantTenantSupportAccessData) =>
    http.post<{ data: TenantSupportAccessGrant; message: string }>(`/superadmin/tenants/${id}/support-access`, data),
  revokeSupportAccess: (id: string, grantId: number, data?: RevokeTenantSupportAccessData) =>
    http.post<{ data: TenantSupportAccessGrant; message: string }>(`/superadmin/tenants/${id}/support-access/${grantId}/revoke`, data ?? {}),
  addUserToTenant: (id: string, data: AssignTenantUserData) =>
    http.post<{ data: AssignTenantUserResponse }>(`/superadmin/tenants/${id}/users`, data),
  updateUserInTenant: (id: string, userId: number, data: { role: 'owner' | 'editor' | 'viewer' }) =>
    http.patch<{ data: AssignTenantUserResponse }>(`/superadmin/tenants/${id}/users/${userId}`, data),
  removeUserFromTenant: (id: string, userId: number) =>
    http.delete<{ message: string }>(`/superadmin/tenants/${id}/users/${userId}`),
};
