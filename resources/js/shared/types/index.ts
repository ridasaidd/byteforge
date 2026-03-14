// Shared TypeScript types across all apps

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferred_locale?: 'en' | 'sv' | 'ar' | null;
  tenant_id?: string;
  avatar?: string;
  roles?: Role[];
  permissions?: Permission[];
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  settings?: Record<string, unknown>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TenantState {
  tenant: Tenant | null;
  isLoading: boolean;
}
