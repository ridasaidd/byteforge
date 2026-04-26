import React from 'react';
import { Link } from 'react-router-dom';
import { isExternalUrl, shouldUseSpaNavigation, toRelativePath } from '@/shared/utils/routerNavigation';

interface NavLinkProps {
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
  isEditing?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  children: React.ReactNode;
}

/**
 * Renders a router-aware navigation link:
 * - Editor mode        → plain <a> with no href (prevents accidental navigation while editing)
 * - External / _blank  → plain <a> with full href and rel attributes
 * - Internal URL       → react-router <Link to="…"> for instant SPA transitions
 */
export function NavLink({ href, target, rel, className, isEditing, onClick, children }: NavLinkProps) {
  // Editor: never navigate, just render the label
  if (isEditing) {
    return (
      <a className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  const url = href || '#';

  // External link or explicit new-tab: full browser navigation
  if (!href || isExternalUrl(url) || target === '_blank' || !shouldUseSpaNavigation(url)) {
    return (
      <a href={url} target={target} rel={rel} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  // Internal link: SPA navigation via react-router — no page reload
  return (
    <Link to={toRelativePath(url)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
