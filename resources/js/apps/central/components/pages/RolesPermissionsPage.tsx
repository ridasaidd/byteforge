import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, permissionsApi, type RoleDto, type PermissionDto } from '@/shared/services/rolesPermissionsApi';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Can } from '@/shared/components/auth/Can';
// Dialog components will be used in the next step for assignment UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/hooks';

type Role = RoleDto & { permissions?: PermissionDto[] };

const RolesPermissionsPage: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [managePermRole, setManagePermRole] = useState<Role | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())

  // Manage permissions dialog helpers
  const togglePerm = (permName: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(permName)) next.delete(permName)
      else next.add(permName)
      return next
    })
  }

  // Permissions state
  const [newPermissionName, setNewPermissionName] = useState('');
  const [editingPermission, setEditingPermission] = useState<PermissionDto | null>(null);
  const [editPermissionName, setEditPermissionName] = useState('');

  // Roles list
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  const createRole = useMutation({
    mutationFn: (data: { name: string; guard_name?: string }) => rolesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setNewRoleName('');
      toast({ title: 'Role created' });
    },
  onError: (e: unknown) => toast({ title: 'Failed to create role', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => rolesApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      setEditName('');
      toast({ title: 'Role updated' });
    },
  onError: (e: unknown) => toast({ title: 'Failed to update role', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const deleteRole = useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Role deleted' });
    },
  onError: (e: unknown) => toast({ title: 'Failed to delete role', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const assignPermissions = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) => rolesApi.assignPermissions(id, permissions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Permissions updated' });
      setManagePermRole(null);
      setSelectedPerms(new Set());
    },
    onError: (e: unknown) => toast({ title: 'Failed to update permissions', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const handleCreate = () => {
    if (!newRoleName.trim()) return;
    createRole.mutate({ name: newRoleName.trim(), guard_name: 'api' });
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setEditName(role.name);
  };

  const handleUpdate = () => {
    if (!editingRole) return;
    if (!editName.trim() || editName.trim() === editingRole.name) {
      setEditingRole(null);
      return;
    }
    updateRole.mutate({ id: editingRole.id, name: editName.trim() });
  };

  const handleDelete = (role: Role) => {
    if (confirm(`Delete role "${role.name}"?`)) {
      deleteRole.mutate(role.id);
    }
  };

  // Permissions list
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsApi.list(),
  });

  const createPermission = useMutation({
    mutationFn: (data: { name: string; guard_name?: string }) => permissionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
      setNewPermissionName('');
      toast({ title: 'Permission created' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to create permission', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const updatePermission = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => permissionsApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
      setEditingPermission(null);
      setEditPermissionName('');
      toast({ title: 'Permission updated' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to update permission', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const deletePermission = useMutation({
    mutationFn: (id: number) => permissionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
      toast({ title: 'Permission deleted' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to delete permission', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }),
  });

  const handleCreatePermission = () => {
    if (!newPermissionName.trim()) return;
    createPermission.mutate({ name: newPermissionName.trim(), guard_name: 'api' });
  };

  const startEditPermission = (permission: PermissionDto) => {
    setEditingPermission(permission);
    setEditPermissionName(permission.name);
  };

  const handleUpdatePermission = () => {
    if (!editingPermission) return;
    if (!editPermissionName.trim() || editPermissionName.trim() === editingPermission.name) {
      setEditingPermission(null);
      return;
    }
    updatePermission.mutate({ id: editingPermission.id, name: editPermissionName.trim() });
  };

  const handleDeletePermission = (permission: PermissionDto) => {
    if (confirm(`Delete permission "${permission.name}"?`)) {
      deletePermission.mutate(permission.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Roles & Permissions</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button variant={activeTab === 'roles' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('roles')}>Roles</Button>
        <Button variant={activeTab === 'permissions' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('permissions')}>Permissions</Button>
      </div>

      {/* Roles CRUD */}
      {activeTab === 'roles' && (
      <div className="space-y-4">
        <Can permission="manage roles">
          <div className="flex gap-2">
            <Input
              placeholder="New role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="max-w-xs"
            />
            <Button onClick={handleCreate} disabled={!newRoleName.trim() || createRole.isPending}>
              <Plus className="size-4" /> Create Role
            </Button>
          </div>
        </Can>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Guard</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolesQuery.data?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    {editingRole?.id === role.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs" />
                    ) : (
                      <span className="font-medium">{role.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{role.guard_name}</span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {editingRole?.id === role.id ? (
                      <Can permission="manage roles">
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setEditingRole(null)}>Cancel</Button>
                          <Button size="sm" onClick={handleUpdate} disabled={updateRole.isPending}>Save</Button>
                        </>
                      </Can>
                    ) : (
                      <>
                        <Can permission="manage roles">
                          <Button size="sm" variant="outline" onClick={() => startEdit(role)}>
                            <Pencil className="size-4" /> Edit
                          </Button>
                        </Can>
                        <Can permission="manage roles">
                          <Button size="sm" variant="outline" onClick={() => { setManagePermRole(role); setSelectedPerms(new Set((role.permissions ?? []).map(p => p.name))); }}>
                            Manage permissions
                          </Button>
                        </Can>
                        <Can permission="manage roles">
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(role)} disabled={deleteRole.isPending}>
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </Can>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rolesQuery.isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Loading roles…</div>
          )}
          {rolesQuery.isError && (
            <div className="p-4 text-sm text-red-600">
              Failed to load roles{rolesQuery.error instanceof Error ? `: ${rolesQuery.error.message}` : ''}.
            </div>
          )}
          {rolesQuery.data && rolesQuery.data.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No roles yet.</div>
          )}
        </div>
      </div>
      )}

      {/* Permissions CRUD */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <Can permission="manage roles">
            <div className="flex gap-2">
              <Input
                placeholder="New permission name"
                value={newPermissionName}
                onChange={(e) => setNewPermissionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePermission()}
                className="max-w-xs"
              />
              <Button onClick={handleCreatePermission} disabled={!newPermissionName.trim() || createPermission.isPending}>
                <Plus className="size-4" /> Create Permission
              </Button>
            </div>
          </Can>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Guard</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionsQuery.data?.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      {editingPermission?.id === permission.id ? (
                        <Input value={editPermissionName} onChange={(e) => setEditPermissionName(e.target.value)} className="max-w-xs" />
                      ) : (
                        <span className="font-medium">{permission.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{permission.guard_name}</span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {editingPermission?.id === permission.id ? (
                        <Can permission="manage roles">
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setEditingPermission(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleUpdatePermission} disabled={updatePermission.isPending}>Save</Button>
                          </>
                        </Can>
                      ) : (
                        <>
                          <Can permission="manage roles">
                            <Button size="sm" variant="outline" onClick={() => startEditPermission(permission)}>
                              <Pencil className="size-4" /> Edit
                            </Button>
                          </Can>
                          <Can permission="manage roles">
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePermission(permission)} disabled={deletePermission.isPending}>
                              <Trash2 className="size-4" /> Delete
                            </Button>
                          </Can>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {permissionsQuery.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading permissions…</div>
            )}
            {permissionsQuery.isError && (
              <div className="p-4 text-sm text-red-600">
                Failed to load permissions{permissionsQuery.error instanceof Error ? `: ${permissionsQuery.error.message}` : ''}.
              </div>
            )}
            {permissionsQuery.data && permissionsQuery.data.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No permissions yet.</div>
            )}
          </div>
        </div>
      )}
      {/* Manage Permissions Dialog */}
      {managePermRole && (
        <Dialog open onOpenChange={(open) => { if (!open) { setManagePermRole(null); setSelectedPerms(new Set()); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage permissions for "{managePermRole.name}"</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 overflow-auto space-y-2 py-2">
              {permissionsQuery.isLoading && (
                <div className="text-sm text-muted-foreground">Loading permissions…</div>
              )}
              {permissionsQuery.isError && (
                <div className="text-sm text-red-600">Failed to load permissions.</div>
              )}
              {permissionsQuery.data?.map((perm) => {
                const id = `perm-${perm.id}`
                const checked = selectedPerms.has(perm.name)
                return (
                  <label key={perm.id} htmlFor={id} className="flex items-center gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      className="size-4"
                      checked={checked}
                      onChange={() => togglePerm(perm.name)}
                    />
                    <span>{perm.name}</span>
                    <span className="text-muted-foreground text-xs">({perm.guard_name})</span>
                  </label>
                )
              })}
              {permissionsQuery.data && permissionsQuery.data.length === 0 && (
                <div className="text-sm text-muted-foreground">No permissions yet.</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setManagePermRole(null); setSelectedPerms(new Set()); }}>Cancel</Button>
              <Button onClick={() => {
                if (!managePermRole) return;
                const payload = Array.from(selectedPerms)
                assignPermissions.mutate({ id: managePermRole.id, permissions: payload })
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RolesPermissionsPage;
