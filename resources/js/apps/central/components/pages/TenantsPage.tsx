// Local ApiService type definition to satisfy useCrud generic
type ApiService<T, CreateData, UpdateData> = {
  list: (params?: { page?: number; per_page?: number; search?: string }) => Promise<{ data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>;
  get: (id: string | number) => Promise<{ data: T }>;
  create: (data: CreateData) => Promise<{ data: T }>;
  update: (id: string | number, data: UpdateData) => Promise<{ data: T }>;
  delete: (id: string | number) => Promise<void>;
};
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { tenants as tenantsApi } from '@/shared/services/api/tenants';
import type { Tenant, CreateTenantData, UpdateTenantData } from '@/shared/services/api/types';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { FormModal, type FormField } from '@/shared/components/organisms/FormModal';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

// ============================================================================
// Form Schema
// ============================================================================

const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  domain: z.string().min(1, 'Domain is required').regex(
    /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
    'Invalid domain format'
  ),
});

const formFields: FormField[] = [
  {
    name: 'name',
    label: 'Tenant Name',
    type: 'text',
    placeholder: 'Acme Corporation',
    required: true,
    description: 'The name of the tenant organization',
  },
  {
    name: 'domain',
    label: 'Domain',
    type: 'text',
    placeholder: 'acme.example.com',
    required: true,
    description: 'The domain where this tenant will be accessible',
  },
];

// ============================================================================
// Component
// ============================================================================

export function TenantsPage() {
  const { toast } = useToast();

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
  tenantsData.create.mutate(data);
      toast({
        title: 'Tenant created',
        description: 'The tenant has been created successfully.',
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create tenant',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof tenantSchema>) => {
    if (!editingTenant) return;

    try {
  tenantsData.update.mutate({ id: editingTenant.id, data });
      toast({
        title: 'Tenant updated',
        description: 'The tenant has been updated successfully.',
      });
      setEditingTenant(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update tenant',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;

    try {
  tenantsData.delete.mutate(deletingTenant.id);
      toast({
        title: 'Tenant deleted',
        description: 'The tenant has been deleted successfully.',
      });
      setDeletingTenant(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tenant',
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
      label: 'Name',
      sortable: true,
      render: (tenant) => (
        <div className="font-medium">{tenant.name}</div>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (tenant) => (
        <Badge variant="outline">{tenant.slug}</Badge>
      ),
    },
    {
      key: 'domain',
      label: 'Domain',
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
      label: 'Created',
      render: (tenant) => (
        <span className="text-sm text-muted-foreground">
          {new Date(tenant.created_at).toLocaleDateString()}
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
        title="Tenants"
        description="Manage tenant organizations and their configurations"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        }
      />

      <DataTable<Tenant>
  data={tenantsData.list.data?.data || []}
        columns={columns}
  isLoading={tenantsData.list.isLoading}
  emptyMessage="No tenants found"
        emptyDescription="Create your first tenant to get started"
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
        title="Create Tenant"
        description="Add a new tenant organization"
        fields={formFields}
        schema={tenantSchema}
  isLoading={tenantsData.create.isPending}
        submitText="Create"
      />

      {/* Edit Modal */}
      <FormModal
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        onSubmit={handleUpdate}
        title="Edit Tenant"
        description="Update tenant information"
        fields={formFields}
        schema={tenantSchema}
        defaultValues={editingTenant || undefined}
  isLoading={tenantsData.update.isPending}
        submitText="Save Changes"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingTenant}
        onOpenChange={(open) => !open && setDeletingTenant(null)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        description={
          <>
            Are you sure you want to delete <strong>{deletingTenant?.name}</strong>?
            {' '}This action cannot be undone. All data associated with this tenant will be permanently deleted.
          </>
        }
        confirmText="Delete"
        variant="destructive"
  isLoading={tenantsData.delete.isPending}
      />
    </div>
  );
}
