import { LayoutDashboard, FileText, Image, Menu, Settings, BarChart2, CreditCard, ShieldCheck } from 'lucide-react';
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
    },
    {
      label: t('menu_analytics'),
      path: '/cms/analytics',
      icon: BarChart2,
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
    },
    {
      label: t('menu_navigation'),
      path: '/cms/navigation',
      icon: Menu,
    },
    {
      label: t('menu_settings'),
      path: '/cms/settings',
      icon: Settings,
    },
  ];
}
