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

export interface User extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  roles: (string | { name: string })[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
}

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

export interface UpdateProfileData {
  name: string;
  email: string;
}

export interface UpdatePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

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

export interface Page extends Record<string, unknown> {
  id: number;
  tenant_id: string;
  title: string;
  slug: string;
  page_type: 'general' | 'home' | 'about' | 'contact' | 'blog' | 'service' | 'product' | 'custom';
  puck_data: Record<string, unknown> | null;
  puck_data_compiled: Record<string, unknown> | null;
  meta_data: Record<string, unknown> | null;
  status: 'draft' | 'published' | 'archived';
  is_homepage: boolean;
  sort_order: number;
  layout_id: number | null;
  header_id: number | null;
  footer_id: number | null;
  created_by: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePageData {
  title: string;
  slug?: string;
  page_type: 'general' | 'home' | 'about' | 'contact' | 'blog' | 'service' | 'product' | 'custom';
  puck_data?: Record<string, unknown> | null;
  meta_data?: Record<string, unknown> | null;
  status: 'draft' | 'published' | 'archived';
  is_homepage?: boolean;
  sort_order?: number;
  layout_id?: number | null;
  header_id?: number | null;
  footer_id?: number | null;
}

export interface UpdatePageData {
  title?: string;
  slug?: string;
  page_type?: 'general' | 'home' | 'about' | 'contact' | 'blog' | 'service' | 'product' | 'custom';
  puck_data?: Record<string, unknown> | null;
  meta_data?: Record<string, unknown> | null;
  status?: 'draft' | 'published' | 'archived';
  is_homepage?: boolean;
  sort_order?: number;
  layout_id?: number | null;
  header_id?: number | null;
  footer_id?: number | null;
}
export interface ThemeData {
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  colors?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  borderRadius?: Record<string, unknown>;
  shadows?: Record<string, unknown>;
  breakpoints?: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown; // Allow index access for compatibility with PuckCssAggregator
}

export interface Theme {
  id: number;
  tenant_id: string | null;
  name: string;
  slug: string;
  base_theme: string | null;
  theme_data: ThemeData;
  is_active: boolean;
  is_system_theme: boolean;
  description: string | null;
  preview_image: string | null;
  author: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableTheme {
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  preview: string | null;
  data: ThemeData;
}

export interface CreateThemeData {
  name: string;
  description?: string;
  preview_image?: string;
  is_system_theme?: boolean;
  base_theme?: string;
  theme_data?: Partial<ThemeData>;
}

export interface UpdateThemeData {
  name?: string;
  description?: string;
  preview_image?: string;
  theme_data?: Partial<ThemeData>;
}

export interface ActivateThemeData {
  slug: string;
}

export interface DuplicateThemeData {
  name: string;
}

export interface PageTemplate {
  id: number;
  theme_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  puck_data: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePageTemplateData {
  theme_id?: number | null;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  preview_image?: string;
  puck_data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdatePageTemplateData {
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  preview_image?: string;
  puck_data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ThemePart extends Record<string, unknown> {
  id: number;
  tenant_id: string | null;
  theme_id: number | null;
  name: string;
  slug: string;
  type: 'header' | 'footer' | 'sidebar';
  puck_data_raw: Record<string, unknown> | null;
  puck_data_compiled: Record<string, unknown> | null;
  status: 'draft' | 'published';
  sort_order: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateThemePartData {
  theme_id?: number | null;
  name: string;
  slug?: string;
  type: 'header' | 'footer' | 'sidebar';
  puck_data_raw?: Record<string, unknown> | null;
  status: 'draft' | 'published';
  sort_order?: number;
  created_by?: number;
}

export interface UpdateThemePartData {
  name?: string;
  slug?: string;
  type?: 'header' | 'footer' | 'sidebar';
  puck_data_raw?: Record<string, unknown> | null;
  status?: 'draft' | 'published';
  sort_order?: number;
}
