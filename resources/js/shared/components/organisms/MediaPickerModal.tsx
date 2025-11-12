import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Media, type MediaFolder, type MediaFilters } from '@/shared/services/api';
import { MediaBrowser } from './MediaBrowser';
import { FolderNavigation } from './FolderNavigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
  title?: string;
  allowedTypes?: string[]; // e.g., ['image/jpeg', 'image/png']
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media',
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
}: MediaPickerModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const [currentFolder, setCurrentFolder] = useState<MediaFolder | null>(null);
  const [filters, setFilters] = useState<MediaFilters>({
    page: 1,
    per_page: 24,
    // Don't filter by mime_type in the API call - let the backend return all,
    // and we'll filter in the UI if needed
  });

  // Fetch media
  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media-picker', filters],
    queryFn: () => api.media.list(filters),
    enabled: isOpen, // Only fetch when modal is open
  });

  // Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ['media-folders-picker'],
    queryFn: () => api.mediaFolders.list(),
    enabled: isOpen,
  });

  // Filter media by allowed types in the UI
  const filteredMedia = allowedTypes.length > 0
    ? (mediaData?.data || []).filter((media) => allowedTypes.includes(media.mime_type))
    : (mediaData?.data || []);

  const handleMediaClick = (media: Media) => {
    // Single selection mode - replace selection
    setSelectedMedia([media]);
  };

  const handleFolderClick = (folder: MediaFolder) => {
    setCurrentFolder(folder);
    setFilters((prev) => ({ ...prev, folder_id: folder.id, page: 1 }));
  };

  const handleFolderNavigate = (folder: MediaFolder | null) => {
    setCurrentFolder(folder);
    setFilters((prev) => ({ ...prev, folder_id: folder?.id, page: 1 }));
  };

  const handleConfirmSelection = () => {
    if (selectedMedia.length > 0) {
      onSelect(selectedMedia[0]); // Return first selected item
      onClose();
      setSelectedMedia([]); // Reset selection
      setCurrentFolder(null); // Reset folder
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedMedia([]); // Reset selection
    setCurrentFolder(null); // Reset folder
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Folder Navigation */}
        {foldersData && foldersData.data.length > 0 && (
          <div className="border-b pb-4">
            <FolderNavigation
              folders={foldersData.data}
              currentFolder={currentFolder}
              onFolderChange={handleFolderNavigate}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <MediaBrowser
            media={filteredMedia}
            folders={currentFolder === null ? foldersData?.data || [] : []}
            isLoading={isLoading}
            selectedMedia={selectedMedia}
            onSelectMedia={handleMediaClick}
            onMediaClick={handleMediaClick}
            onFolderClick={handleFolderClick}
          />
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            {selectedMedia.length > 0 ? (
              <span>
                Selected: <strong>{selectedMedia[0].file_name}</strong>
              </span>
            ) : (
              <span>Select an image from your media library</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={selectedMedia.length === 0}
            >
              Select
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
