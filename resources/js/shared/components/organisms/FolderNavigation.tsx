import { ChevronRight, Home, Folder, Plus } from 'lucide-react';
import { useState } from 'react';
import type { MediaFolder } from '@/shared/services/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/lib/utils';

interface FolderNavigationProps {
  currentFolder: MediaFolder | null;
  folders: MediaFolder[];
  onFolderChange: (folder: MediaFolder | null) => void;
  onCreateFolder?: (name: string, parentId?: string) => void;
  className?: string;
}

export function FolderNavigation({
  currentFolder,
  folders,
  onFolderChange,
  onCreateFolder,
  className,
}: FolderNavigationProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Build breadcrumb path
  const getBreadcrumbs = () => {
    if (!currentFolder) return [];

    const breadcrumbs: MediaFolder[] = [];
    let folder: MediaFolder | undefined = currentFolder;

    while (folder) {
      breadcrumbs.unshift(folder);
      folder = folders.find((f) => f.id === folder?.parent_id);
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    if (onCreateFolder) {
      onCreateFolder(newFolderName.trim(), currentFolder?.id?.toString());
    }

    setNewFolderName('');
    setIsCreateModalOpen(false);
  };

  // Get root-level folders
  const rootFolders = folders.filter((f) => !f.parent_id);

  // Get child folders of current folder
  const childFolders = currentFolder
    ? folders.filter((f) => f.parent_id === currentFolder.id)
    : rootFolders;

  return (
    <>
      <div className={cn('flex items-center justify-between gap-4 p-4 bg-card border-b', className)}>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFolderChange(null)}
            className={cn(
              'h-8 px-2',
              !currentFolder && 'bg-muted'
            )}
          >
            <Home className="w-4 h-4" />
          </Button>

          {breadcrumbs.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFolderChange(folder)}
                className={cn(
                  'h-8 px-2',
                  index === breadcrumbs.length - 1 && 'bg-muted'
                )}
              >
                <Folder className="w-4 h-4 mr-2" />
                {folder.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Folder Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Folder Selector */}
          {childFolders.length > 0 && (
            <Select
              value={currentFolder?.id?.toString() || 'root'}
              onValueChange={(value) => {
                if (value === 'root') {
                  onFolderChange(null);
                } else {
                  const folder = folders.find((f) => f.id.toString() === value);
                  onFolderChange(folder || null);
                }
              }}
            >
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Jump to folder..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root</SelectItem>
                {childFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id.toString()}>
                    <div className="flex items-center">
                      <Folder className="w-4 h-4 mr-2" />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Create Folder Button */}
          {onCreateFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            {currentFolder && (
              <div className="text-sm text-muted-foreground">
                Will be created inside: <span className="font-medium">{currentFolder.name}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              <Folder className="w-4 h-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
