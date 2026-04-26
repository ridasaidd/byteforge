import { useEffect, useMemo, useState } from 'react';
import { pages, tenantPages } from '@/shared/services/api/pages';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import type { Page, SystemSurface } from '@/shared/services/api/types';

interface PagesSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

interface RouteOption {
  label: string;
  value: string;
  group: 'pages' | 'system';
}

const navigableSystemSurfaceKeys = new Set<SystemSurface['surface_key']>([
  'guest_portal',
]);

function isTenantCmsContext(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/cms');
}

function pageRoute(page: Page): string {
  return page.is_homepage ? '/' : `/pages/${page.slug}`;
}

function toPageOption(page: Page): RouteOption {
  const route = pageRoute(page);
  return {
    label: route === '/' ? `${page.title} (Homepage)` : `${page.title} (${route})`,
    value: route,
    group: 'pages',
  };
}

function isLinkableSystemSurface(surface: SystemSurface): boolean {
  return surface.is_enabled
    && navigableSystemSurfaceKeys.has(surface.surface_key)
    && !surface.route_path.includes('/:');
}

function toSystemOption(surface: SystemSurface): RouteOption {
  return {
    label: `${surface.title} (${surface.route_path})`,
    value: surface.route_path,
    group: 'system',
  };
}

export function PagesSelector({ value, onChange }: PagesSelectorProps) {
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);

      try {
        const tenantContext = isTenantCmsContext();
        const pageResponse = tenantContext
          ? await tenantPages.list({ per_page: 100, status: 'published' })
          : await pages.list({ per_page: 100, status: 'published' });

        const nextOptions = (pageResponse.data || []).map(toPageOption);

        if (tenantContext) {
          const surfaceResponse = await tenantSystemSurfaces.list();
          nextOptions.push(
            ...surfaceResponse.data
              .filter(isLinkableSystemSurface)
              .map(toSystemOption),
          );
        }

        setRouteOptions(nextOptions);
      } catch (error) {
        console.error('Failed to fetch internal routes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, []);

  const pageOptions = useMemo(
    () => routeOptions.filter((option) => option.group === 'pages'),
    [routeOptions],
  );

  const systemOptions = useMemo(
    () => routeOptions.filter((option) => option.group === 'system'),
    [routeOptions],
  );

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '14px',
        fontFamily: 'inherit',
      }}
    >
      <option value="">{isLoading ? 'Loading routes...' : 'Select a route'}</option>
      {pageOptions.length > 0 ? (
        <optgroup label="Pages">
          {pageOptions.map((option) => (
            <option key={`${option.group}:${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {systemOptions.length > 0 ? (
        <optgroup label="System Pages">
          {systemOptions.map((option) => (
            <option key={`${option.group}:${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
