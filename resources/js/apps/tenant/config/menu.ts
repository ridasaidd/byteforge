import { LayoutDashboard, FileText, Image, Menu, Settings, BarChart2, CreditCard, ShieldCheck, Palette, Users, Shield } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';
import { useTranslation } from 'react-i18next';

export function useTenantMenuItems(): MenuItem[] {
  const { t } = useTranslation('common');

  return [
    {
      label: t('menu_dashboard'),
      path: '/cms',
      icon: LayoutDashboard,
    },
    {
      label: t('menu_pages'),
      path: '/cms/pages',
      icon: FileText,
      permission: 'pages.view',
    },
    {
      label: t('menu_analytics'),
      path: '/cms/analytics',
      icon: BarChart2,
      permission: 'view analytics',
    },
    {
      label: t('menu_payments'),
      path: '/cms/payments',
      icon: CreditCard,
      permission: 'payments.view',
    },
    {
      label: t('menu_payment_providers'),
      path: '/cms/payments/providers',
      icon: ShieldCheck,
      permission: 'payments.view',
    },
    {
      label: t('menu_media_library'),
      path: '/cms/media',
      icon: Image,
      permission: 'media.view',
    },
    {
      label: t('menu_navigation'),
      path: '/cms/navigation',
      icon: Menu,
      permission: 'navigation.view',
    },
    {
      label: t('menu_themes'),
      path: '/cms/themes',
      icon: Palette,
      permission: 'themes.view',
    },
    {
      label: t('menu_users'),
      path: '/cms/users',
      icon: Users,
      permission: 'view users',
    },
    {
      label: t('menu_roles_permissions'),
      path: '/cms/roles-permissions',
      icon: Shield,
      permission: 'view users',
    },
    {
      label: t('menu_settings'),
      path: '/cms/settings',
      icon: Settings,
      permission: 'view settings',
    },
  ];
}
