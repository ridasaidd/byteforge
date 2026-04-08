import { LayoutDashboard, FileText, Image, Menu, Settings, BarChart2, CreditCard, Palette, Users, Shield, CalendarDays, Layers, Users2, Settings2 } from 'lucide-react';
import type { MenuItem } from '@/shared/components/organisms/Drawer';
import { useTranslation } from 'react-i18next';
import { useAddon } from '@/shared/hooks/useAddon';

export function useTenantMenuItems(): MenuItem[] {
  const { t } = useTranslation('common');
  const { hasAddon } = useAddon();

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
      permission: 'analytics.view',
    },
    {
      label: t('menu_payments'),
      path: '/cms/payments',
      icon: CreditCard,
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
      permission: 'users.view',
    },
    {
      label: t('menu_roles_permissions'),
      path: '/cms/roles-permissions',
      icon: Shield,
      permission: 'users.view',
    },
    {
      label: t('menu_settings'),
      path: '/cms/settings',
      icon: Settings,
      permission: 'settings.view',
    },
    ...(hasAddon('booking') ? [
      {
        label: 'Bookings',
        path: '/cms/bookings',
        icon: CalendarDays,
        permission: 'bookings.view',
      },
      {
        label: 'Services',
        path: '/cms/bookings/services',
        icon: Layers,
        permission: 'bookings.view',
      },
      {
        label: 'Resources',
        path: '/cms/bookings/resources',
        icon: Users2,
        permission: 'bookings.view',
      },
      {
        label: 'Booking Settings',
        path: '/cms/bookings/settings',
        icon: Settings2,
        permission: 'bookings.manage',
      },
    ] as MenuItem[] : []),
  ];
}
