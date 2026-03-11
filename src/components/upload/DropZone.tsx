import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];
  disabled?: boolean;
  children: (state: { isDragging: boolean }) => ReactNode;
}

export function DropZone({ onFiles, accept, disabled, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!accept || accept.length === 0) return arr;
      return arr.filter((f) => {
        const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
        return accept.includes(ext);
      });
    },
    [accept],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) onFiles(valid);
    },
    [disabled, onFiles, validateFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const valid = validateFiles(e.target.files);
        if (valid.length > 0) onFiles(valid);
      }
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [onFiles, validateFiles],
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept?.join(',')}
        multiple
        onChange={handleInputChange}
      />
      {children({ isDragging })}
    </div>
  );
}
