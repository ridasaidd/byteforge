import type { MenuItem } from '@/shared/services/api/navigations';
import { MobileNavItem } from './MobileNavItem';

interface DropdownNavProps {
  className?: string;
  items: MenuItem[];
  isEditing: boolean;
  isOpen: boolean;
  onClose: () => void;
}

function byOrder(a: MenuItem, b: MenuItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function getItemKey(item: MenuItem, index: number): string {
  const base = item.id || item.url || item.label || 'menu-item';
  const order = item.order ?? index;
  return `${base}-${order}-${index}`;
}

export function DropdownNav({ className, items, isEditing, isOpen }: DropdownNavProps) {
  return (
    <div
      className={[
        'nav-mobile-dropdown',
        isOpen ? 'is-open' : '',
        className || '',
      ].filter(Boolean).join(' ')}
    >
      <ul className="nav-items">
        {items.slice().sort(byOrder).map((item, index) => (
          <MobileNavItem key={getItemKey(item, index)} item={item} depth={0} isEditing={isEditing} />
        ))}
      </ul>
    </div>
  );
}
