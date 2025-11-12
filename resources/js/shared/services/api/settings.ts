import { http } from '../http';
import type { GeneralSettings, UpdateSettingsData, ApiResponse } from './types';

export const settings = {
  get: () => http.get<ApiResponse<GeneralSettings>>('/superadmin/settings'),
  update: (data: UpdateSettingsData) => http.put<ApiResponse<GeneralSettings>>('/superadmin/settings', data),
};
