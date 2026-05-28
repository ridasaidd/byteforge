import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type Data, Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import { tenantThemeParts } from '@/shared/services/api/themeParts';
import { tenantThemes } from '@/shared/services/api/themes';
import type { SystemSurface } from '@/shared/services/api/types';
import {
  buildSystemSurfaceData,
  getSystemSurfaceConfig,
  getSystemSurfaceConfigWithChrome,
  getSystemSurfaceAdminTitle,
  isGuestFacingSurface,
  type SystemSurfaceKey,
} from '@/shared/puck/system-surfaces/SystemSurfaceConfig';
import { puckConfig as pagePreviewConfig } from '@/shared/puck/config';

const supportedSurfaceKeys = new Set<SystemSurfaceKey>([
  'tenant_login',
  'register',
  'forgot_password',
  'reset_password',
  'guest_portal',
]);

export function SystemSurfaceEditorPage() {
  const { surfaceKey } = useParams<{ surfaceKey: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation('pages');
  const [isLoading, setIsLoading] = useState(true);
  const [surface, setSurface] = useState<SystemSurface | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });
  const [headerData, setHeaderData] = useState<Data | null>(null);
  const [footerData, setFooterData] = useState<Data | null>(null);
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const toastRef = useRef(toast);
  const tRef = useRef(t);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const viewports = [
    { width: 375, height: 667, label: t('viewport_mobile'), icon: <Smartphone className="h-4 w-4" /> },
    { width: 768, height: 1024, label: t('viewport_tablet'), icon: <Tablet className="h-4 w-4" /> },
    { width: 1280, height: 'auto' as const, label: t('viewport_desktop'), icon: <Monitor className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (!surfaceKey || !supportedSurfaceKeys.has(surfaceKey as SystemSurfaceKey)) {
      navigate('/cms/system-pages', { replace: true });
      return;
    }

    let cancelled = false;

    const loadSurface = async () => {
      try {
        const response = await tenantSystemSurfaces.get(surfaceKey);
        const nextSurface = response.data;
        const nextData = buildSystemSurfaceData(nextSurface.surface_key, nextSurface.puck_data);

        if (!cancelled) {
          setSurface(nextSurface);
          setInitialData(nextData);
          puckDataRef.current = nextData;
          setHeaderData(null);
          setFooterData(null);
        }

        if (!cancelled && isGuestFacingSurface(nextSurface.surface_key as SystemSurfaceKey)) {
          try {
            const activeThemeResponse = await tenantThemes.active().catch(() => ({ data: null }));
            const activeThemeId = activeThemeResponse.data?.id ?? null;

            const [headerResponse, footerResponse] = await Promise.all([
              tenantThemeParts.list({ type: 'header', theme_id: activeThemeId ?? undefined }),
              tenantThemeParts.list({ type: 'footer', theme_id: activeThemeId ?? undefined }),
            ]);

            const headerPart = headerResponse.data?.[0];
            const footerPart = footerResponse.data?.[0];

            if (!cancelled) {
              if (headerPart?.puck_data_raw) {
                setHeaderData(headerPart.puck_data_raw as Data);
              }
              if (footerPart?.puck_data_raw) {
                setFooterData(footerPart.puck_data_raw as Data);
              }
            }
          } catch (themeError) {
            console.warn('Could not load theme parts for system surface preview:', themeError);
          }
        }
      } catch {
        if (!cancelled) {
          toastRef.current({
            title: tRef.current('error_title'),
            description: tRef.current('editor_failed_load'),
            variant: 'destructive',
          });
          navigate('/cms/system-pages', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSurface();

    return () => {
      cancelled = true;
    };
  }, [navigate, surfaceKey]);

  const handleSave = async () => {
    if (!surface) {
      return;
    }

    try {
      await tenantSystemSurfaces.update(surface.surface_key, {
        puck_data: puckDataRef.current as Record<string, unknown>,
        published_at: surface.published_at ?? new Date().toISOString(),
      });

      toastRef.current({
        title: tRef.current('editor_saved_title'),
        description: tRef.current('editor_saved_desc'),
      });
    } catch {
      toastRef.current({
        title: tRef.current('error_title'),
        description: tRef.current('editor_failed_save'),
        variant: 'destructive',
      });
    }
  };

  const handleEditSection = useCallback((section: 'header' | 'footer') => {
    navigate(`/cms/themes?section=${section}`);
  }, [navigate]);

  const config = useMemo(() => {
    if (!surface) return null;
    const baseConfig = getSystemSurfaceConfig(surface.surface_key);
    return getSystemSurfaceConfigWithChrome(surface.surface_key, {
      baseConfig,
      previewConfig: pagePreviewConfig,
      headerData,
      footerData,
      onEditSection: handleEditSection,
    });
  }, [surface, headerData, footerData, handleEditSection]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen" />;
  }

  if (!surface || !config) {
    return null;
  }

  return (
    <Puck
      config={config}
      data={initialData}
      onChange={(data) => {
        puckDataRef.current = data;
      }}
      onPublish={handleSave}
      viewports={viewports}
      headerTitle={getSystemSurfaceAdminTitle(surface.surface_key, surface.title)}
      headerPath={surface.route_path}
    />
  );
}
