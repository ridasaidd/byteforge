import type { SystemSurface } from '@/shared/services/api/types';

export type SystemSurfaceKey = SystemSurface['surface_key'];

const systemSurfaceAdminTitles: Record<SystemSurfaceKey, string> = {
  tenant_login: 'Staff Login',
  register: 'Guest Sign Up (Reserved)',
  forgot_password: 'Guest Password Recovery (Reserved)',
  reset_password: 'Guest Password Reset (Reserved)',
  guest_portal: 'Guest Portal',
};

export function getSystemSurfaceAdminTitle(surfaceKey: SystemSurfaceKey, fallbackTitle?: string): string {
  return systemSurfaceAdminTitles[surfaceKey] ?? fallbackTitle ?? surfaceKey;
}
