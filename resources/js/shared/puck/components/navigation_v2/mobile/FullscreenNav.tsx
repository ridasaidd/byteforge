import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import { registerOverlayPortal } from '@puckeditor/core';
import type { MenuItem } from '@/shared/services/api/navigations';
import { MobileNavItem } from './MobileNavItem';

interface FullscreenNavProps {
  className?: string;
  items: MenuItem[];
  isEditing: boolean;
  isOpen: boolean;
  onClose: () => void;
  closeButtonIconSize?: number;
}

function byOrder(a: MenuItem, b: MenuItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function getItemKey(item: MenuItem, index: number): string {
  const base = item.id || item.url || item.label || 'menu-item';
  const order = item.order ?? index;
  return `${base}-${order}-${index}`;
}

export function FullscreenNav({ className, items, isEditing, isOpen, onClose, closeButtonIconSize = 20 }: FullscreenNavProps) {
  const registerCloseButton = useCallback((element: HTMLButtonElement | null) => {
    if (!isEditing || !element) return;
    registerOverlayPortal(element);
  }, [isEditing]);

  return (
    <div className={[
      'nav-mobile-fullscreen',
      isOpen ? 'is-open' : '',
      className || '',
    ].filter(Boolean).join(' ')}>
      <button ref={registerCloseButton} type="button" className="nav-close" onClick={onClose} aria-label="Close menu">
        <X size={closeButtonIconSize} aria-hidden="true" />
      </button>

      <ul className="nav-items">
        {items.slice().sort(byOrder).map((item, index) => (
          <MobileNavItem key={getItemKey(item, index)} item={item} depth={0} isEditing={isEditing} />
        ))}
      </ul>
    </div>
  );
}
