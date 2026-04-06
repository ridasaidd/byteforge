import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { tenantPages as pages } from '@/shared/services/api/pages';
import { tenantThemes as themes } from '@/shared/services/api/themes';
import type { Page, CreatePageData, UpdatePageData, PageTemplate } from '@/shared/services/api/types';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { TabbedFormModal, type FormTab } from '@/shared/components/organisms/TabbedFormModal';
import { PageCreationWizard, type PageCreationData } from '@/shared/components/organisms/PageCreationWizard';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

export function PagesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation('pages');
  const { hasPermission } = usePermissions();

  const canCreatePages = hasPermission('pages.create');
  const canEditPages = hasPermission('pages.edit');
  const canDeletePages = hasPermission('pages.delete');

  const pageSchema = z.object({
    title: z.string().min(1, t('title_required')).max(255, t('title_too_long')),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t('slug_invalid')).optional(),
    page_type: z.enum(['general', 'home', 'about', 'contact', 'blog', 'service', 'product', 'custom']),
    status: z.enum(['draft', 'published', 'archived']),
    is_homepage: z.boolean().optional(),
    meta_data: z.object({
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      meta_keywords: z.string().optional(),
    }).optional(),
  });

  const getFormTabs = (): FormTab[] => [
    {
      id: 'general',
      label: t('general_tab'),
      fields: [
        {
          name: 'title',
          label: t('page_title_label'),
          type: 'text',
          placeholder: t('page_title_placeholder'),
          required: true,
          description: t('page_title_description'),
        },
        {
          name: 'slug',
          label: t('slug'),
          type: 'text',
          placeholder: t('slug_placeholder'),
          required: false,
          description: t('slug_description'),
        },
        {
          name: 'page_type',
          label: t('page_type'),
          type: 'select',
          required: true,
          options: [
            { label: t('type_general'), value: 'general' },
            { label: t('type_home'), value: 'home' },
            { label: t('type_about'), value: 'about' },
            { label: t('type_contact'), value: 'contact' },
            { label: t('type_blog'), value: 'blog' },
            { label: t('type_service'), value: 'service' },
            { label: t('type_product'), value: 'product' },
            { label: t('type_custom'), value: 'custom' },
          ],
          description: t('page_type_description'),
        },
        {
          name: 'status',
          label: t('status'),
          type: 'select',
          required: true,
          options: [
            { label: t('status_draft'), value: 'draft' },
            { label: t('status_published'), value: 'published' },
            { label: t('status_archived'), value: 'archived' },
          ],
          description: t('status_description'),
        },
        {
          name: 'is_homepage',
          label: t('set_as_homepage'),
          type: 'checkbox',
          required: false,
          description: t('set_as_homepage_description'),
        },
      ],
    },
    {
      id: 'seo',
      label: t('seo_tab'),
      fields: [
        {
          name: 'meta_data.meta_title',
          label: t('seo_title'),
          type: 'text',
          placeholder: t('seo_title_placeholder'),
          description: t('seo_title_description'),
        },
        {
          name: 'meta_data.meta_description',
          label: t('seo_description'),
          type: 'textarea',
          placeholder: t('seo_description_placeholder'),
          description: t('seo_description_text'),
        },
        {
          name: 'meta_data.meta_keywords',
          label: t('seo_keywords'),
          type: 'text',
          placeholder: t('seo_keywords_placeholder'),
          description: t('seo_keywords_description'),
        },
      ],
    },
  ];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);

  const pagesData = useCrud<Page, CreatePageData, UpdatePageData>({
    resource: 'pages',
    apiService: pages,
  });

  const { data: templatesResponse } = useQuery({
    queryKey: ['templates', 'active'],
    queryFn: async () => themes.getActiveTemplates(),
  });

  const templates: PageTemplate[] = templatesResponse?.data || [];

  const handleCreate = async (data: PageCreationData, creationType: 'scratch' | 'template') => {
    try {
      const response = await pagesData.create.mutateAsync(data as CreatePageData) as { data: Page };
      toast({
        title: t('page_created_title'),
        description: creationType === 'template' ? t('page_created_from_template') : t('page_created_blank'),
      });
      setIsCreateModalOpen(false);

      if (response?.data?.id) {
        navigate(`/cms/pages/${response.data.id}/edit`);
      }
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof pageSchema>) => {
    if (!editingPage) return;

    try {
      await pagesData.update.mutateAsync({ id: editingPage.id, data });
      toast({
        title: t('page_updated_title'),
        description: t('page_updated_description'),
      });
      setEditingPage(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;

    try {
      await pagesData.delete.mutateAsync(deletingPage.id);
      toast({
        title: t('page_deleted_title'),
        description: t('page_deleted_description'),
      });
      setDeletingPage(null);
    } catch (error) {
      toast({
        title: t('error_title'),
        description: error instanceof Error ? error.message : t('delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const columns: Column<Page>[] = [
    {
      key: 'title',
      label: t('title'),
      sortable: true,
      render: (page) => (
        <div className="space-y-1">
          {canEditPages ? (
            <button
              onClick={() => navigate(`/cms/pages/${page.id}/edit`)}
              className="font-medium flex items-center gap-2 hover:text-primary transition-colors text-start"
            >
              {page.title}
              {page.is_homepage && (
                <Badge variant="default" className="text-xs">
                  {t('homepage')}
                </Badge>
              )}
            </button>
          ) : (
            <div className="font-medium flex items-center gap-2 text-start">
              {page.title}
              {page.is_homepage && (
                <Badge variant="default" className="text-xs">
                  {t('homepage')}
                </Badge>
              )}
            </div>
          )}
          <div className="text-xs text-muted-foreground">/{page.slug}</div>
        </div>
      ),
    },
    {
      key: 'page_type',
      label: t('type'),
      render: (page) => (
        <Badge variant="outline" className="capitalize">
          {t(`type_${page.page_type}`)}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (page) => (
        <Badge variant={getStatusBadgeVariant(page.status)} className="capitalize">
          {t(`status_${page.status}`)}
        </Badge>
      ),
    },
    {
      key: 'published_at',
      label: t('published'),
      render: (page) => (
        <span className="text-sm text-muted-foreground">
          {page.published_at ? new Date(page.published_at).toLocaleDateString(i18n.language) : '\u2014'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      label: t('updated'),
      render: (page) => (
        <span className="text-sm text-muted-foreground">
          {new Date(page.updated_at).toLocaleDateString(i18n.language)}
        </span>
      ),
    },
  ];

  const actions = (page: Page) => (
    <div className="flex items-center gap-2">
      {page.status === 'published' && (
        <Button
          variant="ghost"
          size="sm"
          title={t('view_page')}
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/${page.slug}`, '_blank');
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {canEditPages && (
        <Button
          variant="ghost"
          size="sm"
          title={t('edit_page')}
          onClick={(e) => {
            e.stopPropagation();
            setEditingPage(page);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canDeletePages && (
        <Button
          variant="ghost"
          size="sm"
          title={t('delete_page')}
          onClick={(e) => {
            e.stopPropagation();
            setDeletingPage(page);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title')}
        description={t('page_description')}
        actions={canCreatePages ? (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('create_page')}
          </Button>
        ) : undefined}
      />

      <DataTable<Page>
        data={pagesData.list.data?.data || []}
        columns={columns}
        isLoading={pagesData.list.isLoading}
        emptyMessage={t('empty_title')}
        emptyDescription={t('empty_description')}
        actions={actions}
        currentPage={pagesData.list.data?.meta.current_page}
        totalPages={pagesData.list.data?.meta.last_page}
        onPageChange={pagesData.pagination.setPage}
      />

      {canCreatePages && (
        <PageCreationWizard
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreate}
          templates={templates}
          isLoading={pagesData.create.isPending}
        />
      )}

      {canEditPages && (
        <TabbedFormModal
          open={!!editingPage}
          onOpenChange={(open) => !open && setEditingPage(null)}
          onSubmit={handleUpdate}
          title={t('edit_page_title')}
          description={t('edit_page_description')}
          tabs={getFormTabs()}
          schema={pageSchema}
          defaultValues={editingPage ? {
            title: editingPage.title,
            slug: editingPage.slug,
            page_type: editingPage.page_type,
            status: editingPage.status,
            is_homepage: editingPage.is_homepage,
            meta_data: editingPage.meta_data as { meta_title?: string; meta_description?: string; meta_keywords?: string } | undefined,
          } : undefined}
          isLoading={pagesData.update.isPending}
          submitText={t('save_changes')}
        />
      )}

      {canDeletePages && (
        <ConfirmDialog
          open={!!deletingPage}
          onOpenChange={(open) => !open && setDeletingPage(null)}
          onConfirm={handleDelete}
          title={t('delete_page_title')}
          description={
            <Trans
              ns="pages"
              i18nKey="delete_page_confirm"
              values={{ name: deletingPage?.title ?? '' }}
              components={{ strong: <strong /> }}
            />
          }
          confirmText={t('delete')}
          variant="destructive"
          isLoading={pagesData.delete.isPending}
        />
      )}
    </div>
  );
}
