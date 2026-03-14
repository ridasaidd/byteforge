import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Lock } from 'lucide-react';
import { api, type UpdatePasswordData } from '@/shared/services/api';
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

type PasswordFormData = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

// ============================================================================
// Component
// ============================================================================

export function AccountSettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('auth');
  const queryClient = useQueryClient();

  const passwordSchema = useMemo(
    () =>
      z.object({
        current_password: z.string().min(1, t('current_password_required')),
        password: z.string().min(8, t('password_min')),
        password_confirmation: z.string().min(8, t('password_confirmation_required')),
      }).refine((data) => data.password === data.password_confirmation, {
        message: t('passwords_do_not_match'),
        path: ['password_confirmation'],
      }),
    [t]
  );

  // ============================================================================
  // Mutation to update password
  // ============================================================================

  const updatePasswordMutation = useMutation({
    mutationFn: (data: UpdatePasswordData) => api.auth.updatePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] }); // Refresh activity log
      toast({
        title: t('password_updated_title'),
        description: t('password_updated_description'),
      });
      form.reset();
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMessage = apiError.response?.data?.errors?.current_password?.[0]
        || apiError.response?.data?.message
        || t('failed_update_password');

      toast({
        title: t('error_title'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // ============================================================================
  // Form Setup
  // ============================================================================

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const onSubmit = (formData: PasswordFormData) => {
    updatePasswordMutation.mutate(formData);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('account_settings')}
        description={t('account_settings_description')}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>{t('change_password')}</CardTitle>
            </div>
            <CardDescription>
              {t('change_password_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">{t('current_password')}</Label>
                <Input
                  id="current_password"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('current_password')}
                />
                {form.formState.errors.current_password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('new_password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('password_min_hint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">{t('confirm_new_password')}</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('password_confirmation')}
                />
                {form.formState.errors.password_confirmation && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password_confirmation.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending || !form.formState.isDirty}
                >
                  <Save className="h-4 w-4 me-2" />
                  {updatePasswordMutation.isPending ? t('updating') : t('update_password')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('security_tips')}</CardTitle>
            <CardDescription>
              {t('security_tips_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  1
                </div>
                <p className="text-muted-foreground">
                  {t('security_tip_1')}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  2
                </div>
                <p className="text-muted-foreground">
                  {t('security_tip_2')}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  3
                </div>
                <p className="text-muted-foreground">
                  {t('security_tip_3')}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  4
                </div>
                <p className="text-muted-foreground">
                  {t('security_tip_4')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
