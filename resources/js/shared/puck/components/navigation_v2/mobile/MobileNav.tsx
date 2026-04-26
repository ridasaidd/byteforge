import type { MenuItem } from '@/shared/services/api/navigations';
import type { MobileVariant } from '../shared/navTypes';
import { DrawerNav } from './DrawerNav';
import { FullscreenNav } from './FullscreenNav';
import { DropdownNav } from './DropdownNav';

interface MobileNavProps {
  className?: string;
  items: MenuItem[];
  utilityItems?: MenuItem[];
  isEditing: boolean;
  isOpen: boolean;
  onClose: () => void;
  mobileVariant?: MobileVariant;
  closeButtonIconSize?: number;
}

export function MobileNav({ mobileVariant = 'dropdown', ...props }: MobileNavProps) {
  switch (mobileVariant) {
    case 'drawer':
      return <DrawerNav {...props} />;
    case 'fullscreen':
      return <FullscreenNav {...props} />;
    case 'dropdown':
    default:
      return <DropdownNav {...props} />;
  }
}
