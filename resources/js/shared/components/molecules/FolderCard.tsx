import { Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MediaFolder } from '@/shared/services/api';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';

interface FolderCardProps {
  folder: MediaFolder;
  onClick?: () => void;
  onRename?: (folder: MediaFolder, newName: string) => void;
  onDelete?: (folder: MediaFolder) => void;
  className?: string;
}

export function FolderCard({ folder, onClick, onRename, onDelete, className }: FolderCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name && onRename) {
      onRename(folder, newName.trim());
      setIsRenaming(false);
    } else {
      setNewName(folder.name);
      setIsRenaming(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(folder);
    }
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
  };

  return (
    <div
      className={cn(
        'group relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-primary',
        className
      )}
      onClick={() => !isRenaming && onClick?.()}
    >
      {/* Actions Menu */}
      {(onRename || onDelete) && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onRename && (
                <DropdownMenuItem onClick={handleRenameClick}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Folder Icon */}
      <div className="aspect-square bg-muted flex items-center justify-center">
        <Folder className="w-16 h-16 text-primary" />
      </div>

      {/* Folder Name */}
      <div className="p-3 border-t">
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              } else if (e.key === 'Escape') {
                setNewName(folder.name);
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <p className="text-sm font-medium truncate" title={folder.name}>
            {folder.name}
          </p>
        )}
      </div>
    </div>
  );
}
