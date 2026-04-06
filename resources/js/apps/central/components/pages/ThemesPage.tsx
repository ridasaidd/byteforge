import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { useToast } from '@/shared/hooks';
import { themes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';
import { Copy, RotateCcw, Trash2, Check, Plus, Edit } from 'lucide-react';

const getMediumPreviewUrl = (url?: string | null) => {
  if (!url) return null;

  const mediaLibraryPattern = /^(.*\/medialibrary\/\d+\/\d+\/)([^/]+)\.(\w+)$/;
  const match = url.match(mediaLibraryPattern);

  if (!match) return url;

  const [, basePath, fileName] = match;
  return `${basePath}conversions/${fileName}-medium.jpg`;
};

export function ThemesPage() {
  const navigate = useNavigate();
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewErrorIds, setPreviewErrorIds] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate' | 'reset' | 'delete'; theme: Theme } | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(5);
  const { toast } = useToast();
  const { t } = useTranslation('themes');

  const loadThemes = async () => {
    try {
      setIsLoading(true);
      // Use allSettled so a 404 on /active (no active theme yet) doesn't prevent the list from loading.
      const [themesList, activeResult] = await Promise.allSettled([themes.list(), themes.active()]);

      if (themesList.status === 'fulfilled') {
        setAllThemes(themesList.value.data);
      } else {
        toast({ title: t('error'), description: t('failed_load'), variant: 'destructive' });
      }
      setActiveTheme(activeResult.status === 'fulfilled' ? activeResult.value.data : null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirmAction) return;

    setConfirmCountdown(5);
    const interval = setInterval(() => {
      setConfirmCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmAction]);

  const handleActivate = (theme: Theme) => setConfirmAction({ type: 'activate', theme });
  const handleReset = (theme: Theme) => setConfirmAction({ type: 'reset', theme });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'activate') {
        await themes.activate({ slug: confirmAction.theme.slug });
        toast({ title: t('success'), description: t('activated_success') });
      }

      if (confirmAction.type === 'reset') {
        await themes.reset(confirmAction.theme.id);
        toast({ title: t('success'), description: t('reset_success') });
      }

      if (confirmAction.type === 'delete') {
        await themes.delete(confirmAction.theme.id);
        toast({ title: t('success'), description: t('deleted_success') });
      }

      await loadThemes();
      setConfirmAction(null);
    } catch {
      const errorKey =
        confirmAction.type === 'activate' ? 'failed_activate'
        : confirmAction.type === 'reset' ? 'failed_reset'
        : 'failed_delete';

      toast({ title: t('error'), description: t(errorKey), variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: number) => {
    const name = prompt(t('duplicate_name_prompt'));
    if (!name) return;

    try {
      await themes.duplicate(id, { name });
      toast({ title: t('success'), description: t('duplicated_success') });
      await loadThemes();
    } catch {
      toast({ title: t('error'), description: t('failed_duplicate'), variant: 'destructive' });
    }
  };

  const handleDelete = (theme: Theme) => setConfirmAction({ type: 'delete', theme });

  const handleCreateTheme = () => navigate('/dashboard/themes/new/builder');
  const handleEditTheme = (themeId: number) => navigate(`/dashboard/themes/${themeId}/builder`);
  const handleCustomizeTheme = (themeId: number) => navigate(`/dashboard/themes/${themeId}/customize`);
  const isThemeActive = (slug: string) => activeTheme?.slug === slug;

  const confirmDialogConfig = confirmAction
    ? {
        title:
          confirmAction.type === 'activate' ? t('switch_theme_title')
          : confirmAction.type === 'reset' ? t('reset_theme_title')
          : t('delete_theme_title'),
        description:
          confirmAction.type === 'activate' ? t('switch_theme_desc')
          : confirmAction.type === 'reset' ? t('reset_theme_desc')
          : t('delete_theme_desc', { name: confirmAction.theme.name }),
        btnVariant: (confirmAction.type === 'activate' ? 'default' : 'destructive') as 'default' | 'destructive',
        btnLabel:
          confirmAction.type === 'activate' ? t('switch_btn')
          : confirmAction.type === 'reset' ? t('reset_btn')
          : t('delete_btn'),
        countdownLabel:
          confirmAction.type === 'activate' ? t('switch_countdown', { seconds: confirmCountdown })
          : confirmAction.type === 'reset' ? t('reset_countdown', { seconds: confirmCountdown })
          : t('delete_countdown', { seconds: confirmCountdown }),
      }
    : null;

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title={t('title')} description={t('loading_description')} />
        <div className="mt-6 text-center text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="default" size="sm" onClick={handleCreateTheme}>
            <Plus className="w-4 h-4 me-2" />
            {t('create_theme')}
          </Button>
        }
      />

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialogConfig?.title}</DialogTitle>
            <DialogDescription>{confirmDialogConfig?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>{t('cancel')}</Button>
            <Button
              variant={confirmDialogConfig?.btnVariant ?? 'default'}
              disabled={confirmCountdown > 0}
              onClick={handleConfirmAction}
            >
              {confirmCountdown > 0 ? confirmDialogConfig?.countdownLabel : confirmDialogConfig?.btnLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        {allThemes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">{t('no_themes')}</p>
            <Button onClick={handleCreateTheme} variant="outline">
              <Plus className="w-4 h-4 me-2" />
              {t('create_first_theme')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allThemes.map((theme) => (
              <Card key={theme.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{theme.name}</h3>
                      {isThemeActive(theme.slug) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 me-1" />
                          {t('active_badge')}
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
                      {t('no_preview')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!isThemeActive(theme.slug) && (
                    <Button variant="secondary" size="sm" onClick={() => handleActivate(theme)} className="flex-1 min-w-[100px]">
                      {t('activate')}
                    </Button>
                  )}

                  {isThemeActive(theme.slug) && (
                    <Button variant="default" size="sm" onClick={() => handleCustomizeTheme(theme.id)} className="flex-1 min-w-[120px]">
                      {t('customize')}
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={() => handleEditTheme(theme.id)} title={t('edit_icon_title')}>
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleReset(theme)} title={t('reset_icon_title')}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleDuplicate(theme.id)} title={t('duplicate_icon_title')}>
                    <Copy className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(theme)}
                    className="text-red-600 hover:text-red-700"
                    title={isThemeActive(theme.slug) ? t('cannot_delete_active') : t('delete_icon_title')}
                    disabled={isThemeActive(theme.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
