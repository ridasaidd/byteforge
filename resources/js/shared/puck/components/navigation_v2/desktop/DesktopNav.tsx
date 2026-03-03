import React from 'react';
import type { MenuItem } from '@/shared/services/api/navigations';
import { DesktopNavItem } from './DesktopNavItem';

interface DesktopNavProps {
  className?: string;
  items: MenuItem[];
  isEditing: boolean;
}

function byOrder(a: MenuItem, b: MenuItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function getItemKey(item: MenuItem, index: number): string {
  const base = item.id || item.url || item.label || 'menu-item';
  const order = item.order ?? index;
  return `${base}-${order}-${index}`;
}

export function DesktopNav({ className, items, isEditing }: DesktopNavProps) {
  return (
    <ul className={['nav-items', className || ''].filter(Boolean).join(' ')}>
      {items.slice().sort(byOrder).map((item, index) => (
        <DesktopNavItem key={getItemKey(item, index)} item={item} depth={0} isEditing={isEditing} />
      ))}
    </ul>
  );
}
