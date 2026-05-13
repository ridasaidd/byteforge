import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tenants } from '@/shared/services/api/tenants';
import type { ActivityLog, TenantInspectionPage as TenantInspectionPageRow, TenantInspectionTheme, TenantInspectionUser, TenantSupportAccessGrant, TenantSupportAccessRelatedTenant } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const firstFieldError = apiError.response?.data?.errors
    ? Object.values(apiError.response.data.errors)[0]?.[0]
    : null;

  return firstFieldError || apiError.response?.data?.message || fallback;
}

function formatOtherActiveGrantLabel(grant: TenantSupportAccessRelatedTenant): string {
  if (grant.tenant_domain) {
    return `${grant.tenant_name} (${grant.tenant_domain})`;
  }

  return grant.tenant_name;
}

export function TenantInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('tenants');
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [pagesPage, setPagesPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [pendingActivation, setPendingActivation] = useState<TenantInspectionTheme | null>(null);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [selectedSupportUserId, setSelectedSupportUserId] = useState('');
  const [grantDurationHours, setGrantDurationHours] = useState('4');
  const [grantReason, setGrantReason] = useState('');
  const [pendingRevoke, setPendingRevoke] = useState<TenantSupportAccessGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);
  const [pendingUserRoleChange, setPendingUserRoleChange] = useState<{
    userId: number;
    name: string;
    email: string;
    currentRole: string;
    nextRole: 'owner' | 'editor' | 'viewer';
  } | null>(null);
  const [pendingUserRemoval, setPendingUserRemoval] = useState<TenantInspectionUser | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'owner' as 'owner' | 'editor' | 'viewer',
  });
  const canViewOverview = hasPermission('tenants.operate') || hasPermission('tenants.manage');
  const canViewThemes = hasPermission('tenants.themes.view') || hasPermission('tenants.manage');
  const canViewPages = hasPermission('tenants.pages.view') || hasPermission('tenants.manage');
  const canViewActivity = hasPermission('tenants.activity.view') || hasPermission('tenants.manage');
  const canViewSupport = hasPermission('tenants.support.view') || hasPermission('tenants.manage');
  const canViewTenantUsers = hasPermission('tenants.view') || hasPermission('tenants.manage');
  const canManageTenantUsers = hasPermission('tenants.manage');

  const summary = useQuery({
    queryKey: ['tenant-inspection', id, 'summary'],
    queryFn: () => tenants.summary(id!),
    enabled: Boolean(id) && canViewOverview,
  });

  const themes = useQuery({
    queryKey: ['tenant-inspection', id, 'themes'],
    queryFn: () => tenants.themes(id!),
    enabled: Boolean(id) && canViewThemes,
  });

  const pages = useQuery({
    queryKey: ['tenant-inspection', id, 'pages', pagesPage],
    queryFn: () => tenants.pages(id!, { page: pagesPage, per_page: 10 }),
    enabled: Boolean(id) && canViewPages,
  });

  const activity = useQuery({
    queryKey: ['tenant-inspection', id, 'activity', activityPage],
    queryFn: () => tenants.activity(id!, { page: activityPage, per_page: 10 }),
    enabled: Boolean(id) && canViewActivity,
  });

  const supportAccess = useQuery({
    queryKey: ['tenant-inspection', id, 'support-access'],
    queryFn: () => tenants.supportAccess(id!),
    enabled: Boolean(id) && canViewSupport,
  });

  const tenantUsers = useQuery({
    queryKey: ['tenant-inspection', id, 'users'],
    queryFn: () => tenants.users(id!),
    enabled: Boolean(id) && canViewTenantUsers,
  });

  const reloadInspection = async () => {
    await Promise.all([
      summary.refetch(),
      themes.refetch(),
    ]);
  };

  const reloadSupportAccess = async () => {
    await Promise.all([
      summary.refetch(),
      activity.refetch(),
      supportAccess.refetch(),
    ]);
  };

  const resetGrantDialog = () => {
    setIsGrantDialogOpen(false);
    setSelectedSupportUserId('');
    setGrantDurationHours('4');
    setGrantReason('');
  };

  const openGrantDialog = () => {
    const firstEligibleUser = eligibleSupportUsers[0];

    setSelectedSupportUserId(firstEligibleUser ? String(firstEligibleUser.id) : '');
    setGrantDurationHours('4');
    setGrantReason('');
    setIsGrantDialogOpen(true);
  };

  const resetRevokeDialog = () => {
    setPendingRevoke(null);
    setRevokeReason('');
  };

  const formatDateTime = (value: string | null | undefined) => {
    return value ? new Date(value).toLocaleString(i18n.language) : '-';
  };

  const formatTenantUserRole = (role: 'owner' | 'editor' | 'viewer' | string) => {
    if (role === 'owner' || role === 'editor' || role === 'viewer') {
      return t(`inspection_user_role_${role}`);
    }

    return role;
  };

  const getSupportGrantStatus = (grant: TenantSupportAccessGrant) => {
    if (grant.revoked_at || grant.status === 'revoked') {
      return { label: t('inspection_support_status_revoked'), variant: 'outline' as const };
    }

    if (grant.is_effective) {
      return { label: t('inspection_support_effective'), variant: 'default' as const };
    }

    const hasExpired = grant.expires_at ? new Date(grant.expires_at).getTime() <= Date.now() : false;

    if (grant.status === 'expired' || hasExpired) {
      return { label: t('inspection_support_status_expired'), variant: 'secondary' as const };
    }

    return { label: t('inspection_support_status_active'), variant: 'secondary' as const };
  };

  const supportOverview = supportAccess.data?.data;
  const supportGrants = supportOverview?.grants ?? [];
  const eligibleSupportUsers = supportOverview?.eligible_users ?? [];
  const selectedSupportUser = eligibleSupportUsers.find((user) => String(user.id) === selectedSupportUserId) ?? null;
  const activeSupportCount = supportGrants.filter((grant) => grant.is_effective).length;

  const handleActivateTheme = async () => {
    if (!id || !pendingActivation) {
      return;
    }

    try {
      await tenants.activateTheme(id, { slug: pendingActivation.slug });
      await reloadInspection();
      toast({ title: t('tenant_updated_title'), description: t('inspection_activate_success') });
      setPendingActivation(null);
    } catch {
      toast({ title: t('error_title'), description: t('inspection_activate_failed'), variant: 'destructive' });
    }
  };

  const handleGrantSupportAccess = async () => {
    if (!id || !selectedSupportUserId || !grantReason.trim()) {
      return;
    }

    setIsSubmittingGrant(true);

    try {
      await tenants.grantSupportAccess(id, {
        support_user_id: Number(selectedSupportUserId),
        duration_hours: Number(grantDurationHours),
        reason: grantReason.trim(),
      });
      await reloadSupportAccess();
      toast({ title: t('tenant_updated_title'), description: t('inspection_support_grant_success') });
      resetGrantDialog();
    } catch (error) {
      toast({
        title: t('error_title'),
        description: getErrorMessage(error, t('inspection_support_grant_failed')),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const handleRevokeSupportAccess = async () => {
    if (!id || !pendingRevoke) {
      return;
    }

    setIsSubmittingRevoke(true);

    try {
      await tenants.revokeSupportAccess(id, pendingRevoke.id, {
        reason: revokeReason.trim() || undefined,
      });
      await reloadSupportAccess();
      toast({ title: t('tenant_updated_title'), description: t('inspection_support_revoke_success') });
      resetRevokeDialog();
    } catch (error) {
      toast({
        title: t('error_title'),
        description: getErrorMessage(error, t('inspection_support_revoke_failed')),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  const createTenantUserMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Tenant id is required.');
      }

      return tenants.addUserToTenant(id, {
        name: userForm.name.trim() || undefined,
        email: userForm.email.trim(),
        password: userForm.password || undefined,
        password_confirmation: userForm.password_confirmation || undefined,
        role: userForm.role,
      });
    },
    onSuccess: async (response) => {
      await reloadInspection();
      await tenantUsers.refetch();
      setIsUserDialogOpen(false);
      setUserForm({ name: '', email: '', password: '', password_confirmation: '', role: 'owner' });
      toast({
        title: t('tenant_updated_title'),
        description: t('inspection_user_added_success', {
          email: response.data.user.email,
          role: t(`inspection_user_role_${response.data.membership.role}`),
        }),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t('error_title'),
        description: getErrorMessage(error, t('inspection_user_added_failed')),
        variant: 'destructive',
      });
    },
  });

  const updateTenantUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: 'owner' | 'editor' | 'viewer' }) => {
      if (!id) {
        throw new Error('Tenant id is required.');
      }

      return tenants.updateUserInTenant(id, userId, { role });
    },
    onSuccess: async () => {
      await tenantUsers.refetch();
      setPendingUserRoleChange(null);
      toast({ title: t('tenant_updated_title'), description: t('inspection_user_role_updated_success') });
    },
    onError: (error: unknown) => {
      toast({
        title: t('error_title'),
        description: getErrorMessage(error, t('inspection_user_role_updated_failed')),
        variant: 'destructive',
      });
    },
  });

  const removeTenantUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!id) {
        throw new Error('Tenant id is required.');
      }

      return tenants.removeUserFromTenant(id, userId);
    },
    onSuccess: async () => {
      await tenantUsers.refetch();
      setPendingUserRemoval(null);
      toast({ title: t('tenant_updated_title'), description: t('inspection_user_removed_success') });
    },
    onError: (error: unknown) => {
      toast({
        title: t('error_title'),
        description: getErrorMessage(error, t('inspection_user_removed_failed')),
        variant: 'destructive',
      });
    },
  });

  const themeColumns: Column<TenantInspectionTheme>[] = [
    {
      key: 'name',
      label: t('inspection_theme_name'),
      render: (theme) => (
        <div>
          <div className="font-medium">{theme.name}</div>
          <div className="text-xs text-muted-foreground">{theme.slug}</div>
        </div>
      ),
    },
    {
      key: 'scope',
      label: t('inspection_scope'),
      render: (theme) => (
        <Badge variant={theme.tenant_id ? 'secondary' : 'outline'}>
          {theme.tenant_id ? t('inspection_scope_tenant') : t('inspection_scope_system')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('inspection_status'),
      render: (theme) => theme.is_active ? <Badge>{t('inspection_active')}</Badge> : <Badge variant="outline">{t('inspection_inactive')}</Badge>,
    },
    {
      key: 'updated_at',
      label: t('inspection_updated'),
      render: (theme) => theme.updated_at ? new Date(theme.updated_at).toLocaleString(i18n.language) : '-',
    },
  ];

  const themeActions = (theme: TenantInspectionTheme) => (
    theme.is_active ? null : (
      <Button size="sm" variant="secondary" onClick={() => setPendingActivation(theme)}>
        {t('inspection_activate_theme')}
      </Button>
    )
  );

  const pageColumns: Column<TenantInspectionPageRow>[] = [
    {
      key: 'title',
      label: t('inspection_page_title'),
      render: (page) => (
        <div>
          <div className="font-medium">{page.title}</div>
          <div className="text-xs text-muted-foreground">/{page.slug}</div>
        </div>
      ),
    },
    {
      key: 'page_type',
      label: t('inspection_page_type'),
    },
    {
      key: 'status',
      label: t('inspection_status'),
      render: (page) => <Badge variant={page.status === 'published' ? 'secondary' : 'outline'}>{page.status}</Badge>,
    },
    {
      key: 'updated_at',
      label: t('inspection_updated'),
      render: (page) => new Date(page.updated_at).toLocaleString(i18n.language),
    },
  ];

  const activityColumns: Column<ActivityLog>[] = [
    {
      key: 'description',
      label: t('inspection_activity_description'),
      render: (row) => (
        <div>
          <div className="font-medium">{row.description || t('inspection_no_description')}</div>
          <div className="text-xs text-muted-foreground">{row.subject_type} #{row.subject_id}</div>
        </div>
      ),
    },
    {
      key: 'event',
      label: t('inspection_event'),
      render: (row) => <Badge variant={row.event === 'deleted' ? 'destructive' : row.event === 'created' ? 'secondary' : 'outline'}>{row.event || '-'}</Badge>,
    },
    {
      key: 'created_at',
      label: t('inspection_updated'),
      render: (row) => new Date(row.created_at).toLocaleString(i18n.language),
    },
  ];

  const supportColumns: Column<TenantSupportAccessGrant>[] = [
    {
      key: 'support_user',
      label: t('inspection_support_user'),
      render: (grant) => (
        <div>
          <div className="font-medium">{grant.support_user?.name ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{grant.support_user?.email ?? '-'}</div>
          {grant.other_active_grants_count > 0 ? (
            <div className="mt-2 space-y-1">
              <Badge variant="outline">
                {t('inspection_support_other_active_count', { count: grant.other_active_grants_count })}
              </Badge>
              {grant.other_active_grants.slice(0, 3).map((otherGrant) => (
                <div key={`${grant.id}-${otherGrant.tenant_id}`} className="text-xs text-muted-foreground">
                  {formatOtherActiveGrantLabel(otherGrant)}
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-1 text-xs text-muted-foreground">
            {t('inspection_support_reason')}: {grant.reason}
          </div>
          {grant.revoke_reason ? (
            <div className="text-xs text-muted-foreground">
              {t('inspection_support_revoke_reason')}: {grant.revoke_reason}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'window',
      label: t('inspection_support_window'),
      render: (grant) => (
        <div className="text-sm">
          <div>{t('inspection_support_started')}: {formatDateTime(grant.starts_at)}</div>
          <div className="text-xs text-muted-foreground">{t('inspection_support_expires')}: {formatDateTime(grant.expires_at)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('inspection_status'),
      render: (grant) => {
        const status = getSupportGrantStatus(grant);

        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'granted_by',
      label: t('inspection_support_granted_by'),
      render: (grant) => (
        <div>
          <div className="font-medium">{grant.granted_by?.name ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{grant.granted_by?.email ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'last_used_at',
      label: t('inspection_support_last_used'),
      render: (grant) => formatDateTime(grant.last_used_at),
    },
  ];

  const supportActions = (grant: TenantSupportAccessGrant) => (
    grant.status === 'active' && !grant.revoked_at ? (
      <Button size="sm" variant="outline" onClick={() => setPendingRevoke(grant)}>
        {t('inspection_support_revoke_action')}
      </Button>
    ) : null
  );

  const userColumns: Column<TenantInspectionUser>[] = [
    {
      key: 'name',
      label: t('name'),
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('inspection_user_role'),
      render: (row) => canManageTenantUsers ? (
        <Select
          value={row.role}
          onValueChange={(value: 'owner' | 'editor' | 'viewer') => {
            if (value !== row.role) {
              setPendingUserRoleChange({
                userId: row.id,
                name: row.name,
                email: row.email,
                currentRole: row.role,
                nextRole: value,
              });
            }
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">{t('inspection_user_role_owner')}</SelectItem>
            <SelectItem value="editor">{t('inspection_user_role_editor')}</SelectItem>
            <SelectItem value="viewer">{t('inspection_user_role_viewer')}</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline">{row.role}</Badge>
      ),
    },
    {
      key: 'status',
      label: t('inspection_status'),
      render: (row) => <Badge variant={row.status === 'active' ? 'secondary' : 'outline'}>{row.status}</Badge>,
    },
    {
      key: 'joined_at',
      label: t('created'),
      render: (row) => formatDateTime(row.joined_at),
    },
  ];

  const userActions = canManageTenantUsers
    ? (row: TenantInspectionUser) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPendingUserRemoval(row)}
          disabled={removeTenantUserMutation.isPending}
        >
          {t('inspection_user_remove_action')}
        </Button>
      )
    : undefined;

  const tenant = summary.data?.data.tenant;
  const stats = summary.data?.data.stats;

  return (
    <div className="space-y-6">
      <Dialog open={!!pendingActivation} onOpenChange={(open) => !open && setPendingActivation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_activate_title')}</DialogTitle>
            <DialogDescription>
              {t('inspection_activate_description', { name: pendingActivation?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingActivation(null)}>{t('cancel', { ns: 'common', defaultValue: 'Cancel' })}</Button>
            <Button onClick={handleActivateTheme}>{t('inspection_activate_theme')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGrantDialogOpen} onOpenChange={(open) => !open ? resetGrantDialog() : setIsGrantDialogOpen(true)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_support_grant_title')}</DialogTitle>
            <DialogDescription>{t('inspection_support_grant_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support_user_id">{t('inspection_support_grant_user')}</Label>
              <Select value={selectedSupportUserId} onValueChange={setSelectedSupportUserId}>
                <SelectTrigger id="support_user_id" className="w-full">
                  <SelectValue placeholder={t('inspection_support_grant_user_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSupportUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupportUser && selectedSupportUser.other_active_grants_count > 0 ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{t('inspection_support_selected_other_grants')}</div>
                <p className="mt-1 text-muted-foreground">
                  {t('inspection_support_selected_other_grants_description', {
                    name: selectedSupportUser.name,
                    count: selectedSupportUser.other_active_grants_count,
                  })}
                </p>
                <div className="mt-3 space-y-2">
                  {selectedSupportUser.other_active_grants.map((otherGrant) => (
                    <div key={`${selectedSupportUser.id}-${otherGrant.tenant_id}`} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                      <div className="font-medium text-foreground">{formatOtherActiveGrantLabel(otherGrant)}</div>
                      <div className="text-muted-foreground">
                        {t('inspection_support_expires')}: {formatDateTime(otherGrant.expires_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="support_duration_hours">{t('inspection_support_grant_duration')}</Label>
              <Select value={grantDurationHours} onValueChange={setGrantDurationHours}>
                <SelectTrigger id="support_duration_hours" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('inspection_support_duration_hours', { count: 1 })}</SelectItem>
                  <SelectItem value="4">{t('inspection_support_duration_hours', { count: 4 })}</SelectItem>
                  <SelectItem value="8">{t('inspection_support_duration_hours', { count: 8 })}</SelectItem>
                  <SelectItem value="24">{t('inspection_support_duration_hours', { count: 24 })}</SelectItem>
                  <SelectItem value="72">{t('inspection_support_duration_hours', { count: 72 })}</SelectItem>
                  <SelectItem value="168">{t('inspection_support_duration_hours', { count: 168 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_grant_reason">{t('inspection_support_grant_reason')}</Label>
              <Textarea
                id="support_grant_reason"
                value={grantReason}
                onChange={(event) => setGrantReason(event.target.value)}
                placeholder={t('inspection_support_grant_reason_placeholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetGrantDialog} disabled={isSubmittingGrant}>
              {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleGrantSupportAccess}
              disabled={isSubmittingGrant || !selectedSupportUserId || !grantReason.trim()}
            >
              {t('inspection_support_grant_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_user_add_title')}</DialogTitle>
            <DialogDescription>{t('inspection_user_add_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_user_name">{t('name')}</Label>
              <Input
                id="tenant_user_name"
                value={userForm.name}
                onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('inspection_user_name_placeholder')}
              />
              <p className="text-xs text-muted-foreground">{t('inspection_user_name_help')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_user_email">{t('inspection_user_email')}</Label>
              <Input
                id="tenant_user_email"
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={t('inspection_user_email_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_user_role">{t('inspection_user_role')}</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: 'owner' | 'editor' | 'viewer') => setUserForm((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="tenant_user_role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('inspection_user_role_owner')}</SelectItem>
                  <SelectItem value="editor">{t('inspection_user_role_editor')}</SelectItem>
                  <SelectItem value="viewer">{t('inspection_user_role_viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_user_password">{t('inspection_user_password')}</Label>
              <Input
                id="tenant_user_password"
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={t('inspection_user_password_placeholder')}
              />
              <p className="text-xs text-muted-foreground">{t('inspection_user_password_help')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_user_password_confirmation">{t('inspection_user_password_confirmation')}</Label>
              <Input
                id="tenant_user_password_confirmation"
                type="password"
                value={userForm.password_confirmation}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                placeholder={t('inspection_user_password_confirmation_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUserDialogOpen(false)}
              disabled={createTenantUserMutation.isPending}
            >
              {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={() => createTenantUserMutation.mutate()}
              disabled={createTenantUserMutation.isPending || !userForm.email.trim()}
            >
              {t('inspection_user_add_action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingRevoke} onOpenChange={(open) => !open && resetRevokeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_support_revoke_title')}</DialogTitle>
            <DialogDescription>
              {t('inspection_support_revoke_description', { name: pendingRevoke?.support_user?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="support_revoke_reason">{t('inspection_support_revoke_reason')}</Label>
            <Textarea
              id="support_revoke_reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder={t('inspection_support_revoke_reason_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetRevokeDialog} disabled={isSubmittingRevoke}>
              {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
            <Button variant="destructive" onClick={handleRevokeSupportAccess} disabled={isSubmittingRevoke}>
              {t('inspection_support_revoke_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingUserRoleChange} onOpenChange={(open) => !open && setPendingUserRoleChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_user_role_change_title')}</DialogTitle>
            <DialogDescription>
              {pendingUserRoleChange ? t('inspection_user_role_change_description', {
                email: pendingUserRoleChange.email,
                currentRole: formatTenantUserRole(pendingUserRoleChange.currentRole),
                nextRole: formatTenantUserRole(pendingUserRoleChange.nextRole),
              }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingUserRoleChange(null)} disabled={updateTenantUserRoleMutation.isPending}>
              {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={() => pendingUserRoleChange && updateTenantUserRoleMutation.mutate({
                userId: pendingUserRoleChange.userId,
                role: pendingUserRoleChange.nextRole,
              })}
              disabled={updateTenantUserRoleMutation.isPending || !pendingUserRoleChange}
            >
              {t('inspection_user_role_change_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingUserRemoval} onOpenChange={(open) => !open && setPendingUserRemoval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inspection_user_remove_title')}</DialogTitle>
            <DialogDescription>
              {pendingUserRemoval ? t('inspection_user_remove_description', { email: pendingUserRemoval.email }) : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('inspection_user_remove_warning')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingUserRemoval(null)} disabled={removeTenantUserMutation.isPending}>
              {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingUserRemoval && removeTenantUserMutation.mutate(pendingUserRemoval.id)}
              disabled={removeTenantUserMutation.isPending || !pendingUserRemoval}
            >
              {t('inspection_user_remove_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        title={tenant ? tenant.name : t('inspection_title_fallback')}
        description={tenant ? t('inspection_description', { domain: tenant.domain }) : t('inspection_loading')}
        actions={
          <Button asChild variant="outline">
            <Link to="/dashboard/tenants">{t('inspection_back')}</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('inspection_total_pages')}</CardDescription>
            <CardTitle>{stats?.total_pages ?? '-'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('inspection_published_pages')}</CardDescription>
            <CardTitle>{stats?.published_pages ?? '-'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('inspection_total_themes')}</CardDescription>
            <CardTitle>{stats?.total_themes ?? '-'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('inspection_recent_activity')}</CardDescription>
            <CardTitle>{stats?.recent_activity_count ?? '-'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue={canViewOverview ? 'overview' : (canViewTenantUsers ? 'users' : (canViewThemes ? 'themes' : (canViewPages ? 'pages' : (canViewActivity ? 'activity' : 'support'))))} className="space-y-6">
        <TabsList>
          {canViewOverview ? <TabsTrigger value="overview">{t('inspection_tab_overview')}</TabsTrigger> : null}
          {canViewTenantUsers ? <TabsTrigger value="users">{t('inspection_tab_users')}</TabsTrigger> : null}
          {canViewThemes ? <TabsTrigger value="themes">{t('inspection_tab_themes')}</TabsTrigger> : null}
          {canViewPages ? <TabsTrigger value="pages">{t('inspection_tab_pages')}</TabsTrigger> : null}
          {canViewActivity ? <TabsTrigger value="activity">{t('inspection_tab_activity')}</TabsTrigger> : null}
          {canViewSupport ? <TabsTrigger value="support">{t('inspection_tab_support')}</TabsTrigger> : null}
        </TabsList>

        {canViewOverview ? <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t('inspection_overview_title')}</CardTitle>
              <CardDescription>{t('inspection_overview_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="font-medium">{t('domain')}:</span> {tenant?.domain ?? '-'}</div>
              <div><span className="font-medium">{t('slug')}:</span> {tenant?.slug ?? '-'}</div>
              <div><span className="font-medium">{t('inspection_active_theme_label')}:</span> {summary.data?.data.active_theme?.name ?? t('inspection_no_active_theme')}</div>
            </CardContent>
          </Card>
        </TabsContent> : null}

        {canViewTenantUsers ? <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{t('inspection_users_title')}</CardTitle>
                <CardDescription>{t('inspection_users_description')}</CardDescription>
              </div>
              {canManageTenantUsers ? (
                <Button onClick={() => setIsUserDialogOpen(true)}>
                  {t('inspection_user_add_action')}
                </Button>
              ) : null}
            </CardHeader>
          </Card>

          <DataTable<TenantInspectionUser>
            data={tenantUsers.data?.data || []}
            columns={userColumns}
            isLoading={tenantUsers.isLoading}
            emptyMessage={t('inspection_users_empty_title')}
            emptyDescription={t('inspection_users_empty_description')}
            actions={userActions}
          />
        </TabsContent> : null}

        {canViewThemes ? <TabsContent value="themes">
          <DataTable<TenantInspectionTheme>
            data={themes.data?.data || []}
            columns={themeColumns}
            isLoading={themes.isLoading}
            emptyMessage={t('inspection_empty_themes_title')}
            emptyDescription={t('inspection_empty_themes_description')}
            actions={themeActions}
          />
        </TabsContent> : null}

        {canViewPages ? <TabsContent value="pages">
          <DataTable<TenantInspectionPageRow>
            data={pages.data?.data || []}
            columns={pageColumns}
            isLoading={pages.isLoading}
            emptyMessage={t('inspection_empty_pages_title')}
            emptyDescription={t('inspection_empty_pages_description')}
            currentPage={pages.data?.meta.current_page}
            totalPages={pages.data?.meta.last_page}
            onPageChange={setPagesPage}
          />
        </TabsContent> : null}

        {canViewActivity ? <TabsContent value="activity">
          <DataTable<ActivityLog>
            data={activity.data?.data || []}
            columns={activityColumns}
            isLoading={activity.isLoading}
            emptyMessage={t('inspection_empty_activity_title')}
            emptyDescription={t('inspection_empty_activity_description')}
            currentPage={activity.data?.meta.current_page}
            totalPages={activity.data?.meta.last_page}
            onPageChange={setActivityPage}
          />
        </TabsContent> : null}

        {canViewSupport ? <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{t('inspection_support_title')}</CardTitle>
                <CardDescription>{t('inspection_support_description')}</CardDescription>
              </div>
              <Button onClick={openGrantDialog} disabled={eligibleSupportUsers.length === 0 || supportAccess.isLoading}>
                {t('inspection_support_grant_submit')}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">{t('inspection_support_active_count')}</div>
                <div className="mt-2 text-2xl font-semibold">{activeSupportCount}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t('inspection_support_active_description')}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">{t('inspection_support_eligible_users')}</div>
                <div className="mt-2 text-2xl font-semibold">{supportAccess.isLoading ? '-' : eligibleSupportUsers.length}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {eligibleSupportUsers.length > 0 ? t('inspection_support_eligible_description') : t('inspection_support_no_eligible_users')}
                </p>
              </div>
            </CardContent>
          </Card>

          {supportAccess.isError ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">
                {t('inspection_support_load_failed')}
              </CardContent>
            </Card>
          ) : null}

          <DataTable<TenantSupportAccessGrant>
            data={supportGrants}
            columns={supportColumns}
            isLoading={supportAccess.isLoading}
            emptyMessage={t('inspection_support_empty_title')}
            emptyDescription={t('inspection_support_empty_description')}
            actions={supportActions}
          />
        </TabsContent> : null}
      </Tabs>
    </div>
  );
}
