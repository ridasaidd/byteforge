import { useState, useEffect, ReactNode } from 'react';
import { http } from '../services/http';
import type { Tenant } from '../types';
import { TenantContext } from './TenantContext';

export function TenantProvider({ children, initialTenant = null }: { children: ReactNode; initialTenant?: Tenant | null }) {
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

  const value = {
    tenant,
    isLoading,
    refetchTenant: fetchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
