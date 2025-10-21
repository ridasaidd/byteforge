import { useState, useRef } from 'react';
import { Upload, X, User } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  isUploading?: boolean;
  isDeleting?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarUpload({
  currentAvatar,
  onUpload,
  onDelete,
  isUploading = false,
  isDeleting = false,
  size = 'md',
  className,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Are you sure you want to delete your avatar?')) {
      setPreview(null);
      await onDelete();
    }
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar Display / Upload Area */}
      <div
        className={cn(
          sizeClasses[size],
          'relative rounded-full overflow-hidden border-2 transition-colors',
          dragOver ? 'border-primary' : 'border-muted',
          !displayAvatar && 'cursor-pointer hover:border-primary',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!displayAvatar ? handleClick : undefined}
      >
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin">
                <Upload className={iconSizeClasses[size]} />
              </div>
            ) : (
              <User className={cn(iconSizeClasses[size], 'text-muted-foreground')} />
            )}
          </div>
        )}

        {/* Delete Button Overlay */}
        {displayAvatar && !isUploading && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 hover:opacity-100 transition-opacity disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload/Change Button */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {displayAvatar ? 'Change' : 'Upload'} Avatar
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Click to upload or drag and drop
        <br />
        PNG, JPG, GIF or WebP (max. 2MB)
      </p>
    </div>
  );
}
