// Local ApiService type definition to satisfy useCrud generic
type ApiService<T, CreateData, UpdateData> = {
  list: (params?: { page?: number; per_page?: number; search?: string }) => Promise<{ data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>;
  get: (id: string | number) => Promise<{ data: T }>;
  create: (data: CreateData) => Promise<{ data: T }>;
  update: (id: string | number, data: UpdateData) => Promise<{ data: T }>;
  delete: (id: string | number) => Promise<void>;
};
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Trans, useTranslation } from 'react-i18next';
import { tenants as tenantsApi } from '@/shared/services/api/tenants';
import type { Tenant, CreateTenantData, UpdateTenantData } from '@/shared/services/api/types';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { FormModal, type FormField } from '@/shared/components/organisms/FormModal';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

export function TenantsPage() {
  const { t, i18n } = useTranslation('tenants');
  const { toast } = useToast();
  const navigate = useNavigate();

  const tenantSchema = z.object({
    name: z.string().min(1, t('name_required')).max(255, t('name_too_long')),
    domain: z.string().min(1, t('domain_required')).regex(
      /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
      t('invalid_domain')
    ),
  });

  const formFields: FormField[] = [
    {
      name: 'name',
      label: t('tenant_name'),
      type: 'text',
      placeholder: t('tenant_name_placeholder'),
      required: true,
      description: t('tenant_name_description'),
    },
    {
      name: 'domain',
      label: t('domain'),
      type: 'text',
      placeholder: t('domain_placeholder'),
      required: true,
      description: t('domain_description'),
    },
  ];

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const tenantsData = useCrud<Tenant, CreateTenantData, UpdateTenantData>({
    resource: 'tenants',
    apiService: tenantsApi as unknown as ApiService<Tenant, CreateTenantData, UpdateTenantData>,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: z.infer<typeof tenantSchema>) => {
    try {
      const response = await tenantsData.create.mutateAsync(data) as { data?: Tenant };
      toast({
        title: t('tenant_created_title'),
        description: t('tenant_created_description'),
      });
      setIsCreateModalOpen(false);

      if (response.data?.id) {
        navigate(`/dashboard/tenants/${response.data.id}`);
      }
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof tenantSchema>) => {
    if (!editingTenant) return;

    try {
      await tenantsData.update.mutateAsync({ id: editingTenant.id, data });
      toast({
        title: t('tenant_updated_title'),
        description: t('tenant_updated_description'),
      });
      setEditingTenant(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;

    try {
      await tenantsData.delete.mutateAsync(deletingTenant.id);
      toast({
        title: t('tenant_deleted_title'),
        description: t('tenant_deleted_description'),
      });
      setDeletingTenant(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('delete_failed'),
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // Table Configuration
  // ============================================================================

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: t('name'),
      sortable: true,
      render: (tenant) => (
        <div className="font-medium">{tenant.name}</div>
      ),
    },
    {
      key: 'slug',
      label: t('slug'),
      render: (tenant) => (
        <Badge variant="outline">{tenant.slug}</Badge>
      ),
    },
    {
      key: 'domain',
      label: t('domain'),
      render: (tenant) => (
        <a
          href={`https://${tenant.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {tenant.domain}
        </a>
      ),
    },
    {
      key: 'created_at',
      label: t('created'),
      render: (tenant) => (
        <span className="text-sm text-muted-foreground">
          {new Date(tenant.created_at).toLocaleDateString(i18n.language)}
        </span>
      ),
    },
  ];

  const actions = (tenant: Tenant) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setEditingTenant(tenant);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setDeletingTenant(tenant);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title')}
        description={t('page_description')}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('create_tenant')}
          </Button>
        }
      />

      <DataTable<Tenant>
        data={tenantsData.list.data?.data || []}
        columns={columns}
        isLoading={tenantsData.list.isLoading}
        emptyMessage={t('empty_title')}
        emptyDescription={t('empty_description')}
        onRowClick={(tenant) => navigate(`/dashboard/tenants/${tenant.id}`)}
        actions={actions}
        currentPage={tenantsData.list.data?.meta.current_page}
        totalPages={tenantsData.list.data?.meta.last_page}
        onPageChange={tenantsData.pagination.setPage}
      />

      {/* Create Modal */}
      <FormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        title={t('create_tenant_title')}
        description={t('create_tenant_description')}
        fields={formFields}
        schema={tenantSchema}
          isLoading={tenantsData.create.isPending}
        submitText={t('create')}
      />

      {/* Edit Modal */}
      <FormModal
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        onSubmit={handleUpdate}
        title={t('edit_tenant_title')}
        description={t('edit_tenant_description')}
        fields={formFields}
        schema={tenantSchema}
        defaultValues={editingTenant || undefined}
          isLoading={tenantsData.update.isPending}
        submitText={t('save_changes')}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingTenant}
        onOpenChange={(open) => !open && setDeletingTenant(null)}
        onConfirm={handleDelete}
        title={t('delete_tenant_title')}
        description={
          <Trans
            ns="tenants"
            i18nKey="delete_tenant_confirm"
            values={{ name: deletingTenant?.name ?? '' }}
            components={{ strong: <strong /> }}
          />
        }
        confirmText={t('delete')}
        variant="destructive"
        isLoading={tenantsData.delete.isPending}
      />
    </div>
  );
}
