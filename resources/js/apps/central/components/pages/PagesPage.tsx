import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { z } from 'zod';
import { api, type Page, type CreatePageData, type UpdatePageData } from '@/shared/services/api';
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

const pageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format (use lowercase, numbers, and hyphens)').optional(),
  page_type: z.enum(['general', 'home', 'about', 'contact', 'blog', 'service', 'product', 'custom']),
  status: z.enum(['draft', 'published', 'archived']),
  is_homepage: z.boolean().optional(),
  meta_data: z.object({
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    meta_keywords: z.string().optional(),
  }).optional(),
});

const formFields: FormField[] = [
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
];

// ============================================================================
// Component
// ============================================================================

export function PagesPage() {
  const { toast } = useToast();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);

  // ============================================================================
  // CRUD Hook
  // ============================================================================

  const pages = useCrud<Page, CreatePageData, UpdatePageData>({
    resource: 'pages',
    apiService: api.pages,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async (data: z.infer<typeof pageSchema>) => {
    try {
      pages.create.mutate(data);
      toast({
        title: 'Page created',
        description: 'The page has been created successfully.',
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create page',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: z.infer<typeof pageSchema>) => {
    if (!editingPage) return;

    try {
      pages.update.mutate({ id: editingPage.id, data });
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
      pages.delete.mutate(deletingPage.id);
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
          <div className="font-medium flex items-center gap-2">
            {page.title}
            {page.is_homepage && (
              <Badge variant="default" className="text-xs">
                Homepage
              </Badge>
            )}
          </div>
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
        data={pages.list.data?.data || []}
        columns={columns}
        isLoading={pages.list.isLoading}
        emptyMessage="No pages found"
        emptyDescription="Create your first page to get started"
        actions={actions}
        currentPage={pages.list.data?.meta.current_page}
        totalPages={pages.list.data?.meta.last_page}
        onPageChange={pages.pagination.setPage}
      />

      {/* Create Modal */}
      <FormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreate}
        title="Create Page"
        description="Add a new page to your website"
        fields={formFields}
        schema={pageSchema}
        isLoading={pages.create.isPending}
        submitText="Create"
        defaultValues={{
          status: 'draft',
          page_type: 'general',
          is_homepage: false,
        }}
      />

      {/* Edit Modal */}
      <FormModal
        open={!!editingPage}
        onOpenChange={(open) => !open && setEditingPage(null)}
        onSubmit={handleUpdate}
        title="Edit Page"
        description="Update page information"
        fields={formFields}
        schema={pageSchema}
        defaultValues={editingPage ? {
          title: editingPage.title,
          slug: editingPage.slug,
          page_type: editingPage.page_type,
          status: editingPage.status,
          is_homepage: editingPage.is_homepage,
          meta_data: editingPage.meta_data as { meta_title?: string; meta_description?: string; meta_keywords?: string } | undefined,
        } : undefined}
        isLoading={pages.update.isPending}
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
        isLoading={pages.delete.isPending}
      />
    </div>
  );
}
