import { useState } from 'react';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { themeParts as themePartsApi } from '@/shared/services/api/themeParts';
import type { ThemePart, CreateThemePartData, UpdateThemePartData } from '@/shared/services/api/types';
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

const themePartSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional(),
  type: z.enum(['header', 'footer', 'sidebar']),
  status: z.enum(['draft', 'published']),
});

const formFields: FormField[] = [
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Main Header',
    required: true,
    description: 'Name for this theme part',
  },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    placeholder: 'main-header (optional - auto-generated)',
    required: false,
    description: 'URL-friendly identifier',
  },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { label: 'Header', value: 'header' },
      { label: 'Footer', value: 'footer' },
      { label: 'Sidebar', value: 'sidebar' },
    ],
    description: 'What type of component is this?',
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ],
    description: 'Publication status',
  },
];

// ============================================================================
// Component
// ============================================================================

export function ThemePartsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ThemePart | null>(null);
  const [deletingPart, setDeletingPart] = useState<ThemePart | null>(null);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const partsData = useCrud<ThemePart, CreateThemePartData, UpdateThemePartData>({
    resource: 'theme-parts',
    apiService: themePartsApi,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: CreateThemePartData) => {
    try {
      const response = await partsData.create.mutateAsync(data) as { data?: ThemePart };
      toast({
        title: 'Theme part created',
        description: 'You can now design it in the editor.',
      });
      setIsCreateModalOpen(false);
      
      // Navigate to editor
      if (response.data?.id) {
        navigate(`/dashboard/theme-parts/${response.data.id}/edit`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create theme part';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: UpdateThemePartData) => {
    if (!editingPart) return;

    try {
      await partsData.update.mutateAsync({ id: editingPart.id, data });
      toast({
        title: 'Theme part updated',
        description: 'Changes saved successfully.',
      });
      setEditingPart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update theme part';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPart) return;

    try {
      await partsData.delete.mutateAsync(deletingPart.id);
      toast({
        title: 'Theme part deleted',
        description: 'The theme part has been removed.',
      });
      setDeletingPart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete theme part';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (part: ThemePart) => {
    navigate(`/dashboard/theme-parts/${part.id}/edit`);
  };

  // ============================================================================
  // Table Configuration
  // ============================================================================

  const columns: Column<ThemePart>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (part) => (
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{part.name}</div>
            <div className="text-sm text-muted-foreground">{part.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (part) => (
        <Badge variant="outline">
          {part.type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (part) => (
        <Badge variant={part.status === 'published' ? 'default' : 'secondary'}>
          {part.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (part) => new Date(part.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (part) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(part)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingPart(part)}
          >
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingPart(part)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theme Parts"
        description="Create reusable headers, footers, and sections for your site."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Theme Part
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={partsData.list.data?.data || []}
        isLoading={partsData.list.isLoading}
        emptyMessage="No theme parts yet. Create your first one!"
      />

      {/* Create Modal */}
      <FormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        title="Create Theme Part"
        description="Create a new reusable component for your site."
        fields={formFields}
        schema={themePartSchema}
        isLoading={partsData.create.isPending}
      />

      {/* Edit Modal */}
      {editingPart && (
        <FormModal
          open={!!editingPart}
          onOpenChange={(open) => !open && setEditingPart(null)}
          onSubmit={handleUpdate}
          title="Edit Theme Part"
          description="Update theme part settings."
          fields={formFields}
          schema={themePartSchema}
          defaultValues={editingPart}
          isLoading={partsData.update.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deletingPart && (
        <ConfirmDialog
          open={!!deletingPart}
          onOpenChange={(open) => !open && setDeletingPart(null)}
          onConfirm={handleDelete}
          title="Delete Theme Part"
          description={`Are you sure you want to delete "${deletingPart.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
          isLoading={partsData.delete.isPending}
        />
      )}
    </div>
  );
}
