import { http } from '../http';
import type { MediaFolder, ApiResponse } from './types';

export const mediaFolders = {
  list: () => http.get<ApiResponse<MediaFolder[]>>('/superadmin/media-folders'),
  tree: () => http.get<ApiResponse<MediaFolder[]>>('/superadmin/media-folders-tree'),
  create: (data: { name: string; parent_id?: number | null }) => http.post<ApiResponse<MediaFolder>>('/superadmin/media-folders', data),
  update: (id: number, data: { name: string; parent_id?: number | null }) => http.put<ApiResponse<MediaFolder>>(`/superadmin/media-folders/${id}`, data),
  delete: (id: number) => http.delete<{ message: string }>(`/superadmin/media-folders/${id}`),
};
