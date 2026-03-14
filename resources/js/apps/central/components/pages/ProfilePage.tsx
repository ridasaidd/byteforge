import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { auth } from '@/shared/services/api/auth';
import type { UpdateProfileData, User } from '@/shared/services/api/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { AvatarUpload } from '@/shared/components/molecules/AvatarUpload';
import { LanguageSelector } from '@/shared/components/molecules/LanguageSelector';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Form Schema
// ============================================================================

type ProfileFormData = {
  name: string;
  email: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatRoleName = (role: string | { name: string }): string => {
  const roleName = typeof role === 'string' ? role : role.name;
  return roleName.charAt(0).toUpperCase() + roleName.slice(1);
};

// ============================================================================
// Component
// ============================================================================

export function ProfilePage() {
  const { toast } = useToast();
  const { t } = useTranslation('auth');
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  const profileSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('name_required')).max(255, t('name_too_long')),
        email: z.string().email(t('invalid_email')).max(255, t('email_too_long')),
      }),
    [t]
  );

  // ============================================================================
  // Query to fetch user profile
  // ============================================================================

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await auth.user();
      return response;
    },
    refetchOnMount: 'always',
  });

  // ============================================================================
  // Mutation to update profile
  // ============================================================================

  const updateMutation = useMutation({
  mutationFn: (data: UpdateProfileData) => auth.updateProfile(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] }); // Refresh activity log
      // Update auth context
      queryClient.setQueryData(['profile'], response.user);
      toast({
        title: t('profile_updated_title'),
        description: t('profile_updated_description'),
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error_title'),
        description: apiError.response?.data?.message || t('failed_update_profile'),
        variant: 'destructive',
      });
    },
  });

  // ============================================================================
  // Avatar Mutations
  // ============================================================================

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  const uploadAvatarMutation = useMutation<{ user: User; avatar_url: string }, unknown, File>({
  mutationFn: (file: File) => auth.uploadAvatar(file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.setQueryData(['profile'], response.user);
      refetchUser(); // Refresh auth context to update navbar avatar
      setIsUploadingAvatar(false);
      toast({
        title: t('avatar_updated_title'),
        description: t('avatar_updated_description'),
      });
    },
    onError: (error: unknown) => {
      setIsUploadingAvatar(false);
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error_title'),
        description: apiError.response?.data?.message || t('failed_upload_avatar'),
        variant: 'destructive',
      });
    },
  });

  const deleteAvatarMutation = useMutation<{ user: User }, unknown, void>({
  mutationFn: () => auth.deleteAvatar(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.setQueryData(['profile'], response.user);
      refetchUser(); // Refresh auth context to update navbar avatar
      setIsDeletingAvatar(false);
      toast({
        title: t('avatar_deleted_title'),
        description: t('avatar_deleted_description'),
      });
    },
    onError: (error: unknown) => {
      setIsDeletingAvatar(false);
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error_title'),
        description: apiError.response?.data?.message || t('failed_delete_avatar'),
        variant: 'destructive',
      });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    uploadAvatarMutation.mutate(file);
  };

  const handleAvatarDelete = async () => {
    setIsDeletingAvatar(true);
    deleteAvatarMutation.mutate();
  };

  // ============================================================================
  // Form Setup
  // ============================================================================

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, form]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const onSubmit = (formData: ProfileFormData) => {
    updateMutation.mutate(formData);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('profile_title')}
          description={t('profile_manage_description')}
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('loading_profile')}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('profile_title')}
        description={t('profile_description')}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t('account_info')}</CardTitle>
            <CardDescription>{t('account_details')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload
              currentAvatar={user?.avatar ?? null}
              onUpload={handleAvatarUpload}
              onDelete={handleAvatarDelete}
              isUploading={isUploadingAvatar}
              isDeleting={isDeletingAvatar}
              size="lg"
            />

            <div className="space-y-2 text-center">
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {user?.roles && user.roles.length > 0 && (
              <div className="space-y-2">
                <Label>{t('roles')}</Label>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role, index) => (
                    <Badge key={index} variant="secondary">
                      {formatRoleName(role)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-2 text-sm text-muted-foreground border-t">
              <div className="flex justify-between">
                <span>{t('account_created')}</span>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : t('na')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('last_updated')}</span>
                <span>{user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : t('na')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('edit_profile')}</CardTitle>
            <CardDescription>
              {t('update_profile_information')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('full_name')}</Label>
                <Input
                  id="name"
                  placeholder={t('full_name_placeholder')}
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('full_name_help')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email_address')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('email_address_placeholder')}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('email_address_help')}
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                >
                  <Save className="h-4 w-4 me-2" />
                  {updateMutation.isPending ? t('saving') : t('save_changes')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Language Preference */}
      <Card>
        <CardHeader>
          <CardTitle>{t('language_title')}</CardTitle>
          <CardDescription>{t('language_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelector />
        </CardContent>
      </Card>
    </div>
  );
}
