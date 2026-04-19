import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tenants } from '@/shared/services/api/tenants';
import type { ActivityLog, TenantInspectionPage as TenantInspectionPageRow, TenantInspectionTheme } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks';

export function TenantInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('tenants');
  const { toast } = useToast();
  const [pagesPage, setPagesPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [pendingActivation, setPendingActivation] = useState<TenantInspectionTheme | null>(null);

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

  const reloadInspection = async () => {
    await Promise.all([
      summary.refetch(),
      themes.refetch(),
    ]);
  };

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
      </Tabs>
    </div>
  );
}
