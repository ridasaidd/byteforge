import { createContext } from 'react';
import type { TenantState } from '../types';

export interface TenantContextType extends TenantState {
  refetchTenant: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);
