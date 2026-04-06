import { http } from '../http';
import type { ApiResponse } from './types';

/**
 * Tenant add-on API — fetches the feature flags active for the current tenant.
 * Uses the tenant-domain `/api/addons` endpoint (not the central superadmin billing API).
 */
export const tenantAddonApi = {
  /**
   * Returns the list of active feature flag strings, e.g. ['booking', 'payments'].
   */
  activeFlags: () => http.get<ApiResponse<string[]>>('/addons'),
};
