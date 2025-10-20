import { useMemo } from 'react';
import { api, type ActivityLog } from '@/shared/services/api';
import { useCrud } from '@/shared/hooks/useCrud';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Badge } from '@/shared/components/ui/badge';

export function ActivityLogPage() {
  const activity = useCrud<ActivityLog, never, never>({
    resource: 'activity-logs',
    // Minimal ApiService wrapper for list only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiService: { list: (params: any) => api.activity.list(params) } as any,
    queryOptions: {
      refetchOnMount: 'always', // Always fetch fresh data when navigating to this page
      staleTime: 0, // Consider data stale immediately for real-time updates
    },
  });

  const columns: Column<ActivityLog>[] = useMemo(() => [
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <div>
          <div className="font-medium">{row.description || '(no description)'}</div>
          <div className="text-xs text-muted-foreground">{row.subject_type} #{row.subject_id}</div>
        </div>
      ),
    },
    {
      key: 'event',
      label: 'Event',
      render: (row) => (
        <Badge variant={row.event === 'deleted' ? 'destructive' : row.event === 'created' ? 'secondary' : 'outline'}>
          {row.event}
        </Badge>
      ),
    },
    {
      key: 'causer',
      label: 'By',
      render: (row) => (
        <div className="text-sm">
          {row.causer ? (
            <>
              <div className="font-medium">{row.causer.name}</div>
              <div className="text-muted-foreground">{row.causer.email}</div>
            </>
          ) : (
            <span className="text-muted-foreground">System</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'At',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Recent system-wide activity"
      />

      <DataTable<ActivityLog>
        data={activity.list.data?.data || []}
        columns={columns}
        isLoading={activity.list.isLoading}
        emptyMessage="No activity yet"
        emptyDescription="System activity will appear here"
        currentPage={activity.list.data?.meta.current_page}
        totalPages={activity.list.data?.meta.last_page}
        onPageChange={activity.pagination.setPage}
      />
    </div>
  );
}
