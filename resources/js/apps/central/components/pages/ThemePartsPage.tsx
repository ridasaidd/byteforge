import { useState } from 'react';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { themeParts as themePartsApi } from '@/shared/services/api/themeParts';
import type { ThemePart, CreateThemePartData, UpdateThemePartData } from '@/shared/services/api/types';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { FormModal, type FormField } from '@/shared/components/organisms/FormModal';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

export function ThemePartsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('themes');

  const themePartSchema = z.object({
    name: z.string().min(1, t('part_schema_name_required')).max(255, t('part_schema_name_too_long')),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t('part_schema_slug_invalid')).optional(),
    type: z.enum(['header', 'footer', 'sidebar']),
    status: z.enum(['draft', 'published']),
  });

  const formFields: FormField[] = [
    {
      name: 'name',
      label: t('part_name_label'),
      type: 'text',
      placeholder: t('part_name_placeholder'),
      required: true,
      description: t('part_name_desc'),
    },
    {
      name: 'slug',
      label: t('part_slug_label'),
      type: 'text',
      placeholder: t('part_slug_placeholder'),
      required: false,
      description: t('part_slug_desc'),
    },
    {
      name: 'type',
      label: t('part_type_label'),
      type: 'select',
      required: true,
      options: [
        { label: t('part_type_header'), value: 'header' },
        { label: t('part_type_footer'), value: 'footer' },
        { label: t('part_type_sidebar'), value: 'sidebar' },
      ],
      description: t('part_type_desc'),
    },
    {
      name: 'status',
      label: t('part_status_label'),
      type: 'select',
      required: true,
      options: [
        { label: t('part_status_draft'), value: 'draft' },
        { label: t('part_status_published'), value: 'published' },
      ],
      description: t('part_status_desc'),
    },
  ];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ThemePart | null>(null);
  const [deletingPart, setDeletingPart] = useState<ThemePart | null>(null);

  const partsData = useCrud<ThemePart, CreateThemePartData, UpdateThemePartData>({
    resource: 'theme-parts',
    apiService: themePartsApi,
  });

  const handleCreate = async (data: CreateThemePartData) => {
    try {
      const response = await partsData.create.mutateAsync(data) as { data?: ThemePart };
      toast({ title: t('part_created_title'), description: t('part_created_desc') });
      setIsCreateModalOpen(false);
      if (response.data?.id) {
        navigate(`/dashboard/theme-parts/${response.data.id}/edit`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('failed_create_part');
      toast({ title: t('error'), description: message, variant: 'destructive' });
    }
  };

  const handleUpdate = async (data: UpdateThemePartData) => {
    if (!editingPart) return;
    try {
      await partsData.update.mutateAsync({ id: editingPart.id, data });
      toast({ title: t('part_updated_title'), description: t('part_updated_desc') });
      setEditingPart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('failed_update_part');
      toast({ title: t('error'), description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingPart) return;
    try {
      await partsData.delete.mutateAsync(deletingPart.id);
      toast({ title: t('part_deleted_title'), description: t('part_deleted_desc') });
      setDeletingPart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('failed_delete_part');
      toast({ title: t('error'), description: message, variant: 'destructive' });
    }
  };

  const handleEdit = (part: ThemePart) => {
    navigate(`/dashboard/theme-parts/${part.id}/edit`);
  };

  const columns: Column<ThemePart>[] = [
    {
      key: 'name',
      label: t('col_name'),
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
      label: t('col_type'),
      sortable: true,
      render: (part) => (
        <Badge variant="outline">{part.type.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'status',
      label: t('col_status'),
      sortable: true,
      render: (part) => (
        <Badge variant={part.status === 'published' ? 'default' : 'secondary'}>
          {part.status === 'published' ? t('part_status_published') : t('part_status_draft')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: t('col_created'),
      sortable: true,
      render: (part) => new Date(part.created_at).toLocaleDateString(i18n.language),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (part) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(part)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingPart(part)}>
            {t('settings')}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('parts_title')}
        description={t('parts_description')}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('create_part')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={partsData.list.data?.data || []}
        isLoading={partsData.list.isLoading}
        emptyMessage={t('no_parts')}
      />

      <FormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        title={t('create_part_modal_title')}
        description={t('create_part_modal_desc')}
        fields={formFields}
        schema={themePartSchema}
        isLoading={partsData.create.isPending}
      />

      {editingPart && (
        <FormModal
          open={!!editingPart}
          onOpenChange={(open) => !open && setEditingPart(null)}
          onSubmit={handleUpdate}
          title={t('edit_part_modal_title')}
          description={t('edit_part_modal_desc')}
          fields={formFields}
          schema={themePartSchema}
          defaultValues={editingPart}
          isLoading={partsData.update.isPending}
        />
      )}

      {deletingPart && (
        <ConfirmDialog
          open={!!deletingPart}
          onOpenChange={(open) => !open && setDeletingPart(null)}
          onConfirm={handleDelete}
          title={t('delete_part_title')}
          description={t('delete_part_confirm', { name: deletingPart.name })}
          confirmText={t('delete')}
          variant="destructive"
          isLoading={partsData.delete.isPending}
        />
      )}
    </div>
  );
}
