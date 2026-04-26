import { http } from '../http';
import type { ApiResponse, SystemSurface, UpdateSystemSurfaceData } from './types';

export const tenantSystemSurfaces = {
  list: () => http.get<{ data: SystemSurface[] }>('/system-surfaces'),
  get: (surfaceKey: string) => http.get<ApiResponse<SystemSurface>>(`/system-surfaces/${surfaceKey}`),
  publicGet: (surfaceKey: string) => http.get<ApiResponse<SystemSurface>>(`/system-surfaces/public/${surfaceKey}`, {
    skipAuthRedirect: true,
    skipAuthRefresh: true,
    skipAuthToken: true,
  }),
  update: (surfaceKey: string, data: UpdateSystemSurfaceData) =>
    http.put<ApiResponse<SystemSurface>>(`/system-surfaces/${surfaceKey}`, data),
  reset: (surfaceKey: string) =>
    http.post<ApiResponse<SystemSurface>>(`/system-surfaces/${surfaceKey}/reset`),
};
