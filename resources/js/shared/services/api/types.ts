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
  roles: (string | { name: string; membership_role?: string | null })[];
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

export interface TenantInspectionSummary extends Record<string, unknown> {
  tenant: Tenant;
  stats: {
    total_pages: number;
    published_pages: number;
    total_themes: number;
    recent_activity_count: number;
  };
  active_theme: {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    updated_at: string | null;
  } | null;
}

export interface TenantInspectionTheme extends Record<string, unknown> {
  id: number;
  tenant_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_system_theme: boolean;
  is_active: boolean;
  updated_at: string | null;
}

export interface TenantInspectionPage extends Record<string, unknown> {
  id: number;
  title: string;
  slug: string;
  page_type: string;
  status: string;
  is_homepage: boolean;
  published_at: string | null;
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
  // Phase 9.6 — Analytics integrations
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  clarity_project_id: string | null;
  plausible_domain: string | null;
  meta_pixel_id: string | null;
  // Phase 13 — Cookie consent controls
  privacy_policy_url: string | null;
  cookie_policy_url: string | null;
  ga4_enabled: boolean;
  gtm_enabled: boolean;
  clarity_enabled: boolean;
  plausible_enabled: boolean;
  meta_pixel_enabled: boolean;
}

export interface UpdateSettingsData {
  site_name?: string;
  site_active?: boolean;
  support_email?: string | null;
  company_name?: string | null;
  max_tenants_per_user?: number;
  // Phase 9.6 — Analytics integrations
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  clarity_project_id?: string | null;
  plausible_domain?: string | null;
  meta_pixel_id?: string | null;
  // Phase 13 — Cookie consent controls
  privacy_policy_url?: string | null;
  cookie_policy_url?: string | null;
  ga4_enabled?: boolean;
  gtm_enabled?: boolean;
  clarity_enabled?: boolean;
  plausible_enabled?: boolean;
  meta_pixel_enabled?: boolean;
}

// Tenant-scoped settings (POST /api/settings on tenant domain)
export interface TenantSettings extends Record<string, unknown> {
  site_title: string;
  site_description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  maintenance_mode: boolean;
  social_links: Record<string, string>;
  seo_meta: Record<string, string>;
  // Phase 9.6 — Analytics integrations
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  clarity_project_id: string | null;
  plausible_domain: string | null;
  meta_pixel_id: string | null;
  // Phase 13 — Cookie consent controls
  privacy_policy_url: string | null;
  cookie_policy_url: string | null;
  ga4_enabled: boolean;
  gtm_enabled: boolean;
  clarity_enabled: boolean;
  plausible_enabled: boolean;
  meta_pixel_enabled: boolean;
  // Phase 13 — Booking system settings
  timezone: string;
  date_format: string;
  time_format: string;
  booking_auto_confirm: boolean;
  booking_hold_minutes: number;
  booking_cancellation_notice_hours: number;
  booking_reminder_hours: number[];
  booking_checkin_time: string;
  booking_checkout_time: string;
  booking_payment_page_id: number | null;
}

export interface UpdateTenantSettingsData {
  site_title?: string;
  site_description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  maintenance_mode?: boolean;
  social_links?: Record<string, string>;
  seo_meta?: Record<string, string>;
  // Phase 9.6 — Analytics integrations
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  clarity_project_id?: string | null;
  plausible_domain?: string | null;
  meta_pixel_id?: string | null;
  // Phase 13 — Cookie consent controls
  privacy_policy_url?: string | null;
  cookie_policy_url?: string | null;
  ga4_enabled?: boolean;
  gtm_enabled?: boolean;
  clarity_enabled?: boolean;
  plausible_enabled?: boolean;
  meta_pixel_enabled?: boolean;
  // Phase 13 — Booking system settings
  timezone?: string;
  date_format?: string;
  time_format?: string;
  booking_auto_confirm?: boolean;
  booking_hold_minutes?: number;
  booking_cancellation_notice_hours?: number;
  booking_reminder_hours?: number[];
  booking_checkin_time?: string;
  booking_checkout_time?: string;
  booking_payment_page_id?: number | null;
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
  thumbnail_url?: string | null;  // 150x150
  small_url?: string | null;      // 300x300
  medium_url?: string | null;     // 800x800
  large_url?: string | null;      // 1920x1920
  webp_url?: string | null;       // webp format, 1920x1920
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
  page_css: string | null;
  meta_data: Record<string, unknown> | null;
  status: 'draft' | 'published' | 'archived';
  is_homepage: boolean;
  sort_order: number;
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
}

export interface UpdatePageData {
  title?: string;
  slug?: string;
  page_type?: 'general' | 'home' | 'about' | 'contact' | 'blog' | 'service' | 'product' | 'custom';
  puck_data?: Record<string, unknown> | null;
  page_css?: string;
  meta_data?: Record<string, unknown> | null;
  status?: 'draft' | 'published' | 'archived';
  is_homepage?: boolean;
  sort_order?: number;
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

/**
 * Font Configuration
 *
 * Represents a font selected in the theme builder with metadata
 */
export interface FontConfig {
  name: string;
  source: 'bundled' | 'system' | 'google' | 'custom';
  file?: string;
  weights?: number[];
  isVariable?: boolean;
  fallback?: string;
}

/**
 * Typography Configuration
 *
 * Contains all font selections for a theme (sans, serif, mono)
 * Can store either font names (string) or full FontConfig objects
 */
export interface ThemeTypography {
  sans?: string | FontConfig;
  serif?: string | FontConfig;
  mono?: string | FontConfig;
  [key: string]: string | FontConfig | undefined;
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

// ─── Analytics ─────────────────────────────────────────────────────────────

/** Period used by every analytics response envelope */
export interface AnalyticsPeriod {
  from: string; // YYYY-MM-DD
  to:   string;
}

/**
 * Analytics overview data shape.
 * Returned by both GET /api/analytics/overview (tenant)
 * and GET /api/superadmin/analytics/overview (central).
 */
export interface AnalyticsOverviewData {
  total_events: number;
  by_type:      Record<string, number>; // e.g. { 'page.viewed': 42, 'page.created': 5 }
}

/** Full response envelope for the overview endpoints */
export interface AnalyticsOverviewResponse {
  data:         AnalyticsOverviewData;
  period:       AnalyticsPeriod;
  generated_at: string;
}

/** Allowed date-range presets for the analytics UI */
export type AnalyticsRangePreset = '7d' | '30d' | '90d';

/**
 * Cross-tenant overview: aggregated analytics across ALL tenants combined.
 * Returned by GET /api/superadmin/analytics/tenants/overview
 */
export interface CrossTenantOverviewData {
  total_events: number;
  tenant_count: number;  // distinct tenants with ≥1 event in the period
  by_type:      Record<string, number>;
}

export interface CrossTenantOverviewResponse {
  data:         CrossTenantOverviewData;
  period:       AnalyticsPeriod;
  generated_at: string;
}

// ─── Payments & Billing (Phase 10) ─────────────────────────────────────────

export type PaymentProviderCode = 'stripe' | 'swish' | 'klarna';
export type PaymentProviderMode = 'test' | 'live';

export interface TenantPaymentProvider {
  provider: PaymentProviderCode;
  is_active: boolean;
  mode: PaymentProviderMode;
  credentials_summary?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertTenantPaymentProviderData {
  credentials: Record<string, string>;
  is_active?: boolean;
  mode?: PaymentProviderMode;
}

export interface TestTenantPaymentProviderData {
  credentials: Record<string, string>;
}

export interface PaymentRecord {
  id: number;
  tenant_id: string;
  provider: PaymentProviderCode;
  provider_transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  metadata: Record<string, unknown> | null;
  provider_response: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentListFilters {
  status?: string;
  provider?: PaymentProviderCode;
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

export interface RefundRecord {
  id: number;
  payment_id: number;
  amount: number;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundPaymentData {
  amount: number;
  reason?: string;
}

export interface BillingPlan {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  currency: string;
}

export interface BillingAddon {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  currency: string;
  feature_flag?: string;
  is_purchased: boolean;
}

export interface BillingSubscriptionSummary {
  plan: { name: string; slug: string } | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean;
  trial_ends_at?: string | null;
  active_addons?: Array<{ name: string; slug: string; activated_at: string | null }>;
  monthly_total: number;
}

export interface BillingCheckoutData {
  tenant_id: string;
  plan_slug: string;
  success_url: string;
  cancel_url: string;
}

export interface BillingPortalData {
  tenant_id: string;
  return_url: string;
}
