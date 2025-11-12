import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { api, type Media, type MediaFolder, type MediaFilters } from '@/shared/services/api';
import { MediaBrowser } from '@/shared/components/organisms/MediaBrowser';
import { MediaDetailsPanel } from '@/shared/components/organisms/MediaDetailsPanel';
import { MediaUploader } from '@/shared/components/molecules/MediaUploader';
import { FolderNavigation } from '@/shared/components/organisms/FolderNavigation';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export default function MediaLibraryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [currentFolder, setCurrentFolder] = useState<MediaFolder | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'folder'; item: Media | MediaFolder } | null>(null);
  const [filters, setFilters] = useState<MediaFilters>({
    page: 1,
    per_page: 24,
  });

  // Queries
  const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
    queryKey: ['media', filters],
    queryFn: () => api.media.list(filters),
  });

  const { data: foldersData } = useQuery({
    queryKey: ['media-folders'],
    queryFn: () => api.mediaFolders.list(),
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; folder_id?: number | null }) =>
      api.media.upload({
        file: data.file,
        folder_id: data.folder_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.media.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSelectedMedia(null);
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parent_id?: number | null }) => api.mediaFolders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string; errors?: { name?: string[] } } } };
      const errorMessage = axiosError?.response?.data?.message || axiosError?.response?.data?.errors?.name?.[0] || 'Failed to create folder';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: (data: { id: number; name: string }) =>
      api.mediaFolders.update(data.id, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast({
        title: 'Success',
        description: 'Folder renamed successfully',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string; errors?: { name?: string[] } } } };
      const errorMessage = axiosError?.response?.data?.message || axiosError?.response?.data?.errors?.name?.[0] || 'Failed to rename folder';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => api.mediaFolders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({
        title: 'Success',
        description: 'Folder and all contents deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadMutation.mutateAsync({
        file,
        folder_id: currentFolder?.id || null,
      });
    }
  };

  const handleDelete = (media: Media) => {
    setDeleteConfirm({ type: 'file', item: media });
  };

  const handleDeleteFolder = (folder: MediaFolder) => {
    setDeleteConfirm({ type: 'folder', item: folder });
  };

  const handleRenameFolder = (folder: MediaFolder, newName: string) => {
    updateFolderMutation.mutate({ id: folder.id, name: newName });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'file') {
      deleteMutation.mutate((deleteConfirm.item as Media).id);
    } else {
      deleteFolderMutation.mutate((deleteConfirm.item as MediaFolder).id);
    }
    setDeleteConfirm(null);
  };

  const handleFolderChange = (folder: MediaFolder | null) => {
    setCurrentFolder(folder);
    setFilters((prev) => ({
      ...prev,
      folder_id: folder?.id || null,
      page: 1,
    }));
  };

  const handleCreateFolder = (name: string, parentId?: string) => {
    createFolderMutation.mutate({
      name,
      parent_id: parentId ? parseInt(parentId, 10) : null,
    });
  };

  const handleMediaClick = (media: Media) => {
    setSelectedMedia(media);
  };

  const media = mediaData?.data || [];
  const folders = foldersData?.data || [];

  // Get child folders of current folder
  const childFolders = currentFolder
    ? folders.filter((f) => f.parent_id === currentFolder.id)
    : folders.filter((f) => !f.parent_id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Media Library</h1>
            <p className="text-sm text-muted-foreground">
              Manage your files, images, and media
            </p>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Folder Navigation */}
      <FolderNavigation
        currentFolder={currentFolder}
        folders={folders}
        onFolderChange={handleFolderChange}
        onCreateFolder={handleCreateFolder}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Media Browser */}
        <div className="flex-1 overflow-auto">
          <MediaBrowser
            media={media}
            folders={childFolders}
            isLoading={isLoadingMedia}
            selectedMedia={selectedMedia ? [selectedMedia] : []}
            onMediaClick={handleMediaClick}
            onSelectMedia={handleMediaClick}
            onFolderClick={handleFolderChange}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onDeleteMedia={handleDelete}
          />
        </div>

        {/* Details Panel */}
        {selectedMedia && (
          <div className="w-96 flex-shrink-0">
            <MediaDetailsPanel
              media={selectedMedia}
              onClose={() => setSelectedMedia(null)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <MediaUploader
            onUpload={handleUpload}
            maxSize={20}
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={deleteConfirm?.type === 'folder' ? 'Delete Folder' : 'Delete File'}
        description={
          deleteConfirm?.type === 'folder'
            ? `Are you sure you want to delete "${(deleteConfirm.item as MediaFolder).name}"? This will permanently delete the folder and ALL its contents, including nested folders and files. This action cannot be undone.`
            : `Are you sure you want to delete "${(deleteConfirm?.item as Media)?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
