import { LayoutDashboard, FileText, Image, Menu, Settings, BarChart2, CreditCard, ShieldCheck } from 'lucide-react';
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
    label: 'Analytics',
    path: '/cms/analytics',
    icon: BarChart2,
  },
  {
    label: 'Payments',
    path: '/cms/payments',
    icon: CreditCard,
    permission: 'payments.view',
  },
  {
    label: 'Payment Providers',
    path: '/cms/payments/providers',
    icon: ShieldCheck,
    permission: 'payments.view',
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
