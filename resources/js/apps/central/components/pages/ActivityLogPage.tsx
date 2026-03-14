import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type ActivityLog } from '@/shared/services/api';
import { useCrud } from '@/shared/hooks/useCrud';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Badge } from '@/shared/components/ui/badge';

export function ActivityLogPage() {
  const { t, i18n } = useTranslation('activity');

  const activity = useCrud<ActivityLog, never, never>({
    resource: 'activity-logs',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiService: { list: (params: any) => api.activity.list(params) } as any,
    queryOptions: {
      refetchOnMount: 'always',
      staleTime: 0,
    },
  });

  const columns: Column<ActivityLog>[] = useMemo(() => [
    {
      key: 'description',
      label: t('col_description'),
      render: (row) => (
        <div>
          <div className="font-medium">{row.description || t('no_description')}</div>
          <div className="text-xs text-muted-foreground">{row.subject_type} #{row.subject_id}</div>
        </div>
      ),
    },
    {
      key: 'event',
      label: t('col_event'),
      render: (row) => (
        <Badge variant={row.event === 'deleted' ? 'destructive' : row.event === 'created' ? 'secondary' : 'outline'}>
          {row.event}
        </Badge>
      ),
    },
    {
      key: 'causer',
      label: t('col_by'),
      render: (row) => (
        <div className="text-sm">
          {row.causer ? (
            <>
              <div className="font-medium">{row.causer.name}</div>
              <div className="text-muted-foreground">{row.causer.email}</div>
            </>
          ) : (
            <span className="text-muted-foreground">{t('system')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('col_at'),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.created_at).toLocaleString(i18n.language)}
        </span>
      ),
    },
  ], [i18n.language, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <DataTable<ActivityLog>
        data={activity.list.data?.data || []}
        columns={columns}
        isLoading={activity.list.isLoading}
        emptyMessage={t('no_activity')}
        emptyDescription={t('no_activity_description')}
        currentPage={activity.list.data?.meta.current_page}
        totalPages={activity.list.data?.meta.last_page}
        onPageChange={activity.pagination.setPage}
      />
    </div>
  );
}
