import { LayoutDashboard, Users, Building2, Settings, Activity } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';

export const centralMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Tenants',
    path: '/dashboard/tenants',
    icon: Building2,
  },
  {
    label: 'Users',
    path: '/dashboard/users',
    icon: Users,
  },
  {
    label: 'Activity Log',
    path: '/dashboard/activity',
    icon: Activity,
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Settings,
  },
];
