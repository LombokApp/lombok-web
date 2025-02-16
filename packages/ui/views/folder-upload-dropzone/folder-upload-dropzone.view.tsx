import React from 'react'
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
    <div className="size-full rounded-md bg-black/10 dark:bg-white/5">
      <div className="h-full" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <div className="flex cursor-pointer flex-col items-center p-6 italic text-gray-600 dark:text-gray-400">
            <p>Drop files here to upload</p>
            <p>or click to select files.</p>
          </div>
        )}
      </div>
    </div>
  )
}
