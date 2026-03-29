import { http } from '../http';
import type {
  ApiResponse,
  PaginatedResponse,
  Workshop,
  WorkshopSearchParams,
  WorkshopSearchResponse,
  CreateWorkshopData,
  UpdateWorkshopData,
} from './types';

/**
 * Tenant-authenticated workshop management endpoints (CMS / admin).
 */
export const workshops = {
  list: (params?: { page?: number; per_page?: number; search?: string; active_only?: boolean }) =>
    http.getAll<PaginatedResponse<Workshop>>('/workshops', params),

  get: (id: number | string) =>
    http.getOne<ApiResponse<Workshop>>('/workshops', id),

  create: (data: CreateWorkshopData) =>
    http.create<ApiResponse<Workshop>>('/workshops', data),

  update: (id: number | string, data: UpdateWorkshopData) =>
    http.update<ApiResponse<Workshop>>('/workshops', id, data),

  delete: (id: number | string) =>
    http.remove<{ message: string }>('/workshops', id),
};

/**
 * Public workshop search endpoints — no authentication required.
 * These are called from the customer-facing storefront.
 */
export const workshopSearch = {
  /** Location-based proximity search using Haversine formula. */
  search: (params: WorkshopSearchParams) =>
    http.getAll<WorkshopSearchResponse>('/workshops/search', params as Record<string, string | number | boolean>),

  /** Fetch a single public workshop profile by ID. */
  get: (id: number | string) =>
    http.getOne<ApiResponse<Workshop>>('/workshops/public', id),
};
