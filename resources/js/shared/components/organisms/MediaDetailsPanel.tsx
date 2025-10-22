import { X, Copy, Download, Trash2, Check, File } from 'lucide-react';
import { useState } from 'react';
import type { Media } from '@/shared/services/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/lib/utils';

interface MediaDetailsPanelProps {
  media: Media | null;
  onClose: () => void;
  onDelete?: (media: Media) => void;
  className?: string;
}

export function MediaDetailsPanel({ media, onClose, onDelete, className }: MediaDetailsPanelProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!media) return null;

  const isImage = media.mime_type.startsWith('image/');

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(media.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Delete "${media.name}"? This action cannot be undone.`)) {
      onDelete(media);
      onClose();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('flex flex-col h-full bg-card border-l', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">File Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {isImage ? (
              <img src={media.url} alt={media.name} className="w-full h-full object-contain" />
            ) : (
              <File className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
        </div>

        <Separator />

        {/* File Information */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">File Name</Label>
            <p className="text-sm font-medium break-all">{media.file_name}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">File Type</Label>
            <p className="text-sm">{media.mime_type}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">File Size</Label>
            <p className="text-sm">{media.human_readable_size}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Uploaded</Label>
            <p className="text-sm">{formatDate(media.created_at)}</p>
          </div>

          {media.custom_properties && Object.keys(media.custom_properties).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Custom Properties</Label>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                {JSON.stringify(media.custom_properties, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <Separator />

        {/* File URL */}
        <div className="space-y-2">
          <Label htmlFor="file-url">File URL</Label>
          <div className="flex gap-2">
            <Input id="file-url" value={media.url} readOnly className="text-xs" />
            <Button variant="outline" size="sm" onClick={copyUrl} className="flex-shrink-0">
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Thumbnail URL (if exists) */}
        {media.thumbnail_url && (
          <div className="space-y-2">
            <Label htmlFor="thumbnail-url">Thumbnail URL</Label>
            <div className="flex gap-2">
              <Input id="thumbnail-url" value={media.thumbnail_url} readOnly className="text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(media.thumbnail_url!);
                }}
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        <Button variant="outline" className="w-full" onClick={() => window.open(media.url, '_blank')}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        {onDelete && (
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete File
          </Button>
        )}
      </div>
    </div>
  );
}
