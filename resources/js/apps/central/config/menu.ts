import { LayoutDashboard, Users, Building2, Settings, Activity, Shield } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';

export const centralMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    // Dashboard is accessible to everyone
  },
  {
    label: 'Tenants',
    path: '/dashboard/tenants',
    icon: Building2,
    permission: 'view tenants',
  },
  {
    label: 'Users',
    path: '/dashboard/users',
    icon: Users,
    permission: 'view users',
  },
  {
    label: 'Manage Roles & Permissions',
    path: '/dashboard/roles-permissions',
    icon: Shield,
    permission: 'manage roles',
  },
  {
    label: 'Activity Log',
    path: '/dashboard/activity',
    icon: Activity,
    permission: 'view activity logs',
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Settings,
    permission: 'view settings',
  },
];
