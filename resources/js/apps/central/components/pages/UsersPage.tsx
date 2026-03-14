import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import { api, type User, type CreateUserData, type UpdateUserData } from '@/shared/services/api';
import { rolesApi } from '@/shared/services/rolesPermissionsApi';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { FormModal } from '@/shared/components/organisms/FormModal';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

// ============================================================================
// Schemas and Fields (will be built dynamically inside component with roleNames)
// ============================================================================

// ============================================================================
// Helper Functions
// ============================================================================

const getRoleColor = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'support':
      return 'secondary';
    case 'viewer':
      return 'outline';
    default:
      return 'default';
  }
};

const getRoleName = (roles: (string | { name: string })[] | undefined): string => {
  if (!roles || roles.length === 0) return 'viewer';
  const first = roles[0];
  if (typeof first === 'string') return first || 'viewer';
  return first?.name || 'viewer';
};

// ============================================================================
// Component
// ============================================================================

export function UsersPage() {
  const { t, i18n } = useTranslation('users');
  const { toast } = useToast();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Fetch dynamic roles
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  // Transform roles to select options
  const roleOptions = useMemo(() => {
    if (!rolesQuery.data) return [];
    return rolesQuery.data.map((role) => ({
      value: role.name,
      label: t(`role_${role.name}`),
    }));
  }, [rolesQuery.data, t]);

  // Dynamic role names for validation
  const roleNames = useMemo(() => rolesQuery.data?.map(r => r.name) ?? [], [rolesQuery.data]);

  // Dynamic schemas
  const createUserSchema = useMemo(() => {
    const roleEnum = roleNames.length > 0 ? roleNames : ['admin', 'support', 'viewer'];
    return z.object({
      name: z.string().min(1, t('name_required')).max(255, t('name_too_long')),
      email: z.string().email(t('invalid_email')).max(255, t('email_too_long')),
      password: z.string().min(8, t('password_min')),
      password_confirmation: z.string().min(8, t('password_confirmation_required')),
      role: z.enum(roleEnum as [string, ...string[]], { errorMap: () => ({ message: t('select_role') }) }),
    }).refine((data) => data.password === data.password_confirmation, {
      message: t('passwords_do_not_match'),
      path: ['password_confirmation'],
    });
  }, [roleNames, t]);

  const updateUserSchema = useMemo(() => {
    const roleEnum = roleNames.length > 0 ? roleNames : ['admin', 'support', 'viewer'];
    return z.object({
      name: z.string().min(1, t('name_required')).max(255, t('name_too_long')),
      email: z.string().email(t('invalid_email')).max(255, t('email_too_long')),
      role: z.enum(roleEnum as [string, ...string[]], { errorMap: () => ({ message: t('select_role') }) }),
    });
  }, [roleNames, t]);

  // Dynamic form fields
  const createFormFields = useMemo(() => [
    {
      name: 'name',
      label: t('full_name'),
      type: 'text' as const,
      placeholder: t('full_name_placeholder'),
      required: true,
      description: t('full_name_description'),
    },
    {
      name: 'email',
      label: t('email_address'),
      type: 'email' as const,
      placeholder: t('email_placeholder'),
      required: true,
      description: t('email_description'),
    },
    {
      name: 'role',
      label: t('role'),
      type: 'select' as const,
      required: true,
      description: t('user_access_level'),
      options: roleOptions,
    },
    {
      name: 'password',
      label: t('password'),
      type: 'password' as const,
      placeholder: t('password_placeholder'),
      required: true,
      description: t('password_description'),
    },
    {
      name: 'password_confirmation',
      label: t('confirm_password'),
      type: 'password' as const,
      placeholder: t('password_placeholder'),
      required: true,
      description: t('confirm_password_description'),
    },
  ], [roleOptions, t]);

  const updateFormFields = useMemo(() => [
    {
      name: 'name',
      label: t('full_name'),
      type: 'text' as const,
      placeholder: t('full_name_placeholder'),
      required: true,
      description: t('full_name_description'),
    },
    {
      name: 'email',
      label: t('email_address'),
      type: 'email' as const,
      placeholder: t('email_placeholder'),
      required: true,
      description: t('email_description'),
    },
    {
      name: 'role',
      label: t('role'),
      type: 'select' as const,
      required: true,
      description: t('user_access_level'),
      options: roleOptions,
    },
  ], [roleOptions, t]);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const users = useCrud<User, CreateUserData, UpdateUserData>({
    resource: 'users',
    apiService: api.users,
    invalidateRelated: ['activity'], // Refresh activity log when users change
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: z.infer<typeof createUserSchema>) => {
    try {
      users.create.mutate(data);
      toast({
        title: t('user_created_title'),
        description: t('user_created_description', {
          name: data.name,
          role: t(`role_${data.role}`),
        }),
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof updateUserSchema>) => {
    if (!editingUser) return;

    try {
      users.update.mutate({ id: editingUser.id, data });
      toast({
        title: t('user_updated_title'),
        description: t('user_updated_description', { name: data.name }),
      });
      setEditingUser(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      users.delete.mutate(deletingUser.id);
      toast({
        title: t('user_deleted_title'),
        description: t('user_deleted_description', { name: deletingUser.name }),
      });
      setDeletingUser(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('delete_failed'),
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // Table Configuration
  // ============================================================================

  const columns: Column<User>[] = [
    {
      key: 'name',
      label: t('name'),
      sortable: true,
      render: (user) => (
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('role'),
      render: (user) => {
  const role = getRoleName(user.roles) || 'viewer';
        return (
          <Badge variant={getRoleColor(role)}>
            {t(`role_${role}`)}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      label: t('joined'),
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
  ];

  const actions = (user: User) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setEditingUser(user);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setDeletingUser(user);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  // Prepare edit form default values (map role from roles array)
  const editDefaultValues = editingUser
    ? {
        name: editingUser.name,
        email: editingUser.email,
        role: getRoleName(editingUser.roles) as 'admin' | 'support' | 'viewer',
      }
    : undefined;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title')}
        description={t('page_description')}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('create_user')}
          </Button>
        }
      />

      <DataTable<User>
        data={users.list.data?.data || []}
        columns={columns}
        isLoading={users.list.isLoading}
        emptyMessage={t('empty_title')}
        emptyDescription={t('empty_description')}
        actions={actions}
        currentPage={users.list.data?.meta.current_page}
        totalPages={users.list.data?.meta.last_page}
        onPageChange={users.pagination.setPage}
      />

      {/* Create Modal */}
      <FormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        title={t('create_user_title')}
        description={t('create_user_description')}
        fields={createFormFields}
        schema={createUserSchema}
        isLoading={users.create.isPending}
        submitText={t('create_user')}
      />

      {/* Edit Modal */}
      <FormModal
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleUpdate}
        title={t('edit_user_title')}
        description={t('edit_user_description')}
        fields={updateFormFields}
        schema={updateUserSchema}
        defaultValues={editDefaultValues}
        isLoading={users.update.isPending}
        submitText={t('save_changes')}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleDelete}
        title={t('delete_user_title')}
        description={
          <Trans
            ns="users"
            i18nKey="delete_user_confirm"
            values={{ name: deletingUser?.name ?? '' }}
            components={{ strong: <strong /> }}
          />
        }
        confirmText={t('delete_user')}
        variant="destructive"
        isLoading={users.delete.isPending}
      />
    </div>
  );
}
