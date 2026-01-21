/**
 * Central API service - Re-exports from modular API structure
 *
 * This file maintains backward compatibility by re-exporting everything from
 * the refactored API modules in /api folder.
 */

// Re-export all types
export * from './api/types';

// Re-export all API modules
export { auth } from './api/auth';
export { users } from './api/users';
export { tenants } from './api/tenants';
export { activity } from './api/activity';
export { settings } from './api/settings';
export { pages } from './api/pages';
export { media } from './api/media';
export { mediaFolders } from './api/mediaFolders';
export { themes } from './api/themes';
export { stats } from './api/stats';

// Aggregate API object for backward compatibility
import { auth } from './api/auth';
import { users } from './api/users';
import { tenants } from './api/tenants';
import { activity } from './api/activity';
import { settings } from './api/settings';
import { pages } from './api/pages';
import { media } from './api/media';
import { mediaFolders } from './api/mediaFolders';
import { themes } from './api/themes';
import { stats } from './api/stats';

/**
 * Aggregated API object for convenient access to all API modules
 *
 * @example
 * // You can use either:
 * import { api } from '@/shared/services/api';
 * api.auth.login(credentials);
 *
 * // Or import specific modules:
 * import { auth } from '@/shared/services/api';
 * auth.login(credentials);
 */
export const api = {
  auth,
  users,
  tenants,
  activity,
  settings,
  pages,
  media,
  mediaFolders,
  themes,
  stats,
};
