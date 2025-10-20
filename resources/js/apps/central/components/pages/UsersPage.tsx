import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { api, type User, type CreateUserData, type UpdateUserData } from '@/shared/services/api';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { FormModal, type FormField } from '@/shared/components/organisms/FormModal';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

// ============================================================================
// Form Schemas
// ============================================================================

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string().min(8, 'Password confirmation is required'),
  role: z.enum(['admin', 'support', 'viewer'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  role: z.enum(['admin', 'support', 'viewer'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
});

// ============================================================================
// Form Fields
// ============================================================================

const createFormFields: FormField[] = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
    required: true,
    description: 'The full name of the user',
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    description: 'User email for login and notifications',
  },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    description: 'User access level',
    options: [
      { value: 'admin', label: 'Admin - Full system access' },
      { value: 'support', label: 'Support - View and assist tenants' },
      { value: 'viewer', label: 'Viewer - Read-only access' },
    ],
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    required: true,
    description: 'Minimum 8 characters',
  },
  {
    name: 'password_confirmation',
    label: 'Confirm Password',
    type: 'password',
    placeholder: '••••••••',
    required: true,
    description: 'Must match password',
  },
];

const updateFormFields: FormField[] = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
    required: true,
    description: 'The full name of the user',
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    description: 'User email for login and notifications',
  },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    description: 'User access level',
    options: [
      { value: 'admin', label: 'Admin - Full system access' },
      { value: 'support', label: 'Support - View and assist tenants' },
      { value: 'viewer', label: 'Viewer - Read-only access' },
    ],
  },
];

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

const getRoleName = (roles: string[] | { name: string }[] | undefined): string => {
  if (!roles || roles.length === 0) return 'viewer';
  const first = roles[0] as unknown;
  if (typeof first === 'string') return (first as string) || 'viewer';
  return (first as { name: string })?.name || 'viewer';
};

// ============================================================================
// Component
// ============================================================================

export function UsersPage() {
  const { toast } = useToast();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const users = useCrud<User, CreateUserData, UpdateUserData>({
    resource: 'users',
    apiService: api.users,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: z.infer<typeof createUserSchema>) => {
    try {
      users.create.mutate(data);
      toast({
        title: 'User created',
        description: `${data.name} has been added as ${data.role}.`,
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof updateUserSchema>) => {
    if (!editingUser) return;

    try {
      users.update.mutate({ id: editingUser.id, data });
      toast({
        title: 'User updated',
        description: `${data.name}'s profile has been updated.`,
      });
      setEditingUser(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      users.delete.mutate(deletingUser.id);
      toast({
        title: 'User deleted',
        description: `${deletingUser.name} has been removed from the system.`,
      });
      setDeletingUser(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
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
      label: 'Name',
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
      label: 'Role',
      render: (user) => {
  const role = getRoleName(user.roles) || 'viewer';
        return (
          <Badge variant={getRoleColor(role)}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString('en-US', {
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
        title="Users"
        description="Manage central admin users and their access levels"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        }
      />

      <DataTable<User>
        data={users.list.data?.data || []}
        columns={columns}
        isLoading={users.list.isLoading}
        emptyMessage="No users found"
        emptyDescription="Create your first admin user to get started"
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
        title="Create User"
        description="Add a new admin user to the system"
        fields={createFormFields}
        schema={createUserSchema}
        isLoading={users.create.isPending}
        submitText="Create User"
      />

      {/* Edit Modal */}
      <FormModal
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleUpdate}
        title="Edit User"
        description="Update user information and role"
        fields={updateFormFields}
        schema={updateUserSchema}
        defaultValues={editDefaultValues}
        isLoading={users.update.isPending}
        submitText="Save Changes"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description={
          <>
            Are you sure you want to delete <strong>{deletingUser?.name}</strong>?
            {' '}This action cannot be undone. The user will lose access to the central admin dashboard.
          </>
        }
        confirmText="Delete User"
        variant="destructive"
        isLoading={users.delete.isPending}
      />
    </div>
  );
}
