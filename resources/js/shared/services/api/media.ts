import { http } from '../http';
import type { Media, UploadMediaData, MediaFilters, PaginatedResponse, ApiResponse } from './types';

function getApiScopePrefix(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/cms')) {
    return '';
  }

  return '/superadmin';
}

const mediaEndpoint = () => `${getApiScopePrefix()}/media`;

export const media = {
  list: (params?: MediaFilters) =>
    http.getAll<PaginatedResponse<Media>>(mediaEndpoint(), params as Record<string, string | number | boolean>),
  get: (id: number) =>
    http.getOne<ApiResponse<Media>>(mediaEndpoint(), id),
  upload: (data: UploadMediaData) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.collection) formData.append('collection', data.collection);
    if (data.folder_id) formData.append('folder_id', data.folder_id.toString());
    if (data.custom_properties) {
      formData.append('custom_properties', JSON.stringify(data.custom_properties));
    }
    return http.post<ApiResponse<Media>>(mediaEndpoint(), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: number) =>
    http.remove<{ message: string }>(mediaEndpoint(), id),
};
