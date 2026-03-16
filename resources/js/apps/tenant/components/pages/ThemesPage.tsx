import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Palette, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { tenantThemes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} description={t('loading_description')} />
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('themes_list', { defaultValue: 'Themes' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {allThemes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {allThemes.map((theme) => {
                const isActive = activeTheme?.id === theme.id || theme.is_active;

                return (
                  <div key={theme.id} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{theme.name}</p>
                        <p className="text-xs text-muted-foreground">{theme.slug}</p>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          <Check className="me-1 h-3 w-3" />
                          {t('active_badge', { defaultValue: 'Active' })}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isActive ? (
                        <Button onClick={() => handleCustomize(theme.id)}>
                          <SlidersHorizontal className="h-4 w-4 me-2" />
                          {t('customize')}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleActivate(theme.slug)}
                          disabled={!canActivate || activatingSlug === theme.slug}
                        >
                          {t('activate')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('no_themes', { defaultValue: 'No themes available.' })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
