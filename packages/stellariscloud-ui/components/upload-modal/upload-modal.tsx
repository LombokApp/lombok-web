import clsx from 'clsx'
import React from 'react'
import type { FileRejection } from 'react-dropzone'

import { Button } from '../../design-system/button/button'
import { Modal } from '../../design-system/modal/modal'
import { FolderUploadDropzone } from '../../views/folder-upload-dropzone/folder-upload-dropzone.view'

export const UploadModal = ({
  onUpload,
  onCancel,
}: {
  onUpload: (file: File) => void
  onCancel: () => void
}) => {
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([])

  const onDrop = React.useCallback(
    (acceptedFiles: File[], _fileRejections: FileRejection[]) => {
      setUploadingFiles((_uploadingFiles) =>
        _uploadingFiles.concat(acceptedFiles),
      )
      for (const f of acceptedFiles) {
        onUpload(f)
      }
    },
    [onUpload],
  )

  return (
    <Modal title="Upload files" onClose={onCancel} disableClose>
      <div
        className={clsx(
          'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-4">
            <FolderUploadDropzone onDrop={onDrop} />
            {uploadingFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                {uploadingFiles.map((uploadingFile, i) => (
                  <div key={`${uploadingFile.name}_${i}`}>
                    {uploadingFile.name}
                  </div>
                ))}
              </div>
            )}
            <Button size="lg" preventDefaultOnClick onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
