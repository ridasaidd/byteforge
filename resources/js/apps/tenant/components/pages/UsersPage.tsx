import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tenantUsers } from '@/shared/services/api/tenantUsers';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useAuth } from '@/shared/hooks/useAuth';
import type { User } from '@/shared/services/api/types';

// ============================================================================
// Helpers
// ============================================================================

const getRoleColor = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (role) {
    case 'admin':   return 'destructive';
    case 'support': return 'secondary';
    case 'owner':   return 'default';
    default:        return 'outline';
  }
};

const getRoleName = (roles: (string | { name: string })[] | undefined): string => {
  if (!roles || roles.length === 0) return 'viewer';
  const first = roles[0];
  return typeof first === 'string' ? first || 'viewer' : (first?.name || 'viewer');
};

// ============================================================================
// Component
// ============================================================================

export function UsersPage() {
  const { t, i18n } = useTranslation('users');
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const { user: currentUser } = useAuth();
  const canManage = hasPermission('manage users');

  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [pendingRole, setPendingRole] = useState<string>('');

  // Fetch tenant members
  const usersQuery = useQuery({
    queryKey: ['tenant-users', page],
    queryFn: () => tenantUsers.list({ page }),
  });

  // Fetch available roles
  const rolesQuery = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: () => tenantUsers.listRoles(),
    enabled: canManage,
  });

  const availableRoles = rolesQuery.data?.data?.map((r) => r.name) ?? ['admin', 'support', 'viewer'];

  // Assign role mutation (syncRoles backend — replaces all existing roles)
  const assignRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      tenantUsers.assignRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-users'] });
      setEditingUserId(null);
      toast({ title: t('user_updated_title') });
    },
    onError: () => {
      toast({ title: t('error_title'), variant: 'destructive' });
    },
  });

  // ============================================================================
  // Table configuration
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
        const role = getRoleName(user.roles);

        if (canManage && editingUserId === user.id) {
          return (
            <div className="flex items-center gap-2">
              <Select value={pendingRole} onValueChange={setPendingRole}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`role_${r}`, { defaultValue: r })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={assignRole.isPending}
                onClick={() => assignRole.mutate({ userId: user.id, role: pendingRole })}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditingUserId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }

        return (
          <Badge variant={getRoleColor(role)}>
            {t(`role_${role}`, { defaultValue: role })}
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

  const actions = canManage
    ? (user: User) => (
        Number(user.id) === Number(currentUser?.id) ? null : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditingUserId(user.id);
            setPendingRole(getRoleName(user.roles));
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        )
      )
    : undefined;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title')}
        description={t('page_description')}
      />

      <DataTable<User>
        data={usersQuery.data?.data ?? []}
        columns={columns}
        isLoading={usersQuery.isLoading}
        emptyMessage={t('empty_title')}
        emptyDescription={t('empty_description')}
        actions={actions}
        currentPage={usersQuery.data?.meta?.current_page}
        totalPages={usersQuery.data?.meta?.last_page}
        onPageChange={setPage}
      />
    </div>
  );
}
