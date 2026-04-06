import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card } from '@/shared/components/molecules/Card';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { tenantThemes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

const getMediumPreviewUrl = (url?: string | null) => {
  if (!url) return null;
  const mediaLibraryPattern = /^(.*\/medialibrary\/\d+\/\d+\/)([^/]+)\.(\w+)$/;
  const match = url.match(mediaLibraryPattern);
  if (!match) return url;
  const [, basePath, fileName] = match;
  return `${basePath}conversions/${fileName}-medium.jpg`;
};

export function ThemesPage() {
  const { t } = useTranslation('themes');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const canActivate = hasPermission('themes.activate') || hasPermission('themes.manage');
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null);
  const [confirmTheme, setConfirmTheme] = useState<Theme | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(5);
  const [previewErrorIds, setPreviewErrorIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [themesResponse, activeResponse] = await Promise.all([
          tenantThemes.list(),
          tenantThemes.active().catch(() => ({ data: null })),
        ]);

        setAllThemes(themesResponse.data ?? []);
        setActiveTheme(activeResponse.data ?? null);
      } catch {
        toast({
          title: t('error', { defaultValue: 'Error' }),
          description: t('failed_load', { defaultValue: 'Failed to load themes.' }),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadThemes = async () => {
    const [themesResponse, activeResponse] = await Promise.all([
      tenantThemes.list(),
      tenantThemes.active().catch(() => ({ data: null })),
    ]);

    setAllThemes(themesResponse.data ?? []);
    setActiveTheme(activeResponse.data ?? null);
  };

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section || !activeTheme?.id) {
      return;
    }

    navigate(`/cms/themes/${activeTheme.id}/customize?section=${encodeURIComponent(section)}`, { replace: true });
  }, [activeTheme?.id, navigate, searchParams]);

  useEffect(() => {
    if (!confirmTheme) return;

    setConfirmCountdown(5);
    const interval = setInterval(() => {
      setConfirmCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmTheme]);

  const handleCustomize = (themeId: number | null | undefined = activeTheme?.id) => {
    if (!themeId) {
      return;
    }

    navigate(`/cms/themes/${themeId}/customize`);
  };

  const handleActivate = async (slug: string) => {
    try {
      setActivatingSlug(slug);
      await tenantThemes.activate({ slug });
      await reloadThemes();

      toast({
        title: t('success', { defaultValue: 'Success' }),
        description: t('activated_success', { defaultValue: 'Theme activated successfully.' }),
      });
    } catch {
      toast({
        title: t('error', { defaultValue: 'Error' }),
        description: t('failed_activate', { defaultValue: 'Failed to activate theme.' }),
        variant: 'destructive',
      });
    } finally {
      setActivatingSlug(null);
    }
  };

  const handleConfirmActivate = async () => {
    if (!confirmTheme) return;
    await handleActivate(confirmTheme.slug);
    setConfirmTheme(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} description={t('loading_description')} />
        <div className="mt-6 text-center text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Dialog open={!!confirmTheme} onOpenChange={(open) => !open && setConfirmTheme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('switch_theme_title', { defaultValue: 'Switch theme?' })}</DialogTitle>
            <DialogDescription>
              {t('switch_theme_desc', { defaultValue: 'Switching themes may change storefront layout and styles immediately.' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTheme(null)}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              disabled={confirmCountdown > 0 || !!activatingSlug}
              onClick={handleConfirmActivate}
            >
              {confirmCountdown > 0
                ? t('switch_countdown', { seconds: confirmCountdown, defaultValue: `Switch (${confirmCountdown}s)` })
                : activatingSlug
                  ? t('switching', { defaultValue: 'Switching…' })
                  : t('switch_btn', { defaultValue: 'Switch theme' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        {allThemes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">{t('no_themes', { defaultValue: 'No themes available.' })}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allThemes.map((theme) => {
              const isActive = activeTheme?.id === theme.id || theme.is_active;

              return (
                <Card key={theme.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{theme.name}</h3>
                        {isActive && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3 me-1" />
                            {t('active_badge', { defaultValue: 'Active' })}
                          </span>
                        )}
                      </div>
                      {theme.description && (
                        <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                      )}
                      {(theme.version || theme.author) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {theme.version && <span>v{theme.version}</span>}
                          {theme.version && theme.author && <span>•</span>}
                          {theme.author && <span>{theme.author}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    {theme.preview_image && !previewErrorIds.has(theme.id) ? (
                      <img
                        src={getMediumPreviewUrl(theme.preview_image) || theme.preview_image}
                        alt={`${theme.name} preview`}
                        className="w-full h-40 object-cover rounded-md border"
                        loading="lazy"
                        onError={() => {
                          setPreviewErrorIds((prev) => {
                            const next = new Set(prev);
                            next.add(theme.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <div className="w-full h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-gray-500">
                        {t('no_preview', { defaultValue: 'No preview image' })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmTheme(theme)}
                        disabled={!canActivate || activatingSlug === theme.slug}
                        className="flex-1 min-w-[100px]"
                      >
                        {t('activate')}
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCustomize(theme.id)}
                        className="flex-1 min-w-[120px]"
                      >
                        {t('customize')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
