import { describe, expect, it, beforeEach } from 'vitest';
import { shouldUseSpaNavigation, toRelativePath } from '../routerNavigation';

describe('routerNavigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('uses SPA navigation for public routes handled by the public app', () => {
    window.history.replaceState({}, '', '/pages/home');

    expect(shouldUseSpaNavigation('/pages/about')).toBe(true);
    expect(shouldUseSpaNavigation('/guest-portal')).toBe(true);
    expect(shouldUseSpaNavigation('/guest-portal/42')).toBe(true);
  });

  it('does not use SPA navigation for tenant shell routes from the public app', () => {
    window.history.replaceState({}, '', '/pages/home');

    expect(shouldUseSpaNavigation('/login')).toBe(false);
    expect(shouldUseSpaNavigation('/cms')).toBe(false);
  });

  it('uses SPA navigation for tenant-owned routes when already inside the tenant shell', () => {
    window.history.replaceState({}, '', '/cms/navigation');

    expect(shouldUseSpaNavigation('/login')).toBe(true);
    expect(shouldUseSpaNavigation('/cms/system-pages')).toBe(true);
    expect(shouldUseSpaNavigation('/guest-portal')).toBe(false);
  });

  it('normalizes same-origin URLs to relative router paths', () => {
    expect(toRelativePath('http://tenant-one.byteforge.se/guest-portal?foo=bar#details')).toBe('/guest-portal?foo=bar#details');
  });
});
