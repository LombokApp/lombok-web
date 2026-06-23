import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { sanitizeUploadFilename } from '@lombokapp/utils'
import React from 'react'
import type { FileRejection } from 'react-dropzone'

import { FolderUploadDropzone } from '../../views/folder-upload-dropzone/folder-upload-dropzone.view'
import { ProgressBar } from '../progress-bar/progress-bar'

export interface UploadModalData {
  isOpen: boolean
  uploadingProgress: Record<string, number | undefined>
}

const UploadModal = ({
  modalData,
  setModalData,
  onUpload,
}: {
  modalData: UploadModalData
  setModalData: (modalData: UploadModalData) => void
  onUpload: (file: File) => void
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

  // Clear uploading files list when the modal is closed
  React.useEffect(() => {
    if (!modalData.isOpen) {
      setUploadingFiles([])
    }
  }, [modalData.isOpen])

  // Keep track of files that have progress data. Progress is reported under the
  // sanitized (resolved) key, so match dropped files by their sanitized name.
  React.useEffect(() => {
    // Only add files from progress that aren't already in uploadingFiles
    const filesFromProgress = Object.keys(modalData.uploadingProgress)
      .filter((filename) => {
        // Check if this file is already in uploadingFiles
        return !uploadingFiles.some(
          (file) => sanitizeUploadFilename(file.name) === filename,
        )
      })
      .map((filename) => {
        // Create a File-like object for display purposes
        return new File([], filename)
      })

    if (filesFromProgress.length > 0) {
      setUploadingFiles((prev) => [...prev, ...filesFromProgress])
    }
  }, [modalData.uploadingProgress, uploadingFiles])

  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(isNowOpen) =>
        setModalData({ ...modalData, isOpen: isNowOpen })
      }
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description="Upload files to this folder"
      >
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Drop files to upload them to this folder.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            'mt-2 flex w-full flex-col justify-between gap-4 overflow-hidden',
          )}
        >
          <FolderUploadDropzone onDrop={onDrop} />
          {uploadingFiles.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 p-3">
              <h3 className="text-sm font-medium">Uploading files</h3>
              <div className="flex max-h-[200px] flex-col gap-3 overflow-y-auto pr-1">
                {uploadingFiles.map((uploadingFile, i) => {
                  // The upload pipeline sanitizes the filename ("/" and "%2F" →
                  // "_"); display and look up progress under that resolved name.
                  const displayName = sanitizeUploadFilename(uploadingFile.name)
                  const progress = modalData.uploadingProgress[displayName] ?? 0
                  return (
                    <div key={`${displayName}_${i}`} className="text-sm">
                      <div className="mb-1 flex justify-between">
                        <span className="max-w-[80%] truncate">
                          {displayName}
                        </span>
                        <span
                          className="ml-2 whitespace-nowrap text-xs font-medium text-muted-foreground"
                          data-testid="upload-progress-percent"
                        >
                          {`${Math.round(progress)}%`}
                        </span>
                      </div>
                      <ProgressBar progress={progress} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <div className="flex gap-4">
            <Button
              variant="solid"
              onClick={() => setModalData({ ...modalData, isOpen: false })}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { UploadModal }
