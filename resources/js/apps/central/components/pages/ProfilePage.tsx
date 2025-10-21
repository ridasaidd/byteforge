import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { api, type UpdateProfileData } from '@/shared/services/api';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks';

// ============================================================================
// Form Schema
// ============================================================================

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

const getRoleName = (role: string | { name: string }): string => {
  if (typeof role === 'string') return role;
  return role.name;
};

// ============================================================================
// Component
// ============================================================================

export function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ============================================================================
  // Query to fetch user profile
  // ============================================================================

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.auth.user();
      return response;
    },
    refetchOnMount: 'always',
  });

  // ============================================================================
  // Mutation to update profile
  // ============================================================================

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => api.auth.updateProfile(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] }); // Refresh activity log
      // Update auth context
      queryClient.setQueryData(['profile'], response.user);
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved successfully.',
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description: apiError.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

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
          title="Profile"
          description="Manage your profile information"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading profile...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal information and account details"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                {user?.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {user?.roles && user.roles.length > 0 && (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role, index) => {
                    const roleName = getRoleName(role);
                    return (
                      <Badge key={index} variant="secondary">
                        {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-2 text-sm text-muted-foreground border-t">
              <div className="flex justify-between">
                <span>Account created</span>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last updated</span>
                <span>{user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Your full name as it appears in the system
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Your email address for login and notifications
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
