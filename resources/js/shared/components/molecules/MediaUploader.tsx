import { Upload, X, File as FileIcon } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface MediaUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  className?: string;
}

export function MediaUploader({
  onUpload,
  accept = 'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 10, // 10MB default
  multiple = true,
  className,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    const validateFile = (file: File): string | null => {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        return `File exceeds maximum size of ${maxSize}MB`;
      }
      return null;
    };
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const initialUploadingFiles: UploadingFile[] = [];

    // Validate all files first
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        initialUploadingFiles.push({
          file,
          progress: 0,
          status: 'error',
          error,
        });
      } else {
        validFiles.push(file);
        initialUploadingFiles.push({
          file,
          progress: 0,
          status: 'uploading',
        });
      }
    });

    setUploadingFiles(initialUploadingFiles);

    // Upload valid files
    if (validFiles.length > 0) {
      try {
        // Upload files - backend handles progress
        await onUpload(validFiles);

        // Mark as success
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            validFiles.includes(uf.file) ? { ...uf, progress: 100, status: 'success' as const } : uf
          )
        );

        // Clear success files after 2 seconds
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((uf) => uf.status !== 'success'));
        }, 2000);
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            validFiles.includes(uf.file)
              ? {
                  ...uf,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : uf
          )
        );
      }
    }
  }, [maxSize, onUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.file !== file));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary',
          'flex flex-col items-center justify-center gap-4'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <div className="rounded-full bg-primary/10 p-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Drop files to upload</p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum file size: {maxSize}MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate" title={uploadingFile.file.name}>
                    {uploadingFile.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                {uploadingFile.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeUploadingFile(uploadingFile.file)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {uploadingFile.status === 'uploading' && (
                <Progress value={uploadingFile.progress} className="h-1" />
              )}

              {uploadingFile.status === 'success' && (
                <p className="text-xs text-green-600">Upload complete!</p>
              )}

              {uploadingFile.status === 'error' && (
                <p className="text-xs text-destructive">{uploadingFile.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
