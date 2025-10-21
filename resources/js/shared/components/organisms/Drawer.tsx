import { Link, useLocation } from 'react-router-dom';
import { X, LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/shared/hooks/usePermissions';

export interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission required to view this menu item (optional) */
  permission?: string | string[];
  /** Role required to view this menu item (optional) */
  role?: string | string[];
  /** If true, user must have ALL permissions/roles. If false, ANY will suffice */
  requireAll?: boolean;
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

export function Drawer({ isOpen, onClose, menuItems }: DrawerProps) {
  const location = useLocation();
  const { hasAnyPermission, hasAllPermissions, hasAnyRole, hasAllRoles } = usePermissions();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  /**
   * Check if user has access to a menu item based on its permission/role requirements
   */
  const hasAccess = (item: MenuItem): boolean => {
    // No restrictions means everyone has access
    if (!item.permission && !item.role) {
      return true;
    }

    // Check permissions
    if (item.permission) {
      const permissions = Array.isArray(item.permission) ? item.permission : [item.permission];
      return item.requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }

    // Check roles
    if (item.role) {
      const roles = Array.isArray(item.role) ? item.role : [item.role];
      return item.requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
    }

    return false;
  };

  // Filter menu items based on user permissions
  const accessibleMenuItems = menuItems.filter(hasAccess);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 border-r bg-background transition-transform duration-200 ease-in-out md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <span className="font-semibold">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {accessibleMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
