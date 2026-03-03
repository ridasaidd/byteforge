import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Determines whether a URL points outside the current origin.
 * Anchors (#), mailto:, tel:, and cross-origin http(s) URLs all count as external.
 */
function isExternalUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).origin !== window.location.origin;
    } catch {
      return true;
    }
  }
  return false;
}

/**
 * Converts an absolute same-origin URL into a relative path+search+hash string
 * so react-router's <Link to="…"> gets the path it needs.
 */
function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

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
  if (!href || isExternalUrl(url) || target === '_blank') {
    return (
      <a href={url} target={target} rel={rel} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  // Internal link: SPA navigation via react-router — no page reload
  return (
    <Link to={toRelativePath(url)} className={className}>
      {children}
    </Link>
  );
}
