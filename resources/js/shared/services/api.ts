import { http } from './http';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface User extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  roles: string[]; // backend returns array of role names
  permissions: string[]; // backend returns array of permission names
  created_at: string;
  updated_at: string;
}

// Keeping types for potential future expansion/use
export interface Role {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// ============================================================================
// Tenant Types
// ============================================================================

export interface Tenant extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  domain: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantData {
  name: string;
  domain: string;
}

export interface UpdateTenantData {
  name?: string;
  domain?: string;
}

// ============================================================================
// User Types (for user management)
// ============================================================================

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
}

// ============================================================================
// API Service
// ============================================================================

/**
 * Central API service - single source of truth for all backend communication.
 * Uses the http service for low-level axios configuration and auth handling.
 */
export const api = {
  // ==========================================================================
  // Authentication
  // ==========================================================================
  auth: {
    /**
     * Login with email and password
     */
    login: (credentials: LoginCredentials) =>
      http.post<LoginResponse>('/auth/login', credentials),

    /**
     * Logout and revoke current token
     */
    logout: () => http.post<{ message: string }>('/auth/logout'),

    /**
     * Get current authenticated user
     */
    user: () => http.get<User>('/auth/user'),

    /**
     * Refresh authentication token
     */
    refresh: () => http.post<{ token: string }>('/auth/refresh'),

    /**
     * Register new user (if enabled)
     */
    register: (data: CreateUserData) =>
      http.post<LoginResponse>('/auth/register', data),
  },

  // ==========================================================================
  // Tenants (Superadmin)
  // ==========================================================================
  tenants: {
    /**
     * List all tenants with optional pagination and search
     */
    list: (params?: { page?: number; per_page?: number; search?: string }) =>
      http.getAll<PaginatedResponse<Tenant>>('/superadmin/tenants', params),

    /**
     * Get single tenant by ID
     */
    get: (id: string) =>
      http.getOne<ApiResponse<Tenant>>('/superadmin/tenants', id),

    /**
     * Create new tenant
     */
    create: (data: CreateTenantData) =>
      http.create<ApiResponse<Tenant>>('/superadmin/tenants', data),

    /**
     * Update existing tenant
     */
    update: (id: string, data: UpdateTenantData) =>
      http.update<ApiResponse<Tenant>>('/superadmin/tenants', id, data),

    /**
     * Delete tenant
     */
    delete: (id: string) =>
      http.remove<{ message: string }>('/superadmin/tenants', id),
  },

  // ==========================================================================
  // Users (Superadmin)
  // ==========================================================================
  users: {
    /**
     * List all users with optional pagination and search
     */
    list: (params?: { page?: number; per_page?: number; search?: string }) =>
      http.getAll<PaginatedResponse<User>>('/superadmin/users', params),

    /**
     * Get single user by ID
     */
    get: (id: string | number) =>
      http.getOne<ApiResponse<User>>('/superadmin/users', id),

    /**
     * Create new user
     */
    create: (data: CreateUserData) =>
      http.create<ApiResponse<User>>('/superadmin/users', data),

    /**
     * Update existing user
     */
    update: (id: string | number, data: UpdateUserData) =>
      http.update<ApiResponse<User>>('/superadmin/users', id, data),

    /**
     * Delete user
     */
    delete: (id: string | number) =>
      http.remove<{ message: string }>('/superadmin/users', id),
  },

  // ==========================================================================
  // Pages (Tenant-scoped) - TODO: Add when building page management
  // ==========================================================================
  // pages: {
  //   list: (params?: { page?: number; per_page?: number; search?: string }) =>
  //     http.getAll<PaginatedResponse<Page>>('/pages', params),
  //   get: (id: number) =>
  //     http.getOne<ApiResponse<Page>>('/pages', id),
  //   create: (data: CreatePageData) =>
  //     http.create<ApiResponse<Page>>('/pages', data),
  //   update: (id: number, data: UpdatePageData) =>
  //     http.update<ApiResponse<Page>>('/pages', id, data),
  //   delete: (id: number) =>
  //     http.remove<{ message: string }>('/pages', id),
  // },

  // ==========================================================================
  // Navigation (Tenant-scoped) - TODO: Add when building navigation management
  // ==========================================================================
  // navigation: {
  //   list: () => http.get<ApiResponse<NavigationItem[]>>('/navigation'),
  //   update: (data: NavigationItem[]) =>
  //     http.post<ApiResponse<NavigationItem[]>>('/navigation', { items: data }),
  // },

  // ==========================================================================
  // Media (Tenant-scoped) - TODO: Add when building media library
  // ==========================================================================
  // media: {
  //   list: (params?: { page?: number; per_page?: number; search?: string }) =>
  //     http.getAll<PaginatedResponse<Media>>('/media', params),
  //   upload: (file: File) => {
  //     const formData = new FormData();
  //     formData.append('file', file);
  //     return http.post<ApiResponse<Media>>('/media', formData, {
  //       headers: { 'Content-Type': 'multipart/form-data' },
  //     });
  //   },
  //   delete: (id: number) =>
  //     http.remove<{ message: string }>('/media', id),
  // },
};
