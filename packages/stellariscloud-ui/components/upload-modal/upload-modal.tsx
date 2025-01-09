import React from 'react'
import type { FileRejection } from 'react-dropzone'

import { Button, cn } from '@stellariscloud/ui-toolkit'
import { Modal } from '../../design-system/modal/modal'
import { FolderUploadDropzone } from '../../views/folder-upload-dropzone/folder-upload-dropzone.view'
import { ProgressBar } from '../progress-bar/progress-bar'

export const UploadModal = ({
  onUpload,
  onCancel,
  uploadingProgress,
}: {
  onUpload: (file: File) => void
  onCancel: () => void
  uploadingProgress: { [key: string]: number | undefined }
}) => {
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([])

  const onDrop = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <div className={cn('flex gap-4 justify-between rounded-md p-4 w-full')}>
        <div className="flex flex-col gap-4 p-6 w-full">
          <div className="flex flex-col gap-4 w-full">
            <FolderUploadDropzone onDrop={onDrop} />
            {uploadingFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                {uploadingFiles.map((uploadingFile, i) => (
                  <div key={`${uploadingFile.name}_${i}`}>
                    {uploadingFile.name}
                    <ProgressBar
                      progress={uploadingProgress[uploadingFile.name] ?? 0}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button size="lg" onClick={onCancel}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
