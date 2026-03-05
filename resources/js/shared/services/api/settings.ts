import { http } from '../http';
import type { GeneralSettings, UpdateSettingsData, TenantSettings, UpdateTenantSettingsData, ApiResponse } from './types';

export const settings = {
  get: () => http.get<ApiResponse<GeneralSettings>>('/superadmin/settings'),
  update: (data: UpdateSettingsData) => http.put<ApiResponse<GeneralSettings>>('/superadmin/settings', data),
};

export const tenantSettings = {
  get: () => http.get<ApiResponse<TenantSettings>>('/settings'),
  update: (data: UpdateTenantSettingsData) => http.put<ApiResponse<TenantSettings>>('/settings', data),
};
