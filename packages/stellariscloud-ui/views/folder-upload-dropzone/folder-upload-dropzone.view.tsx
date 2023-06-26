import type { FolderAndPermission } from '@stellariscloud/api-client'
import React from 'react'
import { useDropzone } from 'react-dropzone'

import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'

export const FolderUploadDropzone = ({
  folderAndPermission,
}: {
  folderAndPermission: FolderAndPermission
}) => {
  const { uploadFile } = useLocalFileCacheContext()
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      for (const f of acceptedFiles) {
        uploadFile(
          folderAndPermission.folder.id,
          `${folderAndPermission.folder.prefix}${f.name}`,
          f,
        )
      }
    },
    [
      folderAndPermission.folder.prefix,
      folderAndPermission.folder.id,
      uploadFile,
    ],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  })

  return (
    <div className="w-full h-full bg-sky-50 border-2 border-sky-600 p-6 rounded-md">
      <div className="h-full" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <div className="flex flex-col items-center italic text-gray-400">
            <p>Drop files here to upload</p>
            <p>or click to select files.</p>
          </div>
        )}
      </div>
    </div>
  )
}
