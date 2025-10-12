// Shared TypeScript types across all apps

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles?: string[];
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
