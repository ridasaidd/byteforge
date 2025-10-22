import { useState } from 'react';
import { Grid3x3, List, Search, Filter, X, Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Media, MediaFolder } from '@/shared/services/api';
import { MediaCard } from '../molecules/MediaCard';
import { FolderCard } from '../molecules/FolderCard';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'videos' | 'audio' | 'documents';

interface MediaBrowserProps {
  media: Media[];
  folders?: MediaFolder[];
  selectedMedia: Media[];
  onSelectMedia: (media: Media) => void;
  onMediaClick: (media: Media) => void;
  onFolderClick?: (folder: MediaFolder) => void;
  onRenameFolder?: (folder: MediaFolder, newName: string) => void;
  onDeleteFolder?: (folder: MediaFolder) => void;
  onDeleteMedia?: (media: Media) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function MediaBrowser({
  media,
  folders = [],
  selectedMedia,
  onSelectMedia,
  onMediaClick,
  onFolderClick,
  onRenameFolder,
  onDeleteFolder,
  onDeleteMedia,
  isLoading = false,
  emptyMessage = 'No media files found',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: MediaBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filter media based on search and type
  const filteredMedia = media.filter((item) => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'images' && !item.mime_type.startsWith('image/')) return false;
      if (filterType === 'videos' && !item.mime_type.startsWith('video/')) return false;
      if (filterType === 'audio' && !item.mime_type.startsWith('audio/')) return false;
      if (filterType === 'documents' && 
          !item.mime_type.includes('pdf') && 
          !item.mime_type.includes('document') &&
          !item.mime_type.includes('sheet') &&
          !item.mime_type.includes('text')) return false;
    }

    return true;
  });

  const isMediaSelected = (item: Media) => {
    return selectedMedia.some((m) => m.id === item.id);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterType !== 'all';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left side - Search and Filter */}
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Right side - View toggle */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      {(filteredMedia.length > 0 || folders.length > 0) && (
        <p className="text-sm text-muted-foreground">
          {folders.length > 0 && `${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
          {folders.length > 0 && filteredMedia.length > 0 && ' • '}
          {filteredMedia.length > 0 && `${filteredMedia.length} file${filteredMedia.length !== 1 ? 's' : ''}`}
          {selectedMedia.length > 0 && ` • ${selectedMedia.length} selected`}
        </p>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredMedia.length === 0 && folders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">{emptyMessage}</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Folders first */}
          {folders.map((folder) => (
            <FolderCard
              key={`folder-${folder.id}`}
              folder={folder}
              onClick={() => onFolderClick?.(folder)}
              onRename={onRenameFolder}
              onDelete={onDeleteFolder}
            />
          ))}
          
          {/* Then media files */}
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              isSelected={isMediaSelected(item)}
              onSelect={onSelectMedia}
              onClick={onMediaClick}
              onDelete={onDeleteMedia}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Size</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Modified</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {/* Folders first */}
              {folders.map((folder) => (
                <tr
                  key={`folder-${folder.id}`}
                  className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onFolderClick?.(folder)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="font-medium truncate">{folder.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">Folder</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">—</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {(onRenameFolder || onDeleteFolder) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          {onRenameFolder && (
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); const newName = prompt('Enter new folder name:', folder.name); if (newName && newName.trim()) onRenameFolder(folder, newName.trim()); }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                          )}
                          {onDeleteFolder && (
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteFolder(folder); }} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
              
              {/* Then media files */}
              {filteredMedia.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b hover:bg-muted/50 cursor-pointer transition-colors',
                    isMediaSelected(item) && 'bg-primary/5'
                  )}
                  onClick={() => onMediaClick(item)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.thumbnail_url || item.url}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                    {item.mime_type.split('/')[0]}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                    {item.human_readable_size}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {onDeleteMedia && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMedia(item);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
