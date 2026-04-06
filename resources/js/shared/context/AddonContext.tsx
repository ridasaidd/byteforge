import { useState, useEffect, useCallback, ReactNode } from 'react';
import { AddonContext } from './AddonContext';
import { tenantAddonApi } from '../services/api/tenantAddons';
import { authService } from '../services/auth.service';

/**
 * Provides the active add-on feature flags for the current tenant.
 *
 * Fetches once when the user is authenticated. Re-fetches are triggered by
 * calling refetch() — useful after an admin activates/deactivates an add-on.
 *
 * Only mount this provider in the tenant app, not the central superadmin app.
 */
export function AddonProvider({ children }: { children: ReactNode }) {
  const [activeFlags, setActiveFlags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    // Only fetch when a token is present (user is logged in)
    if (!authService.isAuthenticated()) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await tenantAddonApi.activeFlags();
      setActiveFlags(response.data ?? []);
    } catch {
      // Not critical — the backend enforces the gate; we just hide UI gracefully
      setActiveFlags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFlags();
  }, [fetchFlags]);

  const hasAddon = useCallback((flag: string) => activeFlags.includes(flag), [activeFlags]);

  return (
    <AddonContext.Provider value={{ activeFlags, isLoading, hasAddon }}>
      {children}
    </AddonContext.Provider>
  );
}
