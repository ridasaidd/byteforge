import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, BarChart2, Cookie } from 'lucide-react';
import { api, type UpdateSettingsData } from '@/shared/services/api';
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
  site_name: string;
  site_active: boolean;
  support_email: string | null;
  company_name: string | null;
  max_tenants_per_user: number;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  clarity_project_id: string | null;
  plausible_domain: string | null;
  meta_pixel_id: string | null;
  privacy_policy_url: string | null;
  cookie_policy_url: string | null;
  ga4_enabled: boolean;
  gtm_enabled: boolean;
  clarity_enabled: boolean;
  plausible_enabled: boolean;
  meta_pixel_enabled: boolean;
};

// ============================================================================
// Component
// ============================================================================

export function SettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  const settingsSchema = useMemo(() => z.object({
    site_name: z.string().min(1, t('site_name_required')).max(255, t('site_name_too_long')),
    site_active: z.boolean(),
    support_email: z.string().email(t('invalid_email')).max(255, t('email_too_long')).nullable().or(z.literal('')),
    company_name: z.string().max(255, t('company_name_too_long')).nullable().or(z.literal('')),
    max_tenants_per_user: z.number().int().min(1, t('min_tenants')).max(100, t('max_tenants')),
    ga4_measurement_id: z.string().max(255).nullable().or(z.literal('')),
    gtm_container_id: z.string().max(255).nullable().or(z.literal('')),
    clarity_project_id: z.string().max(255).nullable().or(z.literal('')),
    plausible_domain: z.string().max(255).nullable().or(z.literal('')),
    meta_pixel_id: z.string().max(255).nullable().or(z.literal('')),
    privacy_policy_url: z.string().url(t('invalid_url')).max(500, t('url_too_long')).nullable().or(z.literal('')),
    cookie_policy_url: z.string().url(t('invalid_url')).max(500, t('url_too_long')).nullable().or(z.literal('')),
    ga4_enabled: z.boolean(),
    gtm_enabled: z.boolean(),
    clarity_enabled: z.boolean(),
    plausible_enabled: z.boolean(),
    meta_pixel_enabled: z.boolean(),
  }), [t]);

  // ============================================================================
  // Query to fetch settings
  // ============================================================================

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.settings.get();
      return response.data;
    },
    refetchOnMount: 'always',
  });

  // ============================================================================
  // Mutation to update settings
  // ============================================================================

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingsData) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] }); // Refresh activity log
      toast({
        title: t('updated_title'),
        description: t('updated_description_central'),
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

  // ============================================================================
  // Form Setup
  // ============================================================================

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      site_name: '',
      site_active: true,
      support_email: '',
      company_name: '',
      max_tenants_per_user: 5,
      ga4_measurement_id: '',
      gtm_container_id: '',
      clarity_project_id: '',
      plausible_domain: '',
      meta_pixel_id: '',
      privacy_policy_url: '',
      cookie_policy_url: '',
      ga4_enabled: false,
      gtm_enabled: false,
      clarity_enabled: false,
      plausible_enabled: false,
      meta_pixel_enabled: false,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      form.reset({
        site_name: data.site_name,
        site_active: data.site_active,
        support_email: data.support_email || '',
        company_name: data.company_name || '',
        max_tenants_per_user: data.max_tenants_per_user,
        ga4_measurement_id: data.ga4_measurement_id || '',
        gtm_container_id: data.gtm_container_id || '',
        clarity_project_id: data.clarity_project_id || '',
        plausible_domain: data.plausible_domain || '',
        meta_pixel_id: data.meta_pixel_id || '',
        privacy_policy_url: data.privacy_policy_url || '',
        cookie_policy_url: data.cookie_policy_url || '',
        ga4_enabled: Boolean(data.ga4_enabled),
        gtm_enabled: Boolean(data.gtm_enabled),
        clarity_enabled: Boolean(data.clarity_enabled),
        plausible_enabled: Boolean(data.plausible_enabled),
        meta_pixel_enabled: Boolean(data.meta_pixel_enabled),
      });
    }
  }, [data, form]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const onSubmit = (formData: SettingsFormData) => {
    updateMutation.mutate({
      site_name: formData.site_name,
      site_active: formData.site_active,
      support_email: formData.support_email || null,
      company_name: formData.company_name || null,
      max_tenants_per_user: formData.max_tenants_per_user,
      ga4_measurement_id: formData.ga4_measurement_id || null,
      gtm_container_id: formData.gtm_container_id || null,
      clarity_project_id: formData.clarity_project_id || null,
      plausible_domain: formData.plausible_domain || null,
      meta_pixel_id: formData.meta_pixel_id || null,
      privacy_policy_url: formData.privacy_policy_url || null,
      cookie_policy_url: formData.cookie_policy_url || null,
      ga4_enabled: formData.ga4_enabled,
      gtm_enabled: formData.gtm_enabled,
      clarity_enabled: formData.clarity_enabled,
      plausible_enabled: formData.plausible_enabled,
      meta_pixel_enabled: formData.meta_pixel_enabled,
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('page_title')}
          description={t('central_description')}
        />
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
        description={t('central_description')}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('general')}</CardTitle>
            <CardDescription>
              {t('general_description_central')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">{t('site_name')}</Label>
              <Input
                id="site_name"
                placeholder={t('site_name_placeholder')}
                {...form.register('site_name')}
              />
              {form.formState.errors.site_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.site_name.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('site_name_help')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">{t('company_name')}</Label>
              <Input
                id="company_name"
                placeholder={t('company_name_placeholder')}
                {...form.register('company_name')}
              />
              {form.formState.errors.company_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.company_name.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('company_name_help')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email">{t('support_email')}</Label>
              <Input
                id="support_email"
                type="email"
                placeholder={t('support_email_placeholder')}
                {...form.register('support_email')}
              />
              {form.formState.errors.support_email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.support_email.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('support_email_help')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('platform')}</CardTitle>
            <CardDescription>
              {t('platform_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="site_active">{t('platform_active')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('platform_active_help')}
                </p>
              </div>
              <input
                id="site_active"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('site_active')}
                onChange={(e) => form.setValue('site_active', e.target.checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_tenants_per_user">{t('max_tenants_per_user')}</Label>
              <Input
                id="max_tenants_per_user"
                type="number"
                min="1"
                max="100"
                {...form.register('max_tenants_per_user', { valueAsNumber: true })}
              />
              {form.formState.errors.max_tenants_per_user && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.max_tenants_per_user.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('max_tenants_per_user_help')}
              </p>
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
              <Input
                id="ga4_measurement_id"
                placeholder="G-XXXXXXXXXX"
                {...form.register('ga4_measurement_id')}
              />
              <p className="text-sm text-muted-foreground">{t('ga4_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gtm_container_id">{t('gtm_label')}</Label>
              <Input
                id="gtm_container_id"
                placeholder="GTM-XXXXXXX"
                {...form.register('gtm_container_id')}
              />
              <p className="text-sm text-muted-foreground">{t('gtm_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clarity_project_id">{t('clarity_label')}</Label>
              <Input
                id="clarity_project_id"
                placeholder="xxxxxxxxxx"
                {...form.register('clarity_project_id')}
              />
              <p className="text-sm text-muted-foreground">{t('clarity_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plausible_domain">{t('plausible_label')}</Label>
              <Input
                id="plausible_domain"
                placeholder="byteforge.com"
                {...form.register('plausible_domain')}
              />
              <p className="text-sm text-muted-foreground">{t('plausible_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">{t('meta_pixel_label')}</Label>
              <Input
                id="meta_pixel_id"
                placeholder="000000000000000"
                {...form.register('meta_pixel_id')}
              />
              <p className="text-sm text-muted-foreground">{t('meta_pixel_help')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cookie Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              {t('cookie_consent')}
            </CardTitle>
            <CardDescription>
              {t('cookie_consent_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privacy_policy_url">{t('privacy_policy_url')}</Label>
              <Input
                id="privacy_policy_url"
                placeholder="https://example.com/privacy"
                {...form.register('privacy_policy_url')}
              />
              <p className="text-sm text-muted-foreground">{t('privacy_policy_url_help')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookie_policy_url">{t('cookie_policy_url')}</Label>
              <Input
                id="cookie_policy_url"
                placeholder="https://example.com/cookies"
                {...form.register('cookie_policy_url')}
              />
              <p className="text-sm text-muted-foreground">{t('cookie_policy_url_help')}</p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="ga4_enabled">{t('ga4_enabled')}</Label>
              <input
                id="ga4_enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('ga4_enabled')}
                onChange={(e) => form.setValue('ga4_enabled', e.target.checked, { shouldDirty: true })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="gtm_enabled">{t('gtm_enabled')}</Label>
              <input
                id="gtm_enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('gtm_enabled')}
                onChange={(e) => form.setValue('gtm_enabled', e.target.checked, { shouldDirty: true })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="clarity_enabled">{t('clarity_enabled')}</Label>
              <input
                id="clarity_enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('clarity_enabled')}
                onChange={(e) => form.setValue('clarity_enabled', e.target.checked, { shouldDirty: true })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="plausible_enabled">{t('plausible_enabled')}</Label>
              <input
                id="plausible_enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('plausible_enabled')}
                onChange={(e) => form.setValue('plausible_enabled', e.target.checked, { shouldDirty: true })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="meta_pixel_enabled">{t('meta_pixel_enabled')}</Label>
              <input
                id="meta_pixel_enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch('meta_pixel_enabled')}
                onChange={(e) => form.setValue('meta_pixel_enabled', e.target.checked, { shouldDirty: true })}
              />
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
