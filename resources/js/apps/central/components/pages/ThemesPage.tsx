import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card } from '@/shared/components/molecules/Card';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks';
import { themes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';
import { Copy, RotateCcw, Trash2, Check, Plus, Edit } from 'lucide-react';

const getMediumPreviewUrl = (url?: string | null) => {
  if (!url) return null;

  const mediaLibraryPattern = /^(.*\/medialibrary\/\d+\/\d+\/)([^/]+)\.(\w+)$/;
  const match = url.match(mediaLibraryPattern);

  if (!match) return url;

  const [, basePath, fileName] = match;
  return `${basePath}conversions/${fileName}-medium.jpg`;
};

export function ThemesPage() {
  const navigate = useNavigate();
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewErrorIds, setPreviewErrorIds] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate' | 'reset'; theme: Theme } | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(5);
  const { toast } = useToast();

  const loadThemes = async () => {
    try {
      setIsLoading(true);
      const [themesList, active] = await Promise.all([
        themes.list(),
        themes.active()
      ]);

      setAllThemes(themesList.data);
      setActiveTheme(active.data);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load themes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirmAction) return;

    setConfirmCountdown(5);
    const interval = setInterval(() => {
      setConfirmCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmAction]);

  const handleActivate = (theme: Theme) => {
    setConfirmAction({ type: 'activate', theme });
  };

  const handleReset = (theme: Theme) => {
    setConfirmAction({ type: 'reset', theme });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'activate') {
        await themes.activate({ slug: confirmAction.theme.slug });
        toast({
          title: 'Success',
          description: 'Theme activated successfully',
        });
      }

      if (confirmAction.type === 'reset') {
        await themes.reset(confirmAction.theme.id);
        toast({
          title: 'Success',
          description: 'Theme reset to blueprint defaults',
        });
      }

      await loadThemes();
      setConfirmAction(null);
    } catch {
      toast({
        title: 'Error',
        description: confirmAction.type === 'activate'
          ? 'Failed to activate theme'
          : 'Failed to reset theme',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (id: number) => {
    const name = prompt('Enter a name for the duplicated theme:');
    if (!name) return;

    try {
      await themes.duplicate(id, { name });
      toast({
        title: 'Success',
        description: 'Theme duplicated successfully',
      });
      await loadThemes();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to duplicate theme',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    try {
      await themes.delete(id);
      toast({
        title: 'Success',
        description: 'Theme deleted successfully',
      });
      await loadThemes();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete theme',
        variant: 'destructive',
      });
    }
  };



  const handleCreateTheme = () => {
    navigate('/dashboard/themes/new/builder');
  };

  const handleEditTheme = (themeId: number) => {
    navigate(`/dashboard/themes/${themeId}/builder`);
  };

  const handleCustomizeTheme = (themeId: number) => {
    navigate(`/dashboard/themes/${themeId}/customize`);
  };

  const isThemeActive = (slug: string) => {
    return activeTheme?.slug === slug;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Themes"
          description="Manage your site themes"
        />
        <div className="mt-6 text-center text-gray-500">Loading themes...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Themes"
        description="Manage and activate your site themes"
        actions={
          <Button variant="default" size="sm" onClick={handleCreateTheme}>
            <Plus className="w-4 h-4 mr-2" />
            Create Theme
          </Button>
        }
      />

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'activate' ? 'Switch Theme?' : 'Reset Theme to Blueprint?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'activate'
                ? 'Switching themes will overwrite current customizations (colors, spacing, typography, header, and footer). This action cannot be undone.'
                : 'This will remove all customizations and restore blueprint defaults (colors, spacing, typography, header, and footer). This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'reset' ? 'destructive' : 'default'}
              disabled={confirmCountdown > 0}
              onClick={handleConfirmAction}
            >
              {confirmCountdown > 0
                ? `${confirmAction?.type === 'activate' ? 'Switch' : 'Reset'} (${confirmCountdown}s)`
                : confirmAction?.type === 'activate' ? 'Switch Theme' : 'Reset Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Themes */}
      <div className="mt-6">
        {allThemes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">No themes available</p>
            <Button onClick={handleCreateTheme} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create your first theme
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allThemes.map((theme) => (
              <Card key={theme.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{theme.name}</h3>
                      {isThemeActive(theme.slug) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>v{theme.version}</span>
                      <span>•</span>
                      <span>{theme.author}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  {theme.preview_image && !previewErrorIds.has(theme.id) ? (
                    <img
                      src={getMediumPreviewUrl(theme.preview_image) || theme.preview_image}
                      alt={`${theme.name} preview`}
                      className="w-full h-40 object-cover rounded-md border"
                      loading="lazy"
                      onError={() => {
                        setPreviewErrorIds((prev) => {
                          const next = new Set(prev);
                          next.add(theme.id);
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <div className="w-full h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-gray-500">
                      No preview image
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!isThemeActive(theme.slug) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleActivate(theme)}
                      className="flex-1 min-w-[100px]"
                    >
                      Activate
                    </Button>
                  )}

                  {isThemeActive(theme.slug) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCustomizeTheme(theme.id)}
                      className="flex-1 min-w-[120px]"
                    >
                      Customize
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTheme(theme.id)}
                    title="Edit Theme"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(theme)}
                    title="Reset to blueprint"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(theme.id)}
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(theme.id)}
                    className="text-red-600 hover:text-red-700"
                    title={isThemeActive(theme.slug) ? 'Cannot delete active theme' : 'Delete'}
                    disabled={isThemeActive(theme.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
