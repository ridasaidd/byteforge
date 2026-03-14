import { useMemo, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { registerOverlayPortal } from '@puckeditor/core';
import type { MenuItem } from '@/shared/services/api/navigations';
import { NavLink } from '../shared/NavLink';

interface MobileNavItemProps {
  item: MenuItem;
  depth: number;
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

export function MobileNavItem({ item, depth, isEditing }: MobileNavItemProps) {
  const [isExpanded, setExpanded] = useState(false);
  const hasChildren = !!(item.children && item.children.length > 0);
  const isExternal = item.target === '_blank';
  const location = useLocation();
  const registerChevronButton = useCallback((element: HTMLButtonElement | null) => {
    if (!isEditing || !element) return;
    registerOverlayPortal(element);
  }, [isEditing]);

  const isActive = useMemo(() => {
    if (!item.url) return false;
    try {
      return location.pathname === new URL(item.url, window.location.origin).pathname;
    } catch {
      return false;
    }
  }, [item.url, location.pathname]);

  return (
    <li
      className={[
        'nav-item',
        `depth-${depth}`,
        hasChildren ? 'has-children' : '',
        isExpanded ? 'is-expanded' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="nav-item-row">
        <NavLink
          href={item.url || '#'}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className={`nav-link ${isActive ? 'is-active' : ''}`.trim()}
          isEditing={isEditing}
          onClick={(event) => {
            if (hasChildren && !item.url) {
              event.preventDefault();
              setExpanded((prev) => !prev);
            }
          }}
        >
          <span className="nav-link-label">{item.label}</span>
        </NavLink>

        {hasChildren && (
          <button
            ref={registerChevronButton}
            type="button"
            className="nav-chevron"
            aria-label={isExpanded ? 'Collapse submenu' : 'Expand submenu'}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {hasChildren && (
        <ul className={`nav-submenu${isExpanded ? ' is-open' : ''}`}>
          {item.children?.slice().sort(byOrder).map((child, index) => (
            <MobileNavItem
              key={getItemKey(child, index)}
              item={child}
              depth={depth + 1}
              isEditing={isEditing}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
