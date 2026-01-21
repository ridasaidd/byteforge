import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card } from '@/shared/components/molecules/Card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Users, Building2, Activity, FileText, Plus, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { stats, tenants, activity } from '@/shared/services/api';
import { formatRelativeTime } from '@/shared/utils/date';
import { usePermissions } from '@/shared/hooks/usePermissions';

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between p-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-2" />
          ) : (
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
          )}
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </Card>
  );
}

function getEventBadgeColor(event: string): 'default' | 'secondary' | 'destructive' {
  switch (event) {
    case 'created':
      return 'default';
    case 'updated':
      return 'secondary';
    case 'deleted':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Check permissions
  const canViewTenants = hasPermission('view tenants');
  const canViewUsers = hasPermission('view users');
  const canViewActivity = hasPermission('view activity logs');
  const canManageTenants = hasPermission('manage tenants');
  const canManageUsers = hasPermission('manage users');
  const canManageSettings = hasPermission('manage settings');

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => stats.getDashboardStats(),
    enabled: canViewTenants || canViewUsers || canViewActivity,
  });

  // Fetch recent tenants
  const { data: recentTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['dashboard', 'recent-tenants'],
    queryFn: () => tenants.list({ per_page: 5 }),
    enabled: canViewTenants,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => activity.list({ per_page: 5 }),
    enabled: canViewActivity,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome to ByteForge Central Admin"
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {canManageTenants && (
          <Button onClick={() => navigate('/dashboard/tenants')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        )}
        {canManageUsers && (
          <Button variant="outline" onClick={() => navigate('/dashboard/users')}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
        {canViewActivity && (
          <Button variant="outline" onClick={() => navigate('/dashboard/activity')}>
            <Activity className="h-4 w-4 mr-2" />
            View Activity
          </Button>
        )}
        {canManageSettings && (
          <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {canViewTenants && (
          <StatCard
            title="Total Tenants"
            value={statsData?.totalTenants ?? 0}
            icon={Building2}
            isLoading={statsLoading}
          />
        )}
        {canViewUsers && (
          <StatCard
            title="Total Users"
            value={statsData?.totalUsers ?? 0}
            icon={Users}
            isLoading={statsLoading}
          />
        )}
        {canViewActivity && (
          <StatCard
            title="Total Activity"
            value={statsData?.recentActivityCount ?? 0}
            icon={Activity}
            isLoading={statsLoading}
          />
        )}
        {canViewTenants && (
          <StatCard
            title="Pages"
            value={statsData?.totalPages ?? 0}
            icon={FileText}
            isLoading={statsLoading}
          />
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Tenants */}
        {canViewTenants && (
          <Card
            title="Recent Tenants"
            description="Latest tenant registrations"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/tenants')}
              >
                View All
              </Button>
            }
          >
            {tenantsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : recentTenants?.data && recentTenants.data.length > 0 ? (
              <div className="space-y-4">
                {recentTenants.data.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(tenant.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tenants yet</p>
              </div>
            )}
          </Card>
        )}

        {/* System Activity */}
        {canViewActivity && (
          <Card
            title="System Activity"
            description="Recent system events"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/activity')}
              >
                View All
              </Button>
            }
          >
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity?.data && recentActivity.data.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.data.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <Badge variant={getEventBadgeColor(log.event || '')} className="mt-0.5">
                      {log.event}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.causer?.name || 'System'} • {formatRelativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
