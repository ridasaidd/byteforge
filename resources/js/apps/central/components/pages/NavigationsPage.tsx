import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Menu as MenuIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/organisms/ConfirmDialog';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { navigations, type Navigation } from '@/shared/services/api/navigations';
import { toast } from 'sonner';
import { NavigationEditor } from '../navigation/NavigationEditor';

export function NavigationsPage() {
  const [navigationList, setNavigationList] = useState<Navigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNavigation, setSelectedNavigation] = useState<Navigation | null>(null);
  const [deletingNavigation, setDeletingNavigation] = useState<Navigation | null>(null);
  const { t } = useTranslation('navigations');

  const fetchNavigations = async () => {
    try {
      setIsLoading(true);
      const response = await navigations.list();
      setNavigationList(response.data);
    } catch (error) {
      console.error('Failed to fetch navigations:', error);
      toast.error(t('failed_load'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNavigations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setSelectedNavigation(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (navigation: Navigation) => {
    setSelectedNavigation(navigation);
    setIsEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingNavigation) return;

    try {
      await navigations.delete(deletingNavigation.id);
      toast.success(t('deleted_success'));
      setDeletingNavigation(null);
      fetchNavigations();
    } catch (error) {
      console.error('Failed to delete navigation:', error);
      toast.error(t('failed_delete'));
    }
  };

  const handleSave = () => {
    setIsEditorOpen(false);
    setSelectedNavigation(null);
    fetchNavigations();
  };

  const handleCancel = () => {
    setIsEditorOpen(false);
    setSelectedNavigation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (isEditorOpen) {
    return (
      <NavigationEditor
        navigation={selectedNavigation}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 me-2" />
            {t('create_navigation')}
          </Button>
        }
      />

      {navigationList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MenuIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_navigations_title')}</h3>
          <p className="text-gray-600 mb-6">{t('no_navigations_description')}</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 me-2" />
            {t('create_navigation')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {navigationList.map((nav) => (
            <div
              key={nav.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{nav.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        nav.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : nav.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {nav.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{t('slug_label', { slug: nav.slug })}</p>
                  <div className="text-sm text-gray-500">
                    {t('menu_items_other', { count: nav.structure?.length || 0 })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(nav)}
                  >
                    <Edit className="w-4 h-4 me-2" />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingNavigation(nav)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingNavigation}
        onOpenChange={(open) => !open && setDeletingNavigation(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        description={t('delete_confirm', { name: deletingNavigation?.name ?? '' })}
        confirmText={t('delete')}
        variant="destructive"
      />
    </div>
  );
}
