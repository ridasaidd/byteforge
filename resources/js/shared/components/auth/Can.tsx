import { ReactNode } from 'react';
import { usePermissions } from '@/shared/hooks/usePermissions';

interface CanProps {
  children: ReactNode;
  /** Single permission or array of permissions */
  permission?: string | string[];
  /** Single role or array of roles */
  role?: string | string[];
  /** If true, user must have ALL permissions/roles. If false, ANY will suffice */
  requireAll?: boolean;
  /** Content to show when user doesn't have permission (optional) */
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on user permissions or roles
 *
 * @example
 * <Can permission="manage users">
 *   <Button>Create User</Button>
 * </Can>
 *
 * @example
 * <Can permission={["view users", "manage users"]} requireAll={false}>
 *   <UsersList />
 * </Can>
 *
 * @example
 * <Can role="superadmin" fallback={<div>Access Denied</div>}>
 *   <AdminPanel />
 * </Can>
 */
export function Can({ children, permission, role, requireAll = false, fallback = null }: CanProps) {
  const { hasAnyPermission, hasAllPermissions, hasAnyRole, hasAllRoles } = usePermissions();

  let hasAccess = false;

  // Check permissions
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];

    if (requireAll) {
      hasAccess = hasAllPermissions(permissions);
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  }
  // Check roles
  else if (role) {
    const roles = Array.isArray(role) ? role : [role];

    if (requireAll) {
      hasAccess = hasAllRoles(roles);
    } else {
      hasAccess = hasAnyRole(roles);
    }
  }
  // If neither permission nor role is provided, deny access
  else {
    hasAccess = false;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
