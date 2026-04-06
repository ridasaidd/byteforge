import { createContext } from 'react';

export interface AddonContextType {
  /** Feature flags active for this tenant, e.g. ['booking', 'payments'] */
  activeFlags: string[];
  isLoading: boolean;
  /** Check whether a specific add-on feature flag is active */
  hasAddon: (flag: string) => boolean;
  /** Re-fetch active flags from the API — call after activating/deactivating an add-on */
  refetch: () => Promise<void>;
}

export const AddonContext = createContext<AddonContextType>({
  activeFlags: [],
  isLoading: false,
  hasAddon: () => false,
  refetch: () => Promise.resolve(),
});
