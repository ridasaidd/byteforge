import { useEffect } from 'react';
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

// ============================================================================
// Form Schema
// ============================================================================

const settingsSchema = z.object({
  site_title: z.string().min(1, 'Site title is required').max(255),
  site_description: z.string().max(500).nullable().or(z.literal('')),
  logo_url: z.string().url('Must be a valid URL').max(255).nullable().or(z.literal('')),
  favicon_url: z.string().url('Must be a valid URL').max(255).nullable().or(z.literal('')),
  maintenance_mode: z.boolean(),
  // Phase 9.6 — Analytics integrations
  ga4_measurement_id: z.string().max(255).nullable().or(z.literal('')),
  gtm_container_id: z.string().max(255).nullable().or(z.literal('')),
  clarity_project_id: z.string().max(255).nullable().or(z.literal('')),
  plausible_domain: z.string().max(255).nullable().or(z.literal('')),
  meta_pixel_id: z.string().max(255).nullable().or(z.literal('')),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// ============================================================================
// Component
// ============================================================================

export function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        title: 'Settings updated',
        description: 'Your site settings have been saved successfully.',
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description: apiError.response?.data?.message || 'Failed to update settings',
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
        <PageHeader title="Settings" description="Manage your site configuration" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading settings...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your site configuration and integrations"
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic site information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">Site Title</Label>
              <Input id="site_title" placeholder="My Site" {...form.register('site_title')} />
              {form.formState.errors.site_title && (
                <p className="text-sm text-destructive">{form.formState.errors.site_title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_description">Site Description</Label>
              <Input id="site_description" placeholder="A short description of your site" {...form.register('site_description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" placeholder="https://example.com/logo.png" {...form.register('logo_url')} />
              {form.formState.errors.logo_url && (
                <p className="text-sm text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input id="favicon_url" placeholder="https://example.com/favicon.ico" {...form.register('favicon_url')} />
              {form.formState.errors.favicon_url && (
                <p className="text-sm text-destructive">{form.formState.errors.favicon_url.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Site Status */}
        <Card>
          <CardHeader>
            <CardTitle>Site Status</CardTitle>
            <CardDescription>Control public access to your site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, your public site displays a maintenance notice to visitors.
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
              Analytics Integrations
            </CardTitle>
            <CardDescription>
              Third-party analytics scripts injected into your public storefront. Leave blank to disable a provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ga4_measurement_id">Google Analytics 4 — Measurement ID</Label>
              <Input id="ga4_measurement_id" placeholder="G-XXXXXXXXXX" {...form.register('ga4_measurement_id')} />
              <p className="text-sm text-muted-foreground">Found in GA4 › Admin › Data Streams › your stream</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gtm_container_id">Google Tag Manager — Container ID</Label>
              <Input id="gtm_container_id" placeholder="GTM-XXXXXXX" {...form.register('gtm_container_id')} />
              <p className="text-sm text-muted-foreground">Found in GTM › your workspace (top of page)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clarity_project_id">Microsoft Clarity — Project ID</Label>
              <Input id="clarity_project_id" placeholder="xxxxxxxxxx" {...form.register('clarity_project_id')} />
              <p className="text-sm text-muted-foreground">Found in Clarity › Settings › Overview</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plausible_domain">Plausible Analytics — Domain</Label>
              <Input id="plausible_domain" placeholder="yourdomain.com" {...form.register('plausible_domain')} />
              <p className="text-sm text-muted-foreground">The domain you registered in Plausible (without https://)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">Meta Pixel — Pixel ID</Label>
              <Input id="meta_pixel_id" placeholder="000000000000000" {...form.register('meta_pixel_id')} />
              <p className="text-sm text-muted-foreground">Found in Meta Events Manager › your pixel</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending || !form.formState.isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
