import { LayoutDashboard, Users, Building2, Settings, Activity, Shield, Image, FileText } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';

export const centralMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    // Dashboard is accessible to everyone
  },
  {
    label: 'Pages',
    path: '/dashboard/pages',
    icon: FileText,
    // Pages accessible to all authenticated users for now
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
    label: 'Media Library',
    path: '/dashboard/media',
    icon: Image,
    // Media library accessible to all authenticated users
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
