import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, BarChart2 } from 'lucide-react';
import { tenantSettings, type UpdateTenantSettingsData } from '@/shared/services/api';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Form Schema
// ============================================================================

type SettingsFormData = {
  site_title: string;
  site_description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  maintenance_mode: boolean;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  clarity_project_id: string | null;
  plausible_domain: string | null;
  meta_pixel_id: string | null;
};

// ============================================================================
// Component
// ============================================================================

export function SettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  const settingsSchema = useMemo(() => z.object({
    site_title: z.string().min(1, t('site_title_required')).max(255, t('site_title_too_long')),
    site_description: z.string().max(500, t('site_description_too_long')).nullable().or(z.literal('')),
    logo_url: z.string().url(t('invalid_url')).max(255, t('url_too_long')).nullable().or(z.literal('')),
    favicon_url: z.string().url(t('invalid_url')).max(255, t('url_too_long')).nullable().or(z.literal('')),
    maintenance_mode: z.boolean(),
    ga4_measurement_id: z.string().max(255).nullable().or(z.literal('')),
    gtm_container_id: z.string().max(255).nullable().or(z.literal('')),
    clarity_project_id: z.string().max(255).nullable().or(z.literal('')),
    plausible_domain: z.string().max(255).nullable().or(z.literal('')),
    meta_pixel_id: z.string().max(255).nullable().or(z.literal('')),
  }), [t]);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const response = await tenantSettings.get();
      return response.data;
    },
    refetchOnMount: 'always',
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTenantSettingsData) => tenantSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({
        title: t('updated_title'),
        description: t('updated_description_tenant'),
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error_title'),
        description: apiError.response?.data?.message || t('error_update'),
        variant: 'destructive',
      });
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      site_title: '',
      site_description: '',
      logo_url: '',
      favicon_url: '',
      maintenance_mode: false,
      ga4_measurement_id: '',
      gtm_container_id: '',
      clarity_project_id: '',
      plausible_domain: '',
      meta_pixel_id: '',
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        site_title: data.site_title,
        site_description: data.site_description || '',
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        maintenance_mode: data.maintenance_mode,
        ga4_measurement_id: data.ga4_measurement_id || '',
        gtm_container_id: data.gtm_container_id || '',
        clarity_project_id: data.clarity_project_id || '',
        plausible_domain: data.plausible_domain || '',
        meta_pixel_id: data.meta_pixel_id || '',
      });
    }
  }, [data, form]);

  const onSubmit = (formData: SettingsFormData) => {
    updateMutation.mutate({
      site_title: formData.site_title,
      site_description: formData.site_description || null,
      logo_url: formData.logo_url || null,
      favicon_url: formData.favicon_url || null,
      maintenance_mode: formData.maintenance_mode,
      ga4_measurement_id: formData.ga4_measurement_id || null,
      gtm_container_id: formData.gtm_container_id || null,
      clarity_project_id: formData.clarity_project_id || null,
      plausible_domain: formData.plausible_domain || null,
      meta_pixel_id: formData.meta_pixel_id || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page_title')} description={t('tenant_description')} />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('loading')}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title')}
        description={t('tenant_description')}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>{t('general')}</CardTitle>
            <CardDescription>{t('general_description_tenant')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">{t('site_title')}</Label>
              <Input id="site_title" placeholder={t('site_title_placeholder')} {...form.register('site_title')} />
              {form.formState.errors.site_title && (
                <p className="text-sm text-destructive">{form.formState.errors.site_title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_description">{t('site_description')}</Label>
              <Input id="site_description" placeholder={t('site_description_placeholder')} {...form.register('site_description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">{t('logo_url')}</Label>
              <Input id="logo_url" placeholder={t('logo_url_placeholder')} {...form.register('logo_url')} />
              {form.formState.errors.logo_url && (
                <p className="text-sm text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon_url">{t('favicon_url')}</Label>
              <Input id="favicon_url" placeholder={t('favicon_url_placeholder')} {...form.register('favicon_url')} />
              {form.formState.errors.favicon_url && (
                <p className="text-sm text-destructive">{form.formState.errors.favicon_url.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Site Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('site_status')}</CardTitle>
            <CardDescription>{t('site_status_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="maintenance_mode">{t('maintenance_mode')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('maintenance_mode_help')}
                </p>
              </div>
              <input
                id="maintenance_mode"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('maintenance_mode')}
                onChange={(e) => form.setValue('maintenance_mode', e.target.checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Analytics Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              {t('analytics_integrations')}
            </CardTitle>
            <CardDescription>
              {t('analytics_integrations_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ga4_measurement_id">{t('ga4_label')}</Label>
              <Input id="ga4_measurement_id" placeholder="G-XXXXXXXXXX" {...form.register('ga4_measurement_id')} />
              <p className="text-sm text-muted-foreground">{t('ga4_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gtm_container_id">{t('gtm_label')}</Label>
              <Input id="gtm_container_id" placeholder="GTM-XXXXXXX" {...form.register('gtm_container_id')} />
              <p className="text-sm text-muted-foreground">{t('gtm_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clarity_project_id">{t('clarity_label')}</Label>
              <Input id="clarity_project_id" placeholder="xxxxxxxxxx" {...form.register('clarity_project_id')} />
              <p className="text-sm text-muted-foreground">{t('clarity_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plausible_domain">{t('plausible_label')}</Label>
              <Input id="plausible_domain" placeholder="yourdomain.com" {...form.register('plausible_domain')} />
              <p className="text-sm text-muted-foreground">{t('plausible_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">{t('meta_pixel_label')}</Label>
              <Input id="meta_pixel_id" placeholder="000000000000000" {...form.register('meta_pixel_id')} />
              <p className="text-sm text-muted-foreground">{t('meta_pixel_help')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending || !form.formState.isDirty}
          >
            <Save className="h-4 w-4 me-2" />
            {updateMutation.isPending ? t('saving') : t('save_changes')}
          </Button>
        </div>
      </form>
    </div>
  );
}
