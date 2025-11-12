import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { navigations, type Navigation } from '@/shared/services/api/navigations';
import { toast } from 'sonner';
import { NavigationEditor } from '../navigation/NavigationEditor';

export function NavigationsPage() {
  const [navigationList, setNavigationList] = useState<Navigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNavigation, setSelectedNavigation] = useState<Navigation | null>(null);

  const fetchNavigations = async () => {
    try {
      setIsLoading(true);
      const response = await navigations.list();
      setNavigationList(response.data);
    } catch (error) {
      console.error('Failed to fetch navigations:', error);
      toast.error('Failed to load navigations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNavigations();
  }, []);

  const handleCreate = () => {
    setSelectedNavigation(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (navigation: Navigation) => {
    setSelectedNavigation(navigation);
    setIsEditorOpen(true);
  };

  const handleDelete = async (navigation: Navigation) => {
    if (!confirm(`Are you sure you want to delete "${navigation.name}"?`)) {
      return;
    }

    try {
      await navigations.delete(navigation.id);
      toast.success('Navigation deleted successfully');
      fetchNavigations();
    } catch (error) {
      console.error('Failed to delete navigation:', error);
      toast.error('Failed to delete navigation');
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading navigations...</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage navigation menus for your site
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Navigation
        </Button>
      </div>

      {/* Navigation List */}
      {navigationList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MenuIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No navigations yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first navigation menu.</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Navigation
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
                  <p className="text-sm text-gray-600 mb-3">Slug: {nav.slug}</p>
                  <div className="text-sm text-gray-500">
                    {nav.structure?.length || 0} menu item{nav.structure?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(nav)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(nav)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
