import { cn } from '@lombokapp/ui-toolkit'
import { CloudUpload } from 'lucide-react'
import type { FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'

export const FolderUploadDropzone = ({
  onDrop,
}: {
  onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => void
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  })

  return (
    <div
      className={cn(
        'size-full rounded-md border-2 border-dashed transition-all duration-200',
        isDragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900/20 dark:hover:border-gray-500',
      )}
    >
      <div
        className="flex h-full flex-col items-center justify-center py-6"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <CloudUpload
          className={cn(
            'mb-2 size-8 transition-colors',
            isDragActive ? 'text-blue-500' : 'text-gray-400',
          )}
        />
        {isDragActive ? (
          <p className="text-center font-medium text-blue-600 dark:text-blue-400">
            Drop files here
          </p>
        ) : (
          <div className="cursor-pointer text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Drop files here to upload</span>
              <br />
              or click to select files
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
