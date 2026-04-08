import { useState } from 'react';
import { Pencil, Check, X, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tenantUsers } from '@/shared/services/api/tenantUsers';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
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

const getMembershipRole = (roles: User['roles'] | undefined): string | null => {
  if (!roles || roles.length === 0) return null;
  const first = roles[0];
  if (typeof first === 'string') return null;
  return typeof first.membership_role === 'string' ? first.membership_role : null;
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
  const canManage = hasPermission('users.manage');

  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [pendingRole, setPendingRole] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'viewer',
  });

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
  const currentMembershipRole = getMembershipRole(usersQuery.data?.data?.find((u) => Number(u.id) === Number(currentUser?.id))?.roles);
  const canOwnerManageUsers = canManage && currentMembershipRole === 'owner';

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

  const createUser = useMutation({
    mutationFn: () => tenantUsers.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-users'] });
      setCreateOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'viewer',
      });
      toast({ title: t('user_created_title') });
    },
    onError: (err) => {
      toast({
        title: t('error_title'),
        description: err instanceof Error ? err.message : t('create_failed'),
        variant: 'destructive',
      });
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

        if (canOwnerManageUsers && editingUserId === user.id) {
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

  const actions = canOwnerManageUsers
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
        actions={canOwnerManageUsers ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('create_user')}
          </Button>
        ) : undefined}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('create_user_title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="staff-name">{t('full_name')}</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('full_name_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">{t('email_address')}</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={t('email_placeholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-password">{t('password')}</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t('password_placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password-confirm">{t('confirm_password')}</Label>
                <Input
                  id="staff-password-confirm"
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                  placeholder={t('password_placeholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={form.role} onValueChange={(role) => setForm((prev) => ({ ...prev, role }))}>
                <SelectTrigger>
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel', { ns: 'access', defaultValue: 'Cancel' })}
            </Button>
            <Button
              disabled={createUser.isPending || !form.name || !form.email || !form.password || !form.password_confirmation}
              onClick={() => createUser.mutate()}
            >
              {t('create_user')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
