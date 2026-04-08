import { useMemo, useState } from 'react';
import { Shield, KeyRound, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { tenantUsers } from '@/shared/services/api/tenantUsers';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

const FIXED_ROLES = new Set(['admin', 'support', 'viewer']);

export function RolesPermissionsPage() {
  const { t } = useTranslation(['access', 'common']);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission('roles.manage');
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Set<string>>(new Set());
  const [deleteRoleId, setDeleteRoleId] = useState<number | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['tenant-roles-with-permissions'],
    queryFn: () => tenantUsers.listRoles(),
    select: (response) => response.data,
  });

  const permissionsQuery = useQuery({
    queryKey: ['tenant-role-permissions'],
    queryFn: () => tenantUsers.listPermissions(),
    select: (response) => response.data,
  });

  const createRole = useMutation({
    mutationFn: () => tenantUsers.createRole({
      name: newRoleName.trim(),
      permissions: [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-roles-with-permissions'] });
      setNewRoleName('');
      toast({ title: t('role_created', { ns: 'access' }) });
    },
    onError: (err) => {
      toast({
        title: t('failed_create_role', { ns: 'access' }),
        description: err instanceof Error ? err.message : t('unknown_error', { ns: 'access' }),
        variant: 'destructive',
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: (roleId: number) => tenantUsers.updateRole(roleId, {
      name: editingRoleName.trim(),
      permissions: Array.from(editingPermissions),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-roles-with-permissions'] });
      setEditingRoleId(null);
      setEditingRoleName('');
      setEditingPermissions(new Set());
      toast({ title: t('role_updated', { ns: 'access' }) });
    },
    onError: (err) => {
      toast({
        title: t('failed_update_role', { ns: 'access' }),
        description: err instanceof Error ? err.message : t('unknown_error', { ns: 'access' }),
        variant: 'destructive',
      });
    },
  });

  const deleteRole = useMutation({
    mutationFn: (roleId: number) => tenantUsers.deleteRole(roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-roles-with-permissions'] });
      setDeleteRoleId(null);
      toast({ title: t('role_deleted', { ns: 'access' }) });
    },
    onError: (err) => {
      toast({
        title: t('failed_delete_role', { ns: 'access' }),
        description: err instanceof Error ? err.message : t('unknown_error', { ns: 'access' }),
        variant: 'destructive',
      });
    },
  });

  const deleteRoleItem = useMemo(
    () => rolesQuery.data?.find((r) => r.id === deleteRoleId) ?? null,
    [rolesQuery.data, deleteRoleId],
  );

  const startEditRole = (role: { id: number; name: string; permissions?: Array<{ name: string }> }) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingPermissions(new Set((role.permissions ?? []).map((p) => p.name)));
  };

  const togglePermission = (permName: string) => {
    setEditingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permName)) {
        next.delete(permName);
      } else {
        next.add(permName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title', { ns: 'access' })}
        description={t('page_description', { ns: 'access' })}
        actions={(
          <div className="flex items-center gap-2">
            {canManageRoles && (
              <div className="flex items-center gap-2">
                <Input
                  className="w-48"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder={t('new_role_placeholder', { ns: 'access' })}
                />
                <Button
                  onClick={() => createRole.mutate()}
                  disabled={createRole.isPending || !newRoleName.trim()}
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('create_role', { ns: 'access' })}
                </Button>
              </div>
            )}
            <Button asChild variant="outline">
              <Link to="/cms/users">
                <KeyRound className="h-4 w-4 me-2" />
                {t('menu_users', { ns: 'common' })}
              </Link>
            </Button>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            {t('roles_tab', { ns: 'access' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rolesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t('loading_roles', { ns: 'access' })}</p>
          )}

          {rolesQuery.isError && (
            <p className="text-sm text-destructive">{t('failed_load_roles', { ns: 'access' })}</p>
          )}

          {!rolesQuery.isLoading && !rolesQuery.isError && (rolesQuery.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t('no_roles', { ns: 'access' })}</p>
          )}

          {!rolesQuery.isLoading && !rolesQuery.isError && (rolesQuery.data?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {rolesQuery.data?.map((role) => (
                <div key={role.id} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {role.name}
                        {FIXED_ROLES.has(role.name) && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" />
                            fixed
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{role.guard_name ?? 'api'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {(role.permissions ?? []).length} {t('permissions_tab', { ns: 'access' }).toLowerCase()}
                      </Badge>
                      {canManageRoles && !FIXED_ROLES.has(role.name) && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => startEditRole(role)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteRoleId(role.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(role.permissions ?? []).length > 0 ? (
                      role.permissions?.map((perm) => (
                        <Badge key={perm.id} variant="secondary">{perm.name}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('no_permissions', { ns: 'access' })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingRoleId !== null} onOpenChange={(open) => !open && setEditingRoleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manage_permissions', { ns: 'access' })}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              value={editingRoleName}
              onChange={(e) => setEditingRoleName(e.target.value)}
              placeholder={t('new_role_placeholder', { ns: 'access' })}
            />

            <div className="max-h-80 overflow-auto space-y-2">
              {permissionsQuery.data?.map((perm) => {
                const id = `perm-${perm.id}`;
                return (
                  <label key={perm.id} htmlFor={id} className="flex items-center gap-2 text-sm">
                    <input
                      id={id}
                      type="checkbox"
                      checked={editingPermissions.has(perm.name)}
                      onChange={() => togglePermission(perm.name)}
                      className="size-4"
                    />
                    <span>{perm.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingRoleId(null)}>
              {t('cancel', { ns: 'access' })}
            </Button>
            <Button
              disabled={editingRoleId === null || updateRole.isPending || !editingRoleName.trim()}
              onClick={() => editingRoleId !== null && updateRole.mutate(editingRoleId)}
            >
              {t('save', { ns: 'access' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRoleId !== null} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_role_title', { ns: 'access' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('delete_role_confirm', { ns: 'access', name: deleteRoleItem?.name ?? '' })}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRoleId(null)}>
              {t('cancel', { ns: 'access' })}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRole.isPending || deleteRoleId === null}
              onClick={() => deleteRoleId !== null && deleteRole.mutate(deleteRoleId)}
            >
              {t('delete', { ns: 'access' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
