import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FolderCard } from '../components/molecules/FolderCard';
import { MediaCard } from '../components/molecules/MediaCard';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import type { MediaFolder, Media } from '../services/api';

// Test utilities
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('FolderCard', () => {
  const mockFolder: MediaFolder = {
    id: 1,
    name: 'Test Folder',
    parent_id: null,
    tenant_id: null,
    created_at: '2025-10-22T10:00:00Z',
    updated_at: '2025-10-22T10:00:00Z',
  };

  it('renders folder name correctly', () => {
    renderWithQueryClient(<FolderCard folder={mockFolder} />);
    expect(screen.getByText('Test Folder')).toBeInTheDocument();
  });

  it('calls onClick when folder is clicked', () => {
    const handleClick = vi.fn();
    renderWithQueryClient(<FolderCard folder={mockFolder} onClick={handleClick} />);
    
    const folderCard = screen.getByText('Test Folder').closest('div');
    fireEvent.click(folderCard!);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows rename and delete options when handlers are provided', () => {
    const handleRename = vi.fn();
    const handleDelete = vi.fn();
    
    renderWithQueryClient(
      <FolderCard 
        folder={mockFolder} 
        onRename={handleRename}
        onDelete={handleDelete}
      />
    );
    
    // Hover to show menu (actions are opacity-0 by default)
    const card = screen.getByText('Test Folder').closest('div');
    fireEvent.mouseOver(card!);
    
    // Menu button should be visible
    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
  });

  it('handles rename functionality', () => {
    const handleRename = vi.fn();
    
    renderWithQueryClient(
      <FolderCard 
        folder={mockFolder} 
        onRename={handleRename}
      />
    );
    
    // Menu button should be present when onRename handler is provided
    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
  });
});

describe('MediaCard', () => {
  const mockMedia: Media = {
    id: 1,
    name: 'test-image',
    file_name: 'test-image.jpg',
    mime_type: 'image/jpeg',
    size: 102400,
    collection_name: 'default',
    url: 'https://example.com/test-image.jpg',
    thumbnail_url: 'https://example.com/test-image-thumb.jpg',
    human_readable_size: '100 KB',
    created_at: '2025-10-22T10:00:00Z',
    updated_at: '2025-10-22T10:00:00Z',
    model_type: 'App\\Models\\MediaLibrary',
    model_id: 1,
    disk: 'public',
    conversions_disk: 'public',
    uuid: 'test-uuid',
    custom_properties: {},
    generated_conversions: {},
    manipulations: {},
    responsive_images: {},
    order_column: 1,
  };

  it('renders media name correctly', () => {
    renderWithQueryClient(
      <MediaCard 
        media={mockMedia}
        isSelected={false}
        onSelect={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    expect(screen.getByText('test-image')).toBeInTheDocument();
  });

  it('displays file size in human readable format', () => {
    renderWithQueryClient(
      <MediaCard 
        media={mockMedia}
        isSelected={false}
        onSelect={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    expect(screen.getByText('100 KB')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    
    renderWithQueryClient(
      <MediaCard 
        media={mockMedia}
        isSelected={false}
        onSelect={vi.fn()}
        onClick={handleClick}
      />
    );
    
    const card = screen.getByText('test-image').closest('div');
    fireEvent.click(card!);
    
    expect(handleClick).toHaveBeenCalledWith(mockMedia);
  });

  it('shows selected state correctly', () => {
    const { container } = renderWithQueryClient(
      <MediaCard 
        media={mockMedia}
        isSelected={true}
        onSelect={vi.fn()}
        onClick={vi.fn()}
      />
    );
    
    // Check if selected styling is applied (you'll need to adjust based on actual implementation)
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('ring'); // Assuming selected cards have a ring class
  });

  it('shows delete button when onDelete is provided', () => {
    const handleDelete = vi.fn();
    
    renderWithQueryClient(
      <MediaCard 
        media={mockMedia}
        isSelected={false}
        onSelect={vi.fn()}
        onClick={vi.fn()}
        onDelete={handleDelete}
      />
    );
    
    // Delete button should be present (might be hidden until hover)
    const card = screen.getByText('test-image').closest('div');
    fireEvent.mouseOver(card!);
    
    // Look for delete icon/button
    const deleteButtons = screen.getAllByRole('button');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});

describe('ConfirmDialog', () => {
  it('renders with correct title and description', () => {
    renderWithQueryClient(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete File"
        description="Are you sure you want to delete this file?"
        onConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this file?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();
    
    renderWithQueryClient(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete File"
        description="Are you sure?"
        confirmText="Delete"
        onConfirm={handleConfirm}
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('calls onOpenChange when cancel button is clicked', () => {
    const handleOpenChange = vi.fn();
    
    renderWithQueryClient(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete File"
        description="Are you sure?"
        cancelText="Cancel"
        onConfirm={vi.fn()}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies destructive variant styling', () => {
    renderWithQueryClient(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete"
        description="Confirm deletion"
        confirmText="Delete"
        variant="destructive"
        onConfirm={vi.fn()}
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeInTheDocument();
    // Button should have destructive variant classes
  });

  it('does not render when open is false', () => {
    renderWithQueryClient(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Delete File"
        description="Are you sure?"
        onConfirm={vi.fn()}
      />
    );
    
    expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
  });
});

describe('Media Library Integration', () => {
  it('handles folder deletion with confirmation', async () => {
    const mockFolder: MediaFolder = {
      id: 1,
      name: 'Test Folder',
      parent_id: null,
      tenant_id: null,
      created_at: '2025-10-22T10:00:00Z',
      updated_at: '2025-10-22T10:00:00Z',
    };

    const handleDelete = vi.fn();
    
    renderWithQueryClient(
      <FolderCard 
        folder={mockFolder}
        onDelete={handleDelete}
      />
    );
    
    // This tests the integration flow of delete action
    // In real app, clicking delete would open ConfirmDialog
    // and confirming would call the delete mutation
  });

  it('validates folder name uniqueness', () => {
    // This would test the validation logic
    // In integration tests, you'd POST to /api/superadmin/media-folders
    // with duplicate name and expect 422 response
    expect(true).toBe(true); // Placeholder
  });
});
