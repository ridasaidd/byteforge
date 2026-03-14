import { LayoutDashboard, Users, Building2, Settings, Activity, Shield, Image, FileText, Palette, Menu, BarChart2, Wallet } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';
import { useTranslation } from 'react-i18next';

export function useCentralMenuItems(): MenuItem[] {
  const { t } = useTranslation('common');

  return [
    {
      label: t('menu_dashboard'),
      path: '/dashboard',
      icon: LayoutDashboard,
      // Dashboard is accessible to everyone
    },
    {
      label: t('menu_pages'),
      path: '/dashboard/pages',
      icon: FileText,
      // Pages accessible to all authenticated users for now
    },
    {
      label: t('menu_navigation'),
      path: '/dashboard/navigations',
      icon: Menu,
      // Navigation accessible to all authenticated users for now
    },
    {
      label: t('menu_themes'),
      path: '/dashboard/themes',
      icon: Palette,
      // Themes accessible to all authenticated users for now
    },
    {
      label: t('menu_tenants'),
      path: '/dashboard/tenants',
      icon: Building2,
      permission: 'view tenants',
    },
    {
      label: t('menu_users'),
      path: '/dashboard/users',
      icon: Users,
      permission: 'view users',
    },
    {
      label: t('menu_media_library'),
      path: '/dashboard/media',
      icon: Image,
      // Media library accessible to all authenticated users
    },
    {
      label: t('menu_roles_permissions'),
      path: '/dashboard/roles-permissions',
      icon: Shield,
      permission: 'manage roles',
    },
    {
      label: t('menu_activity_log'),
      path: '/dashboard/activity',
      icon: Activity,
      permission: 'view activity logs',
    },
    {
      label: t('menu_analytics'),
      path: '/dashboard/analytics',
      icon: BarChart2,
      permission: 'view platform analytics',
    },
    {
      label: t('menu_billing'),
      path: '/dashboard/billing',
      icon: Wallet,
      permission: 'view billing',
    },
    {
      label: t('menu_settings'),
      path: '/dashboard/settings',
      icon: Settings,
      permission: 'view settings',
    },
  ];
}
