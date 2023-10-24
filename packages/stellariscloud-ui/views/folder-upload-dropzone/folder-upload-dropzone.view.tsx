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
    <div className="w-full h-full bg-black/10 dark:bg-white/5 rounded-md">
      <div className="h-full" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <div className="flex flex-col items-center italic text-gray-600 dark:text-gray-400 p-6 cursor-pointer">
            <p>Drop files here to upload</p>
            <p>or click to select files.</p>
          </div>
        )}
      </div>
    </div>
  )
}
