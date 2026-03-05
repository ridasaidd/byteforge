import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, BarChart2 } from 'lucide-react';
import { api, type UpdateSettingsData } from '@/shared/services/api';
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
  site_name: z.string().min(1, 'Site name is required').max(255, 'Site name is too long'),
  site_active: z.boolean(),
  support_email: z.string().email('Invalid email address').max(255, 'Email is too long').nullable().or(z.literal('')),
  company_name: z.string().max(255, 'Company name is too long').nullable().or(z.literal('')),
  max_tenants_per_user: z.number().int().min(1, 'Must be at least 1').max(100, 'Maximum is 100'),
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
        title: 'Settings updated',
        description: 'General platform settings have been saved successfully.',
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
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Manage platform-wide configuration"
        />
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
        description="Manage platform-wide configuration and policies"
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Basic platform information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                placeholder="ByteForge"
                {...form.register('site_name')}
              />
              {form.formState.errors.site_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.site_name.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                The name of your platform displayed across the application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                placeholder="ByteForge Inc."
                {...form.register('company_name')}
              />
              {form.formState.errors.company_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.company_name.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Your organization or company name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                placeholder="support@byteforge.com"
                {...form.register('support_email')}
              />
              {form.formState.errors.support_email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.support_email.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Email address for customer support inquiries
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>
              Platform-wide operational settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="site_active">Platform Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the entire platform. When disabled, only admins can access the system.
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
              <Label htmlFor="max_tenants_per_user">Max Tenants Per User</Label>
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
                Maximum number of tenants a single user can create (1-100)
              </p>
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
              Third-party analytics scripts injected into the public storefront. Leave blank to disable a provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ga4_measurement_id">Google Analytics 4 — Measurement ID</Label>
              <Input
                id="ga4_measurement_id"
                placeholder="G-XXXXXXXXXX"
                {...form.register('ga4_measurement_id')}
              />
              <p className="text-sm text-muted-foreground">Found in GA4 › Admin › Data Streams › your stream</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gtm_container_id">Google Tag Manager — Container ID</Label>
              <Input
                id="gtm_container_id"
                placeholder="GTM-XXXXXXX"
                {...form.register('gtm_container_id')}
              />
              <p className="text-sm text-muted-foreground">Found in GTM › your workspace (top of page)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clarity_project_id">Microsoft Clarity — Project ID</Label>
              <Input
                id="clarity_project_id"
                placeholder="xxxxxxxxxx"
                {...form.register('clarity_project_id')}
              />
              <p className="text-sm text-muted-foreground">Found in Clarity › Settings › Overview</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plausible_domain">Plausible Analytics — Domain</Label>
              <Input
                id="plausible_domain"
                placeholder="byteforge.com"
                {...form.register('plausible_domain')}
              />
              <p className="text-sm text-muted-foreground">The domain you registered in Plausible (without https://)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">Meta Pixel — Pixel ID</Label>
              <Input
                id="meta_pixel_id"
                placeholder="000000000000000"
                {...form.register('meta_pixel_id')}
              />
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
