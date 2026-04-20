import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { users as usersApi } from '@/shared/services/api/users';
import { tenants } from '@/shared/services/api/tenants';
import type { ActivityLog, TenantInspectionPage as TenantInspectionPageRow, TenantInspectionTheme, TenantSupportAccessGrant, User } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks';

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const firstFieldError = apiError.response?.data?.errors
    ? Object.values(apiError.response.data.errors)[0]?.[0]
    : null;

  return firstFieldError || apiError.response?.data?.message || fallback;
}

function getRoleNames(user: User): string[] {
  return user.roles
    .map((role) => typeof role === 'string' ? role : role.name)
    .filter((role): role is string => Boolean(role));
}

export function TenantInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('tenants');
  const { toast } = useToast();
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

  const summary = useQuery({
    queryKey: ['tenant-inspection', id, 'summary'],
    queryFn: () => tenants.summary(id!),
    enabled: Boolean(id),
  });

  const themes = useQuery({
    queryKey: ['tenant-inspection', id, 'themes'],
    queryFn: () => tenants.themes(id!),
    enabled: Boolean(id),
  });

  const pages = useQuery({
    queryKey: ['tenant-inspection', id, 'pages', pagesPage],
    queryFn: () => tenants.pages(id!, { page: pagesPage, per_page: 10 }),
    enabled: Boolean(id),
  });

  const activity = useQuery({
    queryKey: ['tenant-inspection', id, 'activity', activityPage],
    queryFn: () => tenants.activity(id!, { page: activityPage, per_page: 10 }),
    enabled: Boolean(id),
  });

  const supportAccess = useQuery({
    queryKey: ['tenant-inspection', id, 'support-access'],
    queryFn: () => tenants.supportAccess(id!),
    enabled: Boolean(id),
  });

  const supportUsers = useQuery({
    queryKey: ['central-support-users'],
    queryFn: () => usersApi.list({ per_page: 200 }),
    enabled: Boolean(id),
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

  const supportGrants = supportAccess.data?.data ?? [];
  const eligibleSupportUsers = (supportUsers.data?.data ?? []).filter((user) => {
    const roles = getRoleNames(user);

    return roles.includes('support') || roles.includes('admin');
  });
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('inspection_tab_overview')}</TabsTrigger>
          <TabsTrigger value="themes">{t('inspection_tab_themes')}</TabsTrigger>
          <TabsTrigger value="pages">{t('inspection_tab_pages')}</TabsTrigger>
          <TabsTrigger value="activity">{t('inspection_tab_activity')}</TabsTrigger>
          <TabsTrigger value="support">{t('inspection_tab_support')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
        </TabsContent>

        <TabsContent value="themes">
          <DataTable<TenantInspectionTheme>
            data={themes.data?.data || []}
            columns={themeColumns}
            isLoading={themes.isLoading}
            emptyMessage={t('inspection_empty_themes_title')}
            emptyDescription={t('inspection_empty_themes_description')}
            actions={themeActions}
          />
        </TabsContent>

        <TabsContent value="pages">
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
        </TabsContent>

        <TabsContent value="activity">
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
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{t('inspection_support_title')}</CardTitle>
                <CardDescription>{t('inspection_support_description')}</CardDescription>
              </div>
              <Button onClick={openGrantDialog} disabled={eligibleSupportUsers.length === 0 || supportUsers.isLoading}>
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
                <div className="mt-2 text-2xl font-semibold">{supportUsers.isLoading ? '-' : eligibleSupportUsers.length}</div>
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

          {supportUsers.isError ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">
                {t('inspection_support_users_failed')}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
