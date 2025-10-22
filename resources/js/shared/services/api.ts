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
  avatar?: string; // Avatar URL
  roles: (string | { name: string })[]; // backend can return array of role names or role objects
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

// ============================================================================
// Activity Log Types
// ============================================================================

export interface ActivityLog extends Record<string, unknown> {
  id: number | string;
  log_name: string | null;
  description: string | null;
  event: 'created' | 'updated' | 'deleted' | string | null;
  subject_type: string | null;
  subject_id: number | string | null;
  causer: { id: number; name: string; email: string } | null;
  properties: Record<string, unknown>;
  created_at: string;
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
// Profile Types
// ============================================================================

export interface UpdateProfileData {
  name: string;
  email: string;
}

export interface UpdatePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface GeneralSettings extends Record<string, unknown> {
  site_name: string;
  site_active: boolean;
  support_email: string | null;
  company_name: string | null;
  max_tenants_per_user: number;
}

export interface UpdateSettingsData {
  site_name?: string;
  site_active?: boolean;
  support_email?: string | null;
  company_name?: string | null;
  max_tenants_per_user?: number;
}

// ============================================================================
// Media Types
// ============================================================================

export interface Media extends Record<string, unknown> {
  id: number;
  uuid: string;
  name: string;
  file_name: string;
  mime_type: string;
  size: number;
  human_readable_size: string;
  collection_name: string;
  custom_properties: Record<string, unknown>;
  model_type: string | null;
  model_id: number | null;
  url: string;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaFolder extends Record<string, unknown> {
  id: number;
  name: string;
  parent_id: number | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface UploadMediaData {
  file: File;
  collection?: string;
  custom_properties?: Record<string, unknown>;
  folder_id?: number | null;
}

export interface MediaFilters {
  collection?: string;
  mime_type?: string;
  search?: string;
  model_type?: string;
  per_page?: number;
  page?: number;
  folder_id?: number | null | string;
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

    /**
     * Update current user's profile
     */
    updateProfile: (data: UpdateProfileData) =>
      http.put<{ message: string; user: User }>('/auth/user', data),

    /**
     * Update current user's password
     */
    updatePassword: (data: UpdatePasswordData) =>
      http.put<{ message: string }>('/auth/password', data),

    /**
     * Upload avatar for current user
     */
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return http.post<{ user: User; avatar_url: string }>('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },

    /**
     * Delete avatar for current user
     */
    deleteAvatar: () =>
      http.delete<{ user: User }>('/auth/avatar'),
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
  // Activity (Central)
  // ==========================================================================
  activity: {
    list: (params?: { page?: number; per_page?: number; search?: string; subject_type?: string; event?: string; causer_id?: number }) =>
      http.getAll<PaginatedResponse<ActivityLog>>('/superadmin/activity-logs', params),
  },

  // ==========================================================================
  // Settings (Central)
  // ==========================================================================
  settings: {
    /**
     * Get general platform settings
     */
    get: () =>
      http.get<ApiResponse<GeneralSettings>>('/superadmin/settings'),

    /**
     * Update general platform settings
     */
    update: (data: UpdateSettingsData) =>
      http.put<ApiResponse<GeneralSettings>>('/superadmin/settings', data),
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
  // Media Library (works for both Central and Tenant)
  // ==========================================================================
  media: {
    /**
     * List media files with optional filters
     */
    list: (params?: MediaFilters) =>
      http.getAll<PaginatedResponse<Media>>('/superadmin/media', params as Record<string, string | number | boolean>),

    /**
     * Get single media file details
     */
    get: (id: number) =>
      http.getOne<ApiResponse<Media>>('/superadmin/media', id),

    /**
     * Upload a new media file
     */
    upload: (data: UploadMediaData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.collection) formData.append('collection', data.collection);
      if (data.folder_id) formData.append('folder_id', data.folder_id.toString());
      if (data.custom_properties) {
        formData.append('custom_properties', JSON.stringify(data.custom_properties));
      }

      return http.post<ApiResponse<Media>>('/superadmin/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Delete media file
     */
    delete: (id: number) =>
      http.remove<{ message: string }>('/superadmin/media', id),
  },

  // ==========================================================================
  // Media Folders
  // ==========================================================================
  mediaFolders: {
    /**
     * List all folders
     */
    list: () =>
      http.get<ApiResponse<MediaFolder[]>>('/superadmin/media-folders'),

    /**
     * Get folder tree structure
     */
    tree: () =>
      http.get<ApiResponse<MediaFolder[]>>('/superadmin/media-folders-tree'),

    /**
     * Create new folder
     */
    create: (data: { name: string; parent_id?: number | null }) =>
      http.post<ApiResponse<MediaFolder>>('/superadmin/media-folders', data),

    /**
     * Update folder
     */
    update: (id: number, data: { name: string; parent_id?: number | null }) =>
      http.put<ApiResponse<MediaFolder>>(`/superadmin/media-folders/${id}`, data),

    /**
     * Delete folder
     */
    delete: (id: number) =>
      http.delete<{ message: string }>(`/superadmin/media-folders/${id}`),
  },
};
