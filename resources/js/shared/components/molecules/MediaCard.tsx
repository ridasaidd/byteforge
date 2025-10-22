import { Check, File, Image, Video, Music, FileText, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Media } from '@/shared/services/api';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';

interface MediaCardProps {
  media: Media;
  isSelected?: boolean;
  onSelect?: (media: Media) => void;
  onClick?: (media: Media) => void;
  onDelete?: (media: Media) => void;
}

export function MediaCard({ media, isSelected = false, onSelect, onClick, onDelete }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);

  const getFileIcon = () => {
    if (media.mime_type.startsWith('image/')) return Image;
    if (media.mime_type.startsWith('video/')) return Video;
    if (media.mime_type.startsWith('audio/')) return Music;
    if (media.mime_type.includes('pdf')) return FileText;
    return File;
  };

  const Icon = getFileIcon();
  const isImage = media.mime_type.startsWith('image/');
  const showThumbnail = isImage && !imageError && (media.thumbnail_url || media.url);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(media);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(media);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${media.name}"?`)) {
      onDelete?.(media);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={handleCardClick}
    >
      {/* Checkbox overlay */}
      {onSelect && (
        <div
          className={cn(
            'absolute top-2 left-2 z-10',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isSelected && 'opacity-100'
          )}
        >
          <button
            onClick={handleCheckboxClick}
            className={cn(
              'w-6 h-6 rounded border-2 bg-background flex items-center justify-center transition-all',
              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>
      )}

      {/* Thumbnail / Icon */}
      <div className="aspect-square bg-muted flex items-center justify-center relative">
        {showThumbnail ? (
          <img
            src={media.thumbnail_url || media.url}
            alt={media.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className="w-12 h-12 text-muted-foreground" />
        )}

        {/* Action buttons overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {media.url && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                window.open(media.url, '_blank');
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* File info */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium truncate" title={media.name}>
          {media.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {media.human_readable_size}
        </p>
      </div>
    </div>
  );
}
