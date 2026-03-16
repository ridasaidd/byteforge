import { http } from '../http';
import type { MediaFolder, ApiResponse } from './types';

function getApiScopePrefix(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/cms')) {
    return '';
  }

  return '/superadmin';
}

const foldersEndpoint = () => `${getApiScopePrefix()}/media-folders`;
const foldersTreeEndpoint = () => `${getApiScopePrefix()}/media-folders-tree`;

export const mediaFolders = {
  list: () => http.get<ApiResponse<MediaFolder[]>>(foldersEndpoint()),
  tree: () => http.get<ApiResponse<MediaFolder[]>>(foldersTreeEndpoint()),
  create: (data: { name: string; parent_id?: number | null }) => http.post<ApiResponse<MediaFolder>>(foldersEndpoint(), data),
  update: (id: number, data: { name: string; parent_id?: number | null }) => http.put<ApiResponse<MediaFolder>>(`${foldersEndpoint()}/${id}`, data),
  delete: (id: number) => http.delete<{ message: string }>(`${foldersEndpoint()}/${id}`),
};
