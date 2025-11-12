import { http } from '../http';
import type { User, CreateUserData, UpdateUserData, PaginatedResponse, ApiResponse } from './types';

export const users = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    http.getAll<PaginatedResponse<User>>('/superadmin/users', params),
  get: (id: string | number) =>
    http.getOne<ApiResponse<User>>('/superadmin/users', id),
  create: (data: CreateUserData) =>
    http.create<ApiResponse<User>>('/superadmin/users', data),
  update: (id: string | number, data: UpdateUserData) =>
    http.update<ApiResponse<User>>('/superadmin/users', id, data),
  delete: (id: string | number) =>
    http.remove<{ message: string }>('/superadmin/users', id),
};
