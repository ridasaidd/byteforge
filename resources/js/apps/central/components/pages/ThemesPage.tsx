import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card } from '@/shared/components/molecules/Card';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks';
import { themes } from '@/shared/services/api/themes';
import type { Theme, AvailableTheme } from '@/shared/services/api/types';
import { Download, Copy, RotateCcw, Trash2, Check } from 'lucide-react';

export function ThemesPage() {
  const [availableThemes, setAvailableThemes] = useState<AvailableTheme[]>([]);
  const [installedThemes, setInstalledThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadThemes = async () => {
    try {
      setIsLoading(true);
      const [available, installed, active] = await Promise.all([
        themes.available(),
        themes.list(),
        themes.active()
      ]);

      // Filter out installed themes from available themes
      const installedSlugs = installed.data.map((t: Theme) => t.slug);
      const uninstalledThemes = available.data.filter(
        (t: AvailableTheme) => !installedSlugs.includes(t.slug)
      );

      setAvailableThemes(uninstalledThemes);
      setInstalledThemes(installed.data);
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

  const handleActivate = async (slug: string) => {
    try {
  await themes.activate({ slug });
      toast({
        title: 'Success',
        description: 'Theme activated successfully',
      });
      await loadThemes();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to activate theme',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async (id: number) => {
    try {
  await themes.reset(id);
      toast({
        title: 'Success',
        description: 'Theme reset to default',
      });
      await loadThemes();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset theme',
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

  const handleExport = async (id: number) => {
    try {
  const data = await themes.export(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Theme exported successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to export theme',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
  await themes.sync();
      toast({
        title: 'Success',
        description: 'Themes synced from disk',
      });
      await loadThemes();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sync themes',
        variant: 'destructive',
      });
    }
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
        description="Manage your site themes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSync}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Sync
            </Button>
          </div>
        }
      />

      {/* Available Themes */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Available Themes</h2>
        {availableThemes.length === 0 ? (
          <p className="text-gray-500 text-sm">All available themes are already installed.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((theme) => (
              <Card key={theme.slug} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{theme.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>v{theme.version}</span>
                      <span>•</span>
                      <span>{theme.author}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleActivate(theme.slug)}
                    className="flex-1"
                  >
                    Activate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Installed Themes */}
      {installedThemes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Installed Themes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedThemes.map((theme) => (
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

                <div className="flex gap-2">
                  {!isThemeActive(theme.slug) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleActivate(theme.slug)}
                      className="flex-1"
                    >
                      Activate
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(theme.id)}
                    title="Reset to default"
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
                    onClick={() => handleExport(theme.id)}
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {!isThemeActive(theme.slug) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(theme.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
