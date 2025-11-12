import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { pages as pagesApi } from '@/shared/services/api/pages';
import { themes } from '@/shared/services/api/themes';
import { layouts as layoutsApi } from '@/shared/services/api/layouts';
import { themeParts as themePartsApi } from '@/shared/services/api/themeParts';
import type { Page, CreatePageData, UpdatePageData, PageTemplate } from '@/shared/services/api/types';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { TabbedFormModal, type FormTab } from '@/shared/components/organisms/TabbedFormModal';
import { PageCreationWizard, type PageCreationData } from '@/shared/components/organisms/PageCreationWizard';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast, useCrud } from '@/shared/hooks';

// ============================================================================
// Form Schema
// ============================================================================

const pageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format (use lowercase, numbers, and hyphens)').optional(),
  page_type: z.enum(['general', 'home', 'about', 'contact', 'blog', 'service', 'product', 'custom']),
  status: z.enum(['draft', 'published', 'archived']),
  is_homepage: z.boolean().optional(),
  layout_id: z.union([z.string(), z.number(), z.null()]).optional().transform(val => {
    if (val === 'none' || val === null || val === undefined) return null;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  header_id: z.union([z.string(), z.number(), z.null()]).optional().transform(val => {
    if (val === 'none' || val === null || val === undefined) return null;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  footer_id: z.union([z.string(), z.number(), z.null()]).optional().transform(val => {
    if (val === 'none' || val === null || val === undefined) return null;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  meta_data: z.object({
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    meta_keywords: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Component
// ============================================================================

export function PagesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const pagesData = useCrud<Page, CreatePageData, UpdatePageData>({
    resource: 'pages',
    apiService: pagesApi,
  });

  // Fetch available templates from active theme
  const { data: templatesResponse } = useQuery({
    queryKey: ['templates', 'active'],
    queryFn: async () => {
      return await themes.getActiveTemplates();
    },
  });

  const templates: PageTemplate[] = templatesResponse?.data || [];

  // Fetch layouts for selection
  const { data: layoutsResponse } = useQuery({
    queryKey: ['layouts', 'published'],
    queryFn: async () => {
      return await layoutsApi.list({ status: 'published', per_page: 100 });
    },
  });

  const layoutOptions = (layoutsResponse?.data || []).map(layout => ({
    label: layout.name,
    value: String(layout.id),
  }));

  // Fetch theme parts for selection
  const { data: headersResponse } = useQuery({
    queryKey: ['theme-parts', 'header', 'published'],
    queryFn: async () => {
      return await themePartsApi.list({ type: 'header', status: 'published', per_page: 100 });
    },
  });

  const headerOptions = (headersResponse?.data || []).map(part => ({
    label: part.name,
    value: String(part.id),
  }));

  const { data: footersResponse } = useQuery({
    queryKey: ['theme-parts', 'footer', 'published'],
    queryFn: async () => {
      return await themePartsApi.list({ type: 'footer', status: 'published', per_page: 100 });
    },
  });

  const footerOptions = (footersResponse?.data || []).map(part => ({
    label: part.name,
    value: String(part.id),
  }));

  // Build form tabs dynamically with fetched options
  const getFormTabs = (): FormTab[] => [
    {
      id: 'general',
      label: 'General',
      fields: [
        {
          name: 'title',
          label: 'Page Title',
          type: 'text',
          placeholder: 'About Us',
          required: true,
          description: 'The title of the page',
        },
        {
          name: 'slug',
          label: 'Slug',
          type: 'text',
          placeholder: 'about-us (optional - auto-generated from title)',
          required: false,
          description: 'URL-friendly version of the title',
        },
        {
          name: 'page_type',
          label: 'Page Type',
          type: 'select',
          required: true,
          options: [
            { label: 'General', value: 'general' },
            { label: 'Home', value: 'home' },
            { label: 'About', value: 'about' },
            { label: 'Contact', value: 'contact' },
            { label: 'Blog', value: 'blog' },
            { label: 'Service', value: 'service' },
            { label: 'Product', value: 'product' },
            { label: 'Custom', value: 'custom' },
          ],
          description: 'The type of page content',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Archived', value: 'archived' },
          ],
          description: 'Publication status',
        },
      ],
    },
    {
      id: 'layout',
      label: 'Layout & Parts',
      fields: [
        {
          name: 'layout_id',
          label: 'Layout',
          type: 'select',
          required: false,
          options: [
            { label: 'None (use manual parts)', value: 'none' },
            ...layoutOptions,
          ],
          description: 'Choose a pre-configured layout with header/footer',
        },
        {
          name: 'header_id',
          label: 'Header Override',
          type: 'select',
          required: false,
          options: [
            { label: 'None (use layout default)', value: 'none' },
            ...headerOptions,
          ],
          description: 'Override the layout header with a specific one',
        },
        {
          name: 'footer_id',
          label: 'Footer Override',
          type: 'select',
          required: false,
          options: [
            { label: 'None (use layout default)', value: 'none' },
            ...footerOptions,
          ],
          description: 'Override the layout footer with a specific one',
        },
      ],
    },
    {
      id: 'seo',
      label: 'SEO',
      fields: [
        {
          name: 'meta_data.meta_title',
          label: 'SEO Title',
          type: 'text',
          placeholder: 'Optional - defaults to page title',
          description: 'SEO meta title (for search engines)',
        },
        {
          name: 'meta_data.meta_description',
          label: 'SEO Description',
          type: 'textarea',
          placeholder: 'A brief description for search engines',
          description: 'SEO meta description',
        },
        {
          name: 'meta_data.meta_keywords',
          label: 'SEO Keywords',
          type: 'text',
          placeholder: 'keyword1, keyword2, keyword3',
          description: 'Comma-separated keywords',
        },
      ],
    },
  ];

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: PageCreationData, creationType: 'scratch' | 'template' | 'import') => {
    try {
      await pagesData.create.mutateAsync(data as CreatePageData);
      toast({
        title: 'Page created',
        description: creationType === 'template'
          ? 'Page created with template content successfully.'
          : 'Blank page created successfully.',
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create page';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof pageSchema>) => {
    if (!editingPage) return;

    try {
      pagesData.update.mutate({ id: editingPage.id, data: data as UpdatePageData });
      toast({
        title: 'Page updated',
        description: 'The page has been updated successfully.',
      });
      setEditingPage(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update page',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;

    try {
  pagesData.delete.mutate(deletingPage.id);
      toast({
        title: 'Page deleted',
        description: 'The page has been deleted successfully.',
      });
      setDeletingPage(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete page',
        variant: 'destructive',
      });
    }
  };

  // ============================================================================
  // Table Configuration
  // ============================================================================

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
      label: 'Title',
      sortable: true,
      render: (page) => (
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/dashboard/pages/${page.id}/edit`)}
            className="font-medium flex items-center gap-2 hover:text-primary transition-colors text-left"
          >
            {page.title}
            {page.is_homepage && (
              <Badge variant="default" className="text-xs">
                Homepage
              </Badge>
            )}
          </button>
          <div className="text-xs text-muted-foreground">/{page.slug}</div>
        </div>
      ),
    },
    {
      key: 'page_type',
      label: 'Type',
      render: (page) => (
        <Badge variant="outline" className="capitalize">
          {page.page_type}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (page) => (
        <Badge variant={getStatusBadgeVariant(page.status)} className="capitalize">
          {page.status}
        </Badge>
      ),
    },
    {
      key: 'published_at',
      label: 'Published',
      render: (page) => (
        <span className="text-sm text-muted-foreground">
          {page.published_at
            ? new Date(page.published_at).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (page) => (
        <span className="text-sm text-muted-foreground">
          {new Date(page.updated_at).toLocaleDateString()}
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
          title="View page"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/${page.slug}`, '_blank');
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        title="Edit page"
        onClick={(e) => {
          e.stopPropagation();
          setEditingPage(page);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Delete page"
        onClick={(e) => {
          e.stopPropagation();
          setDeletingPage(page);
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
        title="Pages"
        description="Manage your website pages and content"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Page
          </Button>
        }
      />

      <DataTable<Page>
  data={pagesData.list.data?.data || []}
        columns={columns}
  isLoading={pagesData.list.isLoading}
  emptyMessage="No pages found"
  emptyDescription="Create your first page to get started"
  actions={actions}
  currentPage={pagesData.list.data?.meta.current_page}
  totalPages={pagesData.list.data?.meta.last_page}
  onPageChange={pagesData.pagination.setPage}
      />

      {/* Create Page Wizard */}
      <PageCreationWizard
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        templates={templates}
  isLoading={pagesData.create.isPending}
      />

      {/* Edit Modal */}
      <TabbedFormModal
        open={!!editingPage}
        onOpenChange={(open: boolean) => !open && setEditingPage(null)}
        onSubmit={handleUpdate}
        title="Edit Page"
        description="Update page information"
        tabs={getFormTabs()}
        schema={pageSchema}
        defaultValues={editingPage ? {
          title: editingPage.title,
          slug: editingPage.slug,
          page_type: editingPage.page_type,
          status: editingPage.status,
          is_homepage: editingPage.is_homepage,
          layout_id: editingPage.layout_id ? String(editingPage.layout_id) : 'none',
          header_id: editingPage.header_id ? String(editingPage.header_id) : 'none',
          footer_id: editingPage.footer_id ? String(editingPage.footer_id) : 'none',
          meta_data: editingPage.meta_data as { meta_title?: string; meta_description?: string; meta_keywords?: string } | undefined,
        } as never : undefined}
        isLoading={pagesData.update.isPending}
        submitText="Save Changes"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingPage}
        onOpenChange={(open) => !open && setDeletingPage(null)}
        onConfirm={handleDelete}
        title="Delete Page"
        description={
          <>
            Are you sure you want to delete <strong>{deletingPage?.title}</strong>?
            {' '}This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="destructive"
  isLoading={pagesData.delete.isPending}
      />
    </div>
  );
}
