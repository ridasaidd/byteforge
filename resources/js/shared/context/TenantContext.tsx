import { createContext, useState, useEffect, ReactNode } from 'react';
import { http } from '../services/http';
import type { Tenant, TenantState } from '../types';

interface TenantContextType extends TenantState {
  refetchTenant: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  initialTenant?: Tenant | null;
}

export function TenantProvider({ children, initialTenant = null }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant);
  const [isLoading, setIsLoading] = useState(!initialTenant);

  useEffect(() => {
    // If no initial tenant provided, fetch from API
    if (!initialTenant) {
      fetchTenant();
    }
  }, [initialTenant]);

  const fetchTenant = async () => {
    try {
      setIsLoading(true);
      const tenantData = await http.get<Tenant>('/tenant/current');
      setTenant(tenantData);
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: TenantContextType = {
    tenant,
    isLoading,
    refetchTenant: fetchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
