import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type Data, Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import type { SystemSurface } from '@/shared/services/api/types';
import { buildSystemSurfaceData, systemSurfaceConfig, type SystemSurfaceKey } from '@/shared/puck/system-surfaces/SystemSurfaceConfig';

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
  const puckDataRef = useRef<Data>({ content: [], root: {} });

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
        }
      } catch {
        if (!cancelled) {
          toast({
            title: t('error_title'),
            description: t('editor_failed_load'),
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
  }, [navigate, surfaceKey, t, toast]);

  const handleSave = async () => {
    if (!surface) {
      return;
    }

    try {
      await tenantSystemSurfaces.update(surface.surface_key, {
        puck_data: puckDataRef.current as Record<string, unknown>,
        published_at: surface.published_at ?? new Date().toISOString(),
      });

      toast({
        title: t('editor_saved_title'),
        description: t('editor_saved_desc'),
      });
    } catch {
      toast({
        title: t('error_title'),
        description: t('editor_failed_save'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen" />;
  }

  if (!surface) {
    return null;
  }

  return (
    <Puck
      config={systemSurfaceConfig}
      data={initialData}
      onChange={(data) => {
        puckDataRef.current = data;
      }}
      onPublish={handleSave}
      viewports={viewports}
      headerTitle={surface.title}
      headerPath={surface.route_path}
    />
  );
}
