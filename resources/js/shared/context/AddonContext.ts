import { createContext } from 'react';

export interface AddonContextType {
  /** Feature flags active for this tenant, e.g. ['booking', 'payments'] */
  activeFlags: string[];
  isLoading: boolean;
  /** Check whether a specific add-on feature flag is active */
  hasAddon: (flag: string) => boolean;
}

export const AddonContext = createContext<AddonContextType>({
  activeFlags: [],
  isLoading: false,
  hasAddon: () => false,
});
