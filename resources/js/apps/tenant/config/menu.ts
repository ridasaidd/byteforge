import { LayoutDashboard, FileText, Image, Menu, Settings } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';

export const tenantMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/cms',
    icon: LayoutDashboard,
  },
  {
    label: 'Pages',
    path: '/cms/pages',
    icon: FileText,
  },
  {
    label: 'Media Library',
    path: '/cms/media',
    icon: Image,
  },
  {
    label: 'Navigation',
    path: '/cms/navigation',
    icon: Menu,
  },
  {
    label: 'Settings',
    path: '/cms/settings',
    icon: Settings,
  },
];
