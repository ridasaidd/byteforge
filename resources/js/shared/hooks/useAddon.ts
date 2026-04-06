import { useContext } from 'react';
import { AddonContext } from '../context/AddonContext';

/**
 * Access the tenant add-on context.
 *
 * @example
 * const { hasAddon } = useAddon();
 * if (!hasAddon('booking')) return <UpgradePrompt />;
 */
export function useAddon() {
  return useContext(AddonContext);
}
