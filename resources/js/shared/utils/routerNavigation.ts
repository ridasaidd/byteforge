export function isExternalUrl(url: string): boolean {
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

export function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

function isTenantShellPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/cms');
}

function canPublicShellHandle(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/pages/') ||
    pathname === '/booking/payment' ||
    pathname === '/guest-portal' ||
    pathname.startsWith('/guest-portal/') ||
    pathname === '/my-bookings' ||
    pathname.startsWith('/my-bookings/') ||
    pathname.startsWith('/guest/magic/')
  );
}

function canTenantShellHandle(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/cms');
}

export function shouldUseSpaNavigation(url: string): boolean {
  if (!url || isExternalUrl(url) || typeof window === 'undefined') {
    return false;
  }

  const targetPath = toRelativePath(url);
  const currentPath = window.location.pathname;

  if (isTenantShellPath(currentPath)) {
    return canTenantShellHandle(targetPath);
  }

  return canPublicShellHandle(targetPath);
}
