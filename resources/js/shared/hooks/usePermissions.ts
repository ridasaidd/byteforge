import { useAuth } from './useAuth';
import type { User } from '../types';

/**
 * Extract all permission names from a user's roles and direct permissions
 */
function getUserPermissions(user: User | null): string[] {
  if (!user) return [];

  const permissionSet = new Set<string>();

  // Add direct permissions
  user.permissions?.forEach((perm) => {
    permissionSet.add(perm.name);
  });

  // Add permissions from roles
  user.roles?.forEach((role) => {
    role.permissions?.forEach((perm) => {
      permissionSet.add(perm.name);
    });
  });

  return Array.from(permissionSet);
}

/**
 * Extract all role names from a user
 */
function getUserRoles(user: User | null): string[] {
  if (!user) return [];
  return user.roles?.map((role) => role.name) || [];
}

export function usePermissions() {
  const { user } = useAuth();

  const permissions = getUserPermissions(user);
  const roles = getUserRoles(user);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((perm) => permissions.includes(perm));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((perm) => permissions.includes(perm));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  /**
   * Check if user has ANY of the specified roles
   */
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some((role) => roles.includes(role));
  };

  /**
   * Check if user has ALL of the specified roles
   */
  const hasAllRoles = (roleNames: string[]): boolean => {
    return roleNames.every((role) => roles.includes(role));
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };
}
