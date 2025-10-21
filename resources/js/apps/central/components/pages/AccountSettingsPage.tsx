import { useForm } from 'react-hook-form';
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

// ============================================================================
// Form Schema
// ============================================================================

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string().min(8, 'Password confirmation is required'),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// ============================================================================
// Component
// ============================================================================

export function AccountSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ============================================================================
  // Mutation to update password
  // ============================================================================

  const updatePasswordMutation = useMutation({
    mutationFn: (data: UpdatePasswordData) => api.auth.updatePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] }); // Refresh activity log
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
      form.reset();
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMessage = apiError.response?.data?.errors?.current_password?.[0] 
        || apiError.response?.data?.message 
        || 'Failed to update password';
      
      toast({
        title: 'Error',
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
        title="Account Settings"
        description="Manage your account security and preferences"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
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
                <Label htmlFor="password">New Password</Label>
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
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm New Password</Label>
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
                  <Save className="h-4 w-4 mr-2" />
                  {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security Tips</CardTitle>
            <CardDescription>
              Keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  1
                </div>
                <p className="text-muted-foreground">
                  Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  2
                </div>
                <p className="text-muted-foreground">
                  Never share your password with anyone, including support staff.
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  3
                </div>
                <p className="text-muted-foreground">
                  Change your password regularly and avoid reusing old passwords.
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  4
                </div>
                <p className="text-muted-foreground">
                  Use a unique password for this account - don't use the same password across multiple sites.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
