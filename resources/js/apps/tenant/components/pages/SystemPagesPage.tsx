import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { usePermissions, useToast } from '@/shared/hooks';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import type { SystemSurface } from '@/shared/services/api/types';

export function SystemPagesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('pages.edit');

  const { data, isLoading } = useQuery({
    queryKey: ['system-surfaces'],
    queryFn: () => tenantSystemSurfaces.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['system-surfaces'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ surfaceKey, isEnabled }: { surfaceKey: string; isEnabled: boolean }) =>
      tenantSystemSurfaces.update(surfaceKey, { is_enabled: isEnabled }),
    onSuccess: () => {
      invalidate();
      toast({
        title: 'System page updated',
        description: 'The system page state was saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update the system page.',
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (surfaceKey: string) => tenantSystemSurfaces.reset(surfaceKey),
    onSuccess: () => {
      invalidate();
      toast({
        title: 'System page reset',
        description: 'The default configuration was restored.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset the system page.',
        variant: 'destructive',
      });
    },
  });

  const columns: Column<SystemSurface>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (surface) => (
        <div className="space-y-1">
          <div className="font-medium">{surface.title}</div>
          <div className="text-xs text-muted-foreground">{surface.surface_key}</div>
        </div>
      ),
    },
    {
      key: 'route_path',
      label: 'Route',
      render: (surface) => (
        <span className="font-mono text-sm text-muted-foreground">{surface.route_path}</span>
      ),
    },
    {
      key: 'surface_type',
      label: 'Type',
      render: (surface) => (
        <Badge variant="outline" className="capitalize">
          {surface.surface_type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'is_enabled',
      label: 'Status',
      render: (surface) => (
        <Badge variant={surface.is_enabled ? 'default' : 'secondary'}>
          {surface.is_enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (surface) => (
        <span className="text-sm text-muted-foreground">
          {new Date(surface.updated_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Pages"
        description="Manage route-bound surfaces such as login, password recovery, and the guest portal without mixing them into normal CMS pages."
      />

      <DataTable<SystemSurface>
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No system pages found"
        emptyDescription="System pages are provisioned automatically for each tenant."
        actions={canEdit ? (surface) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              title="Edit system page"
              onClick={() => navigate(`/cms/system-pages/${surface.surface_key}/edit`)}
              disabled={updateMutation.isPending || resetMutation.isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={surface.is_enabled ? 'Disable system page' : 'Enable system page'}
              onClick={() => updateMutation.mutate({
                surfaceKey: surface.surface_key,
                isEnabled: !surface.is_enabled,
              })}
              disabled={updateMutation.isPending || resetMutation.isPending}
            >
              {surface.is_enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Reset system page"
              onClick={() => resetMutation.mutate(surface.surface_key)}
              disabled={updateMutation.isPending || resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        ) : undefined}
      />
    </div>
  );
}
